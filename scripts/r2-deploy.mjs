#!/usr/bin/env node
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const configPath = path.join(root, "r2-deployment.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const command = process.argv[2] ?? "plan";
const profileName = process.env.R2_PROFILE ?? config.defaultProfile;
const profile = config.profiles?.[profileName];
const reportDirectory = path.join(root, ".r2");
const reportPath = path.join(reportDirectory, "r2-report.json");

validateConfig();

function validateConfig() {
  if (config.schemaVersion !== 1) throw new Error("Unsupported r2-deployment.json schemaVersion");
  if (!/^[a-f0-9]{32}$/u.test(config.accountId)) throw new Error("Invalid Cloudflare accountId");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u.test(config.bucket)) {
    throw new Error("Invalid R2 bucket name");
  }
  if (!profile || !Array.isArray(profile.roots) || profile.roots.length === 0) {
    throw new Error(`Unknown or empty R2 profile: ${profileName}`);
  }
  const uniqueRoots = new Set(profile.roots);
  if (uniqueRoots.size !== profile.roots.length) throw new Error(`Duplicate roots in profile ${profileName}`);
  for (const entry of profile.roots) {
    if (!/^[A-Za-z0-9._-]+$/u.test(entry)) throw new Error(`Unsafe R2 root: ${entry}`);
  }
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".DS_Store" || entry.name === "Thumbs.db") continue;
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in R2 source roots: ${full}`);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function buildPlan() {
  const roots = [];
  let totalFiles = 0;
  let totalBytes = 0;
  let representativePath = null;

  for (const relativeRoot of profile.roots) {
    const absoluteRoot = path.join(root, relativeRoot);
    const stat = await fs.stat(absoluteRoot).catch((error) => {
      if (error?.code === "ENOENT") throw new Error(`Configured R2 source root does not exist: ${relativeRoot}`);
      throw error;
    });
    if (!stat.isDirectory()) throw new Error(`Configured R2 source root is not a directory: ${relativeRoot}`);

    const files = await walk(absoluteRoot);
    let bytes = 0;
    for (const file of files) {
      const fileStat = await fs.stat(file);
      bytes += fileStat.size;
      if (representativePath === null) {
        representativePath = path.relative(root, file).split(path.sep).join("/").normalize("NFC");
      }
    }
    roots.push({ root: relativeRoot, files: files.length, bytes });
    totalFiles += files.length;
    totalBytes += bytes;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    accountName: config.accountName,
    accountId: config.accountId,
    bucket: config.bucket,
    profile: profileName,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? config.publicBaseUrl ?? null,
    roots,
    totalFiles,
    totalBytes,
    representativePath
  };
  await fs.mkdir(reportDirectory, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

function executable(name) {
  if (process.platform === "win32" && name === "npx") return "npx.cmd";
  return name;
}

function run(program, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable(program), args, {
      cwd: root,
      env: { ...process.env, ...options.env },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${program} exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });
}

function singleLineSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  if (/\r|\n/u.test(value)) throw new Error(`${name} must be a single line`);
  return value;
}

async function withRclone(callback) {
  const binary = process.env.RCLONE_BINARY ?? "rclone";
  await run(binary, ["version"], { capture: true }).catch(() => {
    throw new Error("rclone is required. Install it before running R2 upload or verification.");
  });

  const accessKeyId = singleLineSecret("R2_ACCESS_KEY_ID");
  const secretAccessKey = singleLineSecret("R2_SECRET_ACCESS_KEY");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ddtank-r2-"));
  const temporaryConfig = path.join(directory, "rclone.conf");
  const remoteName = config.rclone?.remoteName ?? "cloudflare-r2";
  const content = [
    `[${remoteName}]`,
    "type = s3",
    "provider = Cloudflare",
    `access_key_id = ${accessKeyId}`,
    `secret_access_key = ${secretAccessKey}`,
    `endpoint = https://${config.accountId}.r2.cloudflarestorage.com`,
    "no_check_bucket = true",
    ""
  ].join("\n");

  await fs.writeFile(temporaryConfig, content, { mode: 0o600 });
  try {
    return await callback({ binary, remoteName, temporaryConfig });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function commonRcloneArgs(temporaryConfig) {
  return [
    "--config", temporaryConfig,
    "--fast-list",
    "--transfers", String(config.rclone?.transfers ?? 32),
    "--checkers", String(config.rclone?.checkers ?? 64),
    "--stats", "15s"
  ];
}

async function transfer(mode) {
  await buildPlan();
  if (mode === "sync" && process.env.R2_ALLOW_DELETE !== "1") {
    throw new Error("R2 sync can delete remote objects. Set R2_ALLOW_DELETE=1 to confirm.");
  }

  await withRclone(async ({ binary, remoteName, temporaryConfig }) => {
    for (const relativeRoot of profile.roots) {
      const source = path.join(root, relativeRoot);
      const destination = `${remoteName}:${config.bucket}/${relativeRoot}`;
      await run(binary, [
        mode,
        source,
        destination,
        ...commonRcloneArgs(temporaryConfig),
        "--checksum",
        "--create-empty-src-dirs"
      ]);
    }
  });
}

async function verify() {
  await buildPlan();
  await withRclone(async ({ binary, remoteName, temporaryConfig }) => {
    for (const relativeRoot of profile.roots) {
      const source = path.join(root, relativeRoot);
      const destination = `${remoteName}:${config.bucket}/${relativeRoot}`;
      await run(binary, [
        "check",
        source,
        destination,
        "--config", temporaryConfig,
        "--one-way",
        "--checksum",
        "--checkers", String(config.rclone?.checkers ?? 64),
        "--stats", "15s"
      ]);
    }
  });
  console.log(JSON.stringify({ status: "ok", bucket: config.bucket, profile: profileName }, null, 2));
}

async function probe() {
  const report = await buildPlan();
  const baseUrl = (process.env.R2_PUBLIC_BASE_URL ?? config.publicBaseUrl ?? "").replace(/\/+$/u, "");
  if (!baseUrl) {
    throw new Error("R2_PUBLIC_BASE_URL is required after enabling an R2 custom domain or r2.dev URL");
  }
  if (!report.representativePath) throw new Error("No R2 object is available to probe");
  const encodedPath = report.representativePath.split("/").map(encodeURIComponent).join("/");
  const url = `${baseUrl}/${encodedPath}?v=${process.env.WORKERS_CI_COMMIT_SHA ?? process.env.COMMIT_SHA ?? Date.now()}`;
  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
    signal: AbortSignal.timeout(20_000)
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status !== 200) throw new Error(`R2 probe failed: HTTP ${response.status} for ${url}`);
  const expectedPrefix = profile.probeContentTypePrefix ?? "";
  if (expectedPrefix && !contentType.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
    throw new Error(`R2 probe returned unexpected content-type ${contentType} for ${url}`);
  }
  console.log(JSON.stringify({ status: "ok", bucket: config.bucket, profile: profileName, url, contentType }, null, 2));
}

async function wranglerBucket(subcommand) {
  const args = ["wrangler", "r2", "bucket", subcommand];
  if (subcommand === "create") args.push(config.bucket);
  await run("npx", args, { env: { CLOUDFLARE_ACCOUNT_ID: config.accountId } });
}

switch (command) {
  case "plan": await buildPlan(); break;
  case "bucket-create": await wranglerBucket("create"); break;
  case "bucket-list": await wranglerBucket("list"); break;
  case "upload": await transfer("copy"); break;
  case "sync": await transfer("sync"); break;
  case "verify": await verify(); break;
  case "probe": await probe(); break;
  case "deploy": await transfer("copy"); await verify(); break;
  default: throw new Error(`Unknown R2 command: ${command}`);
}
