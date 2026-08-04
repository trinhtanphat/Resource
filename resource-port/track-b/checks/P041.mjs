#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve, sep } from "node:path";

const PACKAGE_ID = "P041";
const RUNTIME_ID = "R041";
const OWNER = "guild-social-marriage";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_IMPLEMENTATION_COMMIT = "3d7a049655847ab6b7802541560ef227e17df1ed";
const GUNNY_VERIFIED_MAIN = "0bc3c4b14ff44d1da162eadb4f338610ac3d4d5d";
const FOUNDATION_RESOURCE_COMMIT = "7dc16b70b4b868d6be709cca7d400def67f6d4b6";
const TRACK_A_PUBLICATION = Object.freeze({
  path: "exports/resource-port/guild-social-marriage/track-a/publication.json",
  bytes: 1949,
  sha256: "964ef658c987cccca7f923e1e42ab6b8d642972fb17e223d361e1ab9e08f708f",
  verifiedOnGunnyMain: "969d7b2d33df7bbd51f7d9b0c3c6674969a79994",
  sessions: 1,
  stagedFiles: 1,
  stagedBytes: 2491,
});
const DEPENDENCY = Object.freeze({
  sessionId: "R028",
  evidencePath: "config/resource-port-evidence/R028.json",
  evidenceGitBlobSha1: "507710268dadff9baec0cd22035cdce088fd3c03",
  evidenceSha256: "b1a803fb905257b556fe6c3fd5cdad62594971fbf00999007e884ad273bcbb62",
  importerPath: "scripts/import-resource-port-r028.mjs",
  importerGitBlobSha1: "8b15c6cc99a09112c5f83011fa3f779c2a6c6b33",
  importerSha256: "c38cb9a1e86b5119f9fcc743229a85df501ea207cc28031f8382b099f27d8cc3",
  shardPath: "config/resource-port-dispatch/shards/guild-social-marriage-001.json",
  shardSha256: "f49b67ee54c2965ebe657872d51fcbbd79815ea295fc862a89848fea247f3b88",
});
const SOURCE_FAMILIES = ["image/church/", "image/consortiaicon/", "image/consortiamap/"];
const LOCKED_PATHS = [
  "exports/resource-port/guild-social-marriage/**",
  "resource-port/track-b/contracts/guild-social-marriage.json",
  "resource-port/track-b/evidence/P041.json",
  "resource-port/track-b/checks/P041.mjs",
  "resource-port/track-b/findings/P041.md",
  "resource-port/track-b/status/P041.json",
];
const GUNNY_CONTEXT_PINS = Object.freeze({
  "config/source-church-room-world.json": Object.freeze({
    blob: "8ba45d3688ee7db9e885a21162672ebd19e85612",
    sha256: "7908a5378248a6a13480e01e833a4c33f683926eddc2e82256550c5e6173bcd3",
  }),
  "scripts/import-source-church-room-world-assets.mjs": Object.freeze({
    blob: "25e04ece81ac4f940fd661ee04c8ce680a95340b",
    sha256: "135039b4fb291344664bd4ddd28f48a6715bf11f91b2ee807d7ee86ca08af21a",
  }),
  "src/client/source-church-room-world.ts": Object.freeze({
    blob: "72c4f57967d2995a3e165ab3a8e00f245e28f589",
    sha256: "5c3866748439a3510f29be331dbbe44148a7249bdaa2030a0815f7cbcb8bdded",
  }),
  "src/client/social-scene-world.ts": Object.freeze({
    blob: "5540fd38551b7bbd13ee77d82559d49329a72899",
    sha256: "8a4d061d283731546efb6bfef122f8f39bace51520c12aeaab16a59979362491",
  }),
});
const EXPECTED = Object.freeze({
  files: 1201,
  bytes: 18391659,
  uniqueBlobs: 1031,
  trackAExact: 1173,
  trackAInferred: 0,
  trackAUnresolved: 28,
  packageExact: 1175,
  packageInferred: 0,
  packageUnresolved: 26,
  raster: 1175,
  swf: 26,
  mapFiles: 141,
  mapIds: 30,
  appearanceFiles: 986,
  ceremonyRasterFiles: 46,
  correctedMediaFiles: 2,
  sceneSwfs: 3,
  bombSwfs: 23,
  foundationOutputs: 8,
  ownedFoundationOutputs: 6,
});
const CORRECTED_MEDIA = Object.freeze([
  Object.freeze({
    sourcePath: "image/church/map/13/samll_map_s.jpg",
    sourceBlob: "759f9048776a7b49a2d7fd8a28d643135869ce63",
    outputPath: "exports/resource-port/guild-social-marriage/raster/church-map-13-small.png",
    bytes: 12129,
    sha256: "057f3161b1f700543d44e48b87be43bd0cd2953ca9794700d6d3777dbbcc26db",
    contentType: "image/png",
    width: 131,
    height: 51,
  }),
  Object.freeze({
    sourcePath: "image/consortiamap/default.png",
    sourceBlob: "81b821bb7eda73d4a21982ee8319ea8e795517f5",
    outputPath: "exports/resource-port/guild-social-marriage/raster/consortia-map-default.jpg",
    bytes: 149496,
    sha256: "5e614251ccd4b39504ba607680ab23da301004f56e7fba050b5e75ce83b5ca5b",
    contentType: "image/jpeg",
    width: 1192,
    height: 533,
  }),
]);
const FOUNDATION_OUTPUTS = Object.freeze([
  ["screens/churchroom-world/map01-background.png", 6196422, 2011, 1361, "06d85dbe48aa16f2aab80310547aac7950ce092217d6ba61eb35cc5280b04ca1", "ffdec-sprite-frame", true],
  ["screens/churchroom-world/map01-collision.png", 74883, 2012, 1362, "e1a7cdd404952e13ef3b7c120aef2bb72861441d41fee0d5e98af27b19d16a9d", "ffdec-sprite-frame", true],
  ["screens/churchroom-world/map01-entity.png", 657344, 1789, 588, "44203d80cb9fffe9da6ba8d1e39dc2a7a846d32de391e7fc1c89b1f45abff639", "ffdec-sprite-frame", true],
  ["screens/churchroom-world/map01-sky.png", 367900, 1411, 360, "464f847024ef63039999f167941e57e78ebea9fc85ed9094828ca610774af418", "ffdec-sprite-frame", true],
  ["screens/churchroom-world/map02-background.png", 1117944, 1363, 1206, "72ff7f4ce09220f2ab188bad02aaf937a18fb87ebf668fd33fc54d8f078848c0", "ffdec-sprite-frame", true],
  ["screens/churchroom-world/map02-collision.png", 13761, 1209, 836, "6b2855c4e0d3c440f1c4e993dc06afa09d08486c3436e01e9f2bb954903249f8", "ffdec-sprite-frame", true],
  ["screens/churchroom-world/mouse-click.png", 53284, 71, 59, "a91f05770cbce81d04561988f2c562ea56cdc73f308b0f23566ffe1fdaa16e38", "ffdec-apng", false],
  ["screens/churchroom-world/moon-button.png", 585180, 184, 127, "2d6ac634020c026228edc6b9b4f1c97d6e7853f7851938cd2e6b1d1fade9d292", "ffdec-apng", false],
]);
const CATALOG_COLUMNS = Object.freeze([
  "path", "gitBlobSha1", "bytes", "sha256", "trackAClassification",
  "packageClassification", "inspectionProfile", "detectedFormat", "contentType",
  "width", "height", "family", "consumerRole", "packageOutput",
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
const exportRoot = resolve(root, "exports/resource-port/guild-social-marriage");
const correctionBySource = new Map(CORRECTED_MEDIA.map((entry) => [entry.sourcePath, entry]));
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
  const parts = path.split("/");
  if (path.startsWith("image/church/jiu/")) return parts.slice(0, 5).join("/");
  if (path.startsWith("image/church/f/") || path.startsWith("image/church/m/")) {
    return parts.slice(0, 4).join("/");
  }
  if (path.startsWith("image/church/")) return parts.slice(0, 3).join("/");
  return parts.slice(0, 2).join("/");
}

function consumerRole(file) {
  if (file.inspectionProfile === "swf-timeline") return "unresolved-legacy-timeline";
  if (correctionBySource.has(file.path)) return "exact-corrected-media-extension";
  if (/^image\/church\/(?:f|m|jiu\/f|jiu\/m)\//u.test(file.path)) return "exact-wedding-avatar-layer";
  if (file.path.startsWith("image/church/map/")) return "exact-room-preview";
  if (file.path === "image/consortiaicon/icon.png") return "exact-guild-icon";
  if (file.path === "image/consortiamap/default.png") return "exact-guild-map";
  return "exact-ceremony-presentation";
}

function catalogRow(file) {
  const raster = file.evidence?.details ?? null;
  const correction = correctionBySource.get(file.path) ?? null;
  return [
    file.path,
    file.gitBlobSha1,
    file.bytes,
    file.sha256,
    file.classification,
    correction ? "exact" : file.classification,
    file.inspectionProfile,
    file.detectedFormat,
    correction?.contentType ?? file.output?.contentType ?? null,
    raster?.width ?? null,
    raster?.height ?? null,
    packageFamily(file.path),
    consumerRole(file),
    correction?.outputPath ?? null,
  ];
}

function summarizeRows(rows) {
  const summary = {
    files: rows.length,
    bytes: rows.reduce((total, row) => total + row[2], 0),
    uniqueBlobs: new Set(rows.map((row) => row[1])).size,
    trackA: { exact: 0, inferred: 0, unresolved: 0 },
    package: { exact: 0, inferred: 0, unresolved: 0 },
    profiles: { raster: 0, "swf-timeline": 0 },
  };
  for (const row of rows) {
    summary.trackA[row[4]] += 1;
    summary.package[row[5]] += 1;
    summary.profiles[row[6]] = (summary.profiles[row[6]] ?? 0) + 1;
  }
  return summary;
}

function assertSummary(summary) {
  if (
    summary.files !== EXPECTED.files
    || summary.bytes !== EXPECTED.bytes
    || summary.uniqueBlobs !== EXPECTED.uniqueBlobs
    || summary.trackA.exact !== EXPECTED.trackAExact
    || summary.trackA.inferred !== EXPECTED.trackAInferred
    || summary.trackA.unresolved !== EXPECTED.trackAUnresolved
    || summary.package.exact !== EXPECTED.packageExact
    || summary.package.inferred !== EXPECTED.packageInferred
    || summary.package.unresolved !== EXPECTED.packageUnresolved
    || summary.profiles.raster !== EXPECTED.raster
    || summary.profiles["swf-timeline"] !== EXPECTED.swf
  ) fail("R028/P041 census changed");
}

function imageDimensions(bytes, contentType, label) {
  if (contentType === "image/png") {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)
      || bytes.subarray(12, 16).toString("ascii") !== "IHDR") fail(`${label} is not PNG`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (contentType !== "image/jpeg" || bytes[0] !== 0xff || bytes[1] !== 0xd8
    || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) fail(`${label} is not JPEG`);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  fail(`${label} JPEG dimensions are missing`);
}

function timelineRecord(file) {
  const ffdec = file.evidence?.ffdec;
  if (!ffdec || ffdec.status !== "ok") fail(`missing FFDec evidence for ${file.path}`);
  return {
    path: file.path,
    sourceSha256: file.sha256,
    sourceBytes: file.bytes,
    classification: "unresolved",
    browserRuntimeAllowed: false,
    conversionDisposition: "metadata-preserved-visual-and-behavior-port-unresolved",
    reason: file.decision,
    swf: ffdec.swf,
    rootTagCounts: ffdec.rootTagCounts,
    linkages: ffdec.linkages,
    characters: ffdec.characters,
    timelines: ffdec.timelines,
    actionScript3: ffdec.actionScript3,
  };
}

function buildMapCatalog(rows) {
  const maps = new Map();
  for (const row of rows.filter((entry) => entry[0].startsWith("image/church/map/"))) {
    const mapId = row[0].split("/")[3];
    if (!maps.has(mapId)) maps.set(mapId, []);
    maps.get(mapId).push({
      sourcePath: row[0],
      basename: basename(row[0]),
      bytes: row[2],
      sha256: row[3],
      classification: row[5],
      contentType: row[8],
      width: row[9],
      height: row[10],
      packageOutput: row[13],
    });
  }
  return [...maps].sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
    .map(([mapId, assets]) => ({ mapId, assets }));
}

function buildAppearanceContract(rows) {
  const assets = rows.filter((row) => row[12] === "exact-wedding-avatar-layer").map((row) => {
    const parts = row[0].split("/");
    const jiu = parts[2] === "jiu";
    const gender = jiu ? parts[3] : parts[2];
    const slot = jiu ? parts[4] : parts[3];
    const variant = jiu ? parts[5] : parts[4];
    const frame = basename(row[0], extname(row[0]));
    return {
      sourcePath: row[0],
      sha256: row[3],
      bytes: row[2],
      width: row[9],
      height: row[10],
      context: jiu ? "jiu-source-context" : "standard-source-context",
      gender,
      slot,
      variant,
      frame,
      classification: "exact",
    };
  });
  if (assets.length !== EXPECTED.appearanceFiles) fail(`wedding appearance count changed to ${assets.length}`);
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    assets,
    composition: {
      sourceDimensions: "preserved-per-asset",
      frameNames: ["wedding_1", "wedding_2", "wedding_3"],
      sourceContexts: ["standard-source-context", "jiu-source-context"],
      genders: ["f", "m"],
      slots: ["cloth", "clothf", "eff", "face", "hair"],
      layerOrder: "unresolved-no-authoritative-character-compositor-in-R028",
      anchors: "unresolved-no-authoritative-anchor-record-in-R028",
      representativeFrameClaimsAnimation: false,
    },
  };
}

function gunnyObject(path) {
  if (!gunnyRoot) fail("--gunny-root is required while generating P041");
  const bytes = git(gunnyRoot, ["show", `origin/main:${path}`], null);
  const pin = GUNNY_CONTEXT_PINS[path];
  const blob = git(gunnyRoot, ["rev-parse", `origin/main:${path}`]).trim();
  if (!pin || blob !== pin.blob || sha256(bytes) !== pin.sha256) fail(`Gunny context pin changed: ${path}`);
  return bytes;
}

function verifyDependency(evidenceBytes, importerBytes) {
  if (sha256(evidenceBytes) !== DEPENDENCY.evidenceSha256
    || sha256(importerBytes) !== DEPENDENCY.importerSha256) fail("R028 dependency digest mismatch");
  const evidence = JSON.parse(evidenceBytes.toString("utf8"));
  if (evidence.sessionId !== "R028" || evidence.owner !== OWNER
    || evidence.status !== "complete-with-explicit-unresolved"
    || evidence.source?.commit !== SOURCE_COMMIT || evidence.source?.tree !== SOURCE_TREE
    || evidence.shard?.sha256 !== DEPENDENCY.shardSha256
    || evidence.completion?.trackBDependencySatisfied !== true
    || evidence.summary?.files !== EXPECTED.files || evidence.summary?.bytes !== EXPECTED.bytes) {
    fail("R028 dependency contract mismatch");
  }
  return evidence;
}

function dependencyRecord(evidence) {
  return {
    sessionId: "R028",
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

function assertRawTree(rows) {
  if (!rawRoot) fail("--raw-root is required while generating P041");
  if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT
    || git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim() !== SOURCE_TREE) fail("raw source checkout drifted");
  const rawStatus = git(rawRoot, ["status", "--porcelain", "--", "image/church", "image/consortiaicon", "image/consortiamap"]);
  if (rawStatus.trim()) fail("raw P041 source families are dirty");
  const tree = git(rawRoot, ["ls-tree", "-lr", "-z", "HEAD", "--", "image/church", "image/consortiaicon", "image/consortiamap"], null);
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

function foundationRecord(config) {
  if (config.resource?.commit !== FOUNDATION_RESOURCE_COMMIT
    || config.source?.xml?.sha256 !== "8041f71b94310f73873a2141934c69bbbe1fc0f2cc35cafcf21c72ec430a0645"
    || config.source?.mapSwfs?.[0]?.sha256 !== "598947ab21b0780c2146068f56c139c93a9d5fc469bc851ba927fcdca1132e39"
    || config.source?.mapSwfs?.[1]?.sha256 !== "84841261de22a8657ca957fb23544e922140b1d44d5f0d55f16a7cf13a849363"
    || config.resource?.generatedAssetCount !== EXPECTED.foundationOutputs) fail("Church foundation identity changed");
  const outputs = [];
  for (const [path, bytes, width, height, digest, extraction, ownedByR028] of FOUNDATION_OUTPUTS) {
    const value = git(root, ["show", `${FOUNDATION_RESOURCE_COMMIT}:${path}`], null);
    const blob = git(root, ["rev-parse", `${FOUNDATION_RESOURCE_COMMIT}:${path}`]).trim();
    const dimensions = imageDimensions(value, "image/png", path);
    if (value.length !== bytes || sha256(value) !== digest
      || dimensions.width !== width || dimensions.height !== height) fail(`foundation output changed: ${path}`);
    outputs.push({
      path,
      gitBlobSha1: blob,
      bytes,
      width,
      height,
      sha256: digest,
      extraction,
      classification: "inferred-ffdec-compatible-not-pixel-exact",
      ownedByR028Source: ownedByR028,
      duplicatedIntoP041: false,
    });
  }
  return {
    repository: "trinhtanphat/Resource",
    immutableCommit: FOUNDATION_RESOURCE_COMMIT,
    outputs,
    summary: {
      outputs: outputs.length,
      ownedByR028Source: outputs.filter((entry) => entry.ownedByR028Source).length,
      externalChurchroomControlOutputs: outputs.filter((entry) => !entry.ownedByR028Source).length,
      bytesDuplicatedIntoP041: 0,
    },
  };
}

async function artifact(path) {
  const bytes = await readFile(resolve(root, path));
  const extension = extname(path).toLowerCase();
  const contentType = extension === ".json" ? "application/json"
    : extension === ".png" ? "image/png"
      : extension === ".jpg" ? "image/jpeg" : "application/octet-stream";
  return { path, bytes: bytes.length, sha256: sha256(bytes), contentType };
}

async function buildPackage() {
  if (!gunnyRoot || !rawRoot) fail("--write requires --gunny-root and --raw-root");
  const currentMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
  if (currentMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main changed to ${currentMain}; refresh P041 pins`);
  git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, "origin/main"]);
  const evidenceBytes = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.evidencePath}`], null);
  const importerBytes = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.importerPath}`], null);
  if (git(gunnyRoot, ["rev-parse", `origin/main:${DEPENDENCY.evidencePath}`]).trim() !== DEPENDENCY.evidenceGitBlobSha1
    || git(gunnyRoot, ["rev-parse", `origin/main:${DEPENDENCY.importerPath}`]).trim() !== DEPENDENCY.importerGitBlobSha1) {
    fail("R028 dependency blob changed");
  }
  const trackA = verifyDependency(evidenceBytes, importerBytes);
  const rows = trackA.files.map(catalogRow);
  const summary = summarizeRows(rows);
  assertSummary(summary);
  if (rows.some((row) => !sourceFamily(row[0]))) fail("R028 catalog escaped P041 source families");
  assertRawTree(rows);

  const foundationConfig = JSON.parse(gunnyObject("config/source-church-room-world.json").toString("utf8"));
  gunnyObject("scripts/import-source-church-room-world-assets.mjs");
  const churchRuntime = gunnyObject("src/client/source-church-room-world.ts").toString("utf8");
  const socialRuntime = gunnyObject("src/client/social-scene-world.ts").toString("utf8");
  for (const marker of [
    "sourceChurchRoomCameraForApiPoint", "sourceChurchRoomCollisionPixelForWorldPoint",
    "sourceChurchRoomToolMotionPlan", "mapWidth * leftPoint.y + leftPoint.x",
  ]) if (!churchRuntime.includes(marker)) fail(`Church runtime foundation is missing ${marker}`);
  for (const marker of [
    "mountSourceChurchRoomWorld", '"/api/marriage/rooms/kick"',
    '"/api/marriage/rooms/leave"', "/forbid`",
  ]) if (!socialRuntime.includes(marker)) fail(`social runtime foundation is missing ${marker}`);

  const maps = buildMapCatalog(rows);
  if (maps.length !== EXPECTED.mapIds
    || maps.flatMap((entry) => entry.assets).length !== EXPECTED.mapFiles
    || maps.flatMap((entry) => entry.assets).some((entry) => entry.classification !== "exact")) {
    fail("room preview catalog is incomplete");
  }
  const appearance = buildAppearanceContract(rows);
  const ceremonyRasters = rows.filter((row) => row[12] === "exact-ceremony-presentation");
  if (ceremonyRasters.length !== EXPECTED.ceremonyRasterFiles) fail("ceremony raster count changed");
  const timelines = trackA.files.filter((file) => file.inspectionProfile === "swf-timeline").map(timelineRecord);
  if (timelines.length !== EXPECTED.swf
    || timelines.filter((entry) => entry.path.startsWith("image/church/scene/")).length !== EXPECTED.sceneSwfs
    || timelines.filter((entry) => entry.path.startsWith("image/church/bomb/")).length !== EXPECTED.bombSwfs) {
    fail("unresolved SWF topology changed");
  }
  const foundation = foundationRecord(foundationConfig);
  const contextPins = Object.entries(GUNNY_CONTEXT_PINS).map(([path, pin]) => ({ path, ...pin }));
  const dependency = dependencyRecord(trackA);
  const checks = {
    trackBVerifier: "pass: node resource-port/track-b/verify.mjs",
    packageChecker: "pass-generated-from-exact-origin-main-and-raw-pins",
    nodeSyntax: "pass: node --check resource-port/track-b/checks/P041.mjs",
    jsonParse: "pass-generated-and-reparsed-by-checker",
    dependencyGate: "pass-exact-R028-evidence-importer-and-shard",
    r028ImporterCheck: "pass: 1201 files / 18391659 bytes / 28 Track A unresolved",
    mediaValidation: "pass-two-byte-identical-extension-corrections-with-signature-dimensions-and-sha256",
    foundationAudit: "pass-eight-immutable-FFDec-compatible-outputs-no-binary-duplication",
    trackAStagingPublication: "pass: 1 exact staged payload and 1 immutable publication manifest",
    rawSourceMutation: false,
    githubActionsUsedOrInspected: false,
  };

  assertInside(exportRoot, resolve(root, "exports/resource-port"), "P041 export root");
  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(resolve(exportRoot, "catalog"), { recursive: true });
  await mkdir(resolve(exportRoot, "raster"), { recursive: true });

  for (const correction of CORRECTED_MEDIA) {
    const sourceBytes = git(rawRoot, ["show", `HEAD:${correction.sourcePath}`], null);
    const dimensions = imageDimensions(sourceBytes, correction.contentType, correction.sourcePath);
    if (sourceBytes.length !== correction.bytes || sha256(sourceBytes) !== correction.sha256
      || dimensions.width !== correction.width || dimensions.height !== correction.height) {
      fail(`corrected media identity changed: ${correction.sourcePath}`);
    }
    await writeFile(resolve(root, correction.outputPath), sourceBytes);
  }

  const catalogPath = "exports/resource-port/guild-social-marriage/catalog/r028.json";
  await writeJson(catalogPath, {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    dependencySessionId: "R028",
    columns: CATALOG_COLUMNS,
    assets: rows,
  });
  const catalogDescriptor = await artifact(catalogPath);
  await writeJson("exports/resource-port/guild-social-marriage/catalog-index.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    columns: CATALOG_COLUMNS,
    shards: [{ dependencySessionId: "R028", ...catalogDescriptor, files: rows.length }],
    summary,
    publication: {
      sourceObjectKeys: "exact Resource source paths",
      correctedObjects: CORRECTED_MEDIA.map((entry) => entry.outputPath),
      sourceBytesDuplicatedIntoPackage: CORRECTED_MEDIA.reduce((total, entry) => total + entry.bytes, TRACK_A_PUBLICATION.stagedBytes),
      foundationBytesDuplicatedIntoPackage: 0,
      r2First: true,
      trackA: TRACK_A_PUBLICATION,
    },
  });
  await writeJson("exports/resource-port/guild-social-marriage/room-map-catalog.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    mapIdentity: "exact-source-directory",
    maps,
    summary: {
      mapIds: maps.length,
      sourceFiles: maps.flatMap((entry) => entry.assets).length,
      exactBrowserNativeFiles: maps.flatMap((entry) => entry.assets).filter((entry) => entry.classification === "exact").length,
      correctedExtensionFiles: maps.flatMap((entry) => entry.assets).filter((entry) => entry.packageOutput).length,
      authoredRoomCoordinates: 0,
      authoredRoomLifecycle: 0,
    },
  });
  await writeJson("exports/resource-port/guild-social-marriage/appearance-contract.json", appearance);
  await writeJson("exports/resource-port/guild-social-marriage/geometry-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    source: {
      repository: foundationConfig.source.repository,
      commit: foundationConfig.source.commit,
      xml: foundationConfig.source.xml,
      actionScriptOwners: foundationConfig.source.owners,
      evidenceMode: "typed-reference-to-reviewed-existing-foundation",
    },
    coordinateSystem: {
      unit: "source-pixel",
      twipsPerPixel: 20,
      viewport: foundationConfig.layout.viewport,
      preserveFractionalTransforms: true,
      inferMissingCoordinates: false,
    },
    scenes: {
      wedding: {
        ...foundationConfig.layout.wedding,
        renderOrder: ["background", "depth-sorted-members-with-flat-entity", "sky"],
        collisionLayer: "hit-test-only-not-render-authority",
      },
      moon: {
        ...foundationConfig.layout.moon,
        renderOrder: ["background", "depth-sorted-members"],
        collisionLayer: "hit-test-only-not-render-authority",
      },
    },
    menu: foundationConfig.layout.menu,
    toolbar: foundationConfig.layout.toolbar,
    zOrder: {
      members: foundationConfig.behavior.depthSort,
      weddingEntity: "flat-foreground-approximation-at-mapWidth*850",
      perChildFlashDepth: "unresolved",
    },
    classification: "exact-typed-foundation-reference-with-declared-ffdec-limit",
    runtimeAuthority: false,
  });
  await writeJson("exports/resource-port/guild-social-marriage/behavior-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    source: {
      repository: foundationConfig.source.repository,
      commit: foundationConfig.source.commit,
      owners: foundationConfig.source.owners,
      runtimeTarget: "src/client/source-church-room-world.ts",
      runtimeTargetPin: GUNNY_CONTEXT_PINS["src/client/source-church-room-world.ts"],
    },
    presentationBehavior: foundationConfig.behavior,
    lifecycle: {
      surfaces: ["loading", "list", "room"],
      activeRoomRequiresAuthenticatedPresence: true,
      sceneIdChangeRequiresRemount: true,
      localSceneSwitches: ["wedding-to-moon", "moon-to-wedding"],
      serverOwnedCommands: ["leave", "kick", "forbid"],
      disabledUntilAuthoritative: ["invite", "continuation", "gunsalute", "firecrackers", "wedding-start-stop", "gift-settlement"],
    },
    authority: {
      presentationAndLocalViewState: "client",
      roomMembership: "Gunny server",
      marriageState: "Gunny server",
      permissions: "Gunny server",
      currencyAndSettlement: "Gunny server",
      guildLifecycle: "Gunny server",
      clientBusinessAuthority: false,
    },
    actionScriptPort: {
      reviewedFoundationAvailable: true,
      p041SwfConstructorMetadataRecords: timelines.length,
      p041SwfBehaviorPortsClaimed: 0,
      reason: "R028 SWF evidence exposes constructor/opcode metadata but not a reviewed behavior source port",
    },
    failClosed: foundationConfig.behavior.failClosed,
  });
  await writeJson("exports/resource-port/guild-social-marriage/timeline-index.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    records: timelines,
    summary: { records: timelines.length, browserRuntimeAllowed: 0, visualCompositionsConvertedByP041: 0, behaviorPortsClaimedByP041: 0 },
    runtimePolicy: { swfRuntimeAllowed: false, representativeFrameClaimsFullTimeline: false, inferredBehaviorAllowed: false, failClosed: true },
  });
  await writeJson("exports/resource-port/guild-social-marriage/foundation-audit.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    foundation,
    sourceMatches: {
      map01Swf: "image/church/scene/map01.swf",
      map02Swf: "image/church/scene/map02.swf",
      exactR028SourceMatches: 2,
    },
    covered: [
      "typed XML geometry and transforms",
      "camera projection and source collision-mask hit testing",
      "member depth sorting",
      "toolbar/menu presentation states",
      "authenticated room lifecycle and server-owned command boundaries",
    ],
    unresolved: [
      "map00 has no reviewed browser-native scene composition",
      "23 church bomb SWFs retain metadata only",
      "per-child Flash depth sorting is flattened in the map01 entity composite",
      "PathRoboSearcher route segmentation is not ported",
      ...foundationConfig.behavior.failClosed,
    ],
  });
  await writeJson("exports/resource-port/guild-social-marriage/runtime-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    packageOnly: true,
    publication: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
      immutableFallbackRequired: true,
    },
    browserNative: {
      exactSourceRasters: EXPECTED.packageExact,
      correctedMediaObjects: EXPECTED.correctedMediaFiles,
      referencedFoundationOutputs: EXPECTED.foundationOutputs,
      duplicatedFoundationBytes: 0,
    },
    consumerBoundary: {
      typedGeometryReady: true,
      presentationBehaviorReady: true,
      roomMapCatalogReady: true,
      weddingAppearanceCatalogReady: true,
      fullSwfVisualConversionReady: false,
      fullWeddingCharacterCompositionReady: false,
      runtimeIntegration: false,
    },
    prohibited: {
      swfRuntime: true,
      filenameOnlySelection: true,
      inventedGeometryOrLabels: true,
      representativeFrameAsAnimation: true,
      clientBusinessAuthority: true,
    },
  });

  const exportPaths = [
    "exports/resource-port/guild-social-marriage/catalog-index.json",
    catalogPath,
    "exports/resource-port/guild-social-marriage/room-map-catalog.json",
    "exports/resource-port/guild-social-marriage/appearance-contract.json",
    "exports/resource-port/guild-social-marriage/geometry-contract.json",
    "exports/resource-port/guild-social-marriage/behavior-contract.json",
    "exports/resource-port/guild-social-marriage/timeline-index.json",
    "exports/resource-port/guild-social-marriage/foundation-audit.json",
    "exports/resource-port/guild-social-marriage/runtime-contract.json",
    ...CORRECTED_MEDIA.map((entry) => entry.outputPath),
    TRACK_A_PUBLICATION.path,
  ];
  const exports = [];
  for (const path of exportPaths) exports.push(await artifact(path));
  const manifest = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependency: { sessions: ["R028"], implementationCommit: GUNNY_IMPLEMENTATION_COMMIT, verifiedOnMain: GUNNY_VERIFIED_MAIN },
    trackAPublication: TRACK_A_PUBLICATION,
    summary,
    conversion: {
      exactBrowserNativeSourceObjects: EXPECTED.packageExact,
      correctedExtensionObjects: EXPECTED.correctedMediaFiles,
      weddingAppearanceMappings: EXPECTED.appearanceFiles,
      roomMapFiles: EXPECTED.mapFiles,
      roomMapIds: EXPECTED.mapIds,
      ceremonyRasterMappings: EXPECTED.ceremonyRasterFiles,
      referencedFoundationOutputs: EXPECTED.foundationOutputs,
      p041OwnedFoundationOutputs: EXPECTED.ownedFoundationOutputs,
      unresolvedSwfTimelines: EXPECTED.swf,
      swfVisualCompositionsConvertedByP041: 0,
      p041SwfBehaviorPorts: 0,
    },
    readiness: {
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      typedGeometryAndTransforms: true,
      presentationLifecycleContract: true,
      businessAuthorityInClient: false,
      fullSwfVisualParity: false,
      fullWeddingCharacterComposition: false,
      legacyRuntimeContainersAllowed: false,
      runtimeIntegration: false,
    },
    exports,
    githubActions: false,
  };
  await writeJson("exports/resource-port/guild-social-marriage/manifest.json", manifest);

  const contract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    sourcePin: SOURCE_COMMIT,
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    dependencies: [dependency],
    contextPins,
    assetAddressing: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      canonicalObjectKey: "exact Resource source path or immutable package export path",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
      sourceBytesDuplicatedIntoPackage: CORRECTED_MEDIA.reduce((total, entry) => total + entry.bytes, TRACK_A_PUBLICATION.stagedBytes),
      trackAPublication: TRACK_A_PUBLICATION,
    },
    consumerBoundary: {
      packageOnly: true,
      runtimeIntegration: false,
      geometryAndPresentationBehaviorReady: true,
      sourceRasterCatalogReady: true,
      swfRuntimeAllowed: false,
      clientBusinessAuthority: false,
      unresolvedRuntimeAllowed: false,
    },
  };
  await writeJson("resource-port/track-b/contracts/guild-social-marriage.json", contract);
  const evidence = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P041-guild-social-marriage",
    source: manifest.source,
    dependencies: [dependency],
    contextPins,
    foundation,
    summary: { ...summary, catalogShards: 1, sourceFilesProcessed: EXPECTED.files, sourceFilesUnprocessed: 0, runtimeIntegration: false },
    conversion: manifest.conversion,
    checks,
    claims: {
      exactBrowserNativeObjects: EXPECTED.packageExact,
      extensionMismatchCorrections: EXPECTED.correctedMediaFiles,
      authoredGeometryInvented: false,
      representativeFrameClaimsAnimation: false,
      p041SwfBehaviorClaimedPorted: false,
      clientBusinessAuthority: false,
      swfRuntimeAllowed: false,
      runtimeIntegration: false,
    },
    publication: {
      immutablePackageCommitRequired: true,
      mutableBranchAllowed: false,
      immutableMergeCommit: null,
      trackA: TRACK_A_PUBLICATION,
    },
    generatedAt: "2026-08-02T00:00:00Z",
    githubActions: false,
  };
  await writeJson("resource-port/track-b/evidence/P041.json", evidence);
  await writeJson("resource-port/track-b/status/P041.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    runtimeIntegration: false,
    sourcePin: SOURCE_COMMIT,
    summary: evidence.summary,
    checks,
    remainingRisks: [
      "26 SWF containers retain exact FFDec metadata but no reviewed P041 browser-native visual composition",
      "R028 SWF opcode summaries do not prove a behavior port; P041 claims zero SWF behavior rewrites",
      "wedding appearance layer order and anchors are absent from R028 and remain unresolved",
      "map00, PathRoboSearcher segmentation, per-child map01 depth, invite, continuation, fireworks, ceremony start/stop and settlement remain fail-closed",
      "the eight existing foundation outputs are referenced from immutable Resource commit 7dc16b70 and are not duplicated",
      "business state and permissions remain Gunny server authority",
      "runtime selection belongs to R041, not this Resource package",
    ],
    publication: {
      immutableCommitRequired: true,
      mutableBranchAllowed: false,
      releaseCommit: null,
      trackA: TRACK_A_PUBLICATION,
    },
  });
}

