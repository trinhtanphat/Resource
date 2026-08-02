#!/usr/bin/env node
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE = path.resolve(process.argv[2] || ".");
const OUTPUT = path.resolve(process.argv[3] || "./dist");
const ALL_FILES = process.argv.includes("--all");
const SOFT_LIMIT = 18_000;
const map = JSON.parse(await fs.readFile(new URL("../bucket-map.json", import.meta.url), "utf8"));

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".avif", ".bmp", ".ico"
]);
const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", ".github", ".idea", ".vscode",
  "dist", "build", "coverage"
]);

function normalizeRelative(file) {
  return path.relative(SOURCE, file).split(path.sep).join("/").normalize("NFC");
}

function virtualBucket(relativePath) {
  return createHash("sha256").update(relativePath, "utf8").digest()[0];
}

function physicalShard(relativePath) {
  const bucket = virtualBucket(relativePath);
  const shard = map[String(bucket)];
  if (!Number.isInteger(shard)) throw new Error(`Missing bucket mapping for ${bucket}`);
  return shard;
}

async function* walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function copyFile(source, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

await fs.rm(OUTPUT, { recursive: true, force: true });
await fs.mkdir(OUTPUT, { recursive: true });

const counts = Array(14).fill(0);
const bytes = Array(14).fill(0);

for await (const file of walk(SOURCE)) {
  const ext = path.extname(file).toLowerCase();
  if (!ALL_FILES && !IMAGE_EXTENSIONS.has(ext)) continue;

  const relative = normalizeRelative(file);
  const shard = physicalShard(relative);
  const target = path.join(
    OUTPUT,
    `shard-${String(shard).padStart(2, "0")}`,
    ...relative.split("/")
  );

  await copyFile(file, target);
  const stat = await fs.stat(file);
  counts[shard]++;
  bytes[shard] += stat.size;

  if (counts[shard] > SOFT_LIMIT) {
    throw new Error(`Shard ${shard} exceeded soft limit: ${counts[shard]}`);
  }
}

const report = {
  source: SOURCE,
  totalFiles: counts.reduce((a, b) => a + b, 0),
  algorithm: "SHA-256 path -> 256 virtual buckets -> physical shard map",
  shards: counts.map((files, shard) => ({
    shard: String(shard).padStart(2, "0"),
    files,
    bytes: bytes[shard]
  }))
};

await fs.writeFile(path.join(OUTPUT, "shard-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
