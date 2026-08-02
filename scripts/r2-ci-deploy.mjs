#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const repositoryRoot = process.env.R2_REPO_ROOT
  ? path.resolve(process.env.R2_REPO_ROOT)
  : fileURLToPath(new URL("..", import.meta.url));
const command = process.argv[2] ?? "plan";
const config = JSON.parse(await fs.readFile(path.join(repositoryRoot, "r2-deployment.json"), "utf8"));
const profileName = process.env.R2_PROFILE ?? config.defaultProfile;
const profile = config.profiles?.[profileName];
const ci = config.ci ?? {};
const manifestKey = `${String(ci.manifestPrefix ?? "_deployment/manifests").replace(/^\/+|\/+$/gu, "")}/${profileName}.json.gz`;
const commitSha = process.env.WORKERS_CI_COMMIT_SHA ?? process.env.COMMIT_SHA ?? "local";
const branch = process.env.WORKERS_CI_BRANCH ?? process.env.GIT_BRANCH ?? null;

validateConfiguration();

function validateConfiguration() {
  if (config.schemaVersion !== 2) throw new Error("r2-deployment.json schemaVersion must be 2");
  if (!/^[a-f0-9]{32}$/u.test(config.accountId)) throw new Error("Invalid Cloudflare accountId");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(config.bucket)) throw new Error("Invalid R2 bucket name");
  if (!profile || !Array.isArray(profile.roots) || profile.roots.length === 0) {
    throw new Error(`Unknown or empty R2 profile: ${profileName}`);
  }
  for (const rootName of profile.roots) {
    if (!/^[A-Za-z0-9._-]+$/u.test(rootName)) throw new Error(`Unsafe source root: ${rootName}`);
  }
  if (!Number.isInteger(ci.uploadConcurrency) || ci.uploadConcurrency < 1 || ci.uploadConcurrency > 128) {
    throw new Error("ci.uploadConcurrency must be an integer from 1 to 128");
  }
}

function positiveInteger(value, fallback, maximum = 256) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, worker));
  return results;
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

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".htm": "text/html; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".ogg": "audio/ogg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".swf": "application/x-shockwave-flash",
    ".txt": "text/plain; charset=utf-8",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".xml": "application/xml; charset=utf-8",
    ".zip": "application/zip"
  })[extension] ?? "application/octet-stream";
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function scanLocalFiles() {
  const absoluteFiles = [];
  for (const rootName of profile.roots) {
    const absoluteRoot = path.join(repositoryRoot, rootName);
    const stat = await fs.stat(absoluteRoot).catch((error) => {
      if (error?.code === "ENOENT") throw new Error(`Configured source root does not exist: ${rootName}`);
      throw error;
    });
    if (!stat.isDirectory()) throw new Error(`Configured source root is not a directory: ${rootName}`);
    absoluteFiles.push(...await walk(absoluteRoot));
  }
  absoluteFiles.sort((a, b) => a.localeCompare(b, "en"));
  const hashConcurrency = positiveInteger(process.env.R2_HASH_CONCURRENCY, ci.hashConcurrency ?? 8, 32);
  return mapLimit(absoluteFiles, hashConcurrency, async (absolutePath) => {
    const stat = await fs.stat(absolutePath);
    const key = path.relative(repositoryRoot, absolutePath).split(path.sep).join("/").normalize("NFC");
    return {
      key,
      absolutePath,
      size: stat.size,
      sha256: await sha256File(absolutePath),
      contentType: contentTypeFor(absolutePath)
    };
  });
}

function compactFiles(entries) {
  return Object.fromEntries(entries.map((entry) => [entry.key, [entry.size, entry.sha256, entry.contentType]]));
}

function expandFiles(files = {}) {
  return new Map(Object.entries(files).map(([key, value]) => [key, {
    size: value[0],
    sha256: value[1],
    contentType: value[2]
  }]));
}

