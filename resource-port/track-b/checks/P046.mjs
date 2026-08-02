#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const fail = (message) => { throw new Error(`P046 package invalid: ${message}`); };
const json = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function pngSize(bytes) {
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") fail("output is not PNG");
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") fail("missing IHDR");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const manifest = await json("exports/resource-port/common-ui/manifest.json");
const contract = await json("resource-port/track-b/contracts/common-ui.json");
const evidence = await json("resource-port/track-b/evidence/P046.json");
const status = await json("resource-port/track-b/status/P046.json");

if (manifest.packageSessionId !== "P046" || manifest.runtimeSessionId !== "R046") fail("session identity mismatch");
if (manifest.source?.commit !== "519c35a293745b6a0477c4f6ea03110a89de2318") fail("raw source pin changed");
if (manifest.trackAEvidence?.dispatchSha256 !== "af3fe27570aead68dc7812376bd69b04baaa5e0afc0ea3c4c99e932e76e6fc43") fail("R034 dispatch digest mismatch");
if (!Array.isArray(manifest.assetShards) || manifest.assetShards.length !== 4) fail("expected four asset shards");

const rows = [];
for (const path of manifest.assetShards) {
  const bytes = await readFile(resolve(root, path));
  if (sha256(bytes) !== manifest.assetShardSha256[path]) fail(`${path} digest mismatch`);
  const shard = JSON.parse(bytes.toString("utf8"));
  if (shard.packageSessionId !== "P046") fail(`${path} session mismatch`);
  rows.push(...shard.assets);
}

if (rows.length !== 47) fail("expected 47 assets");
if (new Set(rows.map((row) => row[0])).size !== 47) fail("duplicate source filename");
if (new Set(rows.map((row) => row[4])).size !== 47) fail("duplicate browser digest");
if (manifest.classification?.assetSelection?.value !== "exact") fail("asset selection not exact");
if (manifest.classification?.visualFamily?.value !== "inferred") fail("visual family boundary changed");
if (manifest.classification?.consumerMapping?.value !== "unresolved") fail("consumer mapping was guessed");

let sourceBytes = 0;
let browserBytes = 0;
let identity = 0;
let adapted = 0;
for (const [filename, sourceBlob, sourceDigest, sourceSize, browserDigest, browserSize, width, height, conversion] of rows) {
  if (!/^[0-9a-f]{40}$/u.test(sourceBlob)) fail(`${filename} invalid source blob`);
  const source = await readFile(resolve(root, "image/interfaceicons", filename));
  const output = await readFile(resolve(root, "exports/resource-port/common-ui/raster", `${browserDigest}.png`));
  if (source.length !== sourceSize || sha256(source) !== sourceDigest) fail(`${filename} source identity mismatch`);
  if (output.length !== browserSize || sha256(output) !== browserDigest) fail(`${filename} output identity mismatch`);
  const [actualWidth, actualHeight] = pngSize(output);
  if (actualWidth !== width || actualHeight !== height) fail(`${filename} dimensions mismatch`);
  sourceBytes += source.length;
  browserBytes += output.length;
  if (conversion === "identity") {
    identity += 1;
    if (!source.equals(output)) fail(`${filename} identity conversion mismatch`);
  } else {
    adapted += 1;
    if (filename !== "icon1.png") fail("unexpected adapted asset");
    if (source.subarray(0, 5).toString("hex") !== "00035e5f5e") fail("icon1 prefix mismatch");
    if (source[21] !== 0xff || output[16] !== 0x00) fail("icon1 byte repair mismatch");
    const stored = output.readUInt32BE(29);
    if (stored !== 0x2b0e3243 || crc32(output.subarray(12, 29)) !== stored) fail("icon1 IHDR CRC proof mismatch");
  }
}

if (sourceBytes !== 278072 || browserBytes !== 278067) fail("byte totals mismatch");
if (identity !== 46 || adapted !== 1) fail("conversion census mismatch");
if (contract.consumerMapping?.status !== "unresolved" || contract.consumerMapping?.failClosed !== true) fail("contract must fail closed");
if (contract.assetAddressing?.mutableBranchAllowed !== false) fail("mutable CDN branch forbidden");
if (evidence.summary?.files !== 47 || evidence.summary?.unresolvedConsumers !== 47) fail("evidence summary mismatch");
if (status.status !== "complete-package" || status.runtimeIntegration !== false) fail("status boundary mismatch");

console.log(JSON.stringify({
  status: "pass",
  packageSessionId: "P046",
  files: 47,
  sourceBytes,
  browserBytes,
  identityPng: identity,
  adaptedLegacyPng: adapted,
  unresolvedConsumers: 47,
  runtimeIntegration: false,
  githubActions: false
}, null, 2));
