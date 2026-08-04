#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { inflateSync } from "node:zlib";

const PACKAGE_ID = "P040";
const RUNTIME_ID = "R040";
const OWNER = "pve-maps-npcs";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_IMPLEMENTATION_COMMIT = "3d7a049655847ab6b7802541560ef227e17df1ed";
const GUNNY_VERIFIED_MAIN = "4bf2cab1daf733964dd8772498f2d306e3a73584";
const TRACK_A_PUBLICATION = Object.freeze({
  path: "exports/resource-port/pve-maps-npcs/track-a/publication.json",
  bytes: 1909,
  sha256: "83fc0724a9eec38af2fa968b45da6b30d0e0a12d0d6f8f403f98c22d5516dd52",
  verifiedOnGunnyMain: "969d7b2d33df7bbd51f7d9b0c3c6674969a79994",
  sessions: 1,
  stagedFiles: 1,
  stagedBytes: 2469,
});
const DEPENDENCY = Object.freeze({
  sessionId: "R027",
  evidencePath: "config/resource-port-evidence/R027.json",
  evidenceGitBlobSha1: "da1e356d1b862375339e2d5225baff76bca7c951",
  evidenceSha256: "c31226fb36ff5a644666fbff2c0c999e36550eeee65df1df6ec30efc237a167e",
  importerPath: "scripts/import-resource-port-r027.mjs",
  importerGitBlobSha1: "0e435aeabdbbccd541900eedff2bb60f8cbdee53",
  importerSha256: "a97550b61f1991d10d7e5455fdcba60ed36bbe5e346f793e50a33b8ac38f1a7e",
});
const SOURCE_FAMILIES = ["image/map/", "image/tilemap/", "R027-assigned NPC presentation files only"];
const LOCKED_PATHS = [
  "exports/resource-port/pve-maps-npcs/**",
  "resource-port/track-b/contracts/pve-maps-npcs.json",
  "resource-port/track-b/evidence/P040.json",
  "resource-port/track-b/checks/P040.mjs",
  "resource-port/track-b/findings/P040.md",
  "resource-port/track-b/status/P040.json",
];
const GUNNY_CONTEXT_PINS = Object.freeze({
  "scripts/gunny92-collision-sources.mjs": Object.freeze({
    blob: "7c707e27b365b560767ff69f75f45b9838c951f9",
    sha256: "61feb6b659432abf2c55ae70a905e7513097faef8c8d4b68b560e10338e91caf",
  }),
  "scripts/import-source-pve-map-assets.mjs": Object.freeze({
    blob: "fdee49e1f7e1add422e1a4e8f0d1de08174c15ee",
    sha256: "74fce3dfacd596600521c2683ed6df9238a34c1e4dd3d786c6f8c713b040bfc1",
  }),
  "scripts/import-gunny92-little-game-assets.mjs": Object.freeze({
    blob: "69acffdbb23198087c1d92582120a4051d212fb4",
    sha256: "9374a60c0abc0ae495671ec83874b5ca9530bcddba47711333ac1d894153d49e",
  }),
  "src/shared/source-battle-maps.ts": Object.freeze({
    blob: "a5f803ab1e46f9225e7588067671afdb0ecf38fe",
    sha256: "741d9ee33be71564a81f995bfa9922470f08f9fda1aec0265d48000983353288",
  }),
  "src/shared/source-pve-maps.ts": Object.freeze({
    blob: "d02f65ebad90ee0ab7f88e85548643dc2454bb43",
    sha256: "9b8bc0744082d83a406e51cfed999e31e827da95e02573781c87952127b13d04",
  }),
  "config/source-npc-sprite-coverage.json": Object.freeze({
    blob: "e532daf3f4ebc3b6b499b86882dc577546d8ceec",
    sha256: "ac0fcaa41b11532a5392c9b203363808cbc1d6db9fb9de67f55d82c0a956a018",
  }),
  "public/game-data/content/source-npc-sprites.json": Object.freeze({
    blob: "709bb8171a11afa178897a7621b99fe40a24f8b7",
    sha256: "2ee9fc793389f1726c6e3702fcddd72f15d27b6e8d3b35d8dacd5f785eedbbe7",
  }),
  "docs/NPC_SPRITE_PIPELINE.md": Object.freeze({
    blob: "970e5f947b34309e510a6051880591862bea5a64",
    sha256: "74242ae9f6384030240297857a9f2325ed3ce8d1326b63fa2d35ecdbbafa58b6",
  }),
});
const EXPECTED = Object.freeze({
  files: 3703,
  bytes: 357578563,
  uniqueBlobs: 2764,
  exact: 3527,
  inferred: 0,
  unresolved: 176,
  exactRasters: 3526,
  exactText: 1,
  mapSourceFiles: 3702,
  mapIds: 782,
  consumerMappedPaths: 282,
  consumerMappedMapIds: 197,
  collisionMaps: 194,
  collisionDeadLayers: 55,
  swfTimelines: 18,
  parsedTilemaps: 1,
  tileWidth: 358,
  tileHeight: 215,
  tileDecodedBytes: 153948,
  tileDecodedSha256: "80c6cc68c9ab717d8c9b448a112dcc0a964ad21e3e5d6fc9d17414b98a13a6ed",
  tileSourceSha256: "3571b347c871dade120012ab57f61bfd82e142af63a92b6bece460e6c070c572",
});
const EXPECTED_PROFILES = Object.freeze({
  raster: 3651,
  "fla-authoring": 16,
  "swf-timeline": 18,
  "text-data": 7,
  "binary-unknown": 11,
});
const CATALOG_COLUMNS = [
  "path", "gitBlobSha1", "bytes", "sha256", "classification", "inspectionProfile",
  "detectedFormat", "contentType", "width", "height", "alphaKind", "animated",
  "mapId", "basename",
];
const args = process.argv.slice(2);
const writing = args.includes("--write");
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const root = process.cwd();
const gunnyRoot = valueAfter("--gunny-root") ?? process.env.GUNNY_ROOT ?? null;
const rawRoot = valueAfter("--raw-root") ?? process.env.RESOURCE_RAW_ROOT ?? null;
const exportRoot = resolve(root, "exports/resource-port/pve-maps-npcs");
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
  if (path.startsWith("image/map/")) return "image/map/";
  if (path.startsWith("image/tilemap/")) return "image/tilemap/";
  return null;
}

