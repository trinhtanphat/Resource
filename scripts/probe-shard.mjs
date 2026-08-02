#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const shardValue = args[0] ?? process.env.ASSET_SHARD;

if (!/^\d{1,2}$/u.test(String(shardValue ?? ""))) {
  throw new Error("Usage: npm run probe:shard -- NN");
}

const shardIndex = Number(shardValue);
if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex > 13) {
  throw new Error("Shard must be between 00 and 13");
}

const shard = String(shardIndex).padStart(2, "0");
const matrix = JSON.parse(
  await fs.readFile(path.join(root, "cloudflare-builds.json"), "utf8")
);
const report = JSON.parse(
  await fs.readFile(path.join(root, "dist", "shard-report.json"), "utf8")
);
const entry = report.shards?.find((candidate) => candidate.shard === shard);

if (!entry?.built || entry.files < 1 || !entry.representativePath) {
  throw new Error(`Shard ${shard} report has no built representative asset`);
}

const baseUrl = (
  process.env.SHARD_BASE_URL
  ?? `https://ddtank-assets-shard-${shard}.${matrix.workersDevSubdomain}.workers.dev`
).replace(/\/+$/u, "");
const encodedPath = entry.representativePath
  .split("/")
  .map((segment) => encodeURIComponent(segment))
  .join("/");
const url = `${baseUrl}/${encodedPath}?v=${process.env.CF_PAGES_COMMIT_SHA ?? process.env.COMMIT_SHA ?? "probe"}`;
const attempts = Number(process.env.PROBE_ATTEMPTS ?? 6);
const delayMs = Number(process.env.PROBE_DELAY_MS ?? 2_000);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

let lastResult = null;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000)
    });
    const contentType = response.headers.get("content-type") ?? "";
    lastResult = {
      attempt,
      status: response.status,
      contentType,
      contentLength: response.headers.get("content-length")
    };

    if (response.status === 200 && contentType.toLowerCase().startsWith("image/")) {
      console.log(JSON.stringify({
        status: "ok",
        shard,
        worker: `ddtank-assets-shard-${shard}`,
        url,
        representativePath: entry.representativePath,
        files: entry.files,
        bytes: entry.bytes,
        response: lastResult
      }, null, 2));
      process.exit(0);
    }
  } catch (error) {
    lastResult = {
      attempt,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  if (attempt < attempts) await sleep(delayMs);
}

throw new Error(
  `Shard ${shard} probe failed after ${attempts} attempts: ${JSON.stringify(lastResult)}`
);
