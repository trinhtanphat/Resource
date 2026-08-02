#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const shardCount = 14;
const failures = [];
const matrixPath = path.join(root, "cloudflare-builds.json");
const matrix = JSON.parse(await fs.readFile(matrixPath, "utf8"));
const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));

function expect(actual, expected, label) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

expect(matrix.schemaVersion, 1, "cloudflare-builds.json schemaVersion");
expect(matrix.repository, "trinhtanphat/Resource", "cloudflare-builds.json repository");
expect(matrix.productionBranch, "main", "cloudflare-builds.json productionBranch");
expect(matrix.rootDirectory, "/", "cloudflare-builds.json rootDirectory");
expect(matrix.previewBuilds, false, "cloudflare-builds.json previewBuilds");
expect(matrix.workersDevSubdomain, "ddtank", "cloudflare-builds.json workersDevSubdomain");
expect(matrix.coordinator?.worker, "ddtank-assets-deployer", "coordinator worker");
expect(matrix.coordinator?.role, "validation-and-report-only", "coordinator role");
expect(matrix.coordinator?.buildCommand, "npm run validate:assets", "coordinator buildCommand");
expect(matrix.coordinator?.deployCommand, "npm run coordinator:report", "coordinator deployCommand");
expect(
  packageJson.scripts?.["build:shard"],
  "node scripts/build-shards.mjs --source . --output ./dist --shard",
  "package.json build:shard"
);
expect(
  packageJson.scripts?.["probe:shard"],
  "node scripts/probe-shard.mjs",
  "package.json probe:shard"
);

if (!Array.isArray(matrix.shards) || matrix.shards.length !== shardCount) {
  failures.push(`cloudflare-builds.json must define exactly ${shardCount} shards`);
}

const workerNames = new Set();
const configPaths = new Set();

for (let index = 0; index < shardCount; index += 1) {
  const shard = String(index).padStart(2, "0");
  const worker = matrix.shards?.[index];
  const configRelative = `wrangler/wrangler.shard-${shard}.jsonc`;
  const configPath = path.join(root, configRelative);
  let config;

  try {
    config = JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch (error) {
    failures.push(`${configRelative}: ${error.message}`);
    continue;
  }

  const expectedName = `ddtank-assets-shard-${shard}`;
  const expectedDirectory = `../dist/shard-${shard}`;
  const expectedDeploy = [
    `npx wrangler deploy --config ${configRelative}`,
    `npm run probe:shard -- ${shard}`
  ].join(" && ");

  expect(worker?.worker, expectedName, `shard ${shard} worker`);
  expect(worker?.buildCommand, `npm run build:shard -- ${shard}`, `shard ${shard} buildCommand`);
  expect(worker?.deployCommand, expectedDeploy, `shard ${shard} deployCommand`);
  expect(worker?.config, configRelative, `shard ${shard} config`);
  expect(config.name, expectedName, `${configRelative} name`);
  expect(config.assets?.directory, expectedDirectory, `${configRelative} assets.directory`);
  expect(config.assets?.run_worker_first, false, `${configRelative} assets.run_worker_first`);

  if (workerNames.has(worker?.worker)) failures.push(`duplicate worker name: ${worker?.worker}`);
  if (configPaths.has(worker?.config)) failures.push(`duplicate config path: ${worker?.config}`);
  workerNames.add(worker?.worker);
  configPaths.add(worker?.config);
}

if (failures.length > 0) {
  throw new Error(`Shard configuration validation failed:\n- ${failures.join("\n- ")}`);
}

console.log(JSON.stringify({
  status: "ok",
  coordinator: matrix.coordinator.worker,
  shardWorkers: matrix.shards.length,
  repository: matrix.repository,
  productionBranch: matrix.productionBranch,
  workersDevSubdomain: matrix.workersDevSubdomain,
  postDeployProbe: true
}, null, 2));
