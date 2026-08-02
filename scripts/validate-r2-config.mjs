#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const config = JSON.parse(await fs.readFile(path.join(root, "r2-deployment.json"), "utf8"));
const packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
const failures = [];

function expect(actual, expected, label) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

expect(config.schemaVersion, 1, "schemaVersion");
expect(config.accountName, "trinhtanphat3333", "accountName");
expect(config.accountId, "291f5d12e63427644f59ac4a1d8f9664", "accountId");
expect(config.bucket, "ddtank-resource", "bucket");
expect(config.defaultProfile, "images", "defaultProfile");
expect(config.publicBaseUrl, null, "publicBaseUrl");
expect(JSON.stringify(config.profiles?.images?.roots), JSON.stringify(["image"]), "images roots");
expect(config.profiles?.images?.probeContentTypePrefix, "image/", "images probe type");
expect(
  JSON.stringify(config.profiles?.["full-resource"]?.roots),
  JSON.stringify(["flash", "image", "partical", "sound", "video", "weekly", "xml"]),
  "full-resource roots"
);
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
  "r2:validate": "node scripts/validate-r2-config.mjs"
};

for (const [name, command] of Object.entries(expectedScripts)) {
  expect(packageJson.scripts?.[name], command, `package script ${name}`);
}

if (failures.length > 0) {
  throw new Error(`R2 deployment validation failed:\n- ${failures.join("\n- ")}`);
}

console.log(JSON.stringify({
  status: "ok",
  accountName: config.accountName,
  accountId: config.accountId,
  bucket: config.bucket,
  profiles: Object.keys(config.profiles)
}, null, 2));