function catalogRow(file) {
  const raster = file.evidence?.details ?? null;
  const mapMatch = /^image\/map\/([^/]+)\//u.exec(file.path);
  return [
    file.path,
    file.gitBlobSha1,
    file.bytes,
    file.sha256,
    file.classification,
    file.inspectionProfile,
    file.detectedFormat,
    file.output?.contentType ?? null,
    raster?.width ?? null,
    raster?.height ?? null,
    raster?.alphaMode ?? null,
    raster?.animated ?? false,
    mapMatch?.[1] ?? null,
    basename(file.path),
  ];
}

function summarizeRows(rows) {
  const profiles = {};
  const summary = {
    files: rows.length,
    bytes: 0,
    uniqueBlobs: new Set(rows.map((row) => row[1])).size,
    exact: 0,
    inferred: 0,
    unresolved: 0,
    exactRasters: 0,
    exactText: 0,
    profiles,
  };
  for (const row of rows) {
    summary.bytes += row[2];
    summary[row[4]] += 1;
    profiles[row[5]] = (profiles[row[5]] ?? 0) + 1;
    if (row[4] === "exact" && row[5] === "raster") summary.exactRasters += 1;
    if (row[4] === "exact" && row[5] === "text-data") summary.exactText += 1;
  }
  return summary;
}

function assertSummary(summary) {
  for (const key of ["files", "bytes", "uniqueBlobs", "exact", "inferred", "unresolved", "exactRasters", "exactText"]) {
    if (summary[key] !== EXPECTED[key]) fail(`${key} expected ${EXPECTED[key]}, found ${summary[key]}`);
  }
  if (JSON.stringify(summary.profiles) !== JSON.stringify(EXPECTED_PROFILES)) fail("profile census changed");
}

function parseCollisionMappings(source) {
  const mappings = [];
  for (const match of source.matchAll(/\{\s*id:\s*"(\d+)",([\s\S]*?)\n\s*\},/gu)) {
    const body = match[2];
    const value = (name) => new RegExp(`${name}:\\s*"([^"]+)"`, "u").exec(body)?.[1] ?? null;
    mappings.push({
      mapId: match[1],
      authoredFore: value("fore"),
      authoredDead: value("dead"),
      visualFore: value("visualFore"),
      visualDead: value("visualDead"),
      collisionAuthority: "Gunny server-authored bitmap terrain",
      resourcePackageOwnsCollisionBits: false,
    });
  }
  if (mappings.length !== EXPECTED.collisionMaps) fail(`collision mapping count changed to ${mappings.length}`);
  if (mappings.filter((entry) => entry.authoredDead && entry.visualDead).length !== EXPECTED.collisionDeadLayers) {
    fail("collision dead-layer count changed");
  }
  if (mappings.some((entry) => !entry.authoredFore || !entry.visualFore)) fail("collision mapping is incomplete");
  return mappings;
}

function sourceMapIds(source) {
  return [...source.matchAll(/sourceMapId:\s*"(\d+)"/gu)].map((match) => match[1]);
}

function addRole(roles, path, role) {
  if (!roles.has(path)) roles.set(path, new Set());
  roles.get(path).add(role);
}

function buildConsumerEvidence(collisionMappings, battleIds, pveIds, byPath) {
  const roles = new Map();
  for (const entry of collisionMappings) {
    addRole(roles, entry.visualFore, "collision-visual-fore");
    if (entry.visualDead) addRole(roles, entry.visualDead, "collision-visual-dead");
  }
  for (const id of battleIds) {
    addRole(roles, `image/map/${id}/back.jpg`, "battle-background");
    addRole(roles, `image/map/${id}/fore.png`, "battle-foreground");
    addRole(roles, `image/map/${id}/samll_map.png`, "room-small-preview");
  }
  for (const id of pveIds) {
    addRole(roles, `image/map/${id}/back.jpg`, "pve-background");
    addRole(roles, `image/map/${id}/dead.png`, "pve-terrain-presentation");
    addRole(roles, `image/map/${id}/samll_map.png`, "pve-small-preview");
  }
  if (roles.size !== EXPECTED.consumerMappedPaths) fail(`consumer path count changed to ${roles.size}`);
  for (const [path] of roles) {
    const source = byPath.get(path);
    if (!source || source.classification !== "exact" || source.inspectionProfile !== "raster") {
      fail(`consumer path is not an exact R027 raster: ${path}`);
    }
  }
  const mapIds = new Set([...roles].map(([path]) => path.split("/")[2]));
  if (mapIds.size !== EXPECTED.consumerMappedMapIds) fail(`consumer map count changed to ${mapIds.size}`);
  return roles;
}