function diffEntries(localEntries, previousManifest) {
  const previous = expandFiles(previousManifest?.files);
  const changed = [];
  for (const entry of localEntries) {
    const old = previous.get(entry.key);
    if (!old || old.size !== entry.size || old.sha256 !== entry.sha256 || old.contentType !== entry.contentType) {
      changed.push(entry);
    }
    previous.delete(entry.key);
  }
  return { changed, removed: [...previous.keys()].sort((a, b) => a.localeCompare(b, "en")) };
}

function deterministicSample(entries, limit) {
  if (entries.length <= limit) return [...entries];
  const sampled = [];
  const seen = new Set();
  for (let index = 0; index < limit; index += 1) {
    const position = Math.floor(index * (entries.length - 1) / Math.max(limit - 1, 1));
    if (!seen.has(position)) {
      sampled.push(entries[position]);
      seen.add(position);
    }
  }
  return sampled;
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function createS3() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are required");
  }
  if (/\r|\n/u.test(accessKeyId) || /\r|\n/u.test(secretAccessKey)) throw new Error("R2 credentials must be single-line values");
  const sdk = await import("@aws-sdk/client-s3");
  const client = new sdk.S3Client({
    region: "auto",
    endpoint: process.env.R2_S3_ENDPOINT ?? `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: positiveInteger(process.env.R2_MAX_ATTEMPTS, 5, 10)
  });
  return { client, sdk };
}

async function readRemoteManifest(client, sdk) {
  try {
    const response = await client.send(new sdk.GetObjectCommand({ Bucket: config.bucket, Key: manifestKey }));
    const decoded = JSON.parse((await gunzipAsync(await bodyToBuffer(response.Body))).toString("utf8"));
    if (decoded.schemaVersion !== 1 || decoded.profile !== profileName) throw new Error("Remote R2 manifest is incompatible");
    return decoded;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (error?.name === "NoSuchKey" || status === 404) return null;
    throw error;
  }
}

async function uploadEntry(client, sdk, entry) {
  const metadata = { sha256: entry.sha256, sourcecommit: String(commitSha).slice(0, 64) };
  const params = {
    Bucket: config.bucket,
    Key: entry.key,
    Body: createReadStream(entry.absolutePath),
    ContentLength: entry.size,
    ContentType: entry.contentType,
    CacheControl: process.env.R2_CACHE_CONTROL ?? ci.cacheControl ?? "public, max-age=86400",
    Metadata: metadata
  };
  const multipartThreshold = positiveInteger(process.env.R2_MULTIPART_THRESHOLD_BYTES, ci.multipartThresholdBytes ?? 67_108_864, 5_000_000_000);
  if (entry.size < multipartThreshold) {
    await client.send(new sdk.PutObjectCommand(params));
    return;
  }
  const { Upload } = await import("@aws-sdk/lib-storage");
  const uploader = new Upload({
    client,
    params,
    queueSize: 4,
    partSize: positiveInteger(process.env.R2_MULTIPART_PART_BYTES, ci.multipartPartBytes ?? 8_388_608, 5_000_000_000),
    leavePartsOnError: false
  });
  await uploader.done();
}

async function writeManifest(client, sdk, entries, deployment, complete = true) {
  const manifest = {
    schemaVersion: 1,
    accountId: config.accountId,
    bucket: config.bucket,
    profile: profileName,
    commitSha,
    branch,
    generatedAt: new Date().toISOString(),
    complete,
    deployment,
    files: compactFiles(entries)
  };
  const compressed = await gzipAsync(Buffer.from(`${JSON.stringify(manifest)}\n`), { level: 9 });
  await client.send(new sdk.PutObjectCommand({
    Bucket: config.bucket,
    Key: manifestKey,
    Body: compressed,
    ContentLength: compressed.length,
    ContentType: "application/json",
    ContentEncoding: "gzip",
    CacheControl: "no-store",
    Metadata: {
      sourcecommit: String(commitSha).slice(0, 64),
      profile: profileName,
      complete: complete ? "1" : "0",
      filecount: String(entries.length)
    }
  }));
  return manifest;
}

async function uploadChanged(client, sdk, changed, confirmedEntries, previousManifest) {
  const concurrency = positiveInteger(process.env.R2_UPLOAD_CONCURRENCY, ci.uploadConcurrency ?? 48, 128);
  const checkpointEvery = positiveInteger(process.env.R2_CHECKPOINT_EVERY_FILES, ci.checkpointEveryFiles ?? 5_000, 50_000);
  let completed = 0;
  for (let offset = 0; offset < changed.length; offset += checkpointEvery) {
    const batch = changed.slice(offset, offset + checkpointEvery);
    await mapLimit(batch, concurrency, async (entry) => {
      await uploadEntry(client, sdk, entry);
      confirmedEntries.set(entry.key, entry);
      completed += 1;
      if (completed === changed.length || completed % 500 === 0) {
        console.log(JSON.stringify({ event: "r2-upload-progress", completed, total: changed.length }));
      }
    });
    await writeManifest(client, sdk, [...confirmedEntries.values()], {
      previousCommitSha: previousManifest?.commitSha ?? null,
      uploadedThisRun: completed,
      pendingThisRun: changed.length - completed,
      checkpoint: true
    }, false);
    console.log(JSON.stringify({
      event: "r2-checkpoint",
      completed,
      total: changed.length,
      confirmedFiles: confirmedEntries.size,
      manifestKey
    }));
  }
}

async function deleteRemoved(client, sdk, removed) {
  if (removed.length === 0 || process.env.R2_ALLOW_DELETE !== "1") return 0;
  let deleted = 0;
  for (let offset = 0; offset < removed.length; offset += 1000) {
    const keys = removed.slice(offset, offset + 1000);
    const response = await client.send(new sdk.DeleteObjectsCommand({
      Bucket: config.bucket,
      Delete: { Quiet: true, Objects: keys.map((Key) => ({ Key })) }
    }));
    if (response.Errors?.length) throw new Error(`R2 deletion failed: ${JSON.stringify(response.Errors)}`);
    deleted += keys.length;
  }
  return deleted;
}

async function verifyEntries(client, sdk, changed) {
  const sampleLimit = positiveInteger(process.env.R2_VERIFY_SAMPLE_SIZE, ci.verifySampleSize ?? 256, 10_000);
  const selected = deterministicSample(changed, sampleLimit);
  const concurrency = positiveInteger(process.env.R2_VERIFY_CONCURRENCY, ci.verifyConcurrency ?? 32, 128);
  await mapLimit(selected, concurrency, async (entry) => {
    const response = await client.send(new sdk.HeadObjectCommand({ Bucket: config.bucket, Key: entry.key }));
    if (Number(response.ContentLength) !== entry.size) throw new Error(`R2 size mismatch after upload: ${entry.key}`);
    if (response.Metadata?.sha256 !== entry.sha256) throw new Error(`R2 SHA-256 metadata mismatch after upload: ${entry.key}`);
  });
  return { verified: selected.length, verification: selected.length === changed.length ? "all-changed" : "sampled-changed" };
}

async function probePublic(entries) {
  const baseUrl = (process.env.R2_PUBLIC_BASE_URL ?? config.publicBaseUrl ?? "").replace(/\/+$/u, "");
  if (!baseUrl || entries.length === 0) return { status: "skipped", reason: "R2_PUBLIC_BASE_URL is not configured" };
  const representative = entries[0];
  const encodedPath = representative.key.split("/").map(encodeURIComponent).join("/");
  const url = `${baseUrl}/${encodedPath}?v=${encodeURIComponent(commitSha)}`;
  const response = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(20_000) });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== 200) throw new Error(`R2 public probe failed with HTTP ${response.status}: ${url}`);
  const expectedPrefix = profile.probeContentTypePrefix ?? "";
  if (expectedPrefix && !contentType.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
    throw new Error(`R2 public probe returned unexpected content-type ${contentType}: ${url}`);
  }
  return { status: "ok", url, contentType };
}

async function plan() {
  const entries = await scanLocalFiles();
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const report = {
    status: "ok",
    command: "plan",
    accountName: config.accountName,
    accountId: config.accountId,
    bucket: config.bucket,
    profile: profileName,
    manifestKey,
    totalFiles: entries.length,
    totalBytes,
    representativePath: entries[0]?.key ?? null
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function deploy() {
  const productionBranch = ci.productionBranch ?? "main";
  if (branch && branch !== productionBranch && process.env.R2_ALLOW_NON_PRODUCTION !== "1") {
    const skipped = { status: "skipped", reason: `branch ${branch} is not ${productionBranch}`, branch, productionBranch };
    console.log(JSON.stringify(skipped, null, 2));
    return skipped;
  }
  const entries = await scanLocalFiles();
  const { client, sdk } = await createS3();
  const previous = await readRemoteManifest(client, sdk);
  const { changed, removed } = diffEntries(entries, previous);
  const changedKeys = new Set(changed.map((entry) => entry.key));
  const confirmedEntries = new Map(entries.filter((entry) => !changedKeys.has(entry.key)).map((entry) => [entry.key, entry]));
  await uploadChanged(client, sdk, changed, confirmedEntries, previous);
  const verification = await verifyEntries(client, sdk, changed);
  const deleted = await deleteRemoved(client, sdk, removed);
  const deployment = {
    previousCommitSha: previous?.commitSha ?? null,
    resumedFromCheckpoint: previous?.complete === false,
    uploaded: changed.length,
    unchanged: entries.length - changed.length,
    remoteOnlyDetected: removed.length,
    deleted,
    ...verification
  };
  await writeManifest(client, sdk, entries, deployment, true);
  const probe = await probePublic(entries);
  const report = {
    status: "ok",
    command: "deploy",
    accountName: config.accountName,
    accountId: config.accountId,
    bucket: config.bucket,
    profile: profileName,
    commitSha,
    branch,
    manifestKey,
    totalFiles: entries.length,
    ...deployment,
    probe
  };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function verifyManifest() {
  const entries = await scanLocalFiles();
  const { client, sdk } = await createS3();
  const previous = await readRemoteManifest(client, sdk);
  if (!previous) throw new Error(`R2 manifest does not exist: ${manifestKey}`);
  if (previous.complete !== true) throw new Error(`R2 manifest is an incomplete checkpoint: ${manifestKey}`);
  const { changed, removed } = diffEntries(entries, previous);
  if (changed.length || removed.length) {
    throw new Error(`R2 manifest differs from local state: ${changed.length} changed, ${removed.length} remote-only`);
  }
  const report = { status: "ok", command: "verify-manifest", profile: profileName, totalFiles: entries.length, manifestKey };
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function selfTest() {
  const entries = [
    { key: "image/a.png", size: 1, sha256: "a", contentType: "image/png" },
    { key: "image/b.jpg", size: 2, sha256: "b", contentType: "image/jpeg" },
    { key: "image/c.webp", size: 3, sha256: "c", contentType: "image/webp" }
  ];
  const manifest = { files: compactFiles(entries.slice(0, 2)) };
  const diff = diffEntries(entries, manifest);
  if (diff.changed.length !== 1 || diff.changed[0].key !== "image/c.webp" || diff.removed.length !== 0) {
    throw new Error("diffEntries self-test failed");
  }
  const compressed = await gzipAsync(Buffer.from(JSON.stringify({ files: compactFiles(entries) })));
  const restored = JSON.parse((await gunzipAsync(compressed)).toString("utf8"));
  if (expandFiles(restored.files).size !== 3) throw new Error("manifest compression self-test failed");
  if (deterministicSample(entries, 2).length !== 2) throw new Error("deterministic sample self-test failed");
  if (contentTypeFor("x.png") !== "image/png" || contentTypeFor("x.unknown") !== "application/octet-stream") {
    throw new Error("content type self-test failed");
  }
  console.log(JSON.stringify({ status: "ok", command: "self-test" }, null, 2));
}

switch (command) {
  case "plan": await plan(); break;
  case "deploy": await deploy(); break;
  case "verify-manifest": await verifyManifest(); break;
  case "probe": {
    const entries = await scanLocalFiles();
    console.log(JSON.stringify(await probePublic(entries), null, 2));
    break;
  }
  case "self-test": await selfTest(); break;
  default: throw new Error(`Unknown R2 CI command: ${command}`);
}
