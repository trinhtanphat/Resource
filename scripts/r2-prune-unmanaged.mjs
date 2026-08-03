#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = process.env.R2_REPO_ROOT
  ? path.resolve(process.env.R2_REPO_ROOT)
  : fileURLToPath(new URL("..", import.meta.url));
const command = process.argv[2] ?? "prune";
const config = JSON.parse(await fs.readFile(path.join(repositoryRoot, "r2-deployment.json"), "utf8"));
const profileName = process.env.R2_PROFILE ?? config.defaultProfile;
const profile = config.profiles?.[profileName];
const ci = config.ci ?? {};
const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GIT_BRANCH ?? null;
const manifestPrefix = String(ci.manifestPrefix ?? "_deployment/manifests").replace(/^\/+|\/+$/gu, "");

function validateConfiguration() {
  if (config.schemaVersion !== 2) throw new Error("r2-deployment.json schemaVersion must be 2");
  if (!/^[a-f0-9]{32}$/u.test(config.accountId)) throw new Error("Invalid Cloudflare accountId");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(config.bucket)) throw new Error("Invalid R2 bucket name");
  if (!profile || !Array.isArray(profile.roots) || profile.roots.length === 0) {
    throw new Error(`Unknown or empty R2 profile: ${profileName}`);
  }
  if (profileName !== config.defaultProfile && process.env.R2_PRUNE_ALLOW_PARTIAL !== "1") {
    throw new Error(`Refusing to prune from partial profile ${profileName}; expected ${config.defaultProfile}`);
  }
  for (const rootName of profile.roots) {
    if (!/^[A-Za-z0-9._-]+$/u.test(rootName)) throw new Error(`Unsafe source root: ${rootName}`);
  }
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".DS_Store" || entry.name === "Thumbs.db") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in R2 source roots: ${absolute}`);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function profileManifestKeys() {
  return Object.keys(config.profiles ?? {}).map((name) => `${manifestPrefix}/${name}.json.gz`);
}

async function collectManagedKeys() {
  const managed = new Set(profileManifestKeys());
  for (const rootName of profile.roots) {
    const absoluteRoot = path.join(repositoryRoot, rootName);
    const stat = await fs.stat(absoluteRoot).catch((error) => {
      if (error?.code === "ENOENT") throw new Error(`Configured source root does not exist: ${rootName}`);
      throw error;
    });
    if (!stat.isDirectory()) throw new Error(`Configured source root is not a directory: ${rootName}`);
    for (const absolutePath of await walk(absoluteRoot)) {
      const key = path.relative(repositoryRoot, absolutePath).split(path.sep).join("/").normalize("NFC");
      managed.add(key);
    }
  }
  return managed;
}

function findUnmanagedKeys(remoteKeys, managedKeys) {
  return remoteKeys.filter((key) => !managedKeys.has(key)).sort((a, b) => a.localeCompare(b, "en"));
}

function summarizeTopLevels(keys) {
  const counts = new Map();
  for (const key of keys) {
    const topLevel = key.split("/", 1)[0] || "<root>";
    counts.set(topLevel, (counts.get(topLevel) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en")));
}

async function createS3() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required");
  }
  if (/\r|\n/u.test(accessKeyId) || /\r|\n/u.test(secretAccessKey)) {
    throw new Error("R2 credentials must be single-line values");
  }
  const sdk = await import("@aws-sdk/client-s3");
  const client = new sdk.S3Client({
    region: "auto",
    endpoint: process.env.R2_S3_ENDPOINT ?? `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: positiveInteger(process.env.R2_MAX_ATTEMPTS, 5, 10)
  });
  return { client, sdk };
}

async function listRemoteKeys(client, sdk) {
  const keys = [];
  let continuationToken;
  do {
    const response = await client.send(new sdk.ListObjectsV2Command({
      Bucket: config.bucket,
      ContinuationToken: continuationToken
    }));
    for (const object of response.Contents ?? []) {
      if (typeof object.Key === "string" && object.Key.length > 0) keys.push(object.Key.normalize("NFC"));
    }
    if (response.IsTruncated && !response.NextContinuationToken) {
      throw new Error("R2 listing was truncated without a continuation token");
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function deleteKeys(client, sdk, keys) {
  let deleted = 0;
  for (let offset = 0; offset < keys.length; offset += 1000) {
    const batch = keys.slice(offset, offset + 1000);
    const response = await client.send(new sdk.DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: { Quiet: true, Objects: batch.map((Key) => ({ Key })) }
    }));
    if (response.Errors?.length) throw new Error(`R2 pruning failed: ${JSON.stringify(response.Errors)}`);
    deleted += batch.length;
    console.log(JSON.stringify({ event: "r2-prune-progress", deleted, total: keys.length }));
  }
  return deleted;
}

async function prune() {
  validateConfiguration();
  const productionBranch = ci.productionBranch ?? "main";
  if (branch && branch !== productionBranch && process.env.R2_ALLOW_NON_PRODUCTION !== "1") {
    const report = { status: "skipped", reason: `branch ${branch} is not ${productionBranch}`, branch, productionBranch };
    console.log(JSON.stringify(report, null, 2));
    return report;
  }
  const managedKeys = await collectManagedKeys();
  const minimumManagedFiles = positiveInteger(process.env.R2_PRUNE_MIN_MANAGED_FILES, 1000, 10_000_000);
  const managedResourceFiles = managedKeys.size - profileManifestKeys().length;
  if (managedResourceFiles < minimumManagedFiles) {
    throw new Error(`Refusing to prune with only ${managedResourceFiles} managed resource files; minimum is ${minimumManagedFiles}`);
  }
  const { client, sdk } = await createS3();
  const remoteKeys = await listRemoteKeys(client, sdk);
  const unmanagedKeys = findUnmanagedKeys(remoteKeys, managedKeys);
  const dryRun = process.env.R2_PRUNE_DRY_RUN === "1";
  const deleted = dryRun ? 0 : await deleteKeys(client, sdk, unmanagedKeys);
  const report = {
    status: "ok",
    command: "prune",
    bucket: config.bucket,
    profile: profileName,
    branch,
    dryRun,
    managedResourceFiles,
    protectedManifestKeys: profileManifestKeys(),
    remoteObjects: remoteKeys.length,
    unmanagedDetected: unmanagedKeys.length,
    deleted,
    unmanagedTopLevels: summarizeTopLevels(unmanagedKeys),
    sample: unmanagedKeys.slice(0, 25)
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function selfTest() {
  const managed = new Set([
    "image/a.png",
    "screens/Login/bg.png",
    "_deployment/manifests/images.json.gz",
    "_deployment/manifests/full-resource.json.gz"
  ]);
  const unmanaged = findUnmanagedKeys([
    "screens/Login/bg.png",
    "_review/internal.patch",
    "package.json",
    "image/a.png",
    "_deployment/manifests/images.json.gz"
  ], managed);
  if (JSON.stringify(unmanaged) !== JSON.stringify(["_review/internal.patch", "package.json"])) {
    throw new Error(`R2 prune classification self-test failed: ${JSON.stringify(unmanaged)}`);
  }
  const summary = summarizeTopLevels(unmanaged);
  if (summary._review !== 1 || summary["package.json"] !== 1) {
    throw new Error(`R2 prune summary self-test failed: ${JSON.stringify(summary)}`);
  }
  console.log(JSON.stringify({ status: "ok", command: "self-test", assertions: 2 }, null, 2));
}

switch (command) {
  case "prune": await prune(); break;
  case "self-test": selfTest(); break;
  default: throw new Error(`Unknown R2 prune command: ${command}`);
}
