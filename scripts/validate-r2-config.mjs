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
const gatewaySource = await fs.readFile(path.join(root, "src/r2-deployer-worker.mjs"), "utf8");
const gatewayTestSource = await fs.readFile(path.join(root, "scripts/r2-gateway-self-test.mjs"), "utf8");
const failures = [];

function expect(actual, expected, label) {
  if (actual !== expected) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function expectArray(actual, expected, label) {
  expect(JSON.stringify(actual), JSON.stringify(expected), label);
}

const localResourceRoots = [
  "exports",
  "resource-port-assets",
  "flash",
  "image",
  "partical",
  "sound",
  "video",
  "weekly",
  "xml"
];
const runtimeRoots = ["screens", "pets", "effects", "public"];
const fullResourceRoots = [...localResourceRoots, ...runtimeRoots];
const expectedRuntimeSources = [
  {
    name: "resource-web-assets",
    repository: "trinhtanphat/Resource",
    ref: "7dc16b70b4b868d6be709cca7d400def67f6d4b6",
    mappings: [
      { group: "screens", sourcePath: "screens", destinationPath: "screens" },
      { group: "pets", sourcePath: "pets", destinationPath: "pets" },
      { group: "effects", sourcePath: "effects", destinationPath: "effects" }
    ]
  },
  {
    name: "gunny-audio-browser",
    repository: "trinhtanphat/Gunny",
    ref: "669ddf6b462f79d16afbb020f6a5a3285685c987",
    mappings: [
      { group: "audio", sourcePath: "public/game-ui/audio", destinationPath: "public/game-ui/audio" }
    ]
  },
  {
    name: "gunny-bulk-browser",
    repository: "trinhtanphat/Gunny",
    ref: "f2e1ff59b22f50935d3f70c0f42b608a8239432b",
    mappings: [
      { group: "npc", sourcePath: "public/game-ui/npc", destinationPath: "public/game-ui/npc" },
      { group: "items", sourcePath: "public/game-ui/items", destinationPath: "public/game-ui/items" },
      { group: "weapons", sourcePath: "public/game-ui/weapons", destinationPath: "public/game-ui/weapons" },
      { group: "avatar", sourcePath: "public/game-ui/avatar", destinationPath: "public/game-ui/avatar" }
    ]
  }
];

expect(config.schemaVersion, 2, "schemaVersion");
expect(config.accountName, "trinhtanphat0000", "accountName");
expect(config.accountId, "7bf34a0373ce49a1d7d7928029d62340", "accountId");
expect(config.bucket, "ddtank-resource", "bucket");
expect(config.defaultProfile, "full-resource", "defaultProfile");
expect(config.publicBaseUrl, null, "publicBaseUrl");
expectArray(config.profiles?.images?.roots, ["image"], "images roots");
expectArray(config.profiles?.images?.runtimeSources, [], "images runtime sources");
expect(config.profiles?.images?.probeContentTypePrefix, "image/", "images probe type");
expectArray(config.profiles?.["full-resource"]?.roots, fullResourceRoots, "full-resource roots");
expectArray(
  config.profiles?.["full-resource"]?.runtimeSources,
  expectedRuntimeSources.map((source) => source.name),
  "full-resource runtime sources"
);
expectArray(config.runtimeSources, expectedRuntimeSources, "runtime source pins and mappings");
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
  "r2:gateway:test": "node scripts/r2-gateway-self-test.mjs",
  "r2:validate": "node scripts/validate-r2-config.mjs && node scripts/r2-gateway-self-test.mjs",
  "r2:runtime:materialize": "node scripts/materialize-r2-runtime-exports.mjs",
  "r2:plan:ci": "node scripts/r2-runtime-command.mjs plan",
  "r2:deploy:ci": "node scripts/r2-runtime-command.mjs deploy",
  "r2:verify:ci": "node scripts/r2-runtime-command.mjs verify-manifest",
  "r2:probe:ci": "node scripts/r2-runtime-command.mjs probe",
  "r2:self-test": "node scripts/r2-ci-deploy.mjs self-test",
  "deploy:r2-worker": "npx wrangler deploy --config wrangler.r2-deployer.jsonc",
  "cloudflare:deploy:r2": "npm run r2:validate && npm run r2:deploy:ci && npm run deploy:r2-worker"
};
for (const [name, value] of Object.entries(expectedScripts)) {
  expect(packageJson.scripts?.[name], value, `package script ${name}`);
}
expect(packageJson.dependencies?.["@aws-sdk/client-s3"], "3.1095.0", "AWS S3 SDK version");
expect(packageJson.dependencies?.["@aws-sdk/lib-storage"], "3.1095.0", "AWS multipart SDK version");