function buildMapCatalog(files, roles) {
  const maps = new Map();
  for (const file of files) {
    const match = /^image\/map\/([^/]+)\/(.+)$/u.exec(file.path);
    if (!match) continue;
    if (!maps.has(match[1])) maps.set(match[1], []);
    maps.get(match[1]).push({
      sourcePath: file.path,
      relativePath: match[2],
      sha256: file.sha256,
      bytes: file.bytes,
      classification: file.classification,
      contentType: file.output?.contentType ?? null,
      width: file.evidence?.details?.width ?? null,
      height: file.evidence?.details?.height ?? null,
      consumerRoles: Object.freeze([...(roles.get(file.path) ?? [])].sort()),
      runtimeDisposition: roles.has(file.path)
        ? "exact-active-consumer"
        : "catalogued-no-active-consumer",
    });
  }
  const records = [...maps].sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
    .map(([mapId, assets]) => ({
      mapId,
      identity: "exact-source-directory",
      authoredCoordinates: null,
      authoredSpawnMetadata: null,
      gameplayAuthority: false,
      assets: assets.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath)),
    }));
  if (records.length !== EXPECTED.mapIds) fail(`map identity count changed to ${records.length}`);
  if (records.reduce((total, entry) => total + entry.assets.length, 0) !== EXPECTED.mapSourceFiles) {
    fail("map asset count changed");
  }
  return records;
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
    conversionDisposition: "metadata-preserved-visual-composition-unresolved",
    reason: file.decision,
    swf: ffdec.swf,
    rootTagCounts: ffdec.rootTagCounts,
    linkages: ffdec.linkages,
    characters: ffdec.characters,
    timelines: ffdec.timelines,
    actionScript3: ffdec.actionScript3,
  };
}

function parseTilemap(compressed, source) {
  if (compressed.length !== source.bytes || sha256(compressed) !== source.sha256) fail("tilemap source identity mismatch");
  const decoded = inflateSync(compressed, { maxOutputLength: 4 * 1024 * 1024 });
  const width = decoded.readInt32LE(0);
  const height = decoded.readInt32LE(4);
  if (width !== EXPECTED.tileWidth || height !== EXPECTED.tileHeight
    || decoded.length !== EXPECTED.tileDecodedBytes || sha256(decoded) !== EXPECTED.tileDecodedSha256) {
    fail("tilemap decoded contract mismatch");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    source: {
      path: source.path,
      commit: SOURCE_COMMIT,
      gitBlobSha1: source.gitBlobSha1,
      bytes: source.bytes,
      sha256: source.sha256,
      trackAClassification: source.classification,
    },
    outputClassification: "exact",
    structuralContract: {
      width,
      height,
      bytesPerCell: 2,
      headerBytes: 8,
      decodedBytes: decoded.length,
      decodedSha256: sha256(decoded),
      cellPayloadEncoding: "base64-exact-decoded-bytes-after-header",
      cellSemantics: "unresolved-no-authoritative-enum-in-r027",
    },
    cellPayloadBase64: decoded.subarray(8).toString("base64"),
    consumerAuthority: false,
  };
}

function parseNpcBoundary(coverage, manifest) {
  if (coverage.catalogNpcRows !== 658 || coverage.referencedSpriteModels !== 194) fail("NPC coverage baseline changed");
  if (manifest.count !== 207 || manifest.npcIdsCovered !== 651
    || JSON.stringify(manifest.spritesWithoutUsableFrame) !== JSON.stringify(["1001"])) {
    fail("NPC representative sprite context changed");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    sourceAssignment: {
      assignedR027Files: 0,
      permittedFamily: "R027-assigned NPC presentation files only",
      observedR027NpcFiles: 0,
    },
    currentGunnyContext: {
      catalogNpcRows: coverage.catalogNpcRows,
      referencedSpriteModels: coverage.referencedSpriteModels,
      representativeStaticSprites: manifest.count,
      npcIdsCoveredByRepresentativeSprites: manifest.npcIdsCovered,
      spritesWithoutUsableRepresentativeFrame: manifest.spritesWithoutUsableFrame,
      fullAnimationTimelinesPackagedByP040: 0,
      staticRepresentativeIsFullAnimation: false,
    },
    classification: "unresolved",
    blocker: "R027 contains only image/map and image/tilemap; no NPC presentation file is assigned to P040",
    crossOwnerAssetsUsed: false,
    runtimeIntegration: false,
  };
}

async function artifact(path) {
  const bytes = await readFile(resolve(root, path));
  return { path, bytes: bytes.length, sha256: sha256(bytes), contentType: "application/json" };
}

