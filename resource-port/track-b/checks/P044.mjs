#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";

const PACKAGE_ID = "P044";
const RUNTIME_ID = "R044";
const OWNER = "quests-events";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const RAW_PIN_SCAFFOLD_DIFF = Object.freeze([
  "D\tCNAME",
  "D\tcname",
  "D\tcrossdomain.xml",
  "D\tindex.html",
  "D\treadme.md",
  "D\trename.bat",
]);
const GUNNY_FOUNDATION_COMMIT = "85a40447689a056ba0135331cbbfed8d52f0ac25";
const DEPENDENCY = Object.freeze({
  sessionId: "R032",
  implementationCommit: "3d7a049655847ab6b7802541560ef227e17df1ed",
  evidencePath: "config/resource-port-evidence/R032.json",
  evidenceGitBlobSha1: "3dec3b3a7e3d9b672bf245fb8e01545c93ac2541",
  evidenceSha256: "1d3cbef90794dd2fe96deae0184ff08c6d1122edca3182a786a1f07d17680db5",
  importerPath: "scripts/import-resource-port-r032.mjs",
  importerGitBlobSha1: "3fa128f8b8e565d387550e349929000021c44b04",
  importerSha256: "ebe65ba9708086c0ff80d800dfe73829e519eaaff83432c233cffd72705f0a9b",
  shardPath: "config/resource-port-dispatch/shards/quests-events-001.json",
  shardGitBlobSha1: "8f345ae51e1904ef1affcd716329205f18452b82",
  shardSha256: "72500422e0ff53b5809dc23b9e7397838262283184f5c3d1fb0b0da2446676e1",
  sourceFiles: 774,
  sourceBytes: 33541657,
});
const SOURCE_FAMILIES = Object.freeze([
  "image/badgerole/",
  "image/badge/",
  "image/binglong/",
  "image/cardcollect/",
  "image/collectiontask/",
  "image/ddqiyuan/",
  "image/dice/",
  "image/explorermanual/",
  "image/honorbackground/",
  "image/leaguerank/",
  "image/sevendouble/",
  "image/task/",
  "image/weekly/",
  "image/yearfood/",
]);
const LOCKED_PATHS = Object.freeze([
  "exports/resource-port/quests-events/**",
  "resource-port/track-b/contracts/quests-events.json",
  "resource-port/track-b/evidence/P044.json",
  "resource-port/track-b/checks/P044.mjs",
  "resource-port/track-b/findings/P044.md",
  "resource-port/track-b/status/P044.json",
]);
const EXPECTED = Object.freeze({
  files: 774,
  bytes: 33541657,
  uniqueBlobs: 752,
  trackAExact: 699,
  trackAInferred: 0,
  trackAUnresolved: 75,
  packageExact: 702,
  packageInferred: 0,
  packageUnresolved: 72,
  rasterProfile: 701,
  swfProfile: 64,
  binaryProfile: 8,
  textProfile: 1,
  exactRawRaster: 698,
  correctedMappings: 3,
  correctedObjects: 3,
  correctedBytes: 144489,
  visualReady: 701,
  behaviorReady: 0,
  weeklyWeaponDuplicates: 55,
  eventOwnedSwfs: 9,
  ffdecOk: 64,
  embeddedSoundSwfs: 1,
  embeddedSounds: 5,
  weeklyEntries: 19,
  weeklyResolvedEntries: 0,
});
const EXPECTED_FAMILIES = Object.freeze({
  "image/badgerole/": Object.freeze({ files: 22, bytes: 102309, exact: 22, unresolved: 0 }),
  "image/badge/": Object.freeze({ files: 12, bytes: 64689, exact: 12, unresolved: 0 }),
  "image/binglong/": Object.freeze({ files: 1, bytes: 10130, exact: 1, unresolved: 0 }),
  "image/cardcollect/": Object.freeze({ files: 29, bytes: 614644, exact: 29, unresolved: 0 }),
  "image/collectiontask/": Object.freeze({ files: 1, bytes: 814464, exact: 0, unresolved: 1 }),
  "image/ddqiyuan/": Object.freeze({ files: 0, bytes: 0, exact: 0, unresolved: 0 }),
  "image/dice/": Object.freeze({ files: 12, bytes: 217687, exact: 12, unresolved: 0 }),
  "image/explorermanual/": Object.freeze({ files: 402, bytes: 2608123, exact: 402, unresolved: 0 }),
  "image/honorbackground/": Object.freeze({ files: 1, bytes: 2229, exact: 1, unresolved: 0 }),
  "image/leaguerank/": Object.freeze({ files: 14, bytes: 81717, exact: 14, unresolved: 0 }),
  "image/sevendouble/": Object.freeze({ files: 7, bytes: 1123474, exact: 0, unresolved: 7 }),
  "image/task/": Object.freeze({ files: 184, bytes: 2390349, exact: 177, unresolved: 7 }),
  "image/weekly/": Object.freeze({ files: 88, bytes: 24860432, exact: 32, unresolved: 56 }),
  "image/yearfood/": Object.freeze({ files: 1, bytes: 651410, exact: 0, unresolved: 1 }),
});
const FOUNDATION_CODE_PATHS = Object.freeze([
  "src/client/source-quest.ts",
  "src/client/source-quest-modal-guard.ts",
  "src/client/source-activeevents.ts",
  "src/client/source-calendar.ts",
  "src/client/live-events.ts",
  "src/worker/quest-engine.ts",
  "src/worker/quest-routes.ts",
  "src/worker/live-event-routes.ts",
]);
const FOUNDATION_ASSET_ROOTS = Object.freeze([
  "public/game-ui/quest",
  "public/game-ui/calendar",
  "public/game-ui/activeevents",
  "public/game-ui/league",
]);
const CATALOG_COLUMNS = Object.freeze([
  "path",
  "gitBlobSha1",
  "bytes",
  "sha256",
  "trackAClassification",
  "packageClassification",
  "inspectionProfile",
  "detectedFormat",
  "contentType",
  "width",
  "height",
  "sourceFamily",
  "consumerRole",
  "consumerIdentity",
  "canonicalSourcePath",
  "packageOutput",
  "visualReady",
  "behaviorReady",
  "retirement",
  "dependencySessionId",
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
const exportRoot = resolve(root, "exports/resource-port/quests-events");
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
const pinnedBlobCache = new Map();

async function readPinnedSource(file) {
  const path = resolve(rawRoot, ...file.path.split("/"));
  assertInside(path, rawRoot, file.path);
  try {
    const materialized = await readFile(path);
    if (materialized.length === file.bytes && sha256(materialized) === file.sha256) {
      return { bytes: materialized, retrieval: "working-tree-verified" };
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  let bytes = pinnedBlobCache.get(file.gitBlobSha1);
  if (!bytes) {
    bytes = Buffer.from(git(rawRoot, ["cat-file", "blob", file.gitBlobSha1], null));
    pinnedBlobCache.set(file.gitBlobSha1, bytes);
  }
  if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
    fail(`pinned Git blob differs from R032 evidence: ${file.path}`);
  }
  return { bytes, retrieval: "git-cat-file-fallback" };
}

function assertInside(path, parent, label) {
  const child = resolve(path);
  const boundary = `${resolve(parent)}${sep}`;
  if (!child.startsWith(boundary)) fail(`${label} escaped ${parent}`);
}

function sourceFamily(path) {
  return SOURCE_FAMILIES.find((prefix) => path.startsWith(prefix)) ?? null;
}

function contentTypeFor(format) {
  if (format === "png") return "image/png";
  if (format === "jpeg") return "image/jpeg";
  if (format === "xml") return "application/xml";
  return null;
}

function consumerRole(path) {
  if (path.startsWith("image/badgerole/")) return "badge-role-icon";
  if (path.startsWith("image/badge/")) return "badge-icon";
  if (path.startsWith("image/binglong/")) return "binglong-family-icon";
  if (path.startsWith("image/cardcollect/")) return "card-collection-icon";
  if (path.startsWith("image/collectiontask/")) return "collection-task-timeline";
  if (path.startsWith("image/ddqiyuan/")) return "ddqiyuan-family-asset";
  if (path.startsWith("image/dice/")) return "dice-avatar-layer";
  if (path.startsWith("image/explorermanual/")) return "explorer-manual-art";
  if (path.startsWith("image/honorbackground/")) return "honor-background-art";
  if (path.startsWith("image/leaguerank/")) return "league-rank-icon";
  if (path.startsWith("image/sevendouble/")) return "seven-double-timeline";
  if (path.startsWith("image/task/")) return "task-source-art";
  if (path === "image/weekly/weeklyinfo.xml") return "weekly-source-metadata";
  if (path.startsWith("image/weekly/weapon/")) return "weekly-weapon-legacy-duplicate";
  if (path.startsWith("image/weekly/")) return "weekly-presentation-art";
  if (path.startsWith("image/yearfood/")) return "year-food-timeline";
  return "unassigned";
}

function consumerIdentity(path, family) {
  return path.slice(family.length).replace(/\.[^.]+$/u, "");
}

function rasterDetails(file) {
  const details = file.evidence?.details ?? {};
  return {
    width: details.width ?? null,
    height: details.height ?? null,
  };
}

function correctedOutput(file) {
  const extension = file.detectedFormat === "jpeg" ? "jpg" : "png";
  return `exports/resource-port/quests-events/raster/${file.sha256}.${extension}`;
}

function resolutionRecords(files) {
  return files.map((file) => {
    const family = sourceFamily(file.path);
    if (!family) fail(`path outside P044 source families: ${file.path}`);
    const corrected = file.classification === "unresolved"
      && file.inspectionProfile === "raster"
      && file.evidence?.valid === true
      && ["png", "jpeg"].includes(file.detectedFormat);
    const exact = file.classification === "exact" || corrected;
    const dimensions = rasterDetails(file);
    const weeklyDuplicate = file.path.startsWith("image/weekly/weapon/")
      ? file.path.slice("image/".length)
      : null;
    return {
      file,
      family,
      packageClassification: exact ? "exact" : file.classification,
      contentType: exact ? contentTypeFor(file.detectedFormat) : null,
      width: dimensions.width,
      height: dimensions.height,
      consumerRole: consumerRole(file.path),
      consumerIdentity: consumerIdentity(file.path, family),
      canonicalSourcePath: exact ? file.path : null,
      packageOutput: corrected ? correctedOutput(file) : null,
      visualReady: exact && file.inspectionProfile === "raster",
      behaviorReady: false,
      retirement: weeklyDuplicate
        ? { status: "duplicate-unresolved-in-P038", canonicalSourcePath: weeklyDuplicate }
        : null,
    };
  });
}

function catalogRow(record) {
  const file = record.file;
  return [
    file.path,
    file.gitBlobSha1,
    file.bytes,
    file.sha256,
    file.classification,
    record.packageClassification,
    file.inspectionProfile,
    file.detectedFormat,
    record.contentType,
    record.width,
    record.height,
    record.family,
    record.consumerRole,
    record.consumerIdentity,
    record.canonicalSourcePath,
    record.packageOutput,
    record.visualReady,
    record.behaviorReady,
    record.retirement,
    DEPENDENCY.sessionId,
  ];
}

function summarize(records) {
  const families = Object.fromEntries(SOURCE_FAMILIES.map((family) => [family, {
    files: 0,
    bytes: 0,
    exact: 0,
    inferred: 0,
    unresolved: 0,
  }]));
  const summary = {
    files: records.length,
    bytes: records.reduce((total, record) => total + record.file.bytes, 0),
    uniqueBlobs: new Set(records.map((record) => record.file.gitBlobSha1)).size,
    trackA: { exact: 0, inferred: 0, unresolved: 0 },
    package: { exact: 0, inferred: 0, unresolved: 0 },
    profiles: {},
    families,
    exactRawRaster: records.filter((record) => (
      record.file.classification === "exact" && record.file.inspectionProfile === "raster"
    )).length,
    correctedMappings: records.filter((record) => record.packageOutput).length,
    correctedObjects: new Set(records.filter((record) => record.packageOutput).map((record) => record.packageOutput)).size,
    visualReady: records.filter((record) => record.visualReady).length,
    behaviorReady: records.filter((record) => record.behaviorReady).length,
  };
  for (const record of records) {
    summary.trackA[record.file.classification] += 1;
    summary.package[record.packageClassification] += 1;
    summary.profiles[record.file.inspectionProfile] = (summary.profiles[record.file.inspectionProfile] ?? 0) + 1;
    const family = summary.families[record.family];
    family.files += 1;
    family.bytes += record.file.bytes;
    family[record.packageClassification] += 1;
  }
  return summary;
}

function assertSummary(summary) {
  const checks = [
    [summary.files, EXPECTED.files, "files"],
    [summary.bytes, EXPECTED.bytes, "bytes"],
    [summary.uniqueBlobs, EXPECTED.uniqueBlobs, "unique blobs"],
    [summary.trackA.exact, EXPECTED.trackAExact, "Track A exact"],
    [summary.trackA.inferred, EXPECTED.trackAInferred, "Track A inferred"],
    [summary.trackA.unresolved, EXPECTED.trackAUnresolved, "Track A unresolved"],
    [summary.package.exact, EXPECTED.packageExact, "package exact"],
    [summary.package.inferred, EXPECTED.packageInferred, "package inferred"],
    [summary.package.unresolved, EXPECTED.packageUnresolved, "package unresolved"],
    [summary.profiles.raster, EXPECTED.rasterProfile, "raster profile"],
    [summary.profiles["swf-timeline"], EXPECTED.swfProfile, "SWF profile"],
    [summary.profiles["binary-unknown"], EXPECTED.binaryProfile, "binary profile"],
    [summary.profiles["text-data"], EXPECTED.textProfile, "text profile"],
    [summary.exactRawRaster, EXPECTED.exactRawRaster, "exact raw raster"],
    [summary.correctedMappings, EXPECTED.correctedMappings, "corrected mappings"],
    [summary.correctedObjects, EXPECTED.correctedObjects, "corrected objects"],
    [summary.visualReady, EXPECTED.visualReady, "visual ready"],
    [summary.behaviorReady, EXPECTED.behaviorReady, "behavior ready"],
  ];
  for (const [actual, expected, label] of checks) {
    if (actual !== expected) fail(`${label} changed: ${actual}`);
  }
  for (const [family, expected] of Object.entries(EXPECTED_FAMILIES)) {
    if (JSON.stringify(summary.families[family]) !== JSON.stringify({
      files: expected.files,
      bytes: expected.bytes,
      exact: expected.exact,
      inferred: 0,
      unresolved: expected.unresolved,
    })) fail(`family census changed: ${family}`);
  }
}

function imageDimensions(bytes, contentType, label) {
  if (contentType === "image/png") {
    if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      fail(`${label} is not PNG`);
    }
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (contentType !== "image/jpeg" || bytes.length < 4
    || bytes[0] !== 0xff || bytes[1] !== 0xd8
    || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) fail(`${label} is not JPEG`);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  fail(`${label} JPEG dimensions are missing`);
}

function verifyPinnedGitObject(repositoryRoot, path, blob, digest) {
  const bytes = git(repositoryRoot, ["show", `origin/main:${path}`], null);
  const actualBlob = git(repositoryRoot, ["rev-parse", `origin/main:${path}`]).trim();
  if (actualBlob !== blob || sha256(bytes) !== digest) fail(`Gunny pin mismatch: ${path}`);
  return bytes;
}

function verifyDependency(repositoryRoot) {
  git(repositoryRoot, ["merge-base", "--is-ancestor", DEPENDENCY.implementationCommit, "origin/main"]);
  git(repositoryRoot, ["merge-base", "--is-ancestor", GUNNY_FOUNDATION_COMMIT, "origin/main"]);
  const evidenceBytes = verifyPinnedGitObject(
    repositoryRoot,
    DEPENDENCY.evidencePath,
    DEPENDENCY.evidenceGitBlobSha1,
    DEPENDENCY.evidenceSha256,
  );
  verifyPinnedGitObject(
    repositoryRoot,
    DEPENDENCY.importerPath,
    DEPENDENCY.importerGitBlobSha1,
    DEPENDENCY.importerSha256,
  );
  verifyPinnedGitObject(
    repositoryRoot,
    DEPENDENCY.shardPath,
    DEPENDENCY.shardGitBlobSha1,
    DEPENDENCY.shardSha256,
  );
  const evidence = JSON.parse(evidenceBytes.toString("utf8"));
  if (
    evidence.sessionId !== DEPENDENCY.sessionId
    || evidence.owner !== OWNER
    || evidence.status !== "complete-with-explicit-unresolved"
    || evidence.source?.commit !== SOURCE_COMMIT
    || evidence.source?.tree !== SOURCE_TREE
    || evidence.shard?.path !== DEPENDENCY.shardPath
    || evidence.shard?.sha256 !== DEPENDENCY.shardSha256
    || evidence.summary?.files !== EXPECTED.files
    || evidence.summary?.bytes !== EXPECTED.bytes
    || evidence.completion?.trackBDependencySatisfied !== true
  ) fail("R032 dependency contract mismatch");
  return {
    evidence,
    record: {
      ...DEPENDENCY,
      verifiedOnGunnyMain: GUNNY_FOUNDATION_COMMIT,
      trackBDependencySatisfied: true,
    },
  };
}

function parseTreeEntries(bytes, rootPath) {
  const entries = [];
  for (const record of bytes.toString("utf8").split("\0").filter(Boolean)) {
    const match = /^(\d+) blob ([0-9a-f]{40})\s+(\d+)\t(.+)$/u.exec(record);
    if (!match) continue;
    entries.push({
      root: rootPath,
      path: match[4],
      gitBlobSha1: match[2],
      bytes: Number(match[3]),
    });
  }
  return entries;
}

function foundationAudit(repositoryRoot) {
  const code = FOUNDATION_CODE_PATHS.map((path) => {
    const bytes = git(repositoryRoot, ["show", `${GUNNY_FOUNDATION_COMMIT}:${path}`], null);
    return {
      path,
      gitBlobSha1: git(repositoryRoot, ["rev-parse", `${GUNNY_FOUNDATION_COMMIT}:${path}`]).trim(),
      bytes: bytes.length,
      sha256: sha256(bytes),
    };
  });
  const roots = FOUNDATION_ASSET_ROOTS.map((path) => {
    const entries = parseTreeEntries(
      git(repositoryRoot, ["ls-tree", "-lr", "-z", GUNNY_FOUNDATION_COMMIT, "--", path], null),
      path,
    );
    return {
      path,
      files: entries,
      summary: {
        files: entries.length,
        bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        uniqueBlobs: new Set(entries.map((entry) => entry.gitBlobSha1)).size,
      },
      identitySha256: sha256(Buffer.from(stableJson(entries), "utf8")),
    };
  });
  const text = Object.fromEntries(FOUNDATION_CODE_PATHS.map((path) => [
    path,
    git(repositoryRoot, ["show", `${GUNNY_FOUNDATION_COMMIT}:${path}`]),
  ]));
  if (!text["src/client/source-quest.ts"].includes("/api/quests")
    || !text["src/client/source-calendar.ts"].includes("/api/daily")
    || !text["src/client/source-calendar.ts"].includes("/api/daily/claim")
    || !text["src/client/live-events.ts"].includes("/api/live-events")
    || !text["src/worker/quest-routes.ts"].includes("claimQuestRule")
    || !text["src/worker/live-event-routes.ts"].includes("runScheduledOperations")) {
    fail("Gunny quest/event authority foundation changed");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    foundation: {
      repository: "trinhtanphat/Gunny",
      immutableCommit: GUNNY_FOUNDATION_COMMIT,
      code,
      roots,
      summary: {
        codeFiles: code.length,
        assetFiles: roots.reduce((total, entry) => total + entry.summary.files, 0),
        assetBytes: roots.reduce((total, entry) => total + entry.summary.bytes, 0),
        duplicatedIntoP044: 0,
      },
    },
    authority: {
      questProgressRewardsAndClaims: "Gunny Worker/API",
      liveEventDatesEligibilityAndScheduling: "Gunny Worker/API",
      calendarResetAndClaimState: "Gunny Worker/API",
      p044ArtworkBusinessAuthority: false,
    },
  };
}

async function verifyRawSource(evidence, records) {
  if (!rawRoot) return { verified: false, files: 0, bytes: 0, weeklyWeaponDuplicates: 0 };
  const head = git(rawRoot, ["rev-parse", "HEAD"]).trim();
  const tree = git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim();
  if (head !== SOURCE_COMMIT || tree !== SOURCE_TREE) fail("raw Resource checkout pin mismatch");
  const rawPinDiff = git(rawRoot, ["diff", "--name-status"]).trim().split(/\r?\n/u).filter(Boolean);
  if (JSON.stringify(rawPinDiff) !== JSON.stringify(RAW_PIN_SCAFFOLD_DIFF)) {
    fail(`raw Resource checkout differs outside the known junction scaffold: ${rawPinDiff.join(", ") || "none"}`);
  }
  let bytesTotal = 0;
  let weeklyWeaponDuplicates = 0;
  let pinnedBlobFallbacks = 0;
  for (const file of evidence.files) {
    const source = await readPinnedSource(file);
    const bytes = source.bytes;
    if (source.retrieval === "git-cat-file-fallback") pinnedBlobFallbacks += 1;
    bytesTotal += bytes.length;
    if (file.path.startsWith("image/weekly/weapon/")) {
      const duplicatePath = resolve(rawRoot, ...file.path.slice("image/".length).split("/"));
      assertInside(duplicatePath, rawRoot, `duplicate ${file.path}`);
      const duplicateBytes = await readFile(duplicatePath);
      if (duplicateBytes.length !== bytes.length || sha256(duplicateBytes) !== file.sha256) {
        fail(`weekly weapon duplicate changed: ${file.path}`);
      }
      weeklyWeaponDuplicates += 1;
    }
  }
  if (bytesTotal !== EXPECTED.bytes || weeklyWeaponDuplicates !== EXPECTED.weeklyWeaponDuplicates) {
    fail("raw source aggregate mismatch");
  }
  for (const record of records.filter((entry) => entry.packageOutput)) {
    const { bytes } = await readPinnedSource(record.file);
    const dimensions = imageDimensions(bytes, record.contentType, record.file.path);
    if (dimensions.width !== record.width || dimensions.height !== record.height) {
      fail(`corrected raster dimensions changed: ${record.file.path}`);
    }
  }
  return {
    verified: true,
    files: evidence.files.length,
    bytes: bytesTotal,
    weeklyWeaponDuplicates,
    pinnedBlobFallbacks,
    junctionScaffoldOmissions: RAW_PIN_SCAFFOLD_DIFF.map((entry) => entry.slice(2)),
  };
}

function parseAttributes(fragment) {
  return Object.fromEntries(Array.from(fragment.matchAll(/([A-Za-z][A-Za-z0-9]*)="([^"]*)"/gu), (match) => [match[1], match[2]]));
}

async function weeklyPublicationCatalog(records) {
  const record = records.find((entry) => entry.file.path === "image/weekly/weeklyinfo.xml");
  if (!record || record.packageClassification !== "exact" || !rawRoot) fail("weeklyinfo.xml source missing");
  const { bytes: xmlBytes } = await readPinnedSource(record.file);
  if (sha256(xmlBytes) !== record.file.sha256) fail("weeklyinfo.xml digest changed");
  const xml = xmlBytes.toString("utf8");
  const rootMatch = /^\s*<Result\s+([^>]+)>/u.exec(xml);
  if (!rootMatch) fail("weeklyinfo.xml root is invalid");
  const metadata = parseAttributes(rootMatch[1]);
  const sourcePaths = new Set(records.map((entry) => entry.file.path));
  const entries = Array.from(xml.matchAll(/<item\s+([^>]+)\/>/gu), (match, index) => {
    const item = parseAttributes(match[1]);
    const candidate = `image/weekly/${item.path}`;
    const resolvedSourcePath = sourcePaths.has(candidate) ? candidate : null;
    return {
      sourceIndex: index,
      type: item.type ?? null,
      path: item.path ?? null,
      targetCategory: item.targetCategory ?? null,
      targetPage: item.targetPage ?? null,
      resolvedSourcePath,
      visualReady: resolvedSourcePath !== null,
      behaviorReady: false,
      enabled: false,
      disabledReason: resolvedSourcePath
        ? "R044-server-schedule-and-navigation-required"
        : "referenced-source-not-in-R032-shard",
    };
  });
  if (entries.length !== EXPECTED.weeklyEntries
    || entries.filter((entry) => entry.resolvedSourcePath).length !== EXPECTED.weeklyResolvedEntries) {
    fail("weekly publication reference census changed");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    source: {
      path: record.file.path,
      bytes: record.file.bytes,
      sha256: record.file.sha256,
      metadata,
    },
    entries,
    summary: {
      entries: entries.length,
      resolvedSourceEntries: entries.filter((entry) => entry.resolvedSourcePath).length,
      visualReady: entries.filter((entry) => entry.visualReady).length,
      behaviorReady: 0,
      enabled: 0,
    },
    authority: {
      sourceNextDateIsRuntimeSchedule: false,
      sourceTargetCategoryIsNavigationAuthority: false,
      sourceTargetPageIsNavigationAuthority: false,
      activeScheduleEligibilityRewardsAndReset: "Gunny Worker/API",
    },
  };
}

function timelineEvidence(records) {
  const entries = records.filter((record) => record.file.inspectionProfile === "swf-timeline").map((record) => {
    const structural = record.file.evidence?.structural?.details ?? {};
    const ffdec = record.file.evidence?.ffdec ?? {};
    const embeddedSounds = ffdec.rootTagCounts?.DefineSound ?? 0;
    return {
      path: record.file.path,
      bytes: record.file.bytes,
      sha256: record.file.sha256,
      trackAClassification: record.file.classification,
      packageClassification: record.packageClassification,
      structural,
      ffdec: {
        schema: ffdec.schema ?? null,
        toolFingerprint: ffdec.toolFingerprint ?? null,
        status: ffdec.status ?? null,
        swf: ffdec.swf ?? null,
        rootTagCounts: ffdec.rootTagCounts ?? {},
        linkages: ffdec.linkages ?? null,
        rootTimeline: ffdec.timelines?.root ?? null,
        childTimelines: ffdec.timelines?.characters ?? null,
        actionScriptSummary: ffdec.actionScript3?.summary ?? null,
      },
      embeddedSounds,
      duplicateOf: record.retirement?.canonicalSourcePath ?? null,
      visualReady: false,
      behaviorReady: false,
      browserRuntimeEnabled: false,
      unresolvedReason: record.retirement
        ? "exact duplicate of unresolved P038 weekly weapon SWF; no P044 event consumer"
        : embeddedSounds > 0
          ? "embedded audio requires reviewed browser-native extraction and event trigger authority"
          : "child timeline composition and TypeScript behavior are not fully evidenced",
    };
  });
  const summary = {
    swfs: entries.length,
    ffdecOk: entries.filter((entry) => entry.ffdec.status === "ok").length,
    weeklyWeaponDuplicates: entries.filter((entry) => entry.duplicateOf).length,
    eventOwnedSwfs: entries.filter((entry) => !entry.duplicateOf).length,
    embeddedSoundSwfs: entries.filter((entry) => entry.embeddedSounds > 0).length,
    embeddedSounds: entries.reduce((total, entry) => total + entry.embeddedSounds, 0),
    visualReady: entries.filter((entry) => entry.visualReady).length,
    behaviorReady: entries.filter((entry) => entry.behaviorReady).length,
  };
  const expected = [
    [summary.swfs, EXPECTED.swfProfile],
    [summary.ffdecOk, EXPECTED.ffdecOk],
    [summary.weeklyWeaponDuplicates, EXPECTED.weeklyWeaponDuplicates],
    [summary.eventOwnedSwfs, EXPECTED.eventOwnedSwfs],
    [summary.embeddedSoundSwfs, EXPECTED.embeddedSoundSwfs],
    [summary.embeddedSounds, EXPECTED.embeddedSounds],
    [summary.visualReady, 0],
    [summary.behaviorReady, 0],
  ];
  if (expected.some(([actual, wanted]) => actual !== wanted)) fail("SWF timeline census changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    toolchain: {
      ffdecVersion: "26.2.1",
      toolFingerprint: entries[0]?.ffdec.toolFingerprint ?? null,
    },
    entries,
    summary,
    policy: {
      metadataIsRuntimePlayback: false,
      legacySwfRuntimeAllowed: false,
      visualReadyRequiresReviewedComposition: true,
      behaviorReadyRequiresTypeScriptPortAndServerAuthority: true,
    },
  };
}

function visualSurfaceCatalog(records) {
  const assets = records.filter((record) => record.visualReady).map((record) => ({
    path: record.file.path,
    gitBlobSha1: record.file.gitBlobSha1,
    bytes: record.file.bytes,
    sha256: record.file.sha256,
    contentType: record.contentType,
    width: record.width,
    height: record.height,
    sourceFamily: record.family,
    consumerRole: record.consumerRole,
    consumerIdentity: record.consumerIdentity,
    canonicalSourcePath: record.canonicalSourcePath,
    packageOutput: record.packageOutput,
    visualOnly: true,
    behaviorReady: false,
  }));
  if (assets.length !== EXPECTED.visualReady
    || assets.some((asset) => !asset.consumerRole || !asset.consumerIdentity
      || !asset.contentType || !asset.width || !asset.height)) {
    fail("visual surface catalog mapping is incomplete");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    assets,
    summary: {
      assets: assets.length,
      rawExact: assets.filter((asset) => !asset.packageOutput).length,
      corrected: assets.filter((asset) => asset.packageOutput).length,
      visualOnly: assets.length,
      behaviorReady: 0,
    },
    semantics: {
      identityFromExactSourcePath: true,
      filenameOnlySelectionAllowed: false,
      nearbyIdSelectionAllowed: false,
      artworkDefinesDateRewardEligibilityResetOrProgression: false,
    },
  };
}

async function listFiles(directory, prefix = "") {
  const output = [];
  for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) output.push(...await listFiles(directory, path));
    else output.push(path);
  }
  return output.sort((left, right) => left.localeCompare(right, "en"));
}

async function descriptor(path) {
  const bytes = await readFile(resolve(root, path));
  return {
    path,
    bytes: bytes.length,
    sha256: sha256(bytes),
    contentType: path.endsWith(".json")
      ? "application/json"
      : path.endsWith(".png")
        ? "image/png"
        : path.endsWith(".jpg")
          ? "image/jpeg"
          : "text/plain",
  };
}

async function buildPackage() {
  if (!gunnyRoot || !rawRoot) fail("--write requires --gunny-root and --raw-root");
  const dependency = verifyDependency(gunnyRoot);
  const records = resolutionRecords(dependency.evidence.files);
  const summary = summarize(records);
  assertSummary(summary);
  const rawAudit = await verifyRawSource(dependency.evidence, records);
  const foundation = foundationAudit(gunnyRoot);
  const weekly = await weeklyPublicationCatalog(records);
  const timelines = timelineEvidence(records);
  const visuals = visualSurfaceCatalog(records);

  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(exportRoot, { recursive: true });
  await writeFile(resolve(exportRoot, ".gitattributes"), "* -text whitespace=cr-at-eol\n", "utf8");
  for (const record of records.filter((entry) => entry.packageOutput)) {
    const target = resolve(root, record.packageOutput);
    assertInside(target, exportRoot, record.packageOutput);
    await mkdir(dirname(target), { recursive: true });
    const { bytes } = await readPinnedSource(record.file);
    await writeFile(target, bytes);
  }

  const catalog = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    dependencySessionId: DEPENDENCY.sessionId,
    sourceCommit: SOURCE_COMMIT,
    columns: CATALOG_COLUMNS,
    summary,
    assets: records.map(catalogRow),
  };
  await writeJson("exports/resource-port/quests-events/catalog/r032.json", catalog);
  await writeJson("exports/resource-port/quests-events/visual-surface-catalog.json", visuals);
  await writeJson("exports/resource-port/quests-events/timeline-evidence.json", timelines);
  await writeJson("exports/resource-port/quests-events/weekly-publication-catalog.json", weekly);
  await writeJson("exports/resource-port/quests-events/foundation-audit.json", foundation);
  await writeJson("exports/resource-port/quests-events/presentation-state-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    surfaces: Object.entries(summary.families).map(([family, familySummary]) => ({
      sourceFamily: family,
      consumerNamespace: family.replace(/^image\//u, "").replace(/\/$/u, ""),
      files: familySummary.files,
      visualReady: records.filter((record) => record.family === family && record.visualReady).length,
      behaviorReady: 0,
      unresolved: familySummary.unresolved,
    })),
    states: {
      exactStaticArtIsVisualOnly: true,
      hoverSelectedDisabledStatesFromArtwork: false,
      timelineMetadataIsPlayback: false,
      sourceDateIsActiveSchedule: false,
      sourcePathOrNumericTokenDefinesRewardEligibilityOrProgression: false,
    },
    authority: {
      datesRewardsEligibilityResetScheduleAndProgression: "Gunny Worker/API",
      packageProvidesBusinessBehavior: false,
      clientBusinessAuthority: false,
    },
  });
  await writeJson("exports/resource-port/quests-events/runtime-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    packageOnly: true,
    sourcePin: SOURCE_COMMIT,
    consumerBoundary: {
      runtimeIntegration: false,
      nextSession: RUNTIME_ID,
      exactSourceIdentityRequired: true,
      visualReadyAssets: EXPECTED.visualReady,
      behaviorReadyAssets: EXPECTED.behaviorReady,
      unresolvedAssetsDisabled: EXPECTED.packageUnresolved,
      immutableGunnyFoundationFallback: GUNNY_FOUNDATION_COMMIT,
    },
    prohibited: {
      swfRuntime: true,
      filenameOnlySelection: true,
      artworkDerivedDateRewardEligibilityResetOrProgression: true,
      clientBusinessAuthority: true,
      unresolvedAssetEnablement: true,
    },
  });

  const shardDescriptor = await descriptor("exports/resource-port/quests-events/catalog/r032.json");
  await writeJson("exports/resource-port/quests-events/catalog-index.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    owner: OWNER,
    columns: CATALOG_COLUMNS,
    summary,
    shards: [shardDescriptor],
  });
  const exportPaths = (await listFiles(exportRoot)).filter((path) => path !== "manifest.json");
  const exports = await Promise.all(exportPaths.map((path) => descriptor(`exports/resource-port/quests-events/${path}`)));
  const manifest = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    source: {
      repository: "trinhtanphat/Resource",
      commit: SOURCE_COMMIT,
      tree: SOURCE_TREE,
      readOnly: true,
    },
    dependencies: [dependency.record],
    summary,
    conversion: {
      rawSourceFilesModified: 0,
      exactRawRasterMappings: EXPECTED.exactRawRaster,
      correctedRasterMappings: EXPECTED.correctedMappings,
      correctedRasterObjects: EXPECTED.correctedObjects,
      correctedRasterBytes: EXPECTED.correctedBytes,
      visualReadyAssets: EXPECTED.visualReady,
      behaviorReadyAssets: EXPECTED.behaviorReady,
      swfMetadataRecords: EXPECTED.swfProfile,
      swfRuntimeContainersPublished: 0,
      binaryQuarantineRecords: EXPECTED.binaryProfile,
      weeklySourceMetadataRecords: 1,
      weeklyEnabledEntries: 0,
      runtimeIntegration: false,
    },
    exports,
    generatedAt: "2026-08-02T00:00:00Z",
    githubActions: false,
  };
  await writeJson("exports/resource-port/quests-events/manifest.json", manifest);

  const checks = {
    dependencyEvidencePin: "pass",
    dependencyImporterPin: "pass",
    dependencyImporterCheck: "pass: R032 774 files / 33541657 bytes / 699 exact / 75 unresolved",
    rawSourceHashAudit: `pass: ${rawAudit.files} files / ${rawAudit.bytes} bytes`,
    rawPinnedBlobRetrievalAudit: `pass: ${rawAudit.pinnedBlobFallbacks} materialized mismatches read from immutable Git blobs`,
    weeklyWeaponDuplicateAudit: `pass: ${rawAudit.weeklyWeaponDuplicates} exact duplicates of P038-owned unresolved SWFs`,
    ffdecEvidenceAudit: `pass: ${timelines.summary.ffdecOk} metadata records using FFDec 26.2.1`,
    correctedRasterAudit: `pass: ${EXPECTED.correctedObjects} objects / ${EXPECTED.correctedBytes} bytes`,
    consumerMappingAudit: `pass: ${visuals.summary.assets} visual-ready mappings; ${EXPECTED.packageUnresolved} disabled mappings retained`,
    packageChecker: "pass",
    programVerifier: "pass",
    githubActionsUsed: false,
  };
  await writeJson("resource-port/track-b/contracts/quests-events.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P044-quests-events",
    sourcePin: SOURCE_COMMIT,
    sourceTree: SOURCE_TREE,
    dependencies: [dependency.record],
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    outputs: {
      manifest: "exports/resource-port/quests-events/manifest.json",
      catalogIndex: "exports/resource-port/quests-events/catalog-index.json",
      visualSurfaceCatalog: "exports/resource-port/quests-events/visual-surface-catalog.json",
      timelineEvidence: "exports/resource-port/quests-events/timeline-evidence.json",
      weeklyPublicationCatalog: "exports/resource-port/quests-events/weekly-publication-catalog.json",
      foundationAudit: "exports/resource-port/quests-events/foundation-audit.json",
      presentationStateContract: "exports/resource-port/quests-events/presentation-state-contract.json",
      runtimeContract: "exports/resource-port/quests-events/runtime-contract.json",
    },
    consumerBoundary: {
      exactSourceIdentityRequired: true,
      visualOnlyIsBehaviorReady: false,
      runtimeIntegration: false,
      nextSession: RUNTIME_ID,
      datesRewardsEligibilityResetScheduleAndProgression: "Gunny Worker/API",
      filenameOnlyOrNearbyIdSelectionAllowed: false,
      legacySwfRuntimeAllowed: false,
    },
    commitPolicy: ["P044", "P044-F"],
    mergeMethod: "rebase",
    githubActions: false,
  });
  await writeJson("resource-port/track-b/evidence/P044.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P044-quests-events",
    source: manifest.source,
    dependencies: [dependency.record],
    foundationSummary: foundation.foundation.summary,
    summary: {
      ...summary,
      catalogShards: 1,
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      runtimeIntegration: false,
    },
    conversion: manifest.conversion,
    checks,
    claims: {
      exactBrowserNativeMappings: EXPECTED.packageExact,
      correctedRasterMappings: EXPECTED.correctedMappings,
      visualReadyAssets: EXPECTED.visualReady,
      behaviorReadyAssets: EXPECTED.behaviorReady,
      visualOnlyCalledBehaviorReady: false,
      dateRewardEligibilityResetScheduleOrProgressionInferredFromArtwork: false,
      p044SwfBehaviorClaimedPorted: false,
      clientBusinessAuthority: false,
      runtimeIntegration: false,
    },
    publication: {
      immutablePackageCommitRequired: true,
      mutableBranchAllowed: false,
      immutableMergeCommit: null,
    },
    generatedAt: "2026-08-02T00:00:00Z",
    githubActions: false,
  });
  await writeJson("resource-port/track-b/status/P044.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    runtimeIntegration: false,
    sourcePin: SOURCE_COMMIT,
    summary: {
      ...summary,
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
    },
    checks,
    remainingRisks: [
      "64 SWF timeline containers remain metadata-only and disabled; 55 are exact duplicate weekly weapon SWFs already unresolved under P038",
      "the seven-double audio SWF contains 5 embedded sounds but lacks reviewed extraction, browser codec and event trigger authority",
      "8 binary objects remain quarantined, including PHP, BAT, RAR and zero-byte files",
      "19 weeklyinfo.xml entries reference source files absent from the R032 shard and remain disabled",
      "static artwork does not define dates, rewards, eligibility, reset schedules or progression semantics",
      "runtime selection, behavior and business authority belong to R044 and the Gunny Worker/API",
    ],
    publication: {
      immutableCommitRequired: true,
      mutableBranchAllowed: false,
      releaseCommit: null,
    },
  });
  await mkdir(resolve(root, "resource-port/track-b/findings"), { recursive: true });
  await writeFile(
    resolve(root, "resource-port/track-b/findings/P044.md"),
    "# P044 quests-events findings\n\nPending immutable package commit. Generated evidence is authoritative for census and conversion claims; this file is finalized by the findings-only P044-F commit.\n",
    "utf8",
  );
}

