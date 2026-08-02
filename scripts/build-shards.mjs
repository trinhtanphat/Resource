#!/usr/bin/env node
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const SHARD_COUNT = 14;
const SOFT_LIMIT = 18_000;
const HARD_LIMIT = 20_000;
const args = process.argv.slice(2);

function option(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function parseShard(value) {
  if (value === null || value === undefined || value === "") return null;
  if (!/^\d{1,2}$/u.test(String(value))) throw new Error(`Invalid shard: ${value}`);
  const shard = Number(value);
  if (!Number.isInteger(shard) || shard < 0 || shard >= SHARD_COUNT) {
    throw new Error(`Shard must be between 00 and ${String(SHARD_COUNT - 1).padStart(2, "0")}`);
  }
  return shard;
}

const SOURCE = path.resolve(option("--source", "."));
const OUTPUT = path.resolve(option("--output", "./dist"));
const ALL_FILES = args.includes("--all");
const VALIDATE_ONLY = args.includes("--validate-only");
const SELECTED_SHARD = parseShard(option("--shard", process.env.ASSET_SHARD ?? null));

if (VALIDATE_ONLY && SELECTED_SHARD !== null) {
  throw new Error("--validate-only cannot be combined with --shard");
}

const bucketMap = JSON.parse(
  await fs.readFile(new URL("../bucket-map.json", import.meta.url), "utf8")
);

const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".avif", ".bmp", ".ico"
]);
const EXCLUDED_DIRS = new Set([
  ".git", "node_modules", ".github", ".idea", ".vscode",
  "dist", "build", "coverage"
]);

function validateBucketMap() {
  const usage = Array(SHARD_COUNT).fill(0);
  for (let bucket = 0; bucket < 256; bucket += 1) {
    const shard = bucketMap[String(bucket)];
    if (!Number.isInteger(shard) || shard < 0 || shard >= SHARD_COUNT) {
      throw new Error(`Invalid mapping for virtual bucket ${bucket}: ${shard}`);
    }
    usage[shard] += 1;
  }
  if (Object.keys(bucketMap).length !== 256) {
    throw new Error("bucket-map.json must contain exactly 256 entries");
  }
  if (usage.some((count) => count === 0)) {
    throw new Error("Every physical shard must own at least one virtual bucket");
  }
  return usage;
}

function normalizeRelative(file) {
  return path.relative(SOURCE, file).split(path.sep).join("/").normalize("NFC");
}

function physicalShard(relativePath) {
  const bucket = createHash("sha256").update(relativePath, "utf8").digest()[0];
  return bucketMap[String(bucket)];
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

const virtualBucketsPerShard = validateBucketMap();
await fs.rm(OUTPUT, { recursive: true, force: true });
await fs.mkdir(OUTPUT, { recursive: true });

const counts = Array(SHARD_COUNT).fill(0);
const bytes = Array(SHARD_COUNT).fill(0);
let candidatesScanned = 0;

for await (const file of walk(SOURCE)) {
  const ext = path.extname(file).toLowerCase();
  if (!ALL_FILES && !IMAGE_EXTENSIONS.has(ext)) continue;
  candidatesScanned += 1;

  const relative = normalizeRelative(file);
  const shard = physicalShard(relative);
  if (SELECTED_SHARD !== null && shard !== SELECTED_SHARD) continue;

  const stat = await fs.stat(file);
  counts[shard] += 1;
  bytes[shard] += stat.size;

  if (counts[shard] > HARD_LIMIT) {
    throw new Error(`Shard ${shard} exceeded Cloudflare Free hard limit: ${counts[shard]}`);
  }
  if (!VALIDATE_ONLY) {
    const target = path.join(
      OUTPUT,
      `shard-${String(shard).padStart(2, "0")}`,
      ...relative.split("/")
    );
    await copyFile(file, target);
  }
}

const overSoftLimit = counts
  .map((files, shard) => ({ shard, files }))
  .filter(({ files }) => files > SOFT_LIMIT);
if (overSoftLimit.length > 0) {
  throw new Error(
    `Shard soft limit exceeded: ${overSoftLimit.map(({ shard, files }) => `${shard}=${files}`).join(", ")}`
  );
}

const mode = VALIDATE_ONLY ? "validate" : SELECTED_SHARD === null ? "all-shards" : "single-shard";
const report = {
  source: SOURCE,
  output: OUTPUT,
  mode,
  selectedShard: SELECTED_SHARD === null ? null : String(SELECTED_SHARD).padStart(2, "0"),
  candidatesScanned,
  totalFiles: counts.reduce((sum, count) => sum + count, 0),
  totalBytes: bytes.reduce((sum, size) => sum + size, 0),
  algorithm: "SHA-256 path -> 256 virtual buckets -> physical shard map",
  limits: {
    softFilesPerShard: SOFT_LIMIT,
    freeHardFilesPerShard: HARD_LIMIT
  },
  shards: counts.map((files, shard) => ({
    shard: String(shard).padStart(2, "0"),
    virtualBuckets: virtualBucketsPerShard[shard],
    files,
    bytes: bytes[shard],
    built: !VALIDATE_ONLY && (SELECTED_SHARD === null || SELECTED_SHARD === shard)
  }))
};

await fs.writeFile(
  path.join(OUTPUT, "shard-report.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
console.log(JSON.stringify(report, null, 2));