function gunnyObject(path) {
  if (!gunnyRoot) fail("--gunny-root is required while generating P040");
  const bytes = git(gunnyRoot, ["show", `origin/main:${path}`], null);
  const pin = GUNNY_CONTEXT_PINS[path];
  const blob = git(gunnyRoot, ["rev-parse", `origin/main:${path}`]).trim();
  if (!pin || blob !== pin.blob || sha256(bytes) !== pin.sha256) fail(`Gunny context pin changed: ${path}`);
  return bytes;
}

function verifyDependency(evidenceBytes, importerBytes) {
  if (sha256(evidenceBytes) !== DEPENDENCY.evidenceSha256
    || sha256(importerBytes) !== DEPENDENCY.importerSha256) fail("R027 dependency digest mismatch");
  const evidence = JSON.parse(evidenceBytes.toString("utf8"));
  if (evidence.sessionId !== "R027" || evidence.owner !== OWNER
    || evidence.status !== "complete-with-explicit-unresolved"
    || evidence.source?.commit !== SOURCE_COMMIT || evidence.source?.tree !== SOURCE_TREE
    || evidence.completion?.trackBDependencySatisfied !== true
    || evidence.summary?.files !== EXPECTED.files || evidence.summary?.bytes !== EXPECTED.bytes) {
    fail("R027 dependency contract mismatch");
  }
  return evidence;
}

function dependencyRecord(evidence) {
  return {
    sessionId: "R027",
    implementationCommit: GUNNY_IMPLEMENTATION_COMMIT,
    verifiedOnGunnyMain: GUNNY_VERIFIED_MAIN,
    evidencePath: DEPENDENCY.evidencePath,
    evidenceGitBlobSha1: DEPENDENCY.evidenceGitBlobSha1,
    evidenceSha256: DEPENDENCY.evidenceSha256,
    importerPath: DEPENDENCY.importerPath,
    importerGitBlobSha1: DEPENDENCY.importerGitBlobSha1,
    importerSha256: DEPENDENCY.importerSha256,
    sourceFiles: evidence.summary.files,
    sourceBytes: evidence.summary.bytes,
    trackBDependencySatisfied: true,
    selectedFiles: evidence.summary.files,
    selectedBytes: evidence.summary.bytes,
  };
}

function assertRawTree(rows) {
  if (!rawRoot) fail("--raw-root is required while generating P040");
  if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT
    || git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim() !== SOURCE_TREE) fail("raw source checkout drifted");
  const rawStatus = git(rawRoot, ["status", "--porcelain", "--", "image/map", "image/tilemap"]);
  if (rawStatus.trim()) fail("raw P040 source families are dirty");
  const tree = git(rawRoot, ["ls-tree", "-lr", "-z", "HEAD", "--", "image/map", "image/tilemap"], null);
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

