#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = process.env.R2_REPO_ROOT
  ? path.resolve(process.env.R2_REPO_ROOT)
  : fileURLToPath(new URL("..", import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(repositoryRoot, "r2-deployment.json"), "utf8"));
const profileName = process.env.R2_PROFILE ?? config.defaultProfile;
const profile = config.profiles?.[profileName];
const runtimeSourceNames = profile?.runtimeSources ?? [];
const sourceByName = new Map((config.runtimeSources ?? []).map((source) => [source.name, source]));
const checkoutRoot = path.join(repositoryRoot, ".r2-runtime-checkouts");
const markerPath = path.join(repositoryRoot, ".r2-runtime-materialized.json");
const SAFE_REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const IMMUTABLE_SHA = /^[0-9a-f]{40}$/u;
const SAFE_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/u;

if (!profile) throw new Error(`Unknown R2 profile: ${profileName}`);
if (!Array.isArray(runtimeSourceNames)) throw new Error(`Profile runtimeSources must be an array: ${profileName}`);

function normalizedRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.startsWith("/")) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => !SAFE_PATH_SEGMENT.test(segment) || segment === "." || segment === "..")) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return segments.join("/");
}

function insideRepository(relativePath, label) {
  const resolved = path.resolve(repositoryRoot, relativePath);
  const relative = path.relative(repositoryRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a non-root path inside the repository: ${relativePath}`);
  }
  return resolved;
}

async function exists(target) {
  return fs.stat(target).then(() => true, () => false);
}

async function run(command, args, cwd = repositoryRoot, capture = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_NOSYSTEM: "1"
      },
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      shell: false
    });
    let stdout = "";
    if (capture) child.stdout?.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} ${args.join(" ")} failed with ${signal ? `signal ${signal}` : `exit ${code}`}`));
    });
  });
}

async function countFiles(directory) {
  let total = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await countFiles(absolute);
    else if (entry.isFile()) total += 1;
    else throw new Error(`Unsupported staged entry: ${absolute}`);
  }
  return total;
}

const selectedSources = runtimeSourceNames.map((name) => {
  const source = sourceByName.get(name);
  if (!source) throw new Error(`Unknown runtime source ${name} in profile ${profileName}`);
  if (!SAFE_REPOSITORY.test(source.repository)) throw new Error(`Invalid runtime source repository: ${source.repository}`);
  if (!IMMUTABLE_SHA.test(source.ref)) throw new Error(`Runtime source must use an immutable 40-character SHA: ${source.name}`);
  if (!Array.isArray(source.mappings) || source.mappings.length === 0) {
    throw new Error(`Runtime source has no mappings: ${source.name}`);
  }
  return {
    ...source,
    mappings: source.mappings.map((mapping) => ({
      group: normalizedRelativePath(mapping.group, `${source.name} group`),
      sourcePath: normalizedRelativePath(mapping.sourcePath, `${source.name} sourcePath`),
      destinationPath: normalizedRelativePath(mapping.destinationPath, `${source.name} destinationPath`)
    }))
  };
});

const destinationPaths = selectedSources.flatMap((source) => source.mappings.map((mapping) => mapping.destinationPath));
if (new Set(destinationPaths).size !== destinationPaths.length) {
  throw new Error("Runtime source destination paths must be unique");
}
const managedTopLevels = [...new Set(destinationPaths.map((value) => value.split("/", 1)[0]))].sort();

let previousMarker = null;
if (await exists(markerPath)) {
  previousMarker = JSON.parse(await fs.readFile(markerPath, "utf8"));
}
for (const topLevel of managedTopLevels) {
  const absolute = insideRepository(topLevel, "managed runtime destination");
  if (!await exists(absolute)) continue;
  if (!previousMarker?.managedTopLevels?.includes(topLevel)) {
    throw new Error(`Refusing to replace an unmanaged repository path: ${topLevel}`);
  }
  await fs.rm(absolute, { recursive: true, force: true });
}
await fs.rm(checkoutRoot, { recursive: true, force: true });
await fs.mkdir(checkoutRoot, { recursive: true });
await fs.writeFile(markerPath, `${JSON.stringify({
  schemaVersion: 1,
  profile: profileName,
  state: "materializing",
  materializedAt: new Date().toISOString(),
  managedTopLevels,
  sources: []
}, null, 2)}\n`, "utf8");

const reportSources = [];
try {
  for (const source of selectedSources) {
    const checkout = path.join(checkoutRoot, source.name);
    await fs.mkdir(checkout, { recursive: true });
    await run("git", ["init", "--quiet"], checkout);
    await run("git", ["remote", "add", "origin", `https://github.com/${source.repository}.git`], checkout);
    await run("git", ["fetch", "--quiet", "--depth=1", "--filter=blob:none", "origin", source.ref], checkout);
    await run("git", ["sparse-checkout", "init", "--cone"], checkout);
    await run("git", ["sparse-checkout", "set", ...source.mappings.map((mapping) => mapping.sourcePath)], checkout);
    await run("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], checkout);
    const resolvedRef = await run("git", ["rev-parse", "HEAD"], checkout, true);
    if (resolvedRef !== source.ref) {
      throw new Error(`Runtime source resolved to unexpected commit: ${source.name} ${resolvedRef}`);
    }

    const mappings = [];
    for (const mapping of source.mappings) {
      const sourceDirectory = path.resolve(checkout, mapping.sourcePath);
      const checkoutRelative = path.relative(checkout, sourceDirectory);
      if (!checkoutRelative || checkoutRelative.startsWith("..") || path.isAbsolute(checkoutRelative)) {
        throw new Error(`Runtime source path escaped checkout: ${source.name}/${mapping.sourcePath}`);
      }
      const stat = await fs.stat(sourceDirectory).catch((error) => {
        if (error?.code === "ENOENT") throw new Error(`Runtime source path does not exist: ${source.name}/${mapping.sourcePath}`);
        throw error;
      });
      if (!stat.isDirectory()) throw new Error(`Runtime source path is not a directory: ${source.name}/${mapping.sourcePath}`);

      const destination = insideRepository(mapping.destinationPath, "runtime destination");
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.cp(sourceDirectory, destination, {
        recursive: true,
        force: false,
        errorOnExist: true,
        dereference: false
      });
      mappings.push({
        group: mapping.group,
        sourcePath: mapping.sourcePath,
        destinationPath: mapping.destinationPath,
        files: await countFiles(destination)
      });
    }
    reportSources.push({
      name: source.name,
      repository: source.repository,
      ref: source.ref,
      mappings
    });
  }
} catch (error) {
  for (const topLevel of managedTopLevels) {
    await fs.rm(insideRepository(topLevel, "managed runtime destination"), { recursive: true, force: true });
  }
  await fs.rm(markerPath, { force: true });
  throw error;
} finally {
  await fs.rm(checkoutRoot, { recursive: true, force: true });
}

const marker = {
  schemaVersion: 1,
  profile: profileName,
  materializedAt: new Date().toISOString(),
  managedTopLevels,
  sources: reportSources
};
await fs.writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  status: "ok",
  command: "materialize-runtime-exports",
  profile: profileName,
  managedTopLevels,
  sources: reportSources
}, null, 2));
