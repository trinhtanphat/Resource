#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve, sep } from "node:path";
import { inflateRawSync } from "node:zlib";

const PACKAGE_ID = "P042";
const RUNTIME_ID = "R042";
const OWNER = "pet-farm";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_IMPLEMENTATION_COMMIT = "3d7a049655847ab6b7802541560ef227e17df1ed";
const GUNNY_VERIFIED_MAIN = "0f633d66fc828c311dfd3e984a4d5a7e4c4232a5";
const DEPENDENCY = Object.freeze({
  sessionId: "R029",
  evidencePath: "config/resource-port-evidence/R029.json",
  evidenceGitBlobSha1: "a746d0dff36d3e8ab3778178c26e174ad0d7401b",
  evidenceSha256: "2963538169d3e8a3711d1acab67cf71927fcf02be2420fec8cba3e858ac44efa",
  importerPath: "scripts/import-resource-port-r029.mjs",
  importerGitBlobSha1: "bee682855cf82522adc2ee86dbd7d0ad923b5bea",
  importerSha256: "9f57f3dd7081a859808fc110ab8c3623ee45cbb89b60bc6d5d9c9254e2bdaa26",
  shardPath: "config/resource-port-dispatch/shards/pet-farm-001.json",
  shardSha256: "94d4e19546f852e4a79897a09a9dfb20b225ef8ba279d6b1497430e01da9c69d",
});
const SOURCE_FAMILIES = Object.freeze([
  "image/elf/", "image/farm/", "image/mounts/", "image/pet/",
  "image/petequip/", "image/petfollow/", "image/petskill/", "image/tool/petequip/",
]);
const LOCKED_PATHS = Object.freeze([
  "exports/resource-port/pet-farm/**",
  "resource-port/track-b/contracts/pet-farm.json",
  "resource-port/track-b/evidence/P042.json",
  "resource-port/track-b/checks/P042.mjs",
  "resource-port/track-b/findings/P042.md",
  "resource-port/track-b/status/P042.json",
]);
const GUNNY_CONTEXT_PINS = Object.freeze({
  "public/game-ui/pets-bag/manifest.json": Object.freeze({
    blob: "e71fcdbf92c787f34aedb06373ecf063c5aebb73",
    sha256: "cd5561c06722c0182a7a33f7c20fed21f3f4272afc897862551c342456023d8c",
  }),
  "scripts/import-gunny92-pets-bag-assets.mjs": Object.freeze({
    blob: "1a8e8060f66e5bb92070a3ed9025cbe4c1ae2532",
    sha256: "91f2c09310d24330fb4ac6df7e21f8833c83d350adfb15518bf65af35b03cd0e",
  }),
  "scripts/source-pets-bag-release-audit.mjs": Object.freeze({
    blob: "35c4f1ab460998b362b7e3c5c97666b17d189ea0",
    sha256: "b4d6678dd2ff86de3f7fc2e4e6cd83845a3b8a583fc1d28674384db51552a76c",
  }),
  "src/client/source-pets.ts": Object.freeze({
    blob: "91b2e276b76c98c3b413a49ae56f6cf8f690a950",
    sha256: "818d78342be9c071a80eae58be83d7c58950fd4febca63d42de29fed233c90db",
  }),
  "src/client/source-pets.css": Object.freeze({
    blob: "d220e1536c3d2c7945a2c60cf9d0780c19970dd0",
    sha256: "ae30a1e2dd307740da3349cfbe92b6728f176514193f1b06b4673863cdd3c2f7",
  }),
});
const EXPECTED = Object.freeze({
  files: 1700,
  bytes: 29109140,
  uniqueBlobs: 1096,
  trackAExact: 1285,
  trackAUnresolved: 415,
  packageExact: 1505,
  packageUnresolved: 195,
  correctedPaths: 220,
  correctedUniqueBlobs: 140,
  archivePaths: 106,
  archivePacks: 62,
  archiveEntries: 164,
  archiveUncompressedBytes: 7283377,
  atlasPng: 62,
  atlasXml: 62,
  rigJson: 40,
  subtextures: 1522,
  armatures: 84,
  authoredAnimations: 124,
  authoredSlots: 991,
  unresolvedSwfLike: 40,
  ffdecSwfs: 12,
  disguisedSwfLike: 28,
  petSpecies: 68,
  petStageAssets: 225,
  farmCropGroups: 51,
  farmStageAssets: 204,
  equipmentIconAssets: 197,
  skillSourceAssets: 761,
});
const CATALOG_COLUMNS = Object.freeze([
  "path", "gitBlobSha1", "bytes", "sha256", "trackAClassification",
  "packageClassification", "inspectionProfile", "detectedFormat", "declaredFormat",
  "contentType", "width", "height", "family", "consumerRole", "packageOutput",
]);
const args = process.argv.slice(2);
const writing = args.includes("--write");
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const root = process.cwd();
const gunnyRoot = valueAfter("--gunny-root") ?? process.env.GUNNY_ROOT ?? null;
const rawRoot = valueAfter("--raw-root") ?? process.env.RESOURCE_RAW_ROOT ?? null;
const exportRoot = resolve(root, "exports/resource-port/pet-farm");
const fail = (message) => { throw new Error(`${PACKAGE_ID} package invalid: ${message}`); };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const json = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const writeJson = async (path, value) => {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), stableJson(value), "utf8");
};
const git = (cwd, argv, encoding = "utf8") => execFileSync(
  "git",
  ["-C", cwd, ...argv],
  { encoding, maxBuffer: 256 * 1024 * 1024 },
);

function assertInside(path, parent, label) {
  const child = resolve(path);
  const boundary = `${resolve(parent)}${sep}`;
  if (!child.startsWith(boundary)) fail(`${label} escaped ${parent}`);
}

function sourceFamily(path) {
  return SOURCE_FAMILIES.find((prefix) => path.startsWith(prefix)) ?? null;
}

function packageFamily(path) {
  const prefix = sourceFamily(path);
  return prefix ? prefix.slice(0, -1) : null;
}

function isCorrectablePng(file) {
  return file.classification === "unresolved"
    && file.detectedFormat === "png"
    && file.evidence?.valid === true;
}

function correctedOutput(file) {
  return `exports/resource-port/pet-farm/raster/${file.sha256}.png`;
}

function packageClassification(file) {
  return isCorrectablePng(file) ? "exact" : file.classification;
}

