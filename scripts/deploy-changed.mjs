#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const bucketMap = JSON.parse(readFileSync(path.join(root, "bucket-map.json"), "utf8"));
const IMAGE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".avif", ".bmp", ".ico"
]);

function normalizeRelative(value) {
  return value.split("\\").join("/").replace(/^\.?\//, "").normalize("NFC");
}

function shardFor(relativePath) {
  const normalized = normalizeRelative(relativePath);
  const bucket = createHash("sha256").update(normalized, "utf8").digest()[0];
  const shard = bucketMap[String(bucket)];
  if (!Number.isInteger(shard)) throw new Error(`Missing mapping for virtual bucket ${bucket}`);
  return shard;
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function allShards() {
  return new Set(Array.from({ length: 14 }, (_, i) => i));
}

function changedPaths() {
  try {
    git(["rev-parse", "HEAD^"]);
  } catch {
    return null;
  }

  const output = git(["diff", "--name-status", "--find-renames", "HEAD^", "HEAD"]);
  if (!output) return [];

  const paths = [];
  for (const line of output.split(/\r?\n/)) {
    const parts = line.split("\t");
    const status = parts[0];

    if (status.startsWith("R") || status.startsWith("C")) {
      if (parts[1]) paths.push(parts[1]);
      if (parts[2]) paths.push(parts[2]);
    } else if (parts[1]) {
      paths.push(parts[1]);
    }
  }
  return paths;
}

const changed = changedPaths();
let affected;

if (changed === null) {
  affected = allShards();
} else {
  affected = new Set();

  for (const file of changed) {
    const normalized = normalizeRelative(file);

    if (
      normalized === "bucket-map.json" ||
      normalized === "package.json" ||
      normalized.startsWith("scripts/") ||
      normalized.startsWith("wrangler/")
    ) {
      affected = allShards();
      break;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(normalized).toLowerCase())) continue;
    affected.add(shardFor(normalized));
  }
}

if (affected.size === 0) {
  console.log("No runtime asset shard changed; nothing to deploy.");
  process.exit(0);
}

for (const index of [...affected].sort((a, b) => a - b)) {
  const shard = String(index).padStart(2, "0");
  console.log(`Deploy affected shard ${shard}`);

  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "wrangler",
      "deploy",
      "--config",
      path.join(root, "wrangler", `wrangler.shard-${shard}.jsonc`)
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: "291f5d12e63427644f59ac4a1d8f9664"
      }
    }
  );
}