expect(buildMatrix.repository, "trinhtanphat/Resource", "build repository");
expect(buildMatrix.worker, "ddtank-r2-deployer", "build worker");
expect(buildMatrix.productionBranch, "main", "build production branch");
expect(buildMatrix.previewBuilds, false, "preview builds");
expect(buildMatrix.buildCommand, "npm install --ignore-scripts --no-audit --no-fund", "build command");
expect(buildMatrix.deployCommand, "npm run cloudflare:deploy:r2", "deploy command");
expectArray(buildMatrix.secretVariables, ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"], "build secrets");
expect(buildMatrix.environmentVariables?.R2_PROFILE, "full-resource", "build R2 profile");
for (const rootName of localResourceRoots) {
  if (!buildMatrix.watchPaths?.include?.includes(`${rootName}/**`)) {
    failures.push(`build watch paths: missing ${rootName}/**`);
  }
}
for (const script of [
  "scripts/materialize-r2-runtime-exports.mjs",
  "scripts/r2-runtime-command.mjs",
  "scripts/r2-ci-deploy.mjs",
  "scripts/r2-gateway-self-test.mjs",
  "scripts/validate-r2-config.mjs",
  "src/r2-deployer-worker.mjs"
]) {
  if (!buildMatrix.watchPaths?.include?.includes(script)) {
    failures.push(`build watch paths: missing ${script}`);
  }
}

expect(wrangler.name, "ddtank-r2-deployer", "Wrangler worker name");
expect(wrangler.main, "src/r2-deployer-worker.mjs", "Wrangler entrypoint");
expect(wrangler.r2_buckets?.[0]?.binding, "RESOURCE_BUCKET", "R2 binding name");
expect(wrangler.r2_buckets?.[0]?.bucket_name, "ddtank-resource", "R2 binding bucket");
expect(wrangler.vars?.R2_MANIFEST_PREFIX, "_deployment/manifests", "Worker manifest prefix");

for (const marker of [
  "createR2Gateway",
  "RESOURCE_BUCKET.get",
  "RESOURCE_BUCKET.head",
  "range: request.headers",
  "X-DDTank-Resource-Delivery",
  "immutable-fallback",
  "objects/",
  "resource-port-assets/hall-room-world/r033/",
  "3c35db1200d5f52ac37e7c5f8fc7afdf58ebea4a"
]) {
  if (!gatewaySource.includes(marker)) failures.push(`gateway source: missing ${marker}`);
}
for (const marker of [
  "canonical object GET must succeed",
  "range GET must return 206",
  "encoded traversal must be rejected",
  "known missing R2 key must use immutable fallback",
  "R033 manifest GET must succeed",
  "R033 manifest HEAD must succeed",
  "R033 fallback URL must remain immutable",
  "R2 conditional GET must use HEAD preflight"
]) {
  if (!gatewayTestSource.includes(marker)) failures.push(`gateway self-test: missing ${marker}`);
}

if (failures.length > 0) throw new Error(`R2 deployment validation failed:\n- ${failures.join("\n- ")}`);

console.log(JSON.stringify({
  status: "ok",
  accountName: config.accountName,
  accountId: config.accountId,
  bucket: config.bucket,
  worker: config.ci.worker,
  productionBranch: config.ci.productionBranch,
  defaultProfile: config.defaultProfile,
  profiles: Object.keys(config.profiles),
  localResourceRoots,
  runtimeRoots,
  gatewayMode: "r2-object-gateway",
  gatewayCapabilities: ["get", "head", "conditional", "range", "immutable-fallback"],
  runtimeSources: expectedRuntimeSources.map((source) => ({
    name: source.name,
    repository: source.repository,
    ref: source.ref,
    groups: source.mappings.map((mapping) => mapping.group)
  })),
  dashboardBuildCommand: buildMatrix.buildCommand,
  dashboardDeployCommand: buildMatrix.deployCommand
}, null, 2));
