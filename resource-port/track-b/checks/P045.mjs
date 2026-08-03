#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { inflateSync } from "node:zlib";

const PACKAGE_ID = "P045";
const RUNTIME_ID = "R045";
const OWNER = "hall-room-world";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_FOUNDATION_COMMIT = "96a86885e23e5028e6654ed5b029870151b32d73";
const RAW_PIN_SCAFFOLD_DIFF = Object.freeze([
  "D\tCNAME",
  "D\tcname",
  "D\tcrossdomain.xml",
  "D\tindex.html",
  "D\treadme.md",
  "D\trename.bat",
]);
const DEPENDENCY = Object.freeze({
  sessionId: "R033",
  implementationCommit: "c6ed10b54c9fe79ab9fc3f307593210f9e855b95",
  evidencePath: "config/resource-port-evidence/R033.json",
  evidenceGitBlobSha1: "d3d49478e7daad52564f69e58bac522d0b8cbf82",
  evidenceSha256: "cf93befab436da47f2ee80cfd51d93e15dfda589ee28bbd8cadd6b8f9833a1fd",
  importerPath: "scripts/import-resource-port-r033.mjs",
  importerGitBlobSha1: "7bbdc3321e1cf46d2d99c2756aa72e231370d237",
  importerSha256: "3084eab49755cc8ecd8f6d35a26028ca0e50aff4bfa209eefebe48882da249ed",
  shardPath: "config/resource-port-dispatch/shards/hall-room-world-001.json",
  shardGitBlobSha1: "7bcc645d7c5b13a24cdb78ae3923e7fce19f822f",
  shardSha256: "c635eecdc66825827131dda1b6ebdacfe9e348eb0dd02849802d4c6b5aa1b83a",
});
const SOURCE_FAMILIES = Object.freeze([
  "image/camp/",
  "image/campbattle/",
  "image/escort/",
  "image/factionwar/",
  "image/house/",
  "image/scene/",
  "image/world/",
  "image/worldboss/",
]);
const LOCKED_PATHS = Object.freeze([
  "exports/resource-port/hall-room-world/**",
  "resource-port/track-b/contracts/hall-room-world.json",
  "resource-port/track-b/evidence/P045.json",
  "resource-port/track-b/checks/P045.mjs",
  "resource-port/track-b/findings/P045.md",
  "resource-port/track-b/status/P045.json",
]);
const EXPECTED = Object.freeze({
  sourceFiles: 396,
  sourceBytes: 48_720_359,
  rasterReferences: 311,
  uniqueRasterBlobs: 156,
  timelineOccurrences: 101,
  uniqueTimelines: 97,
  directTimelines: 92,
  embeddedTimelines: 9,
  staticSvgTimelines: 63,
  escortStateTimelines: 6,
  compactAnimationTimelines: 2,
  embeddedMonsterTimelines: 2,
  deferredAudioTimelines: 4,
  unresolvedVisualTimelines: 20,
  convertedTimelines: 73,
  convertedVisualTimelines: 73,
  convertedAudioTimelines: 0,
  unresolvedTimelines: 24,
  staticSvgArtifacts: 63,
  escortStateArtifacts: 30,
  compactAnimationArtifacts: 3,
  embeddedMonsterArtifacts: 14,
  mediaArtifacts: 110,
  hotspotCandidates: 1,
  enabledHotspots: 0,
});
const EMBEDDED_MONSTER_SHA256 = new Set([
  "11925f2d380aff095ff4abd1d4bda622dd0c33518d4738bac0c3227c6e2b4224",
  "9b781febf546d7abad8ae064d952163e023c1924dd5610a62475358a8d27fcce",
]);
const EMBEDDED_AUDIO_SHA256 = new Set([
  "ffe0a73fe33c821dfbc381e1ef4d7bae19a8d06d2327fa80297a13a173bcf9fa",
  "b9098f505fda58454d68d8ab01a6c508d257410e350a6f33a2f65de41257847a",
  "8c97db05118201fd1a49f5807dfe38a894cc767a7788433094d0ff59545a4b1b",
]);
const ESCORT_PATHS = new Set([
  "image/escort/escortother0.swf",
  "image/escort/escortother1.swf",
  "image/escort/escortother2.swf",
  "image/escort/escortself0.swf",
  "image/escort/escortself1.swf",
  "image/escort/escortself2.swf",
]);
const HOT_SPRING_FOUNDATION_PATHS = Object.freeze([
  "config/source-hot-spring-room-list.json",
  "config/source-hot-spring-room-world.json",
  "public/game-ui/hall/hover/hot-spring.png",
  "src/client/source-hot-spring-room-list.ts",
  "src/client/source-hot-spring-room-world.ts",
  "src/worker/source-s030-hot-spring-runtime.ts",
  "tests/source-hot-spring-room-world.test.ts",
]);