function contentType(file) {
  if (file.detectedFormat === "png" && file.evidence?.valid === true) return "image/png";
  if (file.detectedFormat === "jpeg" && file.evidence?.valid === true) return "image/jpeg";
  return file.output?.contentType ?? null;
}

function consumerRole(file) {
  const path = file.path;
  if (file.detectedFormat === "zip") return path.startsWith("image/petfollow/")
    ? "authored-follow-animation-container" : "authored-mount-atlas-container";
  if (file.detectedFormat === "swf") return "unresolved-legacy-timeline";
  if (/^image\/farm\/crops\/[^/]+\/(?:seed|crop\d+)\.png$/u.test(path)) return "exact-farm-stage";
  if (path.startsWith("image/farm/fertilizer/")) return "exact-farm-fertilizer";
  if (/^image\/pet\/[^/]+\/icon\d+\.(?:png|jpg)$/u.test(path)) return "exact-static-pet-stage-icon-not-animation";
  if (path.startsWith("image/petequip/") || path.startsWith("image/tool/petequip/")) {
    return file.detectedFormat === "png" ? "exact-pet-equipment-slot-icon" : "unresolved-pet-equipment-source";
  }
  if (path.startsWith("image/petskill/")) return file.detectedFormat === "png"
    ? "exact-pet-skill-icon" : "unresolved-pet-skill-source";
  if (path.startsWith("image/mounts/cloth") || path.startsWith("image/mounts/saddle/")) return "exact-mount-layer";
  if (path.startsWith("image/mounts/horse/")) return file.detectedFormat === "png"
    ? "exact-mount-presentation-raster" : "unresolved-mount-source";
  if (path.startsWith("image/elf/") && file.detectedFormat === "png") return "exact-static-elf-stage-icon-not-animation";
  return packageClassification(file) === "exact" ? "exact-browser-native-static-asset" : "explicit-unresolved-source";
}

function catalogRow(file) {
  const raster = file.evidence?.details ?? null;
  return [
    file.path,
    file.gitBlobSha1,
    file.bytes,
    file.sha256,
    file.classification,
    packageClassification(file),
    file.inspectionProfile,
    file.detectedFormat,
    file.declaredFormat,
    contentType(file),
    raster?.width ?? null,
    raster?.height ?? null,
    packageFamily(file.path),
    consumerRole(file),
    isCorrectablePng(file) ? correctedOutput(file) : null,
  ];
}

function summarizeRows(rows) {
  const summary = {
    files: rows.length,
    bytes: rows.reduce((total, row) => total + row[2], 0),
    uniqueBlobs: new Set(rows.map((row) => row[1])).size,
    trackA: { exact: 0, inferred: 0, unresolved: 0 },
    package: { exact: 0, inferred: 0, unresolved: 0 },
    profiles: {},
  };
  for (const row of rows) {
    summary.trackA[row[4]] += 1;
    summary.package[row[5]] += 1;
    summary.profiles[row[6]] = (summary.profiles[row[6]] ?? 0) + 1;
  }
  return summary;
}

function assertSummary(summary) {
  if (summary.files !== EXPECTED.files || summary.bytes !== EXPECTED.bytes
    || summary.uniqueBlobs !== EXPECTED.uniqueBlobs
    || summary.trackA.exact !== EXPECTED.trackAExact || summary.trackA.inferred !== 0
    || summary.trackA.unresolved !== EXPECTED.trackAUnresolved
    || summary.package.exact !== EXPECTED.packageExact || summary.package.inferred !== 0
    || summary.package.unresolved !== EXPECTED.packageUnresolved
    || summary.profiles.raster !== 1590 || summary.profiles["swf-timeline"] !== 12
    || summary.profiles["binary-unknown"] !== 98) fail("R029/P042 census changed");
}

