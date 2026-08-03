#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const command = process.argv[2];
const allowed = new Set(["plan", "deploy", "verify-manifest", "probe"]);
if (!allowed.has(command)) throw new Error(`Unsupported R2 runtime command: ${command}`);

const env = {
  ...process.env,
  R2_PROFILE: process.env.R2_PROFILE ?? "full-resource"
};
const markerPath = path.join(repositoryRoot, ".r2-runtime-materialized.json");

async function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repositoryRoot, script), ...args], {
      cwd: repositoryRoot,
      env,
      stdio: "inherit",
      shell: false
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} failed with ${signal ? `signal ${signal}` : `exit ${code}`}`));
    });
  });
}

async function cleanupMaterializedPaths() {
  const marker = await fs.readFile(markerPath, "utf8")
    .then((value) => JSON.parse(value), (error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
  if (!marker) return;
  for (const topLevel of marker.managedTopLevels ?? []) {
    if (typeof topLevel !== "string" || !/^[A-Za-z0-9._-]+$/u.test(topLevel)) {
      throw new Error(`Unsafe materialized top-level path in marker: ${topLevel}`);
    }
    await fs.rm(path.join(repositoryRoot, topLevel), { recursive: true, force: true });
  }
  await fs.rm(markerPath, { force: true });
}

try {
  await runNode("scripts/materialize-r2-runtime-exports.mjs");
  if (command === "deploy") await runNode("scripts/r2-prune-unmanaged.mjs", ["self-test"]);
  await runNode("scripts/r2-ci-deploy.mjs", [command]);
  if (command === "deploy") await runNode("scripts/r2-prune-unmanaged.mjs", ["prune"]);
} finally {
  await cleanupMaterializedPaths();
}