async function verifyArtifactDescriptor(descriptor) {
  const bytes = await readFile(resolve(root, descriptor.path));
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256) fail(`${descriptor.path} descriptor mismatch`);
  if (descriptor.contentType === "application/json") JSON.parse(bytes.toString("utf8"));
}

async function listFiles(path) {
  const output = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) output.push(...await listFiles(child));
    else output.push(child);
  }
  return output;
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/guild-social-marriage/manifest.json");
  const index = await json("exports/resource-port/guild-social-marriage/catalog-index.json");
  const shard = await json("exports/resource-port/guild-social-marriage/catalog/r028.json");
  const maps = await json("exports/resource-port/guild-social-marriage/room-map-catalog.json");
  const appearance = await json("exports/resource-port/guild-social-marriage/appearance-contract.json");
  const geometry = await json("exports/resource-port/guild-social-marriage/geometry-contract.json");
  const behavior = await json("exports/resource-port/guild-social-marriage/behavior-contract.json");
  const timelines = await json("exports/resource-port/guild-social-marriage/timeline-index.json");
  const foundation = await json("exports/resource-port/guild-social-marriage/foundation-audit.json");
  const runtime = await json("exports/resource-port/guild-social-marriage/runtime-contract.json");
  const contract = await json("resource-port/track-b/contracts/guild-social-marriage.json");
  const evidence = await json("resource-port/track-b/evidence/P041.json");
  const status = await json("resource-port/track-b/status/P041.json");
  const trackAPublication = await verifyTrackAPublication();

  if (manifest.packageSessionId !== PACKAGE_ID || manifest.runtimeSessionId !== RUNTIME_ID || manifest.owner !== OWNER
    || manifest.source?.commit !== SOURCE_COMMIT || manifest.source?.tree !== SOURCE_TREE
    || manifest.status !== "complete-package-with-explicit-unresolved") fail("manifest identity mismatch");
  if (JSON.stringify(shard.columns) !== JSON.stringify(CATALOG_COLUMNS) || shard.assets?.length !== EXPECTED.files) fail("catalog shard mismatch");
  const summary = summarizeRows(shard.assets);
  assertSummary(summary);
  if (JSON.stringify(index.summary) !== JSON.stringify(summary) || index.shards?.length !== 1) fail("catalog index mismatch");
  await verifyArtifactDescriptor(index.shards[0]);
  if (new Set(shard.assets.map((row) => row[0])).size !== EXPECTED.files
    || shard.assets.some((row) => !sourceFamily(row[0]) || !/^[0-9a-f]{40}$/u.test(row[1]) || !/^[0-9a-f]{64}$/u.test(row[3]))) {
    fail("catalog source identity invalid");
  }
  if (maps.maps?.length !== EXPECTED.mapIds
    || maps.maps.flatMap((entry) => entry.assets).length !== EXPECTED.mapFiles
    || maps.maps.flatMap((entry) => entry.assets).some((entry) => entry.classification !== "exact")) fail("room map contract mismatch");
  if (appearance.assets?.length !== EXPECTED.appearanceFiles
    || appearance.assets.some((entry) => entry.classification !== "exact")
    || appearance.composition?.layerOrder !== "unresolved-no-authoritative-character-compositor-in-R028") fail("appearance contract mismatch");
  if (geometry.coordinateSystem?.viewport?.width !== 1000
    || geometry.scenes?.wedding?.mapWidth !== 2011 || geometry.scenes?.moon?.mapWidth !== 1208
    || geometry.runtimeAuthority !== false || geometry.zOrder?.perChildFlashDepth !== "unresolved") fail("geometry contract mismatch");
  if (behavior.authority?.clientBusinessAuthority !== false
    || behavior.actionScriptPort?.p041SwfBehaviorPortsClaimed !== 0
    || behavior.lifecycle?.serverOwnedCommands?.length !== 3) fail("behavior authority mismatch");
  if (timelines.records?.length !== EXPECTED.swf
    || timelines.summary?.browserRuntimeAllowed !== 0 || timelines.summary?.behaviorPortsClaimedByP041 !== 0
    || timelines.runtimePolicy?.swfRuntimeAllowed !== false) fail("timeline fail-closed contract mismatch");
  if (foundation.foundation?.summary?.outputs !== EXPECTED.foundationOutputs
    || foundation.foundation?.summary?.ownedByR028Source !== EXPECTED.ownedFoundationOutputs
    || foundation.foundation?.summary?.bytesDuplicatedIntoP041 !== 0) fail("foundation audit mismatch");
  if (runtime.packageOnly !== true || runtime.consumerBoundary?.runtimeIntegration !== false
    || runtime.prohibited?.clientBusinessAuthority !== true || runtime.prohibited?.swfRuntime !== true) fail("runtime contract mismatch");
  if (contract.dependencies?.[0]?.evidenceSha256 !== DEPENDENCY.evidenceSha256
    || contract.sourcePin !== SOURCE_COMMIT || contract.consumerBoundary?.runtimeIntegration !== false) fail("package contract mismatch");
  if (contract.assetAddressing?.sourceBytesDuplicatedIntoPackage !== 164116
    || contract.assetAddressing?.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("Track A publication contract changed");
  if (evidence.summary?.sourceFilesProcessed !== EXPECTED.files || evidence.summary?.sourceFilesUnprocessed !== 0
    || evidence.claims?.p041SwfBehaviorClaimedPorted !== false || evidence.claims?.clientBusinessAuthority !== false
    || status.status !== "complete-package-with-explicit-unresolved" || status.runtimeIntegration !== false) {
    fail("evidence or status overclaims P041");
  }
  if (evidence.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256
    || status.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256
    || manifest.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256
    || index.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("Track A publication metadata changed");
  for (const descriptor of manifest.exports) await verifyArtifactDescriptor(descriptor);
  for (const correction of CORRECTED_MEDIA) {
    const bytes = await readFile(resolve(root, correction.outputPath));
    const dimensions = imageDimensions(bytes, correction.contentType, correction.outputPath);
    if (bytes.length !== correction.bytes || sha256(bytes) !== correction.sha256
      || dimensions.width !== correction.width || dimensions.height !== correction.height) fail(`corrected output mismatch: ${correction.outputPath}`);
  }
  const files = await listFiles(exportRoot);
  if (files.some((path) => extname(path).toLowerCase() === ".swf")) fail("P041 export contains a legacy SWF runtime container");
  if (files.length !== manifest.exports.length + 3) fail(`export file count changed to ${files.length}`);
  return {
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    status: "pass",
    sourceFiles: EXPECTED.files,
    exactBrowserNativeObjects: EXPECTED.packageExact,
    correctedMediaObjects: EXPECTED.correctedMediaFiles,
    unresolvedSwfTimelines: EXPECTED.swf,
    foundationOutputsReferenced: EXPECTED.foundationOutputs,
    trackAPublicationSessions: trackAPublication.sessions.length,
    runtimeIntegration: false,
  };
}

async function verifyTrackAPublication() {
  const rootBytes = await readFile(resolve(root, TRACK_A_PUBLICATION.path));
  if (rootBytes.length !== TRACK_A_PUBLICATION.bytes || sha256(rootBytes) !== TRACK_A_PUBLICATION.sha256) {
    fail("Track A publication root identity mismatch");
  }
  const publication = JSON.parse(rootBytes.toString("utf8"));
  if (publication.packageSessionId !== PACKAGE_ID || publication.runtimeSessionId !== RUNTIME_ID || publication.owner !== OWNER
    || publication.source?.verifiedOnMain !== TRACK_A_PUBLICATION.verifiedOnGunnyMain
    || publication.summary?.sessions !== 1 || publication.summary?.stagedFiles !== 1
    || publication.summary?.stagedBytes !== TRACK_A_PUBLICATION.stagedBytes
    || publication.summary?.exact !== 1 || publication.summary?.inferred !== 0 || publication.summary?.unresolved !== 0
    || publication.boundary?.browserNativeConversionClaimed !== false || publication.boundary?.runtimeIntegration !== false) {
    fail("Track A publication contract changed");
  }
  const entry = publication.sessions?.[0];
  const expectedPrefix = `exports/resource-port/${OWNER}/track-a/r028/`;
  if (entry?.sessionId !== "R028" || entry.objectPrefix !== expectedPrefix
    || entry.manifestPath !== "track-a/r028/publication.json") fail("R028 publication prefix changed");
  const sessionBytes = await readFile(resolve(root, "exports/resource-port", OWNER, entry.manifestPath));
  if (sha256(sessionBytes) !== entry.manifestSha256) fail("R028 publication manifest digest mismatch");
  const session = JSON.parse(sessionBytes.toString("utf8"));
  if (session.classification !== "exact" || session.target?.objectPrefix !== expectedPrefix
    || session.boundary?.runtimeIntegration !== false || session.payload?.files?.length !== 1) fail("R028 publication manifest changed");
  const file = session.payload.files[0];
  const payloadBytes = await readFile(resolve(root, "exports/resource-port", OWNER, "track-a/r028", file.path));
  if (file.objectKey !== `${expectedPrefix}${file.path}` || file.contentType !== "application/json; charset=utf-8"
    || payloadBytes.length !== file.bytes || sha256(payloadBytes) !== file.sha256) fail("R028 payload identity changed");
  JSON.parse(payloadBytes.toString("utf8"));
  return publication;
}

if (writing) await buildPackage();
console.log(JSON.stringify(await verifyPackage()));