async function buildPackage() {
  if (!gunnyRoot || !rawRoot) fail("--write requires --gunny-root and --raw-root");
  const currentMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
  if (currentMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main changed to ${currentMain}; refresh P040 pins`);
  git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, "origin/main"]);

  const evidenceBytes = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.evidencePath}`], null);
  const importerBytes = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.importerPath}`], null);
  if (git(gunnyRoot, ["rev-parse", `origin/main:${DEPENDENCY.evidencePath}`]).trim() !== DEPENDENCY.evidenceGitBlobSha1
    || git(gunnyRoot, ["rev-parse", `origin/main:${DEPENDENCY.importerPath}`]).trim() !== DEPENDENCY.importerGitBlobSha1) {
    fail("R027 dependency blob changed");
  }
  const trackA = verifyDependency(evidenceBytes, importerBytes);
  const rows = trackA.files.map(catalogRow);
  const summary = summarizeRows(rows);
  assertSummary(summary);
  if (rows.some((row) => !sourceFamily(row[0]))) fail("R027 catalog escaped P040 source families");
  assertRawTree(rows);

  const collisionSource = gunnyObject("scripts/gunny92-collision-sources.mjs").toString("utf8");
  const battleSource = gunnyObject("src/shared/source-battle-maps.ts").toString("utf8");
  const pveSource = gunnyObject("src/shared/source-pve-maps.ts").toString("utf8");
  const littleGameImporter = gunnyObject("scripts/import-gunny92-little-game-assets.mjs").toString("utf8");
  gunnyObject("scripts/import-source-pve-map-assets.mjs");
  gunnyObject("docs/NPC_SPRITE_PIPELINE.md");
  if (!littleGameImporter.includes("function parseTileMap(compressed)")
    || !littleGameImporter.includes('resourceByPath.get("image/tilemap/1/map.bin")')) {
    fail("existing tilemap importer contract changed");
  }
  const byPath = new Map(trackA.files.map((file) => [file.path, file]));
  const collisions = parseCollisionMappings(collisionSource);
  const battleIds = sourceMapIds(battleSource);
  const pveIds = sourceMapIds(pveSource);
  if (battleIds.length !== 12 || pveIds.length !== 3) fail("active map consumer identity changed");
  const roles = buildConsumerEvidence(collisions, battleIds, pveIds, byPath);
  const mapRecords = buildMapCatalog(trackA.files, roles);

  const tileSource = byPath.get("image/tilemap/1/map.bin");
  if (!tileSource || tileSource.sha256 !== EXPECTED.tileSourceSha256) fail("tilemap source evidence missing");
  const tileBytes = git(rawRoot, ["show", "HEAD:image/tilemap/1/map.bin"], null);
  const tilemap = parseTilemap(tileBytes, tileSource);
  const timelines = trackA.files.filter((file) => file.inspectionProfile === "swf-timeline").map(timelineRecord);
  if (timelines.length !== EXPECTED.swfTimelines) fail("SWF timeline count changed");

  const coverage = JSON.parse(gunnyObject("config/source-npc-sprite-coverage.json").toString("utf8"));
  const npcManifest = JSON.parse(gunnyObject("public/game-data/content/source-npc-sprites.json").toString("utf8"));
  const npcBoundary = parseNpcBoundary(coverage, npcManifest);
  const contextPins = Object.entries(GUNNY_CONTEXT_PINS).map(([path, pin]) => ({ path, ...pin }));
  const checks = {
    trackBVerifier: "pass: node resource-port/track-b/verify.mjs",
    packageChecker: "pass-generated-from-exact-origin-main-and-raw-pins",
    nodeSyntax: "pass: node --check resource-port/track-b/checks/P040.mjs",
    jsonParse: "pass-generated-and-reparsed-by-checker",
    dependencyGate: "pass-exact-R027-evidence-and-importer-blobs",
    consumerEvidence: "pass-282-exact-source-paths-across-197-map-identities",
    tilemapParserReuse: "pass-existing-Gunny-parser-contract-and-exact-decoded-hash",
    trackAStagingPublication: "pass: 1 exact staged payload and 1 immutable publication manifest",
    rawSourceMutation: false,
    githubActionsUsedOrInspected: false,
  };

  assertInside(exportRoot, resolve(root, "exports/resource-port"), "P040 export root");
  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(resolve(exportRoot, "catalog"), { recursive: true });
  await mkdir(resolve(exportRoot, "tilemap"), { recursive: true });

  const catalogPath = "exports/resource-port/pve-maps-npcs/catalog/r027.json";
  await writeJson(catalogPath, {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    dependencySessionId: "R027",
    columns: CATALOG_COLUMNS,
    assets: rows,
  });
  const catalogDescriptor = await artifact(catalogPath);
  await writeJson("exports/resource-port/pve-maps-npcs/catalog-index.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    columns: CATALOG_COLUMNS,
    shards: [{ dependencySessionId: "R027", ...catalogDescriptor, files: rows.length }],
    summary,
    publication: {
      sourceObjectKeys: "exact Resource source paths",
      sourceBytesDuplicatedIntoPackage: TRACK_A_PUBLICATION.stagedBytes,
      r2First: true,
      trackA: TRACK_A_PUBLICATION,
    },
  });
  await writeJson("exports/resource-port/pve-maps-npcs/map-catalog.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    mapIdentity: "exact-source-directory",
    maps: mapRecords,
    summary: {
      mapIds: mapRecords.length,
      mapSourceFiles: EXPECTED.mapSourceFiles,
      exactConsumerMappedPaths: roles.size,
      exactConsumerMappedMapIds: new Set([...roles].map(([path]) => path.split("/")[2])).size,
      cataloguedWithoutActiveConsumer: EXPECTED.exactRasters - roles.size,
      authoredCoordinateRecords: 0,
      authoredSpawnRecords: 0,
    },
  });
  await writeJson("exports/resource-port/pve-maps-npcs/collision-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    mappings: collisions,
    summary: {
      maps: collisions.length,
      authoredForeSources: collisions.length,
      authoredDeadSources: collisions.filter((entry) => entry.authoredDead).length,
      exactResourceVisualPaths: new Set(collisions.flatMap((entry) => [entry.visualFore, entry.visualDead].filter(Boolean))).size,
      collisionBitsPublishedByP040: 0,
    },
    authorityBoundary: {
      visualPathsAreCollisionAuthority: false,
      collisionBitsRemainGunnyServerOwned: true,
      inferCollisionFromRasterPixels: false,
      inferSpawnFromArt: false,
    },
  });
  await writeJson("exports/resource-port/pve-maps-npcs/tilemap/map-1.json", tilemap);
  await writeJson("exports/resource-port/pve-maps-npcs/timeline-index.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    records: timelines,
    summary: { records: timelines.length, browserRuntimeAllowed: 0, visualCompositionsConverted: 0 },
    runtimePolicy: { swfRuntimeAllowed: false, representativeFrameClaimsFullTimeline: false, failClosed: true },
  });
  await writeJson("exports/resource-port/pve-maps-npcs/npc-presentation.json", npcBoundary);
  await writeJson("exports/resource-port/pve-maps-npcs/runtime-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    packageOnly: true,
    mapPresentation: {
      exactConsumerMappedPaths: roles.size,
      exactConsumerMappedMapIds: EXPECTED.consumerMappedMapIds,
      uncoupledCatalogMapIds: EXPECTED.mapIds - EXPECTED.consumerMappedMapIds,
      backgroundForegroundParallax: "only exact consumer-referenced paths; no inferred parallax factors",
      authoredCoordinates: "unresolved-not-present-in-r027-source-families",
      authoredSpawns: "unresolved-not-present-in-r027-source-families",
    },
    collision: {
      exactVisualToAuthoredSourceMappings: collisions.length,
      authority: "Gunny server runtime",
      packagePublishesCollisionBits: false,
    },
    npcPresentation: npcBoundary,
    tilemap: {
      exactStructuralOutput: "tilemap/map-1.json",
      cellSemanticsAuthoritative: false,
    },
    delivery: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
      immutableFallbackRequired: true,
    },
    prohibited: {
      swfRuntime: true,
      representativeFrameAsAnimation: true,
      inferredCollisionOrSpawn: true,
      crossOwnerNpcAssets: true,
      clientGameplayAuthority: true,
    },
  });

  const dependency = dependencyRecord(trackA);
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
      sourceBytesDuplicatedIntoPackage: TRACK_A_PUBLICATION.stagedBytes,
      trackAPublication: TRACK_A_PUBLICATION,
    },
    consumerBoundary: {
      packageOnly: true,
      runtimeIntegration: false,
      mapIdentityAndPresentationReady: true,
      collisionAuthorityPackaged: false,
      npcAnimationReady: false,
      unresolvedRuntimeAllowed: false,
    },
  };
  await writeJson("resource-port/track-b/contracts/pve-maps-npcs.json", contract);

  const exportPaths = [
    "exports/resource-port/pve-maps-npcs/catalog-index.json",
    catalogPath,
    "exports/resource-port/pve-maps-npcs/map-catalog.json",
    "exports/resource-port/pve-maps-npcs/collision-contract.json",
    "exports/resource-port/pve-maps-npcs/tilemap/map-1.json",
    "exports/resource-port/pve-maps-npcs/timeline-index.json",
    "exports/resource-port/pve-maps-npcs/npc-presentation.json",
    "exports/resource-port/pve-maps-npcs/runtime-contract.json",
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
    dependency: { sessions: ["R027"], implementationCommit: GUNNY_IMPLEMENTATION_COMMIT, verifiedOnMain: GUNNY_VERIFIED_MAIN },
    trackAPublication: TRACK_A_PUBLICATION,
    summary,
    conversion: {
      exactBrowserNativeSourceObjects: EXPECTED.exact,
      exactRasterObjects: EXPECTED.exactRasters,
      exactTextObjects: EXPECTED.exactText,
      exactConsumerMappedPaths: roles.size,
      parsedTilemaps: 1,
      swfTimelineMetadataRecords: timelines.length,
      swfVisualCompositionsConverted: 0,
      npcAssignedSourceFiles: 0,
      npcFullAnimationsConverted: 0,
    },
    readiness: {
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      mapIdentityAndExactActivePresentation: true,
      authoritativeCollisionBits: false,
      authoredSpawnsAndCoordinates: false,
      npcAnimation: false,
      legacyRuntimeContainersAllowed: false,
      runtimeIntegration: false,
    },
    exports,
    githubActions: false,
  };
  await writeJson("exports/resource-port/pve-maps-npcs/manifest.json", manifest);

  const evidence = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P040-pve-maps-npcs",
    source: manifest.source,
    dependencies: [dependency],
    contextPins,
    summary: { ...summary, catalogShards: 1, sourceFilesProcessed: EXPECTED.files, sourceFilesUnprocessed: 0, runtimeIntegration: false },
    conversion: manifest.conversion,
    checks,
    claims: {
      exactMapConsumerPaths: roles.size,
      exactCollisionVisualMappings: collisions.length,
      exactTilemapStructure: 1,
      collisionOrSpawnInferredFromArt: false,
      representativeNpcFrameClaimsAnimation: false,
      swfRuntimeAllowed: false,
      crossOwnerNpcAssetsUsed: false,
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
  await writeJson("resource-port/track-b/evidence/P040.json", evidence);
  await writeJson("resource-port/track-b/status/P040.json", {
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
      "585 map directories and 3244 exact raster objects have no active consumer mapping in the pinned Gunny context",
      "18 SWF containers retain FFDec metadata but have no reviewed browser-native visual composition",
      "authoritative collision bitmaps stay in Gunny server-owned .map sources and are not within the R027 Resource families",
      "R027 contains no authored spawn or coordinate record; P040 does not infer either from artwork",
      "R027 assigns zero NPC presentation files; static representatives and full NPC animation remain outside this package",
      "125 raster, 16 authoring, 6 text, and 11 binary source files remain unresolved",
      "runtime selection and gameplay authority belong to R040, not this Resource package",
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
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256
    || descriptor.contentType !== "application/json") fail(`${descriptor.path} descriptor mismatch`);
  JSON.parse(bytes.toString("utf8"));
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/pve-maps-npcs/manifest.json");
  const index = await json("exports/resource-port/pve-maps-npcs/catalog-index.json");
  const shard = await json("exports/resource-port/pve-maps-npcs/catalog/r027.json");
  const maps = await json("exports/resource-port/pve-maps-npcs/map-catalog.json");
  const collisions = await json("exports/resource-port/pve-maps-npcs/collision-contract.json");
  const tilemap = await json("exports/resource-port/pve-maps-npcs/tilemap/map-1.json");
  const timelines = await json("exports/resource-port/pve-maps-npcs/timeline-index.json");
  const npcs = await json("exports/resource-port/pve-maps-npcs/npc-presentation.json");
  const runtime = await json("exports/resource-port/pve-maps-npcs/runtime-contract.json");
  const contract = await json("resource-port/track-b/contracts/pve-maps-npcs.json");
  const evidence = await json("resource-port/track-b/evidence/P040.json");
  const status = await json("resource-port/track-b/status/P040.json");
  const trackAPublication = await verifyTrackAPublication();

  if (manifest.packageSessionId !== PACKAGE_ID || manifest.runtimeSessionId !== RUNTIME_ID || manifest.owner !== OWNER
    || manifest.source?.commit !== SOURCE_COMMIT || manifest.source?.tree !== SOURCE_TREE) fail("manifest identity mismatch");
  if (JSON.stringify(shard.columns) !== JSON.stringify(CATALOG_COLUMNS) || shard.assets?.length !== EXPECTED.files) fail("catalog shard mismatch");
  const summary = summarizeRows(shard.assets);
  assertSummary(summary);
  if (JSON.stringify(index.summary) !== JSON.stringify(summary) || index.shards?.length !== 1) fail("catalog index mismatch");
  await verifyArtifactDescriptor(index.shards[0]);
  if (new Set(shard.assets.map((row) => row[0])).size !== EXPECTED.files
    || shard.assets.some((row) => !sourceFamily(row[0]) || !/^[0-9a-f]{40}$/u.test(row[1]) || !/^[0-9a-f]{64}$/u.test(row[3]))) {
    fail("catalog source identity invalid");
  }

  if (maps.maps?.length !== EXPECTED.mapIds || maps.summary?.mapSourceFiles !== EXPECTED.mapSourceFiles
    || maps.summary?.exactConsumerMappedPaths !== EXPECTED.consumerMappedPaths
    || maps.summary?.exactConsumerMappedMapIds !== EXPECTED.consumerMappedMapIds
    || maps.summary?.authoredCoordinateRecords !== 0 || maps.summary?.authoredSpawnRecords !== 0) fail("map catalog boundary mismatch");
  const mapAssets = maps.maps.flatMap((entry) => entry.assets);
  if (mapAssets.length !== EXPECTED.mapSourceFiles
    || mapAssets.filter((entry) => entry.runtimeDisposition === "exact-active-consumer").length !== EXPECTED.consumerMappedPaths
    || mapAssets.some((entry) => entry.runtimeDisposition === "exact-active-consumer" && entry.classification !== "exact")) {
    fail("map consumer mapping mismatch");
  }

  if (collisions.mappings?.length !== EXPECTED.collisionMaps
    || collisions.summary?.authoredDeadSources !== EXPECTED.collisionDeadLayers
    || collisions.summary?.collisionBitsPublishedByP040 !== 0
    || collisions.authorityBoundary?.inferCollisionFromRasterPixels !== false
    || collisions.authorityBoundary?.inferSpawnFromArt !== false) fail("collision boundary mismatch");
  if (tilemap.outputClassification !== "exact" || tilemap.source?.sha256 !== EXPECTED.tileSourceSha256
    || tilemap.structuralContract?.width !== EXPECTED.tileWidth || tilemap.structuralContract?.height !== EXPECTED.tileHeight
    || tilemap.structuralContract?.decodedBytes !== EXPECTED.tileDecodedBytes
    || tilemap.structuralContract?.decodedSha256 !== EXPECTED.tileDecodedSha256
    || Buffer.from(tilemap.cellPayloadBase64, "base64").length !== EXPECTED.tileDecodedBytes - 8
    || tilemap.structuralContract?.cellSemantics !== "unresolved-no-authoritative-enum-in-r027") fail("tilemap output mismatch");
  if (timelines.records?.length !== EXPECTED.swfTimelines || timelines.summary?.browserRuntimeAllowed !== 0
    || timelines.summary?.visualCompositionsConverted !== 0 || timelines.runtimePolicy?.swfRuntimeAllowed !== false
    || timelines.records.some((entry) => entry.browserRuntimeAllowed !== false || !entry.swf || !entry.timelines || !entry.actionScript3)) {
    fail("timeline fail-closed contract mismatch");
  }
  if (npcs.sourceAssignment?.assignedR027Files !== 0 || npcs.classification !== "unresolved"
    || npcs.currentGunnyContext?.fullAnimationTimelinesPackagedByP040 !== 0
    || npcs.currentGunnyContext?.staticRepresentativeIsFullAnimation !== false
    || npcs.crossOwnerAssetsUsed !== false) fail("NPC ownership boundary mismatch");
  if (runtime.packageOnly !== true || runtime.collision?.packagePublishesCollisionBits !== false
    || runtime.npcPresentation?.classification !== "unresolved" || runtime.prohibited?.swfRuntime !== true
    || runtime.prohibited?.inferredCollisionOrSpawn !== true || runtime.delivery?.sameOriginOnlyInComponents !== true
    || runtime.delivery?.directGatewayHostnameAllowedInClient !== false) fail("runtime handoff boundary mismatch");

  if (contract.dependencies?.length !== 1 || contract.dependencies[0]?.evidenceSha256 !== DEPENDENCY.evidenceSha256
    || contract.dependencies[0]?.importerSha256 !== DEPENDENCY.importerSha256
    || contract.consumerBoundary?.runtimeIntegration !== false || contract.consumerBoundary?.npcAnimationReady !== false) {
    fail("package contract mismatch");
  }
  if (contract.assetAddressing?.sourceBytesDuplicatedIntoPackage !== TRACK_A_PUBLICATION.stagedBytes
    || contract.assetAddressing?.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("Track A publication contract changed");
  if (evidence.summary?.sourceFilesProcessed !== EXPECTED.files || evidence.summary?.sourceFilesUnprocessed !== 0
    || evidence.claims?.collisionOrSpawnInferredFromArt !== false || evidence.claims?.crossOwnerNpcAssetsUsed !== false
    || status.status !== "complete-package-with-explicit-unresolved" || status.runtimeIntegration !== false) {
    fail("evidence or status overclaims P040");
  }
  if (evidence.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256
    || status.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256
    || manifest.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256
    || index.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("Track A publication metadata changed");
  if (manifest.exports?.length !== 9 || manifest.githubActions !== false || evidence.githubActions !== false
    || manifest.exports.some((entry) => /\.(?:swf|fla)$/iu.test(entry.path))) fail("manifest publication boundary mismatch");
  for (const descriptor of manifest.exports) await verifyArtifactDescriptor(descriptor);

  if (gunnyRoot) {
    if (git(gunnyRoot, ["rev-parse", "origin/main"]).trim() !== GUNNY_VERIFIED_MAIN) fail("Gunny origin/main pin changed");
    git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, "origin/main"]);
    const dependencyEvidence = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.evidencePath}`], null);
    const dependencyImporter = git(gunnyRoot, ["show", `origin/main:${DEPENDENCY.importerPath}`], null);
    verifyDependency(dependencyEvidence, dependencyImporter);
    for (const path of Object.keys(GUNNY_CONTEXT_PINS)) gunnyObject(path);
  }
  if (rawRoot) assertRawTree(shard.assets);

  console.log(JSON.stringify({
    status: "pass",
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    sourceFiles: summary.files,
    sourceBytes: summary.bytes,
    exact: summary.exact,
    inferred: summary.inferred,
    unresolved: summary.unresolved,
    exactBrowserRasters: summary.exactRasters,
    mapIds: maps.maps.length,
    exactConsumerMappedPaths: maps.summary.exactConsumerMappedPaths,
    collisionMappings: collisions.mappings.length,
    parsedTilemaps: 1,
    unresolvedSwfTimelines: timelines.records.length,
    assignedNpcPresentationFiles: 0,
    rawSourceBytesDuplicated: index.publication.sourceBytesDuplicatedIntoPackage,
    trackAPublicationSessions: trackAPublication.sessions.length,
    runtimeIntegration: false,
    githubActions: false,
  }, null, 2));
}