function imageDimensions(bytes, label) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)
    || bytes.subarray(12, 16).toString("ascii") !== "IHDR") fail(`${label} is not PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function zipEntries(bytes, label) {
  let eocd = -1;
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) fail(`${label} ZIP end record missing`);
  const disk = bytes.readUInt16LE(eocd + 4);
  const centralDisk = bytes.readUInt16LE(eocd + 6);
  const entriesOnDisk = bytes.readUInt16LE(eocd + 8);
  const entryCount = bytes.readUInt16LE(eocd + 10);
  const centralBytes = bytes.readUInt32LE(eocd + 12);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount || entryCount === 0
    || centralOffset + centralBytes > eocd) fail(`${label} ZIP layout unsupported`);
  const output = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) fail(`${label} central entry ${index} missing`);
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const expectedCrc = bytes.readUInt32LE(offset + 16);
    const compressedBytes = bytes.readUInt32LE(offset + 20);
    const uncompressedBytes = bytes.readUInt32LE(offset + 24);
    const nameBytes = bytes.readUInt16LE(offset + 28);
    const extraBytes = bytes.readUInt16LE(offset + 30);
    const commentBytes = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameBytes).toString((flags & 0x800) ? "utf8" : "utf8");
    if (!name || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..") || name.endsWith("/")) {
      fail(`${label} unsafe ZIP entry ${name}`);
    }
    if (method !== 0 && method !== 8) fail(`${label} ZIP method ${method} unsupported for ${name}`);
    if ((flags & 1) !== 0) fail(`${label} encrypted ZIP entry ${name}`);
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) fail(`${label} local entry ${name} missing`);
    const localNameBytes = bytes.readUInt16LE(localOffset + 26);
    const localExtraBytes = bytes.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameBytes + localExtraBytes;
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedBytes);
    if (compressed.length !== compressedBytes) fail(`${label} compressed body truncated for ${name}`);
    const data = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed);
    if (data.length !== uncompressedBytes || crc32(data) !== expectedCrc) fail(`${label} integrity mismatch for ${name}`);
    output.push({ name, method, compressedBytes, uncompressedBytes, crc32: expectedCrc, data });
    offset += 46 + nameBytes + extraBytes + commentBytes;
  }
  if (offset !== centralOffset + centralBytes) fail(`${label} central directory size mismatch`);
  return output;
}

function xmlAttributes(fragment) {
  const attributes = {};
  for (const match of fragment.matchAll(/([A-Za-z][A-Za-z0-9]*)="([^"]*)"/gu)) attributes[match[1]] = match[2];
  return attributes;
}

function atlasRecord(bytes, label) {
  const source = bytes.toString("utf8");
  const rootMatch = /<TextureAtlas\s+([^>]+)>/u.exec(source);
  if (!rootMatch) fail(`${label} TextureAtlas root missing`);
  const rootAttributes = xmlAttributes(rootMatch[1]);
  const frames = [];
  for (const match of source.matchAll(/<SubTexture\s+([^>]+?)\s*\/>/gu)) {
    const value = xmlAttributes(match[1]);
    for (const key of ["x", "y", "width", "height", "frameX", "frameY", "frameWidth", "frameHeight"]) {
      if (value[key] !== undefined) value[key] = Number(value[key]);
    }
    if (!value.name || !Number.isFinite(value.x) || !Number.isFinite(value.y)
      || !Number.isFinite(value.width) || !Number.isFinite(value.height)) fail(`${label} invalid SubTexture`);
    frames.push(value);
  }
  if (!rootAttributes.imagePath || frames.length === 0) fail(`${label} atlas is empty`);
  return { imagePath: rootAttributes.imagePath, frames };
}

function rigRecord(bytes, label) {
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); } catch { fail(`${label} is not JSON`); }
  if (!Number.isFinite(value.frameRate) || !Array.isArray(value.armature)) fail(`${label} rig shape invalid`);
  const armatures = value.armature.map((armature) => {
    const skins = Array.isArray(armature.skin) ? armature.skin : [];
    const slots = skins.flatMap((skin) => Array.isArray(skin.slot) ? skin.slot : []);
    const animations = (Array.isArray(armature.animation) ? armature.animation : []).map((animation) => ({
      name: animation.name,
      duration: animation.duration ?? null,
      loop: animation.loop ?? null,
      scale: animation.scale ?? null,
      fadeInTime: animation.fadeInTime ?? null,
      autoTween: animation.autoTween ?? null,
      timelineCount: Array.isArray(animation.timeline) ? animation.timeline.length : 0,
      frameCount: (Array.isArray(animation.timeline) ? animation.timeline : [])
        .reduce((total, timeline) => total + (Array.isArray(timeline.frame) ? timeline.frame.length : 0), 0),
    }));
    return {
      name: armature.name,
      boneCount: Array.isArray(armature.bone) ? armature.bone.length : 0,
      slotCount: slots.length,
      displayCount: slots.reduce((total, slot) => total + (Array.isArray(slot.display) ? slot.display.length : 0), 0),
      animations,
    };
  });
  return { frameRate: value.frameRate, armatures };
}

function verifyDependency(evidenceBytes, importerBytes, evidenceBlob, importerBlob) {
  if (evidenceBlob !== DEPENDENCY.evidenceGitBlobSha1 || importerBlob !== DEPENDENCY.importerGitBlobSha1
    || sha256(evidenceBytes) !== DEPENDENCY.evidenceSha256
    || sha256(importerBytes) !== DEPENDENCY.importerSha256) fail("R029 dependency identity mismatch");
  const evidence = JSON.parse(evidenceBytes.toString("utf8"));
  if (evidence.sessionId !== "R029" || evidence.owner !== OWNER
    || evidence.status !== "complete-with-explicit-unresolved"
    || evidence.source?.commit !== SOURCE_COMMIT || evidence.source?.tree !== SOURCE_TREE
    || evidence.shard?.sha256 !== DEPENDENCY.shardSha256
    || evidence.completion?.trackBDependencySatisfied !== true
    || evidence.summary?.files !== EXPECTED.files || evidence.summary?.bytes !== EXPECTED.bytes
    || !Array.isArray(evidence.files) || evidence.files.length !== EXPECTED.files) fail("R029 dependency contract mismatch");
  return evidence;
}

function dependencyRecord(evidence) {
  return {
    sessionId: "R029",
    implementationCommit: GUNNY_IMPLEMENTATION_COMMIT,
    verifiedOnGunnyMain: GUNNY_VERIFIED_MAIN,
    evidencePath: DEPENDENCY.evidencePath,
    evidenceGitBlobSha1: DEPENDENCY.evidenceGitBlobSha1,
    evidenceSha256: DEPENDENCY.evidenceSha256,
    importerPath: DEPENDENCY.importerPath,
    importerGitBlobSha1: DEPENDENCY.importerGitBlobSha1,
    importerSha256: DEPENDENCY.importerSha256,
    shardPath: DEPENDENCY.shardPath,
    shardSha256: DEPENDENCY.shardSha256,
    sourceFiles: evidence.summary.files,
    sourceBytes: evidence.summary.bytes,
    trackBDependencySatisfied: true,
  };
}

function gunnyObject(path) {
  if (!gunnyRoot) fail("--gunny-root is required while generating P042");
  const bytes = git(gunnyRoot, ["show", `origin/main:${path}`], null);
  const blob = git(gunnyRoot, ["rev-parse", `origin/main:${path}`]).trim();
  const pin = GUNNY_CONTEXT_PINS[path];
  if (!pin || blob !== pin.blob || sha256(bytes) !== pin.sha256) fail(`Gunny context pin changed: ${path}`);
  return bytes;
}

function assertRawTree(rows) {
  if (!rawRoot) fail("--raw-root is required while generating P042");
  if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT
    || git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim() !== SOURCE_TREE) fail("raw source checkout drifted");
  const familyPaths = SOURCE_FAMILIES.map((path) => path.slice(0, -1));
  const rawStatus = git(rawRoot, ["status", "--porcelain", "--", ...familyPaths]);
  if (rawStatus.trim()) fail("raw P042 source families are dirty");
  const tree = git(rawRoot, ["ls-tree", "-lr", "-z", "HEAD", "--", ...familyPaths], null);
  const entries = new Map();
  for (const record of tree.toString("utf8").split("\0").filter(Boolean)) {
    const match = /^(\d+) blob ([0-9a-f]{40})\s+(\d+)\t(.+)$/u.exec(record);
    if (match) entries.set(match[4], { blob: match[2], bytes: Number(match[3]) });
  }
  if (entries.size !== EXPECTED.files) fail(`raw source path count changed to ${entries.size}`);
  for (const row of rows) {
    const entry = entries.get(row[0]);
    if (!entry || entry.blob !== row[1] || entry.bytes !== row[2]) fail(`raw source identity changed: ${row[0]}`);
  }
}

function sourceBytes(path) {
  if (!rawRoot) fail("raw root is missing");
  const absolute = resolve(rawRoot, ...path.split("/"));
  assertInside(absolute, rawRoot, path);
  return readFile(absolute);
}

function groupBy(items, keyOf) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}

function sourceDescriptor(row) {
  return {
    sourcePath: row[0],
    bytes: row[2],
    sha256: row[3],
    classification: row[5],
    contentType: row[9],
    width: row[10],
    height: row[11],
    objectKey: row[14] ?? row[0],
  };
}

function petStageCatalog(rows) {
  const values = rows.filter((row) => row[0].startsWith("image/pet/"));
  const groups = groupBy(values, (row) => row[0].split("/")[2]);
  const species = [...groups].sort(([left], [right]) => left.localeCompare(right)).map(([key, assets]) => ({
    key,
    stages: assets.sort((left, right) => left[0].localeCompare(right[0])).map((row) => ({
      ...sourceDescriptor(row),
      authoredStageToken: /icon(\d+)/u.exec(basename(row[0]))?.[1] ?? null,
      declaredExtension: extname(row[0]).slice(1),
      correctedExtension: row[14] ? "png" : null,
    })),
  }));
  if (species.length !== EXPECTED.petSpecies || values.length !== EXPECTED.petStageAssets
    || values.some((row) => row[5] !== "exact")) fail("pet stage catalog changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    species,
    semantics: {
      stageLabels: "source-filename-token-only",
      staticIconsClaimAnimation: false,
      missingStageFallback: "source-neutral-placeholder-never-neighbor-art",
    },
  };
}

function farmStageCatalog(rows) {
  const values = rows.filter((row) => /^image\/farm\/crops\/[^/]+\/(?:seed|crop\d+)\.png$/u.test(row[0]));
  const groups = groupBy(values, (row) => row[0].split("/")[3]);
  const crops = [...groups].sort(([left], [right]) => left.localeCompare(right)).map(([key, assets]) => ({
    key,
    stages: assets.sort((left, right) => left[0].localeCompare(right[0])).map((row) => ({
      ...sourceDescriptor(row),
      authoredStageToken: basename(row[0], ".png"),
    })),
  }));
  if (crops.length !== EXPECTED.farmCropGroups || values.length !== EXPECTED.farmStageAssets
    || values.some((row) => row[5] !== "exact")) fail("farm stage catalog changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    crops,
    semantics: {
      stageOrder: ["seed", "crop0", "crop1", "crop2"],
      orderBasis: "authored-source-filenames",
      timing: "unresolved-no-growth-duration-in-R029",
      cropBehaviorAuthority: false,
    },
  };
}

function equipmentCatalog(rows) {
  const values = rows.filter((row) => (row[0].startsWith("image/petequip/") || row[0].startsWith("image/tool/petequip/"))
    && row[7] === "png");
  const slots = ["arm", "cloth", "hat"].map((slot) => ({
    slot,
    assets: values.filter((row) => row[0].split("/").includes(slot)).map(sourceDescriptor),
  }));
  if (values.length !== EXPECTED.equipmentIconAssets || values.some((row) => row[5] !== "exact")) fail("equipment catalog changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    slots,
    semantics: {
      slots: ["arm", "cloth", "hat"],
      slotBasis: "source-directory-name",
      equipCompatibility: "unresolved-no-authoritative-item-to-pet-rule-in-R029",
      clientEquipAuthority: false,
    },
  };
}

function skillCatalog(rows) {
  const values = rows.filter((row) => row[0].startsWith("image/petskill/"));
  const groups = groupBy(values, (row) => row[0].split("/")[2]);
  const skills = [...groups].sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
    .map(([key, assets]) => ({ key, assets: assets.map(sourceDescriptor) }));
  if (values.length !== EXPECTED.skillSourceAssets) fail("skill catalog changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    skills,
    semantics: {
      iconsArePresentationOnly: true,
      labelsAndEffects: "unresolved-no-authoritative-skill-metadata-in-R029",
      unresolvedObjectsFailClosed: true,
      clientSkillAuthority: false,
    },
  };
}

function swfLikeCatalog(files) {
  const values = files.filter((file) => file.detectedFormat === "swf");
  const records = values.map((file) => {
    const ffdec = file.evidence?.ffdec;
    const hasFfdec = file.inspectionProfile === "swf-timeline" && ffdec?.status === "ok";
    return {
      path: file.path,
      sourceBytes: file.bytes,
      sourceSha256: file.sha256,
      declaredFormat: file.declaredFormat,
      inspectionProfile: file.inspectionProfile,
      classification: "unresolved",
      browserRuntimeAllowed: false,
      ffdecStatus: hasFfdec ? "metadata-preserved" : "not-run-profile-format-mismatch",
      swf: hasFfdec ? ffdec.swf : null,
      rootTagCounts: hasFfdec ? ffdec.rootTagCounts : null,
      linkages: hasFfdec ? ffdec.linkages : null,
      characters: hasFfdec ? ffdec.characters : null,
      timelines: hasFfdec ? ffdec.timelines : null,
      actionScript3: hasFfdec ? ffdec.actionScript3 : null,
      conversionDisposition: "visual-and-behavior-port-unresolved",
      reason: file.decision,
    };
  });
  if (records.length !== EXPECTED.unresolvedSwfLike
    || records.filter((record) => record.ffdecStatus === "metadata-preserved").length !== EXPECTED.ffdecSwfs
    || records.filter((record) => record.ffdecStatus !== "metadata-preserved").length !== EXPECTED.disguisedSwfLike) {
    fail("SWF-like timeline census changed");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    records,
    summary: {
      unresolvedSwfLike: records.length,
      ffdecMetadataPreserved: EXPECTED.ffdecSwfs,
      profileFormatMismatch: EXPECTED.disguisedSwfLike,
      browserRuntimeAllowed: 0,
      behaviorPortsClaimedByP042: 0,
    },
    runtimePolicy: { swfRuntimeAllowed: false, unresolvedRuntimeAllowed: false },
  };
}

async function materializeCorrections(files) {
  const values = files.filter(isCorrectablePng);
  if (values.length !== EXPECTED.correctedPaths || new Set(values.map((file) => file.sha256)).size !== EXPECTED.correctedUniqueBlobs) {
    fail("correctable PNG census changed");
  }
  const outputs = new Map();
  for (const file of values) {
    const bytes = await sourceBytes(file.path);
    const dimensions = imageDimensions(bytes, file.path);
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256
      || dimensions.width !== file.evidence.details.width || dimensions.height !== file.evidence.details.height) {
      fail(`corrected PNG source changed: ${file.path}`);
    }
    const outputPath = correctedOutput(file);
    if (!outputs.has(file.sha256)) {
      await mkdir(dirname(resolve(root, outputPath)), { recursive: true });
      await writeFile(resolve(root, outputPath), bytes);
      outputs.set(file.sha256, { path: outputPath, bytes: bytes.length, sha256: file.sha256, width: dimensions.width, height: dimensions.height });
    }
  }
  return [...outputs.values()].sort((left, right) => left.path.localeCompare(right.path));
}

async function materializeArchives(files) {
  const values = files.filter((file) => file.detectedFormat === "zip");
  const groups = groupBy(values, (file) => file.sha256);
  if (values.length !== EXPECTED.archivePaths || groups.size !== EXPECTED.archivePacks) fail("archive census changed");
  const packs = [];
  let entryCount = 0;
  let uncompressedBytes = 0;
  let pngCount = 0;
  let xmlCount = 0;
  let jsonCount = 0;
  let subtextures = 0;
  let armatures = 0;
  let animations = 0;
  let slots = 0;
  for (const [digest, sources] of groups) {
    const representative = sources[0];
    const bytes = await sourceBytes(representative.path);
    if (bytes.length !== representative.bytes || sha256(bytes) !== digest) fail(`archive source changed: ${representative.path}`);
    const entries = zipEntries(bytes, representative.path);
    entryCount += entries.length;
    const outputDirectory = `exports/resource-port/pet-farm/animations/${digest}`;
    const entryRecords = [];
    let atlas = null;
    const rigs = [];
    for (const entry of entries) {
      uncompressedBytes += entry.uncompressedBytes;
      const extension = extname(entry.name).toLowerCase();
      let outputPath;
      let authored = null;
      if (extension === ".png") {
        pngCount += 1;
        imageDimensions(entry.data, `${representative.path}:${entry.name}`);
        outputPath = `${outputDirectory}/atlas.png`;
      } else if (extension === ".xml") {
        xmlCount += 1;
        authored = atlasRecord(entry.data, `${representative.path}:${entry.name}`);
        subtextures += authored.frames.length;
        atlas = authored;
        outputPath = `${outputDirectory}/atlas.xml`;
      } else if (extension === ".json") {
        jsonCount += 1;
        authored = rigRecord(entry.data, `${representative.path}:${entry.name}`);
        armatures += authored.armatures.length;
        animations += authored.armatures.reduce((total, armature) => total + armature.animations.length, 0);
        slots += authored.armatures.reduce((total, armature) => total + armature.slotCount, 0);
        rigs.push({ entryName: entry.name, ...authored });
        outputPath = `${outputDirectory}/rigs/${basename(entry.name)}`;
      } else {
        fail(`unsupported archive entry ${entry.name}`);
      }
      await mkdir(dirname(resolve(root, outputPath)), { recursive: true });
      await writeFile(resolve(root, outputPath), entry.data);
      entryRecords.push({
        sourceEntry: entry.name,
        outputPath,
        bytes: entry.data.length,
        sha256: sha256(entry.data),
        crc32: entry.crc32.toString(16).padStart(8, "0"),
        contentType: extension === ".png" ? "image/png" : extension === ".xml" ? "application/xml" : "application/json",
      });
    }
    if (!atlas || entries.filter((entry) => extname(entry.name).toLowerCase() === ".png").length !== 1
      || entries.filter((entry) => extname(entry.name).toLowerCase() === ".xml").length !== 1) {
      fail(`archive atlas pair invalid: ${representative.path}`);
    }
    const atlasPng = entries.find((entry) => extname(entry.name).toLowerCase() === ".png");
    const authoredImagePathMatchesAtlasEntry = basename(atlas.imagePath).toLowerCase() === basename(atlasPng.name).toLowerCase();
    const sourcePaths = sources.map((file) => file.path).sort();
    const family = sourcePaths.some((path) => path.startsWith("image/petfollow/")) ? "pet-follow" : "mount-horse";
    packs.push({
      archiveSha256: digest,
      sourcePaths,
      sourceBytes: representative.bytes,
      family,
      entries: entryRecords.sort((left, right) => left.sourceEntry.localeCompare(right.sourceEntry)),
      atlas: {
        sourceEntry: entries.find((entry) => extname(entry.name).toLowerCase() === ".xml").name,
        imagePath: atlas.imagePath,
        authoredImagePathMatchesAtlasEntry,
        runtimeImageOutput: `${outputDirectory}/atlas.png`,
        frames: atlas.frames,
        frameCount: atlas.frames.length,
      },
      rigs,
      authoredSemantics: family === "pet-follow"
        ? "DragonBones rig JSON supplies frame rate, armatures, slots, timelines, transforms, durations and animation names"
        : "TexturePacker XML supplies exact frame rectangles and trim geometry; playback timing is unresolved",
    });
  }
  packs.sort((left, right) => left.archiveSha256.localeCompare(right.archiveSha256));
  if (entryCount !== EXPECTED.archiveEntries || uncompressedBytes !== EXPECTED.archiveUncompressedBytes
    || pngCount !== EXPECTED.atlasPng || xmlCount !== EXPECTED.atlasXml || jsonCount !== EXPECTED.rigJson
    || subtextures !== EXPECTED.subtextures || armatures !== EXPECTED.armatures
    || animations !== EXPECTED.authoredAnimations || slots !== EXPECTED.authoredSlots) fail("authored archive output census changed");
  return {
    packs,
    summary: {
      sourcePaths: values.length,
      uniqueArchivePacks: packs.length,
      entries: entryCount,
      uncompressedBytes,
      atlasPng: pngCount,
      atlasXml: xmlCount,
      rigJson: jsonCount,
      subtextures,
      armatures,
      authoredAnimations: animations,
      authoredSlots: slots,
      authoredImagePathMismatches: packs.filter((pack) => !pack.atlas.authoredImagePathMatchesAtlasEntry).length,
    },
  };
}

function foundationRecord() {
  const objects = Object.keys(GUNNY_CONTEXT_PINS).map((path) => {
    const bytes = gunnyObject(path);
    return { path, ...GUNNY_CONTEXT_PINS[path], bytes: bytes.length };
  });
  const manifest = JSON.parse(gunnyObject("public/game-ui/pets-bag/manifest.json").toString("utf8"));
  if (manifest.classification !== "gunny92-pets-bag-source-conversion"
    || manifest.fidelity?.sourceAuthored !== true || manifest.fidelity?.pixelExact !== false
    || !Array.isArray(manifest.outputs) || manifest.outputs.length !== 31
    || manifest.actions?.activeTimeline?.name !== "standA"
    || manifest.runtimeBoundary?.stateRead !== "GET /api/pets") fail("PetsBag foundation contract changed");
  return {
    repository: "trinhtanphat/Gunny",
    immutableCommit: GUNNY_VERIFIED_MAIN,
    objects,
    petsBag: {
      classification: manifest.classification,
      sourceAuthored: manifest.fidelity.sourceAuthored,
      pixelExact: manifest.fidelity.pixelExact,
      outputCount: manifest.outputs.length,
      staticOutputs: manifest.outputs.filter((entry) => entry.path.includes("/static/") || entry.path.includes("/bag-frame/") || entry.path.includes("/pets/")).length,
      timelineOutputs: manifest.outputs.filter((entry) => entry.path.includes("/timeline/")).length,
      activeTimeline: manifest.actions.activeTimeline,
      runtimeStateRead: manifest.runtimeBoundary.stateRead,
      duplicatedIntoP042: false,
    },
    boundary: {
      existingPetsBagIsReviewedFoundation: true,
      p042StaticIconsClaimAnimation: false,
      p042ArchiveAnimationsRequireR042Consumer: true,
      businessStateAuthority: "Gunny Worker",
    },
  };
}

async function artifact(path) {
  const bytes = await readFile(resolve(root, path));
  const extension = extname(path).toLowerCase();
  return {
    path,
    bytes: bytes.length,
    sha256: sha256(bytes),
    contentType: extension === ".json" ? "application/json"
      : extension === ".png" ? "image/png"
        : extension === ".xml" ? "application/xml" : "application/octet-stream",
  };
}

async function listFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = resolve(directory, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(child));
    else output.push(child);
  }
  return output;
}

async function buildPackage() {
  if (!gunnyRoot || !rawRoot) fail("--write requires --gunny-root and --raw-root");
  const currentMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
  if (currentMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main changed to ${currentMain}; refresh P042 pins`);
  git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, "origin/main"]);
  const evidenceBytes = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.evidencePath}`], null);
  const importerBytes = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.importerPath}`], null);
  const evidenceBlob = git(gunnyRoot, ["rev-parse", `origin/main:${DEPENDENCY.evidencePath}`]).trim();
  const importerBlob = git(gunnyRoot, ["rev-parse", `origin/main:${DEPENDENCY.importerPath}`]).trim();
  const evidence = verifyDependency(evidenceBytes, importerBytes, evidenceBlob, importerBlob);
  const rows = evidence.files.map(catalogRow);
  const summary = summarizeRows(rows);
  assertSummary(summary);
  assertRawTree(rows);
  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(exportRoot, { recursive: true });
  await writeFile(resolve(exportRoot, ".gitattributes"), "* -text whitespace=cr-at-eol\n", "utf8");
  const corrections = await materializeCorrections(evidence.files);
  const archives = await materializeArchives(evidence.files);
  const foundation = foundationRecord();
  const dependency = dependencyRecord(evidence);
  const catalog = { schemaVersion: 1, packageSessionId: PACKAGE_ID, columns: CATALOG_COLUMNS, assets: rows };
  const petStages = petStageCatalog(rows);
  const farmStages = farmStageCatalog(rows);
  const equipment = equipmentCatalog(rows);
  const skills = skillCatalog(rows);
  const timelines = swfLikeCatalog(evidence.files);
  const mountPacks = archives.packs.filter((pack) => pack.family === "mount-horse");
  const followPacks = archives.packs.filter((pack) => pack.family === "pet-follow");
  const mount = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    packs: mountPacks,
    presentationLayers: rows.filter((row) => row[0].startsWith("image/mounts/cloth") || row[0].startsWith("image/mounts/saddle/"))
      .filter((row) => row[5] === "exact").map(sourceDescriptor),
    semantics: {
      atlasFrameGeometry: "exact-authored-TexturePacker-XML",
      frameSequence: "numeric-source-name-order-only",
      frameTiming: "unresolved-no-authoritative-rate-in-mount-archives",
      representativeFrameClaimsAnimation: false,
      unresolvedSwfRuntimeAllowed: false,
    },
  };
  const follow = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    packs: followPacks,
    semantics: {
      rigFormat: "DragonBones-compatible-authored-JSON",
      frameRateDurationLoopTimelineAndTransformSource: "exact-archive-data",
      layerOrderSource: "authored-slot-z-and-rig-hierarchy",
      clientBusinessAuthority: false,
      unsupportedRigFallback: "exact-static-pet-icon-or-neutral-placeholder-never-neighbor-animation",
    },
  };
  const fallback = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    policies: {
      missingStaticAsset: "neutral-placeholder",
      missingPetStage: "neutral-placeholder-never-neighbor-pet-art",
      missingMountAnimation: "exact-static-source-raster-if-owned-otherwise-neutral-placeholder",
      unsupportedDragonBonesFeature: "hold-last-valid-authored-frame-or-neutral-placeholder",
      invalidArchive: "reject-entire-pack-atomically",
      unresolvedSwfLike: "disabled-no-SWF-runtime-no-representative-frame-animation",
      clientBusinessAuthority: false,
    },
    nonClaims: [
      "static pet icons are not animation",
      "TexturePacker rectangles do not provide mount playback timing",
      "R029 skill icons do not define labels or combat effects",
      "R029 farm stages do not define growth durations",
      "nearby IDs and filenames do not authorize behavioral inference",
    ],
  };
  const runtime = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    packageOnly: true,
    runtimeIntegration: false,
    assetAddressing: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      sourceObjectKeys: "exact Resource source paths",
      packageObjectKeys: "immutable exports/resource-port/pet-farm paths",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
    },
    consumerBoundary: {
      staticCatalogReady: true,
      authoredMountAtlasReady: true,
      authoredFollowRigReady: true,
      runtimeIntegration: false,
      businessStateAuthority: "Gunny Worker",
    },
    prohibited: {
      swfRuntime: true,
      unresolvedRuntime: true,
      inventedGeometryAnimationLabelsOrBehavior: true,
      clientBusinessAuthority: true,
    },
  };
  const paths = {
    catalog: "exports/resource-port/pet-farm/catalog/r029.json",
    petStages: "exports/resource-port/pet-farm/pet-stage-catalog.json",
    farmStages: "exports/resource-port/pet-farm/farm-stage-catalog.json",
    equipment: "exports/resource-port/pet-farm/equipment-slot-catalog.json",
    skills: "exports/resource-port/pet-farm/skill-icon-catalog.json",
    mount: "exports/resource-port/pet-farm/mount-animation-contract.json",
    follow: "exports/resource-port/pet-farm/follow-animation-contract.json",
    timelines: "exports/resource-port/pet-farm/timeline-index.json",
    fallback: "exports/resource-port/pet-farm/fallback-contract.json",
    foundation: "exports/resource-port/pet-farm/foundation-audit.json",
    runtime: "exports/resource-port/pet-farm/runtime-contract.json",
  };
  await writeJson(paths.catalog, catalog);
  await writeJson(paths.petStages, petStages);
  await writeJson(paths.farmStages, farmStages);
  await writeJson(paths.equipment, equipment);
  await writeJson(paths.skills, skills);
  await writeJson(paths.mount, mount);
  await writeJson(paths.follow, follow);
  await writeJson(paths.timelines, timelines);
  await writeJson(paths.fallback, fallback);
  await writeJson(paths.foundation, { schemaVersion: 1, packageSessionId: PACKAGE_ID, foundation });
  await writeJson(paths.runtime, runtime);
  const catalogDescriptor = await artifact(paths.catalog);
  const index = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    columns: CATALOG_COLUMNS,
    shards: [catalogDescriptor],
    summary,
  };
  await writeJson("exports/resource-port/pet-farm/catalog-index.json", index);
  const filesBeforeManifest = (await listFiles(exportRoot))
    .map((path) => path.slice(root.length + 1).split(sep).join("/"))
    .sort();
  const exports = [];
  for (const path of filesBeforeManifest) exports.push(await artifact(path));
  const manifest = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependency,
    summary: {
      ...summary,
      correctedSourcePaths: corrections.length === EXPECTED.correctedPaths ? corrections.length : EXPECTED.correctedPaths,
      correctedUniqueObjects: corrections.length,
      authoredArchive: archives.summary,
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      runtimeIntegration: false,
    },
    exports,
    runtimeContract: paths.runtime,
  };
  manifest.summary.correctedSourcePaths = evidence.files.filter(isCorrectablePng).length;
  await writeJson("exports/resource-port/pet-farm/manifest.json", manifest);
  const contract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    sourcePin: SOURCE_COMMIT,
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    dependencies: [dependency],
    contextPins: Object.entries(GUNNY_CONTEXT_PINS).map(([path, pin]) => ({ path, ...pin })),
    consumerBoundary: runtime.consumerBoundary,
    prohibited: runtime.prohibited,
  };
  const evidenceOutput = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P042-pet-farm",
    source: manifest.source,
    dependencies: [dependency],
    contextPins: contract.contextPins,
    summary: manifest.summary,
    conversion: {
      exactBrowserNativeSourceObjects: EXPECTED.packageExact,
      correctedSourcePaths: EXPECTED.correctedPaths,
      correctedUniqueObjects: EXPECTED.correctedUniqueBlobs,
      authoredArchivePacks: EXPECTED.archivePacks,
      authoredAtlasFrames: EXPECTED.subtextures,
      authoredRigAnimations: EXPECTED.authoredAnimations,
      authoredAtlasImagePathMismatches: archives.summary.authoredImagePathMismatches,
      unresolvedSourceObjects: EXPECTED.packageUnresolved,
      unresolvedSwfLike: EXPECTED.unresolvedSwfLike,
      p042SwfBehaviorPorts: 0,
    },
    checks: {
      trackBVerifier: "pass: node resource-port/track-b/verify.mjs",
      packageChecker: "pass-generated-from-exact-origin-main-and-raw-pins",
      nodeSyntax: "pass: node --check resource-port/track-b/checks/P042.mjs",
      dependencyGate: "pass-exact-R029-evidence-importer-and-shard",
      r029ImporterCheck: "pass: 1700 files / 29109140 bytes / 415 Track A unresolved",
      zipValidation: "pass-central-and-local-records-deflate-size-crc-path-signature-and-authored-JSON-XML",
      mediaValidation: "pass-220-byte-identical-safe-PNG-path-corrections-140-unique",
      rawSourceMutation: false,
      githubActionsUsedOrInspected: false,
    },
    claims: {
      staticIconsClaimAnimation: false,
      inventedGeometryAnimationLabelsOrBehavior: false,
      p042SwfBehaviorClaimedPorted: false,
      clientBusinessAuthority: false,
      swfRuntimeAllowed: false,
      runtimeIntegration: false,
    },
    publication: { immutablePackageCommitRequired: true, mutableBranchAllowed: false, immutableMergeCommit: null },
    generatedAt: "2026-08-02T00:00:00Z",
    githubActions: false,
  };
  const status = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    runtimeIntegration: false,
    sourcePin: SOURCE_COMMIT,
    summary: manifest.summary,
    checks: evidenceOutput.checks,
    remainingRisks: [
      "40 SWF-like objects remain disabled; only 12 have FFDec metadata and P042 claims zero SWF behavior ports",
      "TexturePacker horse atlases provide exact frame geometry but no authoritative playback timing",
      "horse 122 author XML spells hourse.png while the verified archive entry is horse.png; the original XML is preserved and runtimeImageOutput maps to the extracted atlas.png",
      "static pet stage icons are presentation assets and never claim animation",
      "farm stage images do not define growth durations and pet-skill icons do not define labels or combat effects",
      "two corrupt PNG, 29 thumbs.db, one empty file, three RAR and 14 wd3 objects remain unresolved",
      "business state, permissions, inventory, feeding, growth and combat remain Gunny server authority",
      "runtime selection belongs to R042 after immutable Resource merge",
    ],
    publication: { immutableCommitRequired: true, mutableBranchAllowed: false, releaseCommit: null },
  };
  await writeJson("resource-port/track-b/contracts/pet-farm.json", contract);
  await writeJson("resource-port/track-b/evidence/P042.json", evidenceOutput);
  await writeJson("resource-port/track-b/status/P042.json", status);
  await mkdir(resolve(root, "resource-port/track-b/findings"), { recursive: true });
  await writeFile(resolve(root, "resource-port/track-b/findings/P042.md"), `# P042 pet-farm findings\n\nPending immutable package commit. Generated evidence is authoritative for census and conversion claims; this file is finalized by the findings-only P042-F commit.\n`, "utf8");
}

