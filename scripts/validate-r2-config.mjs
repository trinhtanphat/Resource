#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const readJson = async (file) => JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const config = await readJson("r2-deployment.json");
const packageJson = await readJson("package.json");
const buildMatrix = await readJson("cloudflare-r2-builds.json");
const wrangler = await readJson("wrangler.r2-deployer.jsonc");
const failures = [];

function expect(actual, expected, label) {
  if (actual !== expected) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function expectArray(actual, expected, label) {
  expect(JSON.stringify(actual), JSON.stringify(expected), label);
}

expect(config.schemaVersion, 2, "schemaVersion");
expect(config.accountName, "trinhtanphat3333", "accountName");
expect(config.accountId, "291f5d12e63427644f59ac4a1d8f9664", "accountId");
expect(config.bucket, "ddtank-resource", "bucket");
expect(config.defaultProfile, "images", "defaultProfile");
expect(config.publicBaseUrl, null, "publicBaseUrl");
expectArray(config.profiles?.images?.roots, ["image"], "images roots");
expect(config.profiles?.images?.probeContentTypePrefix, "image/", "images probe type");
expectArray(
  config.profiles?.["full-resource"]?.roots,
  ["flash", "image", "partical", "sound", "video", "weekly", "xml"],
  "full-resource roots"
);
expect(config.ci?.worker, "ddtank-r2-deployer", "CI worker");
expect(config.ci?.productionBranch, "main", "CI production branch");
expect(config.ci?.manifestPrefix, "_deployment/manifests", "CI manifest prefix");
expect(config.ci?.checkpointEveryFiles, 5000, "CI checkpoint interval");
expect(config.rclone?.remoteName, "cloudflare-r2", "rclone remoteName");

const expectedScripts = {
  "r2:plan": "node scripts/r2-deploy.mjs plan",
  "r2:bucket:create": "node scripts/r2-deploy.mjs bucket-create",
  "r2:bucket:list": "node scripts/r2-deploy.mjs bucket-list",
  "r2:upload": "node scripts/r2-deploy.mjs upload",
  "r2:sync": "node scripts/r2-deploy.mjs sync",
  "r2:verify": "node scripts/r2-deploy.mjs verify",
  "r2:probe": "node scripts/r2-deploy.mjs probe",
  "r2:deploy": "node scripts/r2-deploy.mjs deploy",
  "r2:validate": "node scripts/validate-r2-config.mjs",
  "r2:plan:ci": "node scripts/r2-ci-deploy.mjs plan",
  "r2:deploy:ci": "node scripts/r2-ci-deploy.mjs deploy",
  "r2:verify:ci": "node scripts/r2-ci-deploy.mjs verify-manifest",
  "r2:probe:ci": "node scripts/r2-ci-deploy.mjs probe",
  "r2:self-test": "node scripts/r2-ci-deploy.mjs self-test",
  "deploy:r2-worker": "npx wrangler deploy --config wrangler.r2-deployer.jsonc",
  "cloudflare:deploy:r2": "npm run r2:deploy:ci && npm run deploy:r2-worker"
};
for (const [name, value] of Object.entries(expectedScripts)) expect(packageJson.scripts?.[name], value, `package script ${name}`);
expect(packageJson.dependencies?.["@aws-sdk/client-s3"], "3.1095.0", "AWS S3 SDK version");
expect(packageJson.dependencies?.["@aws-sdk/lib-storage"], "3.1095.0", "AWS multipart SDK version");

expect(buildMatrix.repository, "trinhtanphat/Resource", "build repository");
expect(buildMatrix.worker, "ddtank-r2-deployer", "build worker");
expect(buildMatrix.productionBranch, "main", "build production branch");
expect(buildMatrix.previewBuilds, false, "preview builds");
expect(buildMatrix.buildCommand, "npm install --ignore-scripts --no-audit --no-fund", "build command");
expect(buildMatrix.deployCommand, "npm run cloudflare:deploy:r2", "deploy command");
expectArray(buildMatrix.secretVariables, ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"], "build secrets");

expect(wrangler.name, "ddtank-r2-deployer", "Wrangler worker name");
expect(wrangler.main, "src/r2-deployer-worker.mjs", "Wrangler entrypoint");
expect(wrangler.r2_buckets?.[0]?.binding, "RESOURCE_BUCKET", "R2 binding name");
expect(wrangler.r2_buckets?.[0]?.bucket_name, "ddtank-resource", "R2 binding bucket");
expect(wrangler.vars?.R2_MANIFEST_PREFIX, "_deployment/manifests", "Worker manifest prefix");

if (failures.length > 0) throw new Error(`R2 deployment validation failed:\n- ${failures.join("\n- ")}`);

console.log(JSON.stringify({
  status: "ok",
  accountName: config.accountName,
  accountId: config.accountId,
  bucket: config.bucket,
  worker: config.ci.worker,
  productionBranch: config.ci.productionBranch,
  profiles: Object.keys(config.profiles),
  dashboardBuildCommand: buildMatrix.buildCommand,
  dashboardDeployCommand: buildMatrix.deployCommand
}, null, 2));