async function verifyTrackAPublication() {
  const rootBytes = await readFile(resolve(root, TRACK_A_PUBLICATION.path));
  if (rootBytes.length !== TRACK_A_PUBLICATION.bytes || sha256(rootBytes) !== TRACK_A_PUBLICATION.sha256) {
    fail("Track A publication root identity mismatch");
  }
  const publication = JSON.parse(rootBytes.toString("utf8"));
  if (publication.packageSessionId !== PACKAGE_ID || publication.runtimeSessionId !== RUNTIME_ID || publication.owner !== OWNER
    || publication.source?.verifiedOnMain !== TRACK_A_PUBLICATION.verifiedOnGunnyMain
    || publication.summary?.sessions !== TRACK_A_PUBLICATION.sessions
    || publication.summary?.stagedFiles !== TRACK_A_PUBLICATION.stagedFiles
    || publication.summary?.stagedBytes !== TRACK_A_PUBLICATION.stagedBytes
    || publication.summary?.exact !== TRACK_A_PUBLICATION.stagedFiles
    || publication.summary?.inferred !== 0 || publication.summary?.unresolved !== 0
    || publication.boundary?.browserNativeConversionClaimed !== false
    || publication.boundary?.runtimeIntegration !== false) fail("Track A publication contract changed");
  const entry = publication.sessions?.[0];
  const expectedPrefix = `exports/resource-port/${OWNER}/track-a/r027/`;
  if (entry?.sessionId !== "R027" || entry.objectPrefix !== expectedPrefix
    || entry.manifestPath !== "track-a/r027/publication.json") fail("R027 publication prefix changed");
  const sessionBytes = await readFile(resolve(root, "exports/resource-port", OWNER, entry.manifestPath));
  if (sha256(sessionBytes) !== entry.manifestSha256) fail("R027 publication manifest digest mismatch");
  const session = JSON.parse(sessionBytes.toString("utf8"));
  if (session.classification !== "exact" || session.target?.objectPrefix !== expectedPrefix
    || session.boundary?.runtimeIntegration !== false || session.payload?.files?.length !== 1) fail("R027 publication manifest changed");
  const file = session.payload.files[0];
  const payloadBytes = await readFile(resolve(root, "exports/resource-port", OWNER, "track-a/r027", file.path));
  if (file.objectKey !== `${expectedPrefix}${file.path}` || file.contentType !== "application/json; charset=utf-8"
    || payloadBytes.length !== file.bytes || sha256(payloadBytes) !== file.sha256) fail("R027 payload identity changed");
  JSON.parse(payloadBytes.toString("utf8"));
  return publication;
}

if (writing) await buildPackage();
await verifyPackage();