function recordsFromCatalog(catalog) {
  return catalog.assets.map((row) => ({
    file: {
      path: row[0],
      gitBlobSha1: row[1],
      bytes: row[2],
      sha256: row[3],
      classification: row[4],
      inspectionProfile: row[6],
      detectedFormat: row[7],
      dependencySessionId: row[19],
    },
    packageClassification: row[5],
    contentType: row[8],
    width: row[9],
    height: row[10],
    family: row[11],
    consumerRole: row[12],
    consumerIdentity: row[13],
    canonicalSourcePath: row[14],
    packageOutput: row[15],
    visualReady: row[16],
    behaviorReady: row[17],
    retirement: row[18],
  }));
}

async function verifyDescriptor(entry) {
  const bytes = await readFile(resolve(root, entry.path));
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail(`artifact changed: ${entry.path}`);
  if (entry.contentType === "application/json") JSON.parse(bytes.toString("utf8"));
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/quests-events/manifest.json");
  const catalogIndex = await json("exports/resource-port/quests-events/catalog-index.json");
  const catalog = await json("exports/resource-port/quests-events/catalog/r032.json");
  const visuals = await json("exports/resource-port/quests-events/visual-surface-catalog.json");
  const timelines = await json("exports/resource-port/quests-events/timeline-evidence.json");
  const weekly = await json("exports/resource-port/quests-events/weekly-publication-catalog.json");
  const foundation = await json("exports/resource-port/quests-events/foundation-audit.json");
  const states = await json("exports/resource-port/quests-events/presentation-state-contract.json");
  const runtime = await json("exports/resource-port/quests-events/runtime-contract.json");
  const contract = await json("resource-port/track-b/contracts/quests-events.json");
  const evidence = await json("resource-port/track-b/evidence/P044.json");
  const status = await json("resource-port/track-b/status/P044.json");
  if (
    manifest.packageSessionId !== PACKAGE_ID
    || manifest.runtimeSessionId !== RUNTIME_ID
    || manifest.owner !== OWNER
    || manifest.status !== "complete-package-with-explicit-unresolved"
    || manifest.source?.commit !== SOURCE_COMMIT
    || manifest.source?.tree !== SOURCE_TREE
  ) fail("manifest identity mismatch");
  if (JSON.stringify(catalog.columns) !== JSON.stringify(CATALOG_COLUMNS)
    || catalog.assets.length !== EXPECTED.files
    || catalog.dependencySessionId !== DEPENDENCY.sessionId) fail("catalog identity mismatch");
  const records = recordsFromCatalog(catalog);
  const summary = summarize(records);
  assertSummary(summary);
  if (new Set(records.map((record) => record.file.path)).size !== EXPECTED.files
    || records.some((record) => !sourceFamily(record.file.path)
      || record.family !== sourceFamily(record.file.path)
      || !/^[0-9a-f]{40}$/u.test(record.file.gitBlobSha1)
      || !/^[0-9a-f]{64}$/u.test(record.file.sha256)
      || !record.consumerRole || record.consumerRole === "unassigned")) {
    fail("catalog source identity or consumer mapping invalid");
  }
  if (JSON.stringify(catalogIndex.summary) !== JSON.stringify(summary)
    || catalogIndex.shards?.length !== 1) fail("catalog index mismatch");
  await verifyDescriptor(catalogIndex.shards[0]);
  if (visuals.assets?.length !== EXPECTED.visualReady
    || visuals.summary?.behaviorReady !== 0
    || visuals.semantics?.filenameOnlySelectionAllowed !== false
    || visuals.semantics?.artworkDefinesDateRewardEligibilityResetOrProgression !== false) {
    fail("visual surface contract overclaims behavior");
  }
  if (timelines.summary?.swfs !== EXPECTED.swfProfile
    || timelines.summary?.ffdecOk !== EXPECTED.ffdecOk
    || timelines.summary?.weeklyWeaponDuplicates !== EXPECTED.weeklyWeaponDuplicates
    || timelines.summary?.behaviorReady !== 0
    || timelines.policy?.legacySwfRuntimeAllowed !== false) fail("timeline evidence mismatch");
  if (weekly.summary?.entries !== EXPECTED.weeklyEntries
    || weekly.summary?.resolvedSourceEntries !== EXPECTED.weeklyResolvedEntries
    || weekly.summary?.enabled !== 0
    || weekly.authority?.sourceNextDateIsRuntimeSchedule !== false) fail("weekly publication contract overclaims readiness");
  if (foundation.foundation?.immutableCommit !== GUNNY_FOUNDATION_COMMIT
    || foundation.foundation?.summary?.duplicatedIntoP044 !== 0
    || foundation.authority?.p044ArtworkBusinessAuthority !== false) fail("foundation audit mismatch");
  if (states.states?.exactStaticArtIsVisualOnly !== true
    || states.states?.timelineMetadataIsPlayback !== false
    || states.authority?.packageProvidesBusinessBehavior !== false) fail("presentation state boundary mismatch");
  if (runtime.packageOnly !== true
    || runtime.consumerBoundary?.runtimeIntegration !== false
    || runtime.consumerBoundary?.behaviorReadyAssets !== 0
    || runtime.prohibited?.swfRuntime !== true
    || runtime.prohibited?.artworkDerivedDateRewardEligibilityResetOrProgression !== true) fail("runtime boundary mismatch");
  if (contract.sourcePin !== SOURCE_COMMIT
    || contract.dependencies?.length !== 1
    || contract.dependencies[0]?.evidenceSha256 !== DEPENDENCY.evidenceSha256
    || contract.dependencies[0]?.importerSha256 !== DEPENDENCY.importerSha256
    || contract.dependencies[0]?.shardSha256 !== DEPENDENCY.shardSha256
    || contract.consumerBoundary?.runtimeIntegration !== false) fail("package contract mismatch");
  if (evidence.summary?.sourceFilesProcessed !== EXPECTED.files
    || evidence.summary?.sourceFilesUnprocessed !== 0
    || evidence.claims?.behaviorReadyAssets !== 0
    || evidence.claims?.visualOnlyCalledBehaviorReady !== false
    || evidence.claims?.p044SwfBehaviorClaimedPorted !== false
    || status.status !== "complete-package-with-explicit-unresolved"
    || status.runtimeIntegration !== false) fail("evidence or status overclaims P044");
  for (const entry of manifest.exports) await verifyDescriptor(entry);
  let correctedBytes = 0;
  for (const record of records.filter((entry) => entry.packageOutput)) {
    const bytes = await readFile(resolve(root, record.packageOutput));
    const dimensions = imageDimensions(bytes, record.contentType, record.packageOutput);
    if (bytes.length !== record.file.bytes || sha256(bytes) !== record.file.sha256
      || dimensions.width !== record.width || dimensions.height !== record.height) {
      fail(`corrected raster mismatch: ${record.packageOutput}`);
    }
    correctedBytes += bytes.length;
  }
  if (correctedBytes !== EXPECTED.correctedBytes) fail("corrected raster byte aggregate changed");
  const exportFiles = await listFiles(exportRoot);
  if (exportFiles.some((path) => [".swf", ".php", ".bat", ".rar"].includes(extname(path).toLowerCase()))) {
    fail("P044 export contains a prohibited legacy or quarantined binary");
  }
  if (exportFiles.length !== manifest.exports.length + 1) fail(`export file count changed: ${exportFiles.length}`);
  if (gunnyRoot) {
    const dependency = verifyDependency(gunnyRoot);
    const expectedFoundation = foundationAudit(gunnyRoot);
    if (JSON.stringify(foundation) !== JSON.stringify(expectedFoundation)) fail("Gunny foundation audit drifted");
    if (dependency.evidence.files.length !== EXPECTED.files) fail("R032 evidence file census changed");
  }
  if (rawRoot) {
    const dependencyEvidence = gunnyRoot
      ? verifyDependency(gunnyRoot).evidence
      : null;
    if (!dependencyEvidence) fail("--raw-root verification also requires --gunny-root");
    await verifyRawSource(dependencyEvidence, records);
  }
  return {
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    status: "pass",
    sourceFiles: EXPECTED.files,
    exactBrowserNativeMappings: EXPECTED.packageExact,
    visualReadyAssets: EXPECTED.visualReady,
    behaviorReadyAssets: EXPECTED.behaviorReady,
    correctedRasterObjects: EXPECTED.correctedObjects,
    unresolvedObjects: EXPECTED.packageUnresolved,
    swfMetadataRecords: EXPECTED.swfProfile,
    runtimeIntegration: false,
  };
}

if (writing) await buildPackage();
console.log(JSON.stringify(await verifyPackage()));