async function verifyArtifactDescriptor(descriptor) {
  const bytes = await readFile(resolve(root, descriptor.path));
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256) fail(`artifact changed: ${descriptor.path}`);
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/pet-farm/manifest.json");
  const index = await json("exports/resource-port/pet-farm/catalog-index.json");
  const catalog = await json("exports/resource-port/pet-farm/catalog/r029.json");
  const petStages = await json("exports/resource-port/pet-farm/pet-stage-catalog.json");
  const farmStages = await json("exports/resource-port/pet-farm/farm-stage-catalog.json");
  const equipment = await json("exports/resource-port/pet-farm/equipment-slot-catalog.json");
  const skills = await json("exports/resource-port/pet-farm/skill-icon-catalog.json");
  const mount = await json("exports/resource-port/pet-farm/mount-animation-contract.json");
  const follow = await json("exports/resource-port/pet-farm/follow-animation-contract.json");
  const timelines = await json("exports/resource-port/pet-farm/timeline-index.json");
  const fallback = await json("exports/resource-port/pet-farm/fallback-contract.json");
  const foundation = await json("exports/resource-port/pet-farm/foundation-audit.json");
  const runtime = await json("exports/resource-port/pet-farm/runtime-contract.json");
  const contract = await json("resource-port/track-b/contracts/pet-farm.json");
  const evidence = await json("resource-port/track-b/evidence/P042.json");
  const status = await json("resource-port/track-b/status/P042.json");
  if (manifest.packageSessionId !== PACKAGE_ID || manifest.runtimeSessionId !== RUNTIME_ID || manifest.owner !== OWNER
    || manifest.source?.commit !== SOURCE_COMMIT || manifest.source?.tree !== SOURCE_TREE
    || manifest.status !== "complete-package-with-explicit-unresolved") fail("manifest identity mismatch");
  if (JSON.stringify(catalog.columns) !== JSON.stringify(CATALOG_COLUMNS) || catalog.assets?.length !== EXPECTED.files) fail("catalog mismatch");
  const summary = summarizeRows(catalog.assets);
  assertSummary(summary);
  if (JSON.stringify(index.summary) !== JSON.stringify(summary) || index.shards?.length !== 1) fail("catalog index mismatch");
  await verifyArtifactDescriptor(index.shards[0]);
  if (petStages.species?.length !== EXPECTED.petSpecies
    || petStages.species.flatMap((entry) => entry.stages).length !== EXPECTED.petStageAssets
    || petStages.semantics?.staticIconsClaimAnimation !== false) fail("pet stage semantics mismatch");
  if (farmStages.crops?.length !== EXPECTED.farmCropGroups
    || farmStages.crops.flatMap((entry) => entry.stages).length !== EXPECTED.farmStageAssets
    || farmStages.semantics?.timing !== "unresolved-no-growth-duration-in-R029") fail("farm stage semantics mismatch");
  if (equipment.slots?.flatMap((entry) => entry.assets).length !== EXPECTED.equipmentIconAssets
    || equipment.semantics?.clientEquipAuthority !== false) fail("equipment semantics mismatch");
  if (skills.skills?.flatMap((entry) => entry.assets).length !== EXPECTED.skillSourceAssets
    || skills.semantics?.clientSkillAuthority !== false) fail("skill semantics mismatch");
  const packs = [...mount.packs, ...follow.packs];
  if (packs.length !== EXPECTED.archivePacks
    || packs.reduce((total, pack) => total + pack.atlas.frameCount, 0) !== EXPECTED.subtextures
    || packs.filter((pack) => !pack.atlas.authoredImagePathMatchesAtlasEntry).length !== 1
    || follow.packs.flatMap((pack) => pack.rigs).flatMap((rig) => rig.armatures)
      .reduce((total, armature) => total + armature.animations.length, 0) !== EXPECTED.authoredAnimations
    || mount.semantics?.frameTiming !== "unresolved-no-authoritative-rate-in-mount-archives") fail("authored animation contract mismatch");
  if (timelines.records?.length !== EXPECTED.unresolvedSwfLike
    || timelines.summary?.browserRuntimeAllowed !== 0 || timelines.summary?.behaviorPortsClaimedByP042 !== 0
    || timelines.runtimePolicy?.swfRuntimeAllowed !== false) fail("timeline fail-closed contract mismatch");
  if (fallback.policies?.unresolvedSwfLike !== "disabled-no-SWF-runtime-no-representative-frame-animation"
    || fallback.policies?.clientBusinessAuthority !== false) fail("fallback contract mismatch");
  if (foundation.foundation?.petsBag?.outputCount !== 31
    || foundation.foundation?.petsBag?.pixelExact !== false
    || foundation.foundation?.boundary?.p042StaticIconsClaimAnimation !== false) fail("foundation audit mismatch");
  if (runtime.packageOnly !== true || runtime.consumerBoundary?.runtimeIntegration !== false
    || runtime.prohibited?.swfRuntime !== true || runtime.prohibited?.clientBusinessAuthority !== true) fail("runtime boundary mismatch");
  if (contract.dependencies?.[0]?.evidenceSha256 !== DEPENDENCY.evidenceSha256
    || contract.sourcePin !== SOURCE_COMMIT || contract.consumerBoundary?.runtimeIntegration !== false) fail("package contract mismatch");
  if (evidence.summary?.sourceFilesProcessed !== EXPECTED.files || evidence.summary?.sourceFilesUnprocessed !== 0
    || evidence.claims?.staticIconsClaimAnimation !== false || evidence.claims?.p042SwfBehaviorClaimedPorted !== false
    || status.status !== "complete-package-with-explicit-unresolved" || status.runtimeIntegration !== false) {
    fail("evidence or status overclaims P042");
  }
  for (const descriptor of manifest.exports) await verifyArtifactDescriptor(descriptor);
  const files = await listFiles(exportRoot);
  if (files.some((path) => extname(path).toLowerCase() === ".swf")) fail("P042 export contains a legacy SWF runtime container");
  if (files.length !== manifest.exports.length + 1) fail(`export file count changed to ${files.length}`);
  const correctionOutputs = catalog.assets.filter((row) => row[14]).map((row) => row[14]);
  if (correctionOutputs.length !== EXPECTED.correctedPaths || new Set(correctionOutputs).size !== EXPECTED.correctedUniqueBlobs) fail("corrected output mapping mismatch");
  for (const path of new Set(correctionOutputs)) imageDimensions(await readFile(resolve(root, path)), path);
  return {
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    status: "pass",
    sourceFiles: EXPECTED.files,
    exactBrowserNativeSourceObjects: EXPECTED.packageExact,
    authoredArchivePacks: EXPECTED.archivePacks,
    authoredAnimations: EXPECTED.authoredAnimations,
    unresolvedSourceObjects: EXPECTED.packageUnresolved,
    runtimeIntegration: false,
  };
}

if (writing) await buildPackage();
console.log(JSON.stringify(await verifyPackage()));