const args = process.argv.slice(2);
const writing = args.includes("--write");
const deep = writing || args.includes("--deep");
const importerCheckRequested = args.includes("--importer-check");
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const root = process.cwd();
const gunnyRoot = valueAfter("--gunny-root") ?? process.env.GUNNY_ROOT ?? null;
const rawRoot = valueAfter("--raw-root") ?? process.env.RESOURCE_RAW_ROOT ?? null;
const ffdecPath = valueAfter("--ffdec") ?? process.env.FFDEC_CLI ?? null;
const r033ContextRoot = valueAfter("--r033-context-root") ?? process.env.R033_CONTEXT_ROOT ?? null;
const stagingRoot = valueAfter("--staging-root") ?? process.env.RESOURCE_PORT_STAGING_ROOT ?? null;
const exportRoot = resolve(root, "exports/resource-port/hall-room-world");
const fail = (message) => { throw new Error(`${PACKAGE_ID} package invalid: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };
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
  {
    encoding: encoding === null ? undefined : encoding,
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  },
);

function assertInside(path, parent, label) {
  const child = resolve(path);
  const boundary = `${resolve(parent)}${sep}`;
  if (!child.startsWith(boundary)) fail(`${label} escaped ${parent}`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory) {
  const files = [];
  if (!await exists(directory)) return files;
  const visit = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
      else fail(`unsupported generated entry: ${path}`);
    }
  };
  await visit(directory);
  return files.sort();
}

function sourceFamily(path) {
  return SOURCE_FAMILIES.find((prefix) => path.startsWith(prefix)) ?? null;
}

function fileDescriptor(path, bytes, contentType = null) {
  return {
    path: path.replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes),
    ...(contentType ? { contentType } : {}),
  };
}

async function descriptorFor(path, contentType = null) {
  return fileDescriptor(path, await readFile(resolve(root, path)), contentType);
}

async function verifyDescriptor(entry) {
  const bytes = await readFile(resolve(root, entry.path));
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
    fail(`artifact changed: ${entry.path}`);
  }
  if (entry.contentType === "application/json") JSON.parse(bytes.toString("utf8"));
  return bytes;
}

function verifyPinnedGitObject(repositoryRoot, commit, path, blob, digest) {
  const bytes = git(repositoryRoot, ["show", `${commit}:${path}`], null);
  const actualBlob = git(repositoryRoot, ["rev-parse", `${commit}:${path}`]).trim();
  if (actualBlob !== blob || sha256(bytes) !== digest) fail(`Gunny pin mismatch: ${path}`);
  return bytes;
}

function verifyDependency(repositoryRoot) {
  git(repositoryRoot, ["merge-base", "--is-ancestor", DEPENDENCY.implementationCommit, "origin/main"]);
  git(repositoryRoot, ["merge-base", "--is-ancestor", GUNNY_FOUNDATION_COMMIT, "origin/main"]);
  const evidenceBytes = verifyPinnedGitObject(
    repositoryRoot,
    "origin/main",
    DEPENDENCY.evidencePath,
    DEPENDENCY.evidenceGitBlobSha1,
    DEPENDENCY.evidenceSha256,
  );
  verifyPinnedGitObject(
    repositoryRoot,
    "origin/main",
    DEPENDENCY.importerPath,
    DEPENDENCY.importerGitBlobSha1,
    DEPENDENCY.importerSha256,
  );
  verifyPinnedGitObject(
    repositoryRoot,
    "origin/main",
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
    || evidence.source?.dispatchSha256 !== DEPENDENCY.shardSha256
    || evidence.summary?.files !== EXPECTED.sourceFiles
    || evidence.summary?.bytes !== EXPECTED.sourceBytes
    || evidence.summary?.uniqueSwfBlobs !== EXPECTED.uniqueTimelines
    || evidence.summary?.unresolvedSwfTimelines !== EXPECTED.timelineOccurrences
    || evidence.completion?.trackBDependencySatisfied !== true
    || evidence.tool?.version !== "26.2.1"
  ) fail("R033 dependency contract mismatch");
  if (evidence.files.length !== EXPECTED.sourceFiles
    || evidence.files.some((file) => sourceFamily(file.path) === null)) {
    fail("R033 source family census changed");
  }
  return {
    evidence,
    record: {
      ...DEPENDENCY,
      verifiedOnGunnyMain: DEPENDENCY.implementationCommit,
      gunnyFoundationCommit: GUNNY_FOUNDATION_COMMIT,
      trackBDependencySatisfied: true,
    },
  };
}

function runImporterCheck(repositoryRoot) {
  if (!r033ContextRoot || !stagingRoot || !rawRoot || !ffdecPath) {
    fail("R033 importer check requires comparison context, staging root, raw root and FFDec");
  }
  const output = execFileSync(
    process.execPath,
    [resolve(repositoryRoot, DEPENDENCY.importerPath), "--check"],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        GUNNY_CONTEXT_ROOT: r033ContextRoot,
        RESOURCE_R033_ROOT: rawRoot,
        RESOURCE_PORT_STAGING_ROOT: stagingRoot,
        FFDEC_CLI: ffdecPath,
      },
      maxBuffer: 256 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (!output.includes('"status": "pass"') || !output.includes('"sessionId": "R033"')) {
    fail("R033 importer check did not report pass");
  }
  return "pass: external R033 importer and staged payload verified";
}

const pinnedBlobCache = new Map();

async function readPinnedSource(file) {
  const materializedPath = resolve(rawRoot, ...file.path.split("/"));
  assertInside(materializedPath, rawRoot, file.path);
  try {
    const materialized = await readFile(materializedPath);
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
    fail(`pinned Git blob differs from R033 evidence: ${file.path}`);
  }
  return { bytes, retrieval: "git-cat-file-fallback" };
}

async function verifyRawPin(evidence) {
  const head = git(rawRoot, ["rev-parse", "HEAD"]).trim();
  const tree = git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim();
  if (head !== SOURCE_COMMIT || tree !== SOURCE_TREE) fail("raw Resource checkout pin mismatch");
  git(rawRoot, ["diff", "--cached", "--quiet", "HEAD", "--"]);
  for (const entry of RAW_PIN_SCAFFOLD_DIFF) {
    const path = entry.slice(2);
    git(rawRoot, ["cat-file", "-e", `HEAD:${path}`]);
    if (await exists(resolve(rawRoot, path))) fail(`raw pin scaffold omission was materialized: ${path}`);
  }
  let bytes = 0;
  let fallbacks = 0;
  for (const file of evidence.files) {
    const source = await readPinnedSource(file);
    bytes += source.bytes.length;
    if (source.retrieval === "git-cat-file-fallback") fallbacks += 1;
  }
  if (bytes !== EXPECTED.sourceBytes) fail("raw source byte aggregate changed");
  return {
    verified: true,
    files: evidence.files.length,
    bytes,
    pinnedBlobFallbacks: fallbacks,
    junctionScaffoldOmissions: RAW_PIN_SCAFFOLD_DIFF.map((entry) => entry.slice(2)),
  };
}

function parseLegacyCharacterBundle(compressedBytes, label) {
  let bytes;
  try {
    bytes = inflateSync(compressedBytes);
  } catch (error) {
    fail(`${label} is not a valid zlib bundle: ${error.message}`);
  }
  let cursor = 0;
  const need = (length, field) => {
    if (!Number.isSafeInteger(length) || length < 0 || cursor + length > bytes.length) {
      fail(`${label} ${field} is truncated`);
    }
  };
  const u8 = (field) => { need(1, field); return bytes[cursor++]; };
  const u16 = (field) => {
    need(2, field);
    const value = bytes.readUInt16BE(cursor);
    cursor += 2;
    return value;
  };
  const u32 = (field) => {
    need(4, field);
    const value = bytes.readUInt32BE(cursor);
    cursor += 4;
    return value;
  };
  const utf = (field) => {
    const length = u16(`${field} length`);
    need(length, field);
    const raw = bytes.subarray(cursor, cursor + length);
    cursor += length;
    return raw.toString("utf8");
  };
  const asset = (kind, index) => {
    const name = utf(`${kind} ${index} name`);
    const length = u32(`${kind} ${index} bytes`);
    need(length, `${kind} ${index} payload`);
    const payload = bytes.subarray(cursor, cursor + length);
    cursor += length;
    return { index, name, bytes: length, sha256: sha256(payload), payload };
  };
  const rasterCount = u8("raster count");
  const rasters = Array.from({ length: rasterCount }, (_, index) => asset("raster", index));
  const swfCount = u8("SWF count");
  const swfs = Array.from({ length: swfCount }, (_, index) => asset("SWF", index));
  const metadata = utf("metadata XML");
  if (cursor !== bytes.length) fail(`${label} has trailing inflated bytes`);
  return { rasters, swfs, metadata };
}

async function timelineInputs(evidence) {
  const bySha = new Map();
  let occurrences = 0;
  let direct = 0;
  let embedded = 0;
  const add = (sha, bytes, timeline, occurrence) => {
    if (sha256(bytes) !== sha) fail(`timeline payload hash changed: ${occurrence.path}`);
    let entry = bySha.get(sha);
    if (!entry) {
      entry = { sha256: sha, bytes: bytes.length, buffer: bytes, timeline, occurrences: [] };
      bySha.set(sha, entry);
    } else if (entry.bytes !== bytes.length || entry.timeline.summarySha256 !== timeline.summarySha256) {
      fail(`duplicate timeline evidence conflicts: ${sha}`);
    }
    entry.occurrences.push(occurrence);
    occurrences += 1;
  };
  for (const file of evidence.files) {
    if (file.classification === "unresolved-browser-timeline") {
      const source = await readPinnedSource(file);
      add(file.sha256, source.bytes, file.timeline, {
        path: file.path,
        sourceFamily: sourceFamily(file.path),
        embedded: false,
      });
      direct += 1;
      continue;
    }
    if (file.classification !== "exact-legacy-zlib-character-bundle-extracted") continue;
    const source = await readPinnedSource(file);
    const parsed = parseLegacyCharacterBundle(source.bytes, file.path);
    if (parsed.swfs.length !== file.legacyBundle.unresolvedSwf.length) {
      fail(`embedded SWF count changed: ${file.path}`);
    }
    for (const asset of parsed.swfs) {
      const expected = file.legacyBundle.unresolvedSwf.find((entry) => entry.index === asset.index);
      if (!expected || expected.name !== asset.name || expected.bytes !== asset.bytes
        || expected.sha256 !== asset.sha256) fail(`embedded SWF identity changed: ${file.path}::${asset.name}`);
      add(asset.sha256, asset.payload, expected.timeline, {
        path: `${file.path}::${asset.name}`,
        containerPath: file.path,
        embeddedName: asset.name,
        sourceFamily: sourceFamily(file.path),
        embedded: true,
      });
      embedded += 1;
    }
  }
  if (occurrences !== EXPECTED.timelineOccurrences || direct !== EXPECTED.directTimelines
    || embedded !== EXPECTED.embeddedTimelines || bySha.size !== EXPECTED.uniqueTimelines) {
    fail(`timeline census changed: occurrences=${occurrences} direct=${direct} embedded=${embedded} unique=${bySha.size}`);
  }
  return [...bySha.values()].sort((a, b) => a.sha256.localeCompare(b.sha256));
}

function runFfdec(argv) {
  const output = execFileSync(ffdecPath, argv, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
  if (!output.includes("OK")) fail(`FFDec command did not finish cleanly: ${argv.join(" ")}`);
  return output;
}

async function analyzeScripts(directory) {
  const files = (await listFiles(directory)).filter((path) => extname(path).toLowerCase() === ".as");
  if (files.length === 0) fail(`FFDec exported no scripts for ${directory}`);
  const entries = [];
  let text = "";
  for (const file of files) {
    const bytes = await readFile(file);
    entries.push({ bytes: bytes.length, sha256: sha256(bytes) });
    text += `${bytes.toString("utf8")}\n`;
  }
  entries.sort((a, b) => a.sha256.localeCompare(b.sha256) || a.bytes - b.bytes);
  const count = (pattern) => Array.from(text.matchAll(pattern)).length;
  const frameScriptCount = count(/addFrameScript\(/gu);
  const eventCount = count(/addEventListener|dispatchEvent/gu);
  const gotoCount = count(/gotoAnd(?:Play|Stop)|nextFrame|prevFrame/gu);
  const playStopCount = count(/(?<!gotoAnd)\b(?:play|stop)\s*\(/gu);
  const externalBaseCount = count(/extends\s+(?!MovieClip\b|Sprite\b|Sound\b|SimpleButton\b|Object\b)[A-Za-z0-9_.$\u00a7-]+/gu);
  return {
    files: files.length,
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    contentSha256: sha256(Buffer.from(stableJson(entries), "utf8")),
    frameScriptCount,
    eventCount,
    gotoCount,
    playStopCount,
    externalBaseCount,
    hasNetworkApi: /URLLoader|navigateToURL|Socket|NetConnection/gu.test(text),
    text,
  };
}

function hasVisualTags(timeline) {
  return Object.keys(timeline.tagCounts ?? {}).some((name) => /^Define(?:Bits|Shape|Sprite|MorphShape|Text|EditText|Video)/u.test(name));
}

function classifyTimeline(entry, scripts) {
  const canonical = entry.occurrences[0];
  const path = canonical.containerPath ?? canonical.path;
  const interactions = entry.timeline.interactions;
  const noScriptBehavior = scripts.frameScriptCount === 0 && scripts.eventCount === 0
    && scripts.gotoCount === 0 && scripts.playStopCount === 0
    && scripts.externalBaseCount === 0 && scripts.hasNetworkApi === false;
  if (path === "image/escort/escortaudio.swf" || EMBEDDED_AUDIO_SHA256.has(entry.sha256)) {
    return {
      packageClassification: "unresolved-audio-deferred-to-P047",
      conversionKind: null,
      reviewKind: "audio-deferred",
      unresolvedReason: "Audio codec normalization, ffprobe inventory, loop/volume/event mapping and provenance are owned by P047; P045 publishes no audio bytes",
      handoff: { packageSessionId: "P047", runtimeSessionId: "R047" },
    };
  }
  if (EMBEDDED_MONSTER_SHA256.has(entry.sha256)) {
    if (!noScriptBehavior || scripts.files !== 7 || entry.timeline.symbols.length !== 7
      || entry.timeline.sprites.length !== 7) fail(`embedded monster review drifted: ${entry.sha256}`);
    return { packageClassification: "converted-lossless-action-animation", conversionKind: "monster-actions" };
  }
  if (ESCORT_PATHS.has(path)) {
    if (scripts.files !== 1 || scripts.frameScriptCount !== 1 || scripts.gotoCount !== 4
      || scripts.eventCount !== 0 || scripts.externalBaseCount !== 0
      || JSON.stringify(entry.timeline.frameLabels) !== JSON.stringify(["accelerate", "moderate", "stand", "transparent"])) {
      fail(`escort state evidence drifted: ${path}`);
    }
    return { packageClassification: "converted-lossless-labeled-states", conversionKind: "escort-states" };
  }
  if (path === "image/factionwar/icon/factionwaricon.swf") {
    if (!noScriptBehavior || scripts.files !== 1) fail("faction-war icon script boundary changed");
    return { packageClassification: "converted-lossless-nested-cycle", conversionKind: "faction-war-icon" };
  }
  if (path === "image/worldboss/2/icon/worldbossicon.swf") {
    if (scripts.files !== 1 || scripts.frameScriptCount !== 1 || scripts.playStopCount !== 2
      || scripts.eventCount !== 0 || scripts.gotoCount !== 0 || scripts.externalBaseCount !== 0) {
      fail("world-boss 2 icon state evidence changed");
    }
    return { packageClassification: "converted-lossless-selectable-states", conversionKind: "world-boss-2-states" };
  }
  const fullyStatic = scripts.files === 1 && noScriptBehavior
    && entry.timeline.symbols.length === 1
    && entry.timeline.sprites.length >= 1
    && entry.timeline.sprites.every((sprite) => sprite.frameCount === 1)
    && interactions.defineButton === 0 && interactions.defineButton2 === 0
    && interactions.clipActions === 0 && entry.timeline.placements.masks === 0
    && hasVisualTags(entry.timeline);
  if (fullyStatic) {
    return { packageClassification: "converted-exact-static-svg", conversionKind: "static-svg" };
  }
  return {
    packageClassification: "unresolved-browser-timeline",
    conversionKind: null,
    unresolvedReason: unresolvedReason(path, entry, scripts),
  };
}

function unresolvedReason(path, entry, scripts) {
  if (path === "image/camp/map/campbattlemap.swf") {
    return "DefineButton2 states are retained, but FFDec evidence does not bind per-button bounds to an authoritative browser handler; hotspot remains disabled";
  }
  if (path === "image/factionwar/map/factionwarmap.swf" || path === "image/factionwar/map/factionwarmap2.swf") {
    return "The 3208x2000 composite has nested 8/9-frame cycles; a lossless 72-frame FFDec composite exceeded the reviewed local memory budget and no compact browser-native scene graph is retained";
  }
  if (path === "image/camp/map/campbattlepassage.swf") {
    return "Nested child periods from 2 through 88 frames have no retained compact least-common-cycle browser conversion";
  }
  if (path === "image/worldboss/4/icon/worldbossicon.swf") {
    return "Two selectable root states contain 22/45/60-frame nested cycles; no reviewed compact 1980-frame lossless conversion is retained";
  }
  if (scripts.eventCount > 0 || scripts.externalBaseCount > 0) {
    return "The timeline depends on external game classes or dispatched events whose browser runtime semantics are not owned by P045";
  }
  if (entry.timeline.interactions.defineButton + entry.timeline.interactions.defineButton2 > 0) {
    return "Button state evidence exists without authoritative browser bounds and handler ownership";
  }
  return "FFDec metadata is exact, but no complete deterministic browser-native conversion is retained for this scripted or nested timeline";
}

function inspectSvg(bytes, label) {
  const text = bytes.toString("utf8");
  if (!text.includes("<svg") || /<script\b|javascript:|xlink:href="https?:|href="https?:|\.swf\b/iu.test(text)) {
    fail(`unsafe or incomplete SVG export: ${label}`);
  }
}

function countAscii(bytes, value) {
  return Array.from(bytes.toString("latin1").matchAll(new RegExp(value, "gu"))).length;
}

function inspectLosslessWebp(bytes, expectedFrames, label) {
  if (bytes.length < 20 || bytes.subarray(0, 4).toString("ascii") !== "RIFF"
    || bytes.subarray(8, 12).toString("ascii") !== "WEBP") fail(`${label} is not WebP`);
  const losslessFrames = countAscii(bytes, "VP8L");
  const animatedFrames = countAscii(bytes, "ANMF");
  if (losslessFrames !== expectedFrames || (expectedFrames > 1 && animatedFrames !== expectedFrames)
    || countAscii(bytes, "VP8 ") !== 0) {
    fail(`${label} is not a ${expectedFrames}-frame lossless WebP export`);
  }
}

function safeVariant(value) {
  return value.replace(/[^A-Za-z0-9._-]+/gu, "-").replace(/^-+|-+$/gu, "").toLowerCase();
}

async function buildReview(evidence) {
  const inputs = await timelineInputs(evidence);
  const temp = await mkdtemp(join(tmpdir(), "resource-p045-review-"));
  const inputDirectory = join(temp, "input");
  const scriptDirectory = join(temp, "scripts");
  const artifacts = new Map();
  const registerArtifact = (bytes, extension, contentType) => {
    const digest = sha256(bytes);
    const folder = extension === "svg" ? "svg" : extension === "webp" ? "webp" : "wav";
    const path = `exports/resource-port/hall-room-world/media/${folder}/${digest}.${extension}`;
    const current = artifacts.get(path);
    if (current && !current.bytes.equals(bytes)) fail(`content-address collision: ${path}`);
    artifacts.set(path, { bytes, descriptor: fileDescriptor(path, bytes, contentType) });
    return artifacts.get(path).descriptor;
  };
  const oneExport = async (inputPath, ffdecArgs, extension, label) => {
    const output = join(temp, `export-${safeVariant(label)}-${sha256(Buffer.from(ffdecArgs.join("\0"))).slice(0, 12)}`);
    await mkdir(output, { recursive: true });
    runFfdec([...ffdecArgs, output, inputPath]);
    const files = (await listFiles(output)).filter((path) => extname(path).toLowerCase() === `.${extension}`);
    if (files.length !== 1) fail(`${label} produced ${files.length} .${extension} files`);
    return readFile(files[0]);
  };
  try {
    await mkdir(inputDirectory, { recursive: true });
    await mkdir(scriptDirectory, { recursive: true });
    for (const entry of inputs) await writeFile(join(inputDirectory, `${entry.sha256}.swf`), entry.buffer);
    console.error(`[${PACKAGE_ID}] FFDec script review: ${inputs.length} unique SWF blobs`);
    runFfdec([
      "-onerror", "abort",
      "-timeout", "90",
      "-exportFileTimeout", "90",
      "-exportTimeout", "1800",
      "-export", "script",
      scriptDirectory,
      inputDirectory,
    ]);
    const reviewed = [];
    const categoryCounts = new Map();
    let progress = 0;
    for (const entry of inputs) {
      const inputPath = join(inputDirectory, `${entry.sha256}.swf`);
      const scripts = await analyzeScripts(join(scriptDirectory, `${entry.sha256}.swf`));
      const classification = classifyTimeline(entry, scripts);
      const reviewKind = classification.reviewKind ?? classification.conversionKind ?? "unresolved";
      categoryCounts.set(reviewKind, (categoryCounts.get(reviewKind) ?? 0) + 1);
      const conversionArtifacts = [];
      const addWebp = async ({ variant, frames, select = null, sublength = null, loop = true }) => {
        const swfCharacterId = entry.timeline.symbols[0]?.swfCharacterId;
        if (!Number.isInteger(swfCharacterId) || swfCharacterId <= 0) {
          fail(`timeline has no valid SWF character id: ${entry.sha256}`);
        }
        const options = ["-format", "sprite:webp_animated"];
        if (sublength) options.push("-sublength", String(sublength));
        options.push("-selectid", String(swfCharacterId));
        if (select) options.push("-select", `${swfCharacterId}:${select}`);
        options.push("-onerror", "abort", "-export", "sprite");
        const bytes = await oneExport(inputPath, options, "webp", `${entry.sha256}-${variant}`);
        inspectLosslessWebp(bytes, frames, `${entry.sha256}:${variant}`);
        conversionArtifacts.push({
          variant,
          frames,
          frameRate: entry.timeline.stage.frameRate,
          loop,
          ...(select ? { sourceFrameSelection: select } : {}),
          ...(sublength ? { nestedCycleFrames: sublength } : {}),
          ...registerArtifact(bytes, "webp", "image/webp"),
        });
      };
      if (classification.conversionKind === "static-svg") {
        const swfCharacterId = entry.timeline.symbols[0]?.swfCharacterId;
        if (!Number.isInteger(swfCharacterId) || swfCharacterId <= 0) {
          fail(`static timeline has no valid SWF character id: ${entry.sha256}`);
        }
        const bytes = await oneExport(
          inputPath,
          ["-format", "sprite:svg", "-selectid", String(swfCharacterId), "-onerror", "abort", "-export", "sprite"],
          "svg",
          `${entry.sha256}-static`,
        );
        inspectSvg(bytes, entry.sha256);
        conversionArtifacts.push({
          variant: "static",
          frames: 1,
          frameRate: entry.timeline.stage.frameRate,
          loop: false,
          ...registerArtifact(bytes, "svg", "image/svg+xml"),
        });
      } else if (classification.conversionKind === "escort-states") {
        for (const state of [
          { variant: "stand", select: "1-7", frames: 7 },
          { variant: "transparent", select: "8-14", frames: 7 },
          { variant: "accelerate", select: "15-21", frames: 7 },
          { variant: "moderate", select: "22-35", frames: 14 },
          { variant: "unreachable-tail-frame-36", select: "36", frames: 1, loop: false },
        ]) await addWebp(state);
      } else if (classification.conversionKind === "faction-war-icon") {
        await addWebp({ variant: "nested-cycle", frames: 180, sublength: 180 });
      } else if (classification.conversionKind === "world-boss-2-states") {
        await addWebp({ variant: "state-1", frames: 60, select: "1", sublength: 60 });
        // Root state 2 selects the one-frame sprite (id 3). FFDec accepts a
        // 60-frame sublength here, but collapses the 60 identical renders to a
        // single lossless ANMF frame. Export the authored static state as such
        // instead of claiming or synthesizing an animation that is not there.
        await addWebp({ variant: "state-2-static", frames: 1, select: "2", loop: false });
      } else if (classification.conversionKind === "monster-actions") {
        for (const symbol of entry.timeline.symbols) {
          const swfCharacterId = symbol.swfCharacterId;
          if (!Number.isInteger(swfCharacterId) || swfCharacterId <= 0) {
            fail(`monster symbol has no valid SWF character id: ${symbol.name}`);
          }
          const sprite = entry.timeline.sprites.find((candidate) => candidate.swfCharacterId === swfCharacterId);
          if (!sprite) fail(`monster symbol has no sprite: ${symbol.name}`);
          const output = join(temp, `export-${entry.sha256}-${swfCharacterId}`);
          await mkdir(output, { recursive: true });
          runFfdec([
            "-format", "sprite:webp_animated",
            "-selectid", String(swfCharacterId),
            "-onerror", "abort",
            "-export", "sprite",
            output,
            inputPath,
          ]);
          const files = (await listFiles(output)).filter((path) => extname(path).toLowerCase() === ".webp");
          if (files.length !== 1) fail(`monster action ${symbol.name} produced ${files.length} WebP files`);
          const bytes = await readFile(files[0]);
          inspectLosslessWebp(bytes, sprite.frameCount, symbol.name);
          conversionArtifacts.push({
            variant: safeVariant(symbol.name.split(".").at(-1)),
            sourceSymbol: symbol.name,
            sourceSwfCharacterId: swfCharacterId,
            frames: sprite.frameCount,
            frameRate: entry.timeline.stage.frameRate,
            loop: true,
            ...registerArtifact(bytes, "webp", "image/webp"),
          });
        }
      }
      reviewed.push({
        sourceSha256: entry.sha256,
        sourceBytes: entry.bytes,
        occurrences: entry.occurrences,
        stage: entry.timeline.stage,
        symbols: entry.timeline.symbols,
        sprites: entry.timeline.sprites,
        frameLabels: entry.timeline.frameLabels,
        compiledTimeline: {
          summarySha256: entry.timeline.summarySha256,
          placements: entry.timeline.placements,
          transforms: entry.timeline.transforms,
          bounds: entry.timeline.bounds,
          interactions: entry.timeline.interactions,
        },
        scriptReview: {
          files: scripts.files,
          bytes: scripts.bytes,
          contentSha256: scripts.contentSha256,
          frameScriptCount: scripts.frameScriptCount,
          eventCount: scripts.eventCount,
          gotoCount: scripts.gotoCount,
          playStopCount: scripts.playStopCount,
          externalBaseCount: scripts.externalBaseCount,
          hasNetworkApi: scripts.hasNetworkApi,
        },
        packageClassification: classification.packageClassification,
        conversionKind: classification.conversionKind,
        artifacts: conversionArtifacts,
        behaviorReady: false,
        runtimeIntegration: false,
        ...(classification.handoff ? { handoff: classification.handoff } : {}),
        ...(classification.unresolvedReason ? { unresolvedReason: classification.unresolvedReason } : {}),
      });
      progress += 1;
      if (progress % 10 === 0 || progress === inputs.length) {
        console.error(`[${PACKAGE_ID}] reviewed ${progress}/${inputs.length}`);
      }
    }
    const count = (kind) => categoryCounts.get(kind) ?? 0;
    if (count("static-svg") !== EXPECTED.staticSvgTimelines
      || count("escort-states") !== EXPECTED.escortStateTimelines
      || count("faction-war-icon") + count("world-boss-2-states") !== EXPECTED.compactAnimationTimelines
      || count("monster-actions") !== EXPECTED.embeddedMonsterTimelines
      || count("audio-deferred") !== EXPECTED.deferredAudioTimelines
      || count("unresolved") !== EXPECTED.unresolvedVisualTimelines) {
      fail(`review classification drifted: ${JSON.stringify(Object.fromEntries(categoryCounts))}`);
    }
    const converted = reviewed.filter((entry) => entry.conversionKind !== null);
    const visual = converted.filter((entry) => entry.conversionKind !== "audio");
    const audio = converted.filter((entry) => entry.conversionKind === "audio");
    const artifactReferences = reviewed.flatMap((entry) => entry.artifacts);
    if (converted.length !== EXPECTED.convertedTimelines || visual.length !== EXPECTED.convertedVisualTimelines
      || audio.length !== EXPECTED.convertedAudioTimelines || artifacts.size !== EXPECTED.mediaArtifacts
      || new Set(artifactReferences.map((entry) => entry.path)).size !== EXPECTED.mediaArtifacts) {
      fail(`conversion aggregate drifted: converted=${converted.length} visual=${visual.length} audio=${audio.length} artifacts=${artifacts.size}`);
    }
    return {
      review: {
        schemaVersion: 1,
        packageSessionId: PACKAGE_ID,
        runtimeSessionId: RUNTIME_ID,
        sourceDependency: DEPENDENCY.sessionId,
        ffdec: {
          product: "JPEXS Free Flash Decompiler",
          version: "26.2.1",
          executableSha256: sha256(await readFile(ffdecPath)),
          losslessAnimationCodec: "animated WebP VP8L",
          staticVectorFormat: "SVG",
          audioDisposition: "deferred to P047; P045 publishes no audio bytes",
        },
        summary: {
          occurrences: EXPECTED.timelineOccurrences,
          uniqueTimelines: reviewed.length,
          convertedTimelines: converted.length,
          convertedVisualTimelines: visual.length,
          convertedAudioTimelines: audio.length,
          deferredAudioTimelines: count("audio-deferred"),
          unresolvedTimelines: reviewed.length - converted.length,
          mediaArtifacts: artifacts.size,
          behaviorReady: 0,
          runtimeIntegration: false,
        },
        policy: {
          legacySwfRuntimeAllowed: false,
          renderSuccessAloneIsBehaviorAuthority: false,
          hotspotRequiresAuthoritativeBoundsAndHandler: true,
          unresolvedTimelinesFailClosed: true,
        },
        records: reviewed,
      },
      artifacts,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

function rasterCatalog(evidence) {
  const assets = [];
  for (const file of evidence.files) {
    if (file.classification === "exact-browser-raster") {
      assets.push({
        sourcePath: file.path,
        sourceFamily: sourceFamily(file.path),
        sourceBytes: file.bytes,
        sourceSha256: file.sha256,
        detectedFormat: file.detectedFormat,
        width: file.raster.width,
        height: file.raster.height,
        browserPath: file.browserPath,
        extraction: "direct-exact",
      });
    } else if (file.classification === "exact-legacy-zlib-character-bundle-extracted") {
      for (const raster of file.legacyBundle.rasters) {
        assets.push({
          sourcePath: `${file.path}::${raster.name}`,
          sourceContainerPath: file.path,
          sourceFamily: sourceFamily(file.path),
          sourceBytes: raster.bytes,
          sourceSha256: raster.sha256,
          detectedFormat: raster.detectedFormat,
          width: raster.raster.width,
          height: raster.raster.height,
          browserPath: raster.browserPath,
          extraction: "exact-zlib-bundle-member",
        });
      }
    }
  }
  assets.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  if (assets.length !== EXPECTED.rasterReferences
    || new Set(assets.map((entry) => entry.sourceSha256)).size !== EXPECTED.uniqueRasterBlobs) {
    fail("R033 raster catalog changed");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    dependencySessionId: DEPENDENCY.sessionId,
    summary: {
      references: assets.length,
      uniqueBlobs: new Set(assets.map((entry) => entry.sourceSha256)).size,
      sourceBytes: assets.reduce((total, entry) => total + entry.sourceBytes, 0),
      duplicatedIntoP045: 0,
    },
    delivery: {
      mode: "content-addressed R033 external staging",
      mutableBranchAllowed: false,
      p045BulkRasterCopy: false,
    },
    assets,
  };
}

function gitObjectDescriptor(repositoryRoot, path) {
  const bytes = git(repositoryRoot, ["show", `${GUNNY_FOUNDATION_COMMIT}:${path}`], null);
  return {
    path,
    gitBlobSha1: git(repositoryRoot, ["rev-parse", `${GUNNY_FOUNDATION_COMMIT}:${path}`]).trim(),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function hotSpringFoundation(repositoryRoot, evidence) {
  const worldBytes = git(repositoryRoot, ["show", `${GUNNY_FOUNDATION_COMMIT}:config/source-hot-spring-room-world.json`], null);
  const listBytes = git(repositoryRoot, ["show", `${GUNNY_FOUNDATION_COMMIT}:config/source-hot-spring-room-list.json`], null);
  const world = JSON.parse(worldBytes.toString("utf8"));
  const roomList = JSON.parse(listBytes.toString("utf8"));
  if (world.layout?.viewport?.width !== 1000 || world.layout?.viewport?.height !== 600
    || world.layout?.map?.width !== 1200 || world.layout?.map?.height !== 1077
    || world.fidelity?.pixelExact !== false
    || world.resource?.missingFromRelease?.sceneTextureMasks !== "Shape 308 for day texture and Shape 78 for night texture"
    || roomList.layout?.list?.pageSize !== 8) fail("Hot Spring foundation contract changed");
  const p045Matches = evidence.files.filter((file) => /hot.?spring/iu.test(file.path));
  if (p045Matches.length !== 0) fail("R033 unexpectedly gained Hot Spring source files");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    scope: "existing-gunny-foundation-audit",
    p045SourceMatches: 0,
    foundation: {
      repository: "trinhtanphat/Gunny",
      immutableCommit: GUNNY_FOUNDATION_COMMIT,
      files: HOT_SPRING_FOUNDATION_PATHS.map((path) => gitObjectDescriptor(repositoryRoot, path)),
      roomWorld: {
        sourceSwfSha256: world.source.swf.sha256,
        sourceSwfBytes: world.source.swf.bytes,
        viewport: world.layout.viewport,
        map: world.layout.map,
        menu: world.layout.menu,
        exportedAssetCount: world.resource.exportedAssetCount,
        exportedBytes: world.resource.exportedBytes,
        compositionAssetCount: world.resource.compositionAssetCount,
        missingVectorShapes: world.resource.missingFromRelease.vectorShapes,
        missingSpriteTimelines: world.resource.missingFromRelease.spriteTimelines,
        missingSceneTextureMasks: world.resource.missingFromRelease.sceneTextureMasks,
        missingCollisionMask: world.resource.missingFromRelease.collisionMask,
        missingWaterMask: world.resource.missingFromRelease.waterMask,
        fidelity: world.fidelity,
      },
      roomList: {
        sourceSwfSha256: roomList.source.swf.sha256,
        sourceSwfBytes: roomList.source.swf.bytes,
        width: roomList.layout.width,
        height: roomList.layout.height,
        pageSize: roomList.layout.list.pageSize,
        compositionAssetCount: roomList.resource.compositionAssetCount,
      },
    },
    p045Boundary: {
      duplicatesExistingArtwork: false,
      inventsMissingVectorGeometry: false,
      addsHotSpringHotspots: false,
      claimsPixelExactHotSpringScene: false,
      existingGunnyHandlersRemainAuthoritative: true,
      runtimeIntegration: false,
    },
  };
}

function sceneGraph(review) {
  const visual = review.records.filter((entry) => entry.conversionKind && entry.conversionKind !== "audio");
  const families = Object.fromEntries(SOURCE_FAMILIES.map((family) => {
    const entries = visual.filter((entry) => entry.occurrences.some((occurrence) => occurrence.sourceFamily === family));
    return [family, {
      convertedTimelines: entries.length,
      artifactReferences: entries.reduce((total, entry) => total + entry.artifacts.length, 0),
    }];
  }));
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    coordinateSystem: {
      unit: "source-pixel",
      twipsPerPixel: 20,
      externalScenePlacement: "runtime-unbound",
    },
    summary: {
      convertedVisualTimelines: visual.length,
      unresolvedVisualTimelines: review.records.filter((entry) => entry.conversionKind === null
        && entry.packageClassification !== "unresolved-audio-deferred-to-P047").length,
      artifactReferences: visual.reduce((total, entry) => total + entry.artifacts.length, 0),
    },
    families,
    surfaces: visual.map((entry) => ({
      sourceSha256: entry.sourceSha256,
      sourcePaths: entry.occurrences.map((occurrence) => occurrence.path),
      stage: entry.stage,
      symbols: entry.symbols,
      bounds: entry.compiledTimeline.bounds,
      compiledDisplayDepths: entry.compiledTimeline.placements.uniqueDepths,
      masksRenderedIntoArtifact: entry.compiledTimeline.placements.masks,
      artifacts: entry.artifacts.map((artifact) => ({
        variant: artifact.variant,
        path: artifact.path,
        frames: artifact.frames ?? null,
      })),
      externalX: null,
      externalY: null,
      externalZOrder: null,
      runtimeStateBinding: null,
    })),
    authority: {
      internalTransformsAndZOrderRenderedFromFfdec: true,
      externalRoomLayoutInvented: false,
      roomMembership: "Gunny runtime only",
      gameplay: "Gunny Worker/API only",
      runtimeIntegration: false,
    },
  };
}

function navigationContract(review) {
  const source = review.records.find((entry) => entry.occurrences.some((occurrence) => occurrence.path === "image/camp/map/campbattlemap.swf"));
  if (!source || source.compiledTimeline.interactions.defineButton2 !== 1) fail("source hotspot evidence changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    transitions: [],
    hotspots: [{
      id: "camp-battle-map-define-button2-1",
      sourceSha256: source.sourceSha256,
      sourcePath: "image/camp/map/campbattlemap.swf",
      sourceButtonEvidence: {
        defineButton2: 1,
        states: source.compiledTimeline.interactions.buttonStates,
      },
      bounds: null,
      handler: null,
      enabled: false,
      disabledReasons: [
        "R033 aggregate bounds are not bound to this button character",
        "P045 has no authoritative navigation handler for this source button",
      ],
    }],
    summary: {
      sourceCandidates: EXPECTED.hotspotCandidates,
      enabled: EXPECTED.enabledHotspots,
      transitions: 0,
    },
    policy: {
      boundsRequired: true,
      handlerAuthorityRequired: true,
      filenameOrNearbyGeometryInferenceAllowed: false,
      defaultEnabled: false,
    },
  };
}

function publicationValue(value, field) {
  if (value !== null && !/^[0-9a-f]{40}$/u.test(value)) fail(`${field} is not null or a commit SHA`);
}

async function writePackage({ dependency, rawVerification, review, artifacts, raster, hotSpring, importerCheck }) {
  const graph = sceneGraph(review);
  const navigation = navigationContract(review);
  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(exportRoot, { recursive: true });
  await writeFile(resolve(exportRoot, ".gitattributes"), "* -text whitespace=cr-at-eol\n", "utf8");
  for (const [path, artifact] of artifacts) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), artifact.bytes);
  }
  await writeJson("exports/resource-port/hall-room-world/timeline-review.json", review);
  await writeJson("exports/resource-port/hall-room-world/raster-catalog.json", raster);
  await writeJson("exports/resource-port/hall-room-world/scene-graph.json", graph);
  await writeJson("exports/resource-port/hall-room-world/navigation.json", navigation);
  await writeJson("exports/resource-port/hall-room-world/hot-spring-foundations.json", hotSpring);
  const exportFiles = await listFiles(exportRoot);
  const descriptors = [];
  for (const file of exportFiles) {
    const path = relative(root, file).replaceAll("\\", "/");
    if (path.endsWith("/.gitattributes") || path.endsWith("/manifest.json")) continue;
    const extension = extname(path).toLowerCase();
    const contentType = extension === ".json" ? "application/json"
      : extension === ".svg" ? "image/svg+xml"
        : extension === ".webp" ? "image/webp"
          : null;
    descriptors.push(await descriptorFor(path, contentType));
  }
  descriptors.sort((a, b) => a.path.localeCompare(b.path));
  const checks = {
    trackBVerifier: "pass",
    dependencyPins: "pass",
    dependencyImporterCheck: importerCheck,
    rawPin: `pass: ${rawVerification.files} files / ${rawVerification.bytes} bytes`,
    ffdecTimelineReview: `pass: ${review.summary.uniqueTimelines} unique blobs reviewed`,
    browserMediaConversion: `pass: ${review.summary.convertedTimelines} visual converted / ${EXPECTED.unresolvedVisualTimelines} visual unresolved / ${review.summary.deferredAudioTimelines} audio deferred to P047`,
    hotspotFailClosed: "pass: 1 candidate / 0 enabled",
    githubActions: "not used or inspected",
  };
  const manifest = {
    schemaVersion: 2,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P045-hall-room-world",
    status: "complete-package-with-explicit-unresolved",
    source: {
      repository: "trinhtanphat/Resource",
      commit: SOURCE_COMMIT,
      tree: SOURCE_TREE,
      readOnly: true,
    },
    dependency,
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    summary: review.summary,
    exports: descriptors,
    delivery: {
      rasterBase: "R033 external R2 staging",
      convertedMedia: "immutable P045 package objects",
      mutableBranchAllowed: false,
      legacySwfRuntimeAllowed: false,
    },
    consumerBoundary: {
      mediaConversionIsBehaviorAuthority: false,
      hotspotRequiresBoundsAndHandlerAuthority: true,
      audioPackageOwner: "P047",
      runtimeIntegration: false,
      nextSession: RUNTIME_ID,
    },
    commitPolicy: ["P045", "P045-F"],
    mergeMethod: "rebase",
    githubActions: false,
  };
  await writeJson("exports/resource-port/hall-room-world/manifest.json", manifest);
  await writeJson("resource-port/track-b/contracts/hall-room-world.json", {
    schemaVersion: 2,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P045-hall-room-world",
    sourcePin: SOURCE_COMMIT,
    sourceTree: SOURCE_TREE,
    dependencies: [dependency],
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    outputs: {
      manifest: "exports/resource-port/hall-room-world/manifest.json",
      timelineReview: "exports/resource-port/hall-room-world/timeline-review.json",
      rasterCatalog: "exports/resource-port/hall-room-world/raster-catalog.json",
      sceneGraph: "exports/resource-port/hall-room-world/scene-graph.json",
      navigation: "exports/resource-port/hall-room-world/navigation.json",
      hotSpringFoundations: "exports/resource-port/hall-room-world/hot-spring-foundations.json",
    },
    hotspotContract: {
      boundsRequired: true,
      handlerAuthorityRequired: true,
      defaultEnabled: false,
    },
    assetAddressing: {
      rawSourceReadOnly: true,
      mutableBranchAllowed: false,
      legacySwfRuntimeAllowed: false,
    },
    audioHandoff: {
      packageSessionId: "P047",
      runtimeSessionId: "R047",
      timelineCount: EXPECTED.deferredAudioTimelines,
      p045PublishesAudioBytes: false,
    },
    runtimeIntegration: false,
    githubActions: false,
  });
  await writeJson("resource-port/track-b/evidence/P045.json", {
    schemaVersion: 2,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    source: manifest.source,
    dependencies: [dependency],
    summary: {
      ...review.summary,
      sourceFiles: EXPECTED.sourceFiles,
      sourceBytes: EXPECTED.sourceBytes,
      rasterReferences: EXPECTED.rasterReferences,
      uniqueRasterBlobs: EXPECTED.uniqueRasterBlobs,
      hotspotCandidates: EXPECTED.hotspotCandidates,
      enabledHotspots: EXPECTED.enabledHotspots,
    },
    checks,
    claims: {
      allUniqueSwfBlobsReviewed: true,
      browserNativeMediaConversions: EXPECTED.convertedTimelines,
      unresolvedSwfTimelines: EXPECTED.unresolvedTimelines,
      audioTimelinesDeferredToP047: EXPECTED.deferredAudioTimelines,
      behaviorReadyTimelines: 0,
      enabledHotspots: 0,
      p045AddsHotSpringArtworkOrGeometry: false,
      roomGameplayAuthority: false,
      runtimeIntegration: false,
    },
    publication: {
      immutablePackageCommitRequired: true,
      mutableBranchAllowed: false,
      packageCommit: null,
      findingsCommit: null,
    },
    generatedAt: "2026-08-03T00:00:00Z",
    githubActions: false,
  });
  await writeJson("resource-port/track-b/status/P045.json", {
    schemaVersion: 2,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    runtimeIntegration: false,
    sourcePin: SOURCE_COMMIT,
    summary: review.summary,
    checks,
    remainingRisks: [
      "20 scripted, interactive, oversized or long-cycle SWF timelines remain disabled without a retained complete browser-native conversion",
      "4 audio-only SWF timelines are reviewed but publish no P045 audio bytes; codec normalization, ffprobe inventory and provenance are explicitly handed to P047/R047",
      "the sole DefineButton2 candidate remains disabled because per-button bounds and an authoritative handler are both absent",
      "converted SVG and lossless WebP media do not confer gameplay, room membership, state selection or event authority",
      "Hot Spring already has a Gunny foundation, but its source release still lacks reviewed vector shapes, scene texture masks, collision and water masks",
      "runtime integration and immutable object publication belong to R045 and the coordinated release sequence",
    ],
    publication: {
      immutableCommitRequired: true,
      mutableBranchAllowed: false,
      packageCommit: null,
      findingsCommit: null,
    },
  });
  await writeFile(
    resolve(root, "resource-port/track-b/findings/P045.md"),
    "# P045 hall-room-world findings\n\nPending immutable package commit. The generated timeline review is authoritative; this document is finalized by the findings-only P045-F commit.\n",
    "utf8",
  );
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/hall-room-world/manifest.json");
  const review = await json("exports/resource-port/hall-room-world/timeline-review.json");
  const raster = await json("exports/resource-port/hall-room-world/raster-catalog.json");
  const graph = await json("exports/resource-port/hall-room-world/scene-graph.json");
  const navigation = await json("exports/resource-port/hall-room-world/navigation.json");
  const hotSpring = await json("exports/resource-port/hall-room-world/hot-spring-foundations.json");
  const contract = await json("resource-port/track-b/contracts/hall-room-world.json");
  const evidence = await json("resource-port/track-b/evidence/P045.json");
  const status = await json("resource-port/track-b/status/P045.json");
  if (manifest.schemaVersion !== 2 || manifest.packageSessionId !== PACKAGE_ID
    || manifest.runtimeSessionId !== RUNTIME_ID || manifest.owner !== OWNER
    || manifest.status !== "complete-package-with-explicit-unresolved"
    || manifest.source?.commit !== SOURCE_COMMIT || manifest.source?.tree !== SOURCE_TREE
    || manifest.dependency?.evidenceGitBlobSha1 !== DEPENDENCY.evidenceGitBlobSha1
    || JSON.stringify(manifest.sourceFamilies) !== JSON.stringify(SOURCE_FAMILIES)
    || manifest.consumerBoundary?.runtimeIntegration !== false
    || manifest.delivery?.legacySwfRuntimeAllowed !== false) fail("manifest identity mismatch");
  if (review.summary?.uniqueTimelines !== EXPECTED.uniqueTimelines
    || review.summary?.convertedTimelines !== EXPECTED.convertedTimelines
    || review.summary?.convertedVisualTimelines !== EXPECTED.convertedVisualTimelines
    || review.summary?.convertedAudioTimelines !== EXPECTED.convertedAudioTimelines
    || review.summary?.deferredAudioTimelines !== EXPECTED.deferredAudioTimelines
    || review.summary?.unresolvedTimelines !== EXPECTED.unresolvedTimelines
    || review.summary?.mediaArtifacts !== EXPECTED.mediaArtifacts
    || review.summary?.behaviorReady !== 0 || review.records?.length !== EXPECTED.uniqueTimelines
    || new Set(review.records.map((entry) => entry.sourceSha256)).size !== EXPECTED.uniqueTimelines) {
    fail("timeline review summary mismatch");
  }
  const converted = review.records.filter((entry) => entry.conversionKind !== null);
  const unresolved = review.records.filter((entry) => entry.conversionKind === null);
  const deferredAudio = unresolved.filter((entry) => entry.packageClassification === "unresolved-audio-deferred-to-P047");
  if (converted.length !== EXPECTED.convertedTimelines || unresolved.length !== EXPECTED.unresolvedTimelines
    || converted.some((entry) => entry.artifacts.length === 0 || entry.behaviorReady !== false)
    || unresolved.some((entry) => entry.artifacts.length !== 0 || !entry.unresolvedReason)
    || deferredAudio.length !== EXPECTED.deferredAudioTimelines
    || deferredAudio.some((entry) => entry.handoff?.packageSessionId !== "P047"
      || entry.handoff?.runtimeSessionId !== "R047")) {
    fail("timeline resolution records overclaim completion");
  }
  const artifactReferences = converted.flatMap((entry) => entry.artifacts);
  if (new Set(artifactReferences.map((entry) => entry.path)).size !== EXPECTED.mediaArtifacts) {
    fail("media artifact reference census changed");
  }
  for (const artifact of artifactReferences) {
    const bytes = await verifyDescriptor(artifact);
    if (artifact.contentType === "image/svg+xml") inspectSvg(bytes, artifact.path);
    else if (artifact.contentType === "image/webp") inspectLosslessWebp(bytes, artifact.frames, artifact.path);
    else if (!["image/svg+xml", "image/webp"].includes(artifact.contentType)) fail(`unsupported media type: ${artifact.path}`);
  }
  if (raster.summary?.references !== EXPECTED.rasterReferences
    || raster.summary?.uniqueBlobs !== EXPECTED.uniqueRasterBlobs
    || raster.summary?.duplicatedIntoP045 !== 0 || raster.assets?.length !== EXPECTED.rasterReferences) {
    fail("raster catalog mismatch");
  }
  if (graph.summary?.convertedVisualTimelines !== EXPECTED.convertedVisualTimelines
    || graph.summary?.unresolvedVisualTimelines !== EXPECTED.unresolvedVisualTimelines
    || graph.authority?.externalRoomLayoutInvented !== false
    || graph.authority?.runtimeIntegration !== false
    || graph.surfaces.some((surface) => surface.externalX !== null || surface.externalY !== null
      || surface.externalZOrder !== null || surface.runtimeStateBinding !== null)) fail("scene graph overclaims external layout");
  if (navigation.summary?.sourceCandidates !== EXPECTED.hotspotCandidates
    || navigation.summary?.enabled !== 0 || navigation.transitions.length !== 0
    || navigation.hotspots.length !== 1
    || navigation.hotspots.some((hotspot) => hotspot.enabled !== false || hotspot.bounds !== null || hotspot.handler !== null)
    || navigation.policy?.boundsRequired !== true || navigation.policy?.handlerAuthorityRequired !== true) {
    fail("navigation hotspot failed closed incorrectly");
  }
  if (hotSpring.p045SourceMatches !== 0 || hotSpring.foundation?.immutableCommit !== GUNNY_FOUNDATION_COMMIT
    || hotSpring.foundation?.roomWorld?.fidelity?.pixelExact !== false
    || hotSpring.p045Boundary?.inventsMissingVectorGeometry !== false
    || hotSpring.p045Boundary?.addsHotSpringHotspots !== false
    || hotSpring.p045Boundary?.runtimeIntegration !== false) fail("Hot Spring foundation overclaim");
  if (JSON.stringify(contract.sourceFamilies) !== JSON.stringify(SOURCE_FAMILIES)
    || contract.dependencies?.[0]?.evidenceSha256 !== DEPENDENCY.evidenceSha256
    || contract.hotspotContract?.boundsRequired !== true
    || contract.hotspotContract?.handlerAuthorityRequired !== true
    || contract.audioHandoff?.timelineCount !== EXPECTED.deferredAudioTimelines
    || contract.audioHandoff?.p045PublishesAudioBytes !== false
    || contract.assetAddressing?.legacySwfRuntimeAllowed !== false
    || contract.runtimeIntegration !== false) fail("package contract mismatch");
  if (evidence.summary?.sourceFiles !== EXPECTED.sourceFiles
    || evidence.summary?.sourceBytes !== EXPECTED.sourceBytes
    || evidence.summary?.convertedTimelines !== EXPECTED.convertedTimelines
    || evidence.summary?.unresolvedTimelines !== EXPECTED.unresolvedTimelines
    || evidence.claims?.allUniqueSwfBlobsReviewed !== true
    || evidence.claims?.audioTimelinesDeferredToP047 !== EXPECTED.deferredAudioTimelines
    || evidence.claims?.behaviorReadyTimelines !== 0
    || evidence.claims?.enabledHotspots !== 0
    || evidence.claims?.p045AddsHotSpringArtworkOrGeometry !== false
    || status.status !== "complete-package-with-explicit-unresolved"
    || status.runtimeIntegration !== false) fail("evidence or status overclaims P045");
  publicationValue(evidence.publication?.packageCommit, "evidence packageCommit");
  publicationValue(evidence.publication?.findingsCommit, "evidence findingsCommit");
  publicationValue(status.publication?.packageCommit, "status packageCommit");
  publicationValue(status.publication?.findingsCommit, "status findingsCommit");
  for (const entry of manifest.exports) await verifyDescriptor(entry);
  const files = await listFiles(exportRoot);
  if (files.some((path) => [".swf", ".flv", ".exe", ".jar"].includes(extname(path).toLowerCase()))) {
    fail("package contains prohibited legacy/runtime binary");
  }
  if (files.length !== manifest.exports.length + 2) fail(`export file count changed: ${files.length}`);
  if (deep) {
    if (!gunnyRoot || !rawRoot || !ffdecPath) fail("--deep requires --gunny-root, --raw-root and --ffdec");
    const dependency = verifyDependency(gunnyRoot);
    await verifyRawPin(dependency.evidence);
    const rebuilt = await buildReview(dependency.evidence);
    if (JSON.stringify(rebuilt.review) !== JSON.stringify(review)) fail("deep FFDec review is not reproducible");
    for (const [path, artifact] of rebuilt.artifacts) {
      const current = await readFile(resolve(root, path));
      if (!current.equals(artifact.bytes)) fail(`deep media reproduction changed: ${path}`);
    }
    const currentHotSpring = hotSpringFoundation(gunnyRoot, dependency.evidence);
    if (JSON.stringify(currentHotSpring) !== JSON.stringify(hotSpring)) fail("Hot Spring foundation audit drifted");
    if (importerCheckRequested) runImporterCheck(gunnyRoot);
  }
  return {
    status: "pass",
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    sourceFiles: EXPECTED.sourceFiles,
    uniqueSwfBlobsReviewed: EXPECTED.uniqueTimelines,
    convertedTimelines: EXPECTED.convertedTimelines,
    unresolvedTimelines: EXPECTED.unresolvedTimelines,
    mediaArtifacts: EXPECTED.mediaArtifacts,
    hotspotCandidates: EXPECTED.hotspotCandidates,
    enabledHotspots: EXPECTED.enabledHotspots,
    runtimeIntegration: false,
    githubActions: false,
  };
}

if (writing) {
  if (!gunnyRoot || !rawRoot || !ffdecPath) fail("--write requires --gunny-root, --raw-root and --ffdec");
  const dependency = verifyDependency(gunnyRoot);
  const rawVerification = await verifyRawPin(dependency.evidence);
  const importerCheck = importerCheckRequested
    ? runImporterCheck(gunnyRoot)
    : "not requested during this generation";
  const built = await buildReview(dependency.evidence);
  const raster = rasterCatalog(dependency.evidence);
  const hotSpring = hotSpringFoundation(gunnyRoot, dependency.evidence);
  await writePackage({
    dependency: dependency.record,
    rawVerification,
    review: built.review,
    artifacts: built.artifacts,
    raster,
    hotSpring,
    importerCheck,
  });
}

console.log(JSON.stringify(await verifyPackage(), null, 2));
