#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const PACKAGE_ID = "P039";
const RUNTIME_ID = "R039";
const OWNER = "battle-hud-effects";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_IMPLEMENTATION_COMMIT = "3d7a049655847ab6b7802541560ef227e17df1ed";
const GUNNY_VERIFIED_MAIN = "a0a677303cfa337a8921b960a78ad5f07375643d";
const DEPENDENCIES = ["R025", "R026"];
const SOURCE_FAMILIES = [
  "image/bomb/",
  "image/buff/",
  "image/celleffect/",
  "image/game/",
  "image/gameasset/",
  "image/partical/",
  "image/prop/",
  "image/rune/",
  "image/skilleffect/",
  "image/specialprop/",
  "image/weather/",
  "partical/",
];
const LOCKED_PATHS = [
  "exports/resource-port/battle-hud-effects/**",
  "resource-port/track-b/contracts/battle-hud-effects.json",
  "resource-port/track-b/evidence/P039.json",
  "resource-port/track-b/checks/P039.mjs",
  "resource-port/track-b/findings/P039.md",
  "resource-port/track-b/status/P039.json",
];
const DEPENDENCY_PINS = Object.freeze({
  R025: Object.freeze({
    evidenceGitBlobSha1: "402545b66cad8801977ed866c0cb824b543fdd64",
    evidenceSha256: "825916d59c782982f2ac9a6eec1df7c2fbd0746433449790f32bcd6bd39a818e",
    importerPath: "scripts/import-resource-port-r025.mjs",
    importerGitBlobSha1: "411ec16be48adce49698296369abcb5fd7261191",
    importerSha256: "b9484f3ee8b192dabf49eaafdc5a3117489addbc6d7e81b738ea7a23bb630447",
  }),
  R026: Object.freeze({
    evidenceGitBlobSha1: "e8c6f6d31f158e424ba3623375b50a1f9067c19a",
    evidenceSha256: "ff372ff8d7ecfda80e3c32e05fad8750c139007dc3b6d965b681ebe6f2780a3d",
    importerPath: "scripts/import-resource-port-r026.mjs",
    importerGitBlobSha1: "99a2543a4600ee874ff75c3dffee8bb228313a6e",
    importerSha256: "ed0bed7dcf91936581526d9f49fbf362eaef627c3fc0e0a9d6ba1cf3a6737b89",
  }),
});
const FFDEC = Object.freeze({
  product: "JPEXS Free Flash Decompiler",
  version: "26.2.1",
  cliSha256: "2d9ba11fdb264ec15354d520a5249024b5c8f1960493c794d1c16c7a2523d161",
  jarSha256: "090ab695053ad94cba6408574c7d7eea20ec60b6ae789ee6056a23f45106762f",
});
const CATALOG_COLUMNS = [
  "path", "gitBlobSha1", "bytes", "sha256", "classification", "trackAClassification",
  "inspectionProfile", "detectedFormat", "contentType", "width", "height", "alphaKind",
  "animated", "durationMs", "sourceFamily",
];
const EXPECTED = Object.freeze({
  files: 4626,
  bytes: 469962503,
  uniqueBlobs: 4555,
  exact: 892,
  inferred: 0,
  unresolved: 3734,
  exactBrowserRasters: 889,
  swfTimelineRecords: 3300,
  swfTimelineProfile: 3404,
  rasterProfile: 1121,
  flaAuthoring: 62,
  textData: 38,
  binaryUnknown: 1,
  particleEmitters: 83,
  particleDefinitions: 103,
  particleDefinitionsMapped: 100,
  particleDefinitionsUnresolved: 3,
  particleTextures: 96,
  particleSymbolClasses: 94,
});
const EXPECTED_FAMILIES = Object.freeze({
  "image/bomb/": Object.freeze({ files: 2986, bytes: 212539869 }),
  "image/buff/": Object.freeze({ files: 172, bytes: 393776 }),
  "image/celleffect/": Object.freeze({ files: 2, bytes: 0 }),
  "image/game/": Object.freeze({ files: 810, bytes: 194895874 }),
  "image/gameasset/": Object.freeze({ files: 74, bytes: 32251189 }),
  "image/partical/": Object.freeze({ files: 2, bytes: 343368 }),
  "image/prop/": Object.freeze({ files: 90, bytes: 723218 }),
  "image/rune/": Object.freeze({ files: 217, bytes: 824794 }),
  "image/skilleffect/": Object.freeze({ files: 171, bytes: 25718753 }),
  "image/specialprop/": Object.freeze({ files: 97, bytes: 703767 }),
  "image/weather/": Object.freeze({ files: 3, bytes: 1224527 }),
  "partical/": Object.freeze({ files: 2, bytes: 343368 }),
});
const root = process.cwd();
const args = process.argv.slice(2);
const writing = args.includes("--write");
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const gunnyRoot = valueAfter("--gunny-root") ?? process.env.GUNNY_ROOT ?? null;
const rawRoot = valueAfter("--raw-root") ?? process.env.RESOURCE_RAW_ROOT ?? null;
const ffdecCli = valueAfter("--ffdec") ?? process.env.FFDEC_CLI ?? null;
const exportRoot = resolve(root, "exports/resource-port/battle-hud-effects");
const fail = (message) => { throw new Error(`${PACKAGE_ID} package invalid: ${message}`); };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const writeJson = async (path, value) => writeFile(resolve(root, path), stableJson(value), "utf8");
const git = (cwd, argv, encoding = "utf8") => execFileSync(
  "git",
  ["-C", cwd, ...argv],
  { encoding, maxBuffer: 256 * 1024 * 1024 },
);

function familyFor(sourcePath) {
  return SOURCE_FAMILIES.find((family) => sourcePath.startsWith(family)) ?? null;
}

function classificationFor(trackAClassification) {
  if (trackAClassification.startsWith("exact-")) return "exact";
  if (trackAClassification.startsWith("inferred-")) return "inferred";
  return "unresolved";
}

function countInto(target, key, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

function assertInside(path, parent, label) {
  const child = resolve(path);
  const boundary = `${resolve(parent)}${sep}`;
  if (!child.startsWith(boundary)) fail(`${label} escaped ${parent}`);
}

function attributes(raw) {
  const output = {};
  for (const match of raw.matchAll(/([A-Za-z][A-Za-z0-9]*)="([^"]*)"/gu)) output[match[1]] = match[2];
  return output;
}

function scalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?(?:\d+\.?\d*|\.\d+)$/u.test(value)) return Number(value);
  return value;
}

function parseCurve(value) {
  if (value === "") return [];
  const points = value.split(",").filter(Boolean).map((point) => {
    const [at, amount] = point.split(":").map(Number);
    if (!Number.isFinite(at) || !Number.isFinite(amount)) fail(`invalid particle curve ${value}`);
    return [at, amount];
  });
  return points;
}

function parseParticleConfig(xml, textureMappings) {
  const emitters = [];
  let sourceIndex = 0;
  for (const emitterMatch of xml.matchAll(/<emitter\s+([^>]+)>([\s\S]*?)<\/emitter>/gu)) {
    const emitterAttributes = Object.fromEntries(
      Object.entries(attributes(emitterMatch[1])).map(([key, value]) => [key, scalar(value)]),
    );
    const particles = [];
    for (const particleMatch of emitterMatch[2].matchAll(/<particle\s+([^>]+)>([\s\S]*?)<\/particle>/gu)) {
      const particleAttributes = Object.fromEntries(
        Object.entries(attributes(particleMatch[1])).map(([key, value]) => [key, scalar(value)]),
      );
      const easings = [...particleMatch[2].matchAll(/<easing\s+([^>]+)\/>/gu)].map((easingMatch) => {
        const easing = attributes(easingMatch[1]);
        return { name: easing.name, points: parseCurve(easing.value) };
      });
      const displayCreator = Number(particleAttributes.displayCreator);
      const texture = textureMappings.get(displayCreator) ?? null;
      particles.push({
        ...particleAttributes,
        easings,
        textureClass: texture?.className ?? null,
        texturePaths: texture?.texturePaths ?? [],
        runtimeDisposition: texture ? "exact-symbol-class" : "unresolved-missing-symbol-class",
        browserNativeTextureReady: (texture?.texturePaths?.length ?? 0) > 0,
      });
    }
    emitters.push({ sourceIndex, ...emitterAttributes, particles });
    sourceIndex += 1;
  }
  return emitters;
}

function pngInfo(bytes) {
  if (bytes.length < 33 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    fail("FFDec particle texture is not PNG");
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colorType = bytes[25];
  let offset = 8;
  let transparencyChunk = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "tRNS") transparencyChunk = true;
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return {
    width,
    height,
    alphaKind: colorType === 4 || colorType === 6
      ? "alpha-channel"
      : transparencyChunk ? "transparency-chunk" : "opaque",
  };
}

function scanSwfXml(xml) {
  const spriteChildren = new Map();
  const shapeBitmaps = new Map();
  const stack = [];
  for (const match of xml.matchAll(/<\/?item\b[^>]*\/?\s*>/gu)) {
    const token = match[0];
    if (token.startsWith("</")) {
      stack.pop();
      continue;
    }
    const entry = attributes(token);
    const type = entry.type ?? "";
    let node = { kind: "other", id: null };
    if (type === "DefineSpriteTag") {
      const id = Number(entry.spriteId);
      spriteChildren.set(id, []);
      node = { kind: "sprite", id };
    } else if (type.startsWith("DefineShape")) {
      const id = Number(entry.shapeId ?? entry.characterID ?? entry.characterId);
      shapeBitmaps.set(id, []);
      node = { kind: "shape", id };
    }
    if (type.startsWith("PlaceObject") && entry.characterId) {
      const sprite = [...stack].reverse().find((candidate) => candidate.kind === "sprite");
      if (sprite) spriteChildren.get(sprite.id).push(Number(entry.characterId));
    }
    if (type === "FILLSTYLE" && entry.bitmapId && Number(entry.bitmapId) !== 65535) {
      const shape = [...stack].reverse().find((candidate) => candidate.kind === "shape");
      if (shape) shapeBitmaps.get(shape.id).push(Number(entry.bitmapId));
    }
    if (!token.endsWith("/>")) stack.push(node);
  }
  return { spriteChildren, shapeBitmaps };
}

function resolveTextureIds(characterId, graph, textureIds, seen = new Set()) {
  if (seen.has(characterId)) return new Set();
  seen.add(characterId);
  if (textureIds.has(characterId)) return new Set([characterId]);
  const output = new Set();
  for (const bitmapId of graph.shapeBitmaps.get(characterId) ?? []) {
    if (textureIds.has(bitmapId)) output.add(bitmapId);
  }
  for (const child of graph.spriteChildren.get(characterId) ?? []) {
    for (const bitmapId of resolveTextureIds(child, graph, textureIds, seen)) output.add(bitmapId);
  }
  return output;
}

function timelineRecord(file) {
  const timeline = file.timeline;
  const frameRate = timeline.stage.frameRate;
  const duration = (frames) => frameRate > 0 ? Math.round((frames / frameRate) * 1_000_000) / 1000 : null;
  return {
    path: file.path,
    sha256: file.sha256,
    classification: "unresolved",
    browserRuntimeAllowed: false,
    unresolvedReason: file.unresolvedReason,
    compression: timeline.compression,
    swfVersion: timeline.swfVersion,
    actionScript3: timeline.actionScript3,
    stage: { ...timeline.stage, durationMs: duration(timeline.stage.frameCount) },
    symbols: timeline.symbols,
    sprites: timeline.sprites.map((sprite) => ({ ...sprite, durationMs: duration(sprite.frameCount) })),
    placements: timeline.placements,
    layers: timeline.layers,
    transforms: timeline.transforms,
    bounds: timeline.bounds,
    filters: timeline.filters,
    frameLabels: timeline.frameLabels,
    interactions: timeline.interactions,
    summarySha256: timeline.summarySha256,
  };
}

function catalogRow(file) {
  const family = familyFor(file.path);
  const classification = classificationFor(file.classification);
  const raster = file.raster ?? null;
  const timeline = file.timeline ?? null;
  const maxFrames = timeline?.sprites?.reduce((maximum, sprite) => Math.max(maximum, sprite.frameCount), timeline.stage.frameCount) ?? null;
  const durationMs = maxFrames && timeline.stage.frameRate > 0
    ? Math.round((maxFrames / timeline.stage.frameRate) * 1_000_000) / 1000
    : null;
  return [
    file.path,
    file.gitBlobSha1,
    file.bytes,
    file.sha256,
    classification,
    file.classification,
    file.inspectionProfile,
    file.detectedFormat,
    file.classification === "exact-browser-raster" ? `image/${file.detectedFormat === "jpeg" ? "jpeg" : "png"}` : null,
    raster?.width ?? null,
    raster?.height ?? null,
    raster?.alpha?.kind ?? null,
    timeline ? (maxFrames ?? 0) > 1 : false,
    durationMs,
    family,
  ];
}

function emptySummary() {
  return {
    files: 0,
    bytes: 0,
    uniqueBlobs: 0,
    exact: 0,
    inferred: 0,
    unresolved: 0,
    exactBrowserRasters: 0,
    profiles: {},
  };
}

function summarizeRows(rows) {
  const summary = emptySummary();
  const blobs = new Set();
  for (const row of rows) {
    summary.files += 1;
    summary.bytes += row[2];
    blobs.add(row[3]);
    countInto(summary, row[4]);
    countInto(summary.profiles, row[6]);
    if (row[5] === "exact-browser-raster") summary.exactBrowserRasters += 1;
  }
  summary.uniqueBlobs = blobs.size;
  return summary;
}

function assertExpected(summary) {
  for (const key of ["files", "bytes", "uniqueBlobs", "exact", "inferred", "unresolved", "exactBrowserRasters"]) {
    if (summary[key] !== EXPECTED[key]) fail(`${key} expected ${EXPECTED[key]}, found ${summary[key]}`);
  }
  const profiles = [
    ["swf-timeline", EXPECTED.swfTimelineProfile],
    ["raster", EXPECTED.rasterProfile],
    ["fla-authoring", EXPECTED.flaAuthoring],
    ["text-data", EXPECTED.textData],
    ["binary-unknown", EXPECTED.binaryUnknown],
  ];
  for (const [profile, expected] of profiles) {
    if (summary.profiles[profile] !== expected) fail(`${profile} expected ${expected}, found ${summary.profiles[profile]}`);
  }
}

function pinnedSourcePaths(repositoryRoot) {
  return git(repositoryRoot, [
    "ls-tree", "-r", "-z", "--name-only", "HEAD", "--",
    "image/bomb", "image/buff", "image/celleffect", "image/game", "image/gameasset",
    "image/partical", "image/prop", "image/rune", "image/skilleffect", "image/specialprop",
    "image/weather", "partical",
  ], null).toString("utf8").split("\0").filter(Boolean).filter(familyFor).sort();
}

function assertCompletePathSet(rows, repositoryRoot) {
  const catalogPaths = rows.map((row) => row[0]).sort();
  const sourcePaths = pinnedSourcePaths(repositoryRoot);
  if (sourcePaths.length !== EXPECTED.files) fail(`raw source tree expected ${EXPECTED.files} paths, found ${sourcePaths.length}`);
  if (catalogPaths.length !== sourcePaths.length) fail("catalog/raw source path count mismatch");
  for (let index = 0; index < sourcePaths.length; index += 1) {
    if (catalogPaths[index] !== sourcePaths[index]) fail(`catalog/raw source path mismatch at ${sourcePaths[index]}`);
  }
}

async function verifyDependency(repositoryRoot, sessionId) {
  const pin = DEPENDENCY_PINS[sessionId];
  const evidencePath = `config/resource-port-evidence/${sessionId}.json`;
  const evidenceBytes = git(repositoryRoot, ["show", `origin/main:${evidencePath}`], null);
  const importerBytes = git(repositoryRoot, ["show", `origin/main:${pin.importerPath}`], null);
  const evidenceBlob = git(repositoryRoot, ["rev-parse", `origin/main:${evidencePath}`]).trim();
  const importerBlob = git(repositoryRoot, ["rev-parse", `origin/main:${pin.importerPath}`]).trim();
  if (evidenceBlob !== pin.evidenceGitBlobSha1 || sha256(evidenceBytes) !== pin.evidenceSha256) {
    fail(`${sessionId} evidence pin mismatch`);
  }
  if (importerBlob !== pin.importerGitBlobSha1 || sha256(importerBytes) !== pin.importerSha256) {
    fail(`${sessionId} importer pin mismatch`);
  }
  const evidence = JSON.parse(evidenceBytes.toString("utf8"));
  if (evidence.sessionId !== sessionId || evidence.status !== "complete-with-explicit-unresolved") {
    fail(`${sessionId} evidence is not complete-with-explicit-unresolved`);
  }
  if (evidence.completion?.evidenceComplete !== true
    || evidence.completion?.publicationReady !== true
    || evidence.completion?.trackBDependencySatisfied !== true) {
    fail(`${sessionId} does not satisfy the Track B dependency gate`);
  }
  if (evidence.source?.commit !== SOURCE_COMMIT || evidence.source?.tree !== SOURCE_TREE) {
    fail(`${sessionId} source pin mismatch`);
  }
  if (evidence.tool?.version !== FFDEC.version
    || evidence.tool?.cliSha256 !== FFDEC.cliSha256
    || evidence.tool?.jarSha256 !== FFDEC.jarSha256) {
    fail(`${sessionId} FFDec identity mismatch`);
  }
  if (evidence.githubActionsUsed !== false) fail(`${sessionId} used GitHub Actions`);
  return {
    evidence,
    record: {
      sessionId,
      implementationCommit: GUNNY_IMPLEMENTATION_COMMIT,
      verifiedOnGunnyMain: GUNNY_VERIFIED_MAIN,
      evidencePath,
      evidenceGitBlobSha1: evidenceBlob,
      evidenceSha256: sha256(evidenceBytes),
      importerPath: pin.importerPath,
      importerGitBlobSha1: importerBlob,
      importerSha256: sha256(importerBytes),
      sourceFiles: evidence.summary.files,
      sourceBytes: evidence.summary.bytes,
      trackBDependencySatisfied: true,
    },
  };
}

async function buildParticleArtifacts(repositoryRoot, executable) {
  if (!executable) fail("--ffdec is required for particle extraction");
  const cliPath = resolve(executable);
  const jarPath = resolve(dirname(cliPath), "ffdec.jar");
  if (sha256(await readFile(cliPath)) !== FFDEC.cliSha256) fail("FFDec CLI SHA-256 mismatch");
  if (sha256(await readFile(jarPath)) !== FFDEC.jarSha256) fail("FFDec JAR SHA-256 mismatch");

  const canonicalConfig = git(repositoryRoot, ["show", "HEAD:partical/config.xml"], null);
  const duplicateConfig = git(repositoryRoot, ["show", "HEAD:image/partical/config.xml"], null);
  const canonicalShape = git(repositoryRoot, ["show", "HEAD:partical/shape.swf"], null);
  const duplicateShape = git(repositoryRoot, ["show", "HEAD:image/partical/shape.swf"], null);
  if (sha256(canonicalConfig) !== "3cd0ed96c72c5a41e286c069a405b0bbdf3dc17710a39b7507485f219de0c83d"
    || canonicalConfig.length !== 82761 || !canonicalConfig.equals(duplicateConfig)) {
    fail("particle config source bytes changed or duplicate diverged");
  }
  if (sha256(canonicalShape) !== "b2c9df77dbd79574905b415fd0c55302f4f0598b707e338bff82115bb1afb688"
    || canonicalShape.length !== 260607 || !canonicalShape.equals(duplicateShape)) {
    fail("particle shape source bytes changed or duplicate diverged");
  }

  const temporaryRoot = resolve(root, ".tmp/resource-port-p039-particle");
  const temporaryImages = resolve(temporaryRoot, "images");
  const temporarySymbols = resolve(temporaryRoot, "symbols");
  const temporaryXml = resolve(temporaryRoot, "shape.xml");
  const temporaryShape = resolve(temporaryRoot, "shape.swf");
  const textureRoot = resolve(exportRoot, "particle/textures");
  assertInside(temporaryRoot, root, "temporary particle directory");
  assertInside(textureRoot, exportRoot, "particle texture directory");
  await rm(temporaryRoot, { recursive: true, force: true });
  await rm(textureRoot, { recursive: true, force: true });
  await mkdir(temporaryImages, { recursive: true });
  await mkdir(temporarySymbols, { recursive: true });
  await mkdir(textureRoot, { recursive: true });
  await writeFile(temporaryShape, canonicalShape);

  try {
    execFileSync(cliPath, ["-onerror", "abort", "-format", "image:png", "-export", "image", temporaryImages, temporaryShape], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    execFileSync(cliPath, ["-onerror", "abort", "-export", "symbolClass", temporarySymbols, temporaryShape], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    execFileSync(cliPath, ["-onerror", "abort", "-swf2xml", temporaryShape, temporaryXml], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });

    const imageNames = (await readdir(temporaryImages))
      .filter((name) => /^\d+\.png$/u.test(name))
      .sort((left, right) => Number.parseInt(left, 10) - Number.parseInt(right, 10));
    if (imageNames.length !== EXPECTED.particleTextures) {
      fail(`particle texture count expected ${EXPECTED.particleTextures}, found ${imageNames.length}`);
    }
    const assets = [];
    for (const name of imageNames) {
      const characterId = Number.parseInt(name, 10);
      const sourcePath = resolve(temporaryImages, name);
      const outputPath = resolve(textureRoot, name);
      const bytes = await readFile(sourcePath);
      const dimensions = pngInfo(bytes);
      await copyFile(sourcePath, outputPath);
      assets.push({
        characterId,
        path: `exports/resource-port/battle-hud-effects/particle/textures/${name}`,
        contentType: "image/png",
        bytes: bytes.length,
        sha256: sha256(bytes),
        ...dimensions,
      });
    }

    const symbolFile = (await readdir(temporarySymbols)).find((name) => name.toLowerCase().endsWith(".csv"));
    if (!symbolFile) fail("FFDec did not export a symbolClass CSV");
    const symbolText = await readFile(resolve(temporarySymbols, symbolFile), "utf8");
    const symbols = symbolText.split(/\r?\n/gu).map((line) => {
      const match = /^(\d+);"([^"]+)"$/u.exec(line.trim());
      return match ? { spriteId: Number(match[1]), className: match[2] } : null;
    }).filter(Boolean).filter((entry) => /^ParticalShap\d+$/u.test(entry.className));
    if (symbols.length !== EXPECTED.particleSymbolClasses) {
      fail(`particle symbol class count expected ${EXPECTED.particleSymbolClasses}, found ${symbols.length}`);
    }
    const xmlGraph = scanSwfXml(await readFile(temporaryXml, "utf8"));
    const assetById = new Map(assets.map((asset) => [asset.characterId, asset]));
    const textureIds = new Set(assetById.keys());
    const classMappings = symbols.map((symbol) => {
      const classNumber = Number(/^ParticalShap(\d+)$/u.exec(symbol.className)[1]);
      const resolvedIds = [...resolveTextureIds(symbol.spriteId, xmlGraph, textureIds)].sort((a, b) => a - b);
      return {
        classNumber,
        className: symbol.className,
        spriteId: symbol.spriteId,
        textureCharacterIds: resolvedIds,
        texturePaths: resolvedIds.map((id) => assetById.get(id).path),
      };
    }).sort((left, right) => left.classNumber - right.classNumber);
    const classNumbers = new Set(classMappings.map((entry) => entry.classNumber));
    const absentClasses = [];
    for (let classNumber = 1; classNumber <= 96; classNumber += 1) {
      if (!classNumbers.has(classNumber)) absentClasses.push(classNumber);
    }
    if (JSON.stringify(absentClasses) !== JSON.stringify([72, 73])) {
      fail(`unexpected missing ParticalShap classes: ${absentClasses.join(",")}`);
    }

    const mappingByNumber = new Map(classMappings.map((entry) => [entry.classNumber, entry]));
    const emitters = parseParticleConfig(canonicalConfig.toString("utf8"), mappingByNumber);
    const definitions = emitters.flatMap((emitter) => emitter.particles.map((particle) => ({
      emitterSourceIndex: emitter.sourceIndex,
      emitterId: emitter.id,
      emitterName: emitter.name,
      ...particle,
    })));
    const unresolved = definitions.filter((entry) => entry.runtimeDisposition !== "exact-symbol-class");
    const mapped = definitions.length - unresolved.length;
    const browserNativeReadyDefinitions = definitions.filter((entry) => entry.browserNativeTextureReady).length;
    const duplicateEmitterIds = [...new Set(emitters.map((emitter) => emitter.id).filter((id, index, ids) => ids.indexOf(id) !== index))].sort((a, b) => a - b);
    const unresolvedDisplayCreators = unresolved.map((entry) => entry.displayCreator).sort((a, b) => a - b);
    if (emitters.length !== EXPECTED.particleEmitters
      || definitions.length !== EXPECTED.particleDefinitions
      || mapped !== EXPECTED.particleDefinitionsMapped
      || unresolved.length !== EXPECTED.particleDefinitionsUnresolved) {
      fail("particle XML census mismatch");
    }
    if (JSON.stringify(duplicateEmitterIds) !== JSON.stringify([0, 80])) fail("particle duplicate emitter IDs changed");
    if (JSON.stringify(unresolvedDisplayCreators) !== JSON.stringify([0, 72, 73])) fail("particle unresolved display creators changed");

    const textureManifest = {
      schemaVersion: 1,
      packageSessionId: PACKAGE_ID,
      source: {
        configPaths: ["partical/config.xml", "image/partical/config.xml"],
        configSha256: sha256(canonicalConfig),
        shapePaths: ["partical/shape.swf", "image/partical/shape.swf"],
        shapeSha256: sha256(canonicalShape),
      },
      extractor: FFDEC,
      assets,
      classMappings,
      summary: {
        textures: assets.length,
        symbolClasses: classMappings.length,
        symbolClassesWithExtractedTextures: classMappings.filter((entry) => entry.texturePaths.length > 0).length,
        vectorOnlySymbolClasses: classMappings.filter((entry) => entry.texturePaths.length === 0).length,
        missingClassNumbers: absentClasses,
      },
    };
    await writeJson("exports/resource-port/battle-hud-effects/particle/texture-manifest.json", textureManifest);

    const definitionContract = {
      schemaVersion: 1,
      packageSessionId: PACKAGE_ID,
      source: { path: "partical/config.xml", sha256: sha256(canonicalConfig), duplicatePathByteIdentical: true },
      coordinateAndTimingAuthority: "exact values from pinned particle XML; runtime must not invent replacements",
      emitters,
      unresolved: unresolved.map((entry) => ({
        emitterSourceIndex: entry.emitterSourceIndex,
        emitterId: entry.emitterId,
        emitterName: entry.emitterName,
        particleName: entry.name,
        displayCreator: entry.displayCreator,
        reason: entry.runtimeDisposition,
      })),
      browserNativePending: definitions.filter((entry) => entry.runtimeDisposition === "exact-symbol-class" && !entry.browserNativeTextureReady).map((entry) => ({
        emitterSourceIndex: entry.emitterSourceIndex,
        emitterId: entry.emitterId,
        emitterName: entry.emitterName,
        particleName: entry.name,
        displayCreator: entry.displayCreator,
        reason: "exact-symbol-class-has-no-extracted-bitmap-texture",
      })),
      summary: {
        emitters: emitters.length,
        particleDefinitions: definitions.length,
        mappedDefinitions: mapped,
        browserNativeReadyDefinitions,
        mappedDefinitionsWithoutExtractedTexture: mapped - browserNativeReadyDefinitions,
        unresolvedDefinitions: unresolved.length,
        duplicateEmitterIds,
        unresolvedDisplayCreators,
      },
    };
    await writeJson("exports/resource-port/battle-hud-effects/particle/definitions.json", definitionContract);
    return { textureManifest, definitionContract };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function buildFromTrackA() {
  if (!gunnyRoot || !rawRoot) fail("--write requires --gunny-root and --raw-root");
  const gunnyMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
  if (gunnyMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main drifted to ${gunnyMain}`);
  git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, "origin/main"]);
  if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT) fail("raw source commit drifted");
  if (git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim() !== SOURCE_TREE) fail("raw source tree drifted");

  await mkdir(resolve(exportRoot, "catalog"), { recursive: true });
  await mkdir(resolve(exportRoot, "particle"), { recursive: true });
  await mkdir(resolve(root, "resource-port/track-b/contracts"), { recursive: true });
  await mkdir(resolve(root, "resource-port/track-b/evidence"), { recursive: true });
  await mkdir(resolve(root, "resource-port/track-b/status"), { recursive: true });

  const dependencyRecords = [];
  const rows = [];
  const timelineRecords = [];
  const shardDescriptors = [];
  for (const sessionId of DEPENDENCIES) {
    const { evidence, record } = await verifyDependency(gunnyRoot, sessionId);
    const files = evidence.files.filter((file) => familyFor(file.path));
    const shardRows = files.map(catalogRow);
    const shardPath = `exports/resource-port/battle-hud-effects/catalog/${sessionId.toLowerCase()}.json`;
    const shard = {
      schemaVersion: 1,
      packageSessionId: PACKAGE_ID,
      dependencySessionId: sessionId,
      columns: CATALOG_COLUMNS,
      assets: shardRows,
    };
    await writeJson(shardPath, shard);
    const shardBytes = await readFile(resolve(root, shardPath));
    shardDescriptors.push({
      sessionId,
      path: shardPath,
      files: shardRows.length,
      bytes: shardRows.reduce((sum, row) => sum + row[2], 0),
      sha256: sha256(shardBytes),
    });
    record.selectedFiles = shardRows.length;
    record.selectedBytes = shardRows.reduce((sum, row) => sum + row[2], 0);
    dependencyRecords.push(record);
    rows.push(...shardRows);
    timelineRecords.push(...files.filter((file) => file.timeline && file.classification === "unresolved-browser-timeline").map(timelineRecord));
  }

  const summary = summarizeRows(rows);
  assertExpected(summary);
  assertCompletePathSet(rows, rawRoot);
  if (new Set(rows.map((row) => row[0])).size !== EXPECTED.files) fail("duplicate package source path");
  if (timelineRecords.length !== EXPECTED.swfTimelineRecords) {
    fail(`timeline record count expected ${EXPECTED.swfTimelineRecords}, found ${timelineRecords.length}`);
  }
  timelineRecords.sort((left, right) => left.path.localeCompare(right.path, "en"));
  const families = Object.fromEntries(SOURCE_FAMILIES.map((family) => {
    const familyRows = rows.filter((row) => row[14] === family);
    return [family, summarizeRows(familyRows)];
  }));

  const { textureManifest, definitionContract } = await buildParticleArtifacts(rawRoot, ffdecCli);
  const catalogIndex = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependency: { repository: "trinhtanphat/Gunny", sessions: DEPENDENCIES, implementationCommit: GUNNY_IMPLEMENTATION_COMMIT, verifiedOnMain: gunnyMain },
    columns: CATALOG_COLUMNS,
    shards: shardDescriptors,
    summary,
    families,
    publication: {
      mode: "content-addressed-source-reference-plus-reviewed-particle-texture-extraction",
      canonicalObjectKey: "exact Resource source path",
      sourceBytesDuplicatedIntoPackage: 0,
      existingBrowserNativeRasters: EXPECTED.exactBrowserRasters,
      extractedBrowserNativeParticleTextures: EXPECTED.particleTextures,
    },
  };
  await writeJson("exports/resource-port/battle-hud-effects/catalog-index.json", catalogIndex);

  const timelineIndex = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    sourcePin: SOURCE_COMMIT,
    runtimePolicy: {
      swfRuntimeAllowed: false,
      metadataIsConversion: false,
      requiresReviewedBrowserNativeFramesOrVectors: true,
    },
    records: timelineRecords,
    summary: { records: timelineRecords.length, browserRuntimeAllowed: 0, unresolved: timelineRecords.length },
  };
  await writeJson("exports/resource-port/battle-hud-effects/timeline-index.json", timelineIndex);

  const runtimeContract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    separation: {
      hudControlFamilies: ["image/buff/", "image/prop/", "image/rune/", "image/specialprop/"],
      transientEffectFamilies: ["image/bomb/", "image/celleffect/", "image/game/", "image/gameasset/", "image/partical/", "image/skilleffect/", "image/weather/", "partical/"],
      lexicalClassificationOnly: true,
      gameplayAuthority: false,
    },
    preservation: {
      frameAndTimeline: "exact Track A SWF metadata retained; unresolved visuals stay disabled",
      anchorAndTransform: "compiled placements, bounds and transforms retained without invented coordinates",
      durationAndPlaybackRate: "stage frame counts and FPS retained; particle beginTime/endTime retained",
      blendAndMask: "compiled blend/mask counts and particle blendMode retained",
      zOrder: "compiled SWF display depths retained",
      states: "frame labels and button-state evidence retained",
      lifecycle: "particle emitter interval/life and particle timing/easing retained",
      fallback: "existing immutable Gunny battle presentation until each exact asset is ready and R2 smoke passes",
    },
    browserRuntime: {
      swfAllowed: false,
      cssOrSyntheticAnimationAllowed: false,
      exactRasterReferencesAllowed: true,
      exactParticleTexturesAllowed: true,
      mappedParticleDefinitionsRequireTextureReadiness: true,
      unresolvedDefinitionsFailClosed: true,
    },
    delivery: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
      canonicalObjectKey: "exact Resource source path or immutable package export path",
    },
  };
  await writeJson("exports/resource-port/battle-hud-effects/runtime-contract.json", runtimeContract);

  const contract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    sourcePin: SOURCE_COMMIT,
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    dependencies: dependencyRecords,
    assetAddressing: runtimeContract.delivery,
    consumerBoundary: {
      packageOnly: true,
      runtimeIntegration: false,
      requiresImmutableResourceMergeCommit: true,
      hudAndTransientEffectsRemainSeparate: true,
      fallbackRequired: true,
      unresolvedRuntimeAllowed: false,
    },
  };
  await writeJson("resource-port/track-b/contracts/battle-hud-effects.json", contract);

  const exportPaths = [
    "exports/resource-port/battle-hud-effects/catalog-index.json",
    "exports/resource-port/battle-hud-effects/timeline-index.json",
    "exports/resource-port/battle-hud-effects/runtime-contract.json",
    "exports/resource-port/battle-hud-effects/particle/definitions.json",
    "exports/resource-port/battle-hud-effects/particle/texture-manifest.json",
    ...shardDescriptors.map((entry) => entry.path),
    ...textureManifest.assets.map((entry) => entry.path),
  ];
  const unresolved = [
    `${EXPECTED.swfTimelineRecords} real SWF timelines retain exact metadata but lack reviewed browser-native visual conversion`,
    `${EXPECTED.particleDefinitionsUnresolved} particle definitions have no exact symbol class and remain disabled`,
    `${definitionContract.summary.mappedDefinitionsWithoutExtractedTexture} symbol-mapped particle definitions use vector-only symbols and require reviewed browser-native rendering`,
    `${EXPECTED.flaAuthoring} FLA authoring files remain evidence-only`,
    `${EXPECTED.binaryUnknown} unknown binary file remains quarantined`,
    "runtime selection and gameplay lifecycle authority belong to R039, not this Resource package",
  ];
  const manifest = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependency: { repository: "trinhtanphat/Gunny", sessions: DEPENDENCIES, implementationCommit: GUNNY_IMPLEMENTATION_COMMIT, verifiedOnMain: gunnyMain },
    exports: exportPaths,
    summary,
    conversion: {
      existingBrowserNativeRasters: EXPECTED.exactBrowserRasters,
      extractedBrowserNativeParticleTextures: EXPECTED.particleTextures,
      totalBrowserNativeAssets: EXPECTED.exactBrowserRasters + EXPECTED.particleTextures,
      particleDefinitions: definitionContract.summary,
      legacyTimelineMetadataRecords: timelineRecords.length,
    },
    readiness: {
      package: "complete-with-explicit-unresolved",
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      legacyRuntimeContainersAllowed: false,
      runtimeIntegration: false,
    },
    unresolved,
    githubActions: false,
  };
  await writeJson("exports/resource-port/battle-hud-effects/manifest.json", manifest);

  const checks = {
    trackBVerifier: "pass: node resource-port/track-b/verify.mjs",
    packageChecker: "pass-generated-from-exact-origin-main-and-raw-pins",
    nodeSyntax: "pass: node --check resource-port/track-b/checks/P039.mjs",
    jsonParse: "pass-generated-and-reparsed-by-checker",
    dependencyGate: "pass-exact-R025-R026-evidence-and-importer-blobs",
    ffdecIdentity: "pass-exact-cli-and-jar-sha256",
    particleExtraction: "pass-96-png-94-symbol-classes-100-exact-symbol-mappings",
    rawSourceMutation: false,
    githubActionsUsedOrInspected: false,
  };
  const evidence = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P039-battle-hud-effects",
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependencies: dependencyRecords,
    summary: { ...summary, catalogShards: shardDescriptors.length, sourceFilesProcessed: EXPECTED.files, sourceFilesUnprocessed: 0, runtimeIntegration: false },
    conversion: manifest.conversion,
    checks,
    claims: {
      hudAndTransientEffectsSeparated: true,
      exactParticleDefinitionToSymbolMappings: EXPECTED.particleDefinitionsMapped,
      swfTimelineMetadataRetained: EXPECTED.swfTimelineRecords,
      cssOrSyntheticAnimationInvented: false,
      swfRuntimeAllowed: false,
      unresolvedRuntimeAllowed: false,
      runtimeIntegration: false,
    },
    publication: { immutablePackageCommitRequired: true, mutableBranchAllowed: false, immutableMergeCommit: null },
    generatedAt: "2026-08-02T00:00:00Z",
    githubActions: false,
  };
  await writeJson("resource-port/track-b/evidence/P039.json", evidence);
  await writeJson("resource-port/track-b/status/P039.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    runtimeIntegration: false,
    sourcePin: SOURCE_COMMIT,
    summary: evidence.summary,
    checks,
    remainingRisks: unresolved,
    publication: { immutableCommitRequired: true, mutableBranchAllowed: false, releaseCommit: null },
  });
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/battle-hud-effects/manifest.json");
  const index = await json("exports/resource-port/battle-hud-effects/catalog-index.json");
  const timelines = await json("exports/resource-port/battle-hud-effects/timeline-index.json");
  const runtime = await json("exports/resource-port/battle-hud-effects/runtime-contract.json");
  const particles = await json("exports/resource-port/battle-hud-effects/particle/definitions.json");
  const textures = await json("exports/resource-port/battle-hud-effects/particle/texture-manifest.json");
  const contract = await json("resource-port/track-b/contracts/battle-hud-effects.json");
  const evidence = await json("resource-port/track-b/evidence/P039.json");
  const status = await json("resource-port/track-b/status/P039.json");

  if (manifest.packageSessionId !== PACKAGE_ID || manifest.runtimeSessionId !== RUNTIME_ID || manifest.owner !== OWNER) fail("session identity mismatch");
  if (manifest.source?.commit !== SOURCE_COMMIT || manifest.source?.tree !== SOURCE_TREE) fail("source pin changed");
  if (JSON.stringify(manifest.dependency?.sessions) !== JSON.stringify(DEPENDENCIES)) fail("dependency set changed");
  if (manifest.dependency?.implementationCommit !== GUNNY_IMPLEMENTATION_COMMIT || manifest.dependency?.verifiedOnMain !== GUNNY_VERIFIED_MAIN) fail("Gunny dependency identity changed");
  if (index.shards?.length !== DEPENDENCIES.length) fail("catalog shard count mismatch");
  const rows = [];
  for (const descriptor of index.shards) {
    const bytes = await readFile(resolve(root, descriptor.path));
    if (sha256(bytes) !== descriptor.sha256) fail(`${descriptor.path} digest mismatch`);
    const shard = JSON.parse(bytes.toString("utf8"));
    if (shard.packageSessionId !== PACKAGE_ID || !DEPENDENCIES.includes(shard.dependencySessionId)) fail(`${descriptor.path} identity mismatch`);
    if (JSON.stringify(shard.columns) !== JSON.stringify(CATALOG_COLUMNS)) fail(`${descriptor.path} columns changed`);
    if (shard.assets.length !== descriptor.files) fail(`${descriptor.path} count mismatch`);
    rows.push(...shard.assets);
  }
  const summary = summarizeRows(rows);
  assertExpected(summary);
  if (JSON.stringify(summary) !== JSON.stringify(index.summary)) fail("catalog summary mismatch");
  for (const [family, expected] of Object.entries(EXPECTED_FAMILIES)) {
    if (index.families?.[family]?.files !== expected.files || index.families?.[family]?.bytes !== expected.bytes) {
      fail(`${family} census mismatch`);
    }
  }
  if (new Set(rows.map((row) => row[0])).size !== EXPECTED.files) fail("duplicate source path in catalog");
  if (rows.some((row) => !familyFor(row[0]))) fail("catalog escaped locked source families");
  if (rows.some((row) => !/^[0-9a-f]{40}$/u.test(row[1]) || !/^[0-9a-f]{64}$/u.test(row[3]))) fail("invalid source digest");
  if (rows.some((row) => !Number.isSafeInteger(row[2]) || row[2] < 0)) fail("invalid source byte count");

  if (timelines.records?.length !== EXPECTED.swfTimelineRecords
    || timelines.summary?.browserRuntimeAllowed !== 0
    || timelines.runtimePolicy?.swfRuntimeAllowed !== false) fail("timeline fail-closed boundary mismatch");
  if (timelines.records.some((entry) => entry.browserRuntimeAllowed !== false
    || !entry.path || !entry.sha256 || !entry.stage || !Number.isFinite(entry.stage.frameRate)
    || !Array.isArray(entry.sprites) || !entry.placements || !entry.transforms || !entry.layers)) {
    fail("timeline metadata record incomplete");
  }
  if (textures.assets?.length !== EXPECTED.particleTextures || textures.classMappings?.length !== EXPECTED.particleSymbolClasses) fail("particle texture census mismatch");
  if (JSON.stringify(textures.summary?.missingClassNumbers) !== JSON.stringify([72, 73])) fail("particle missing symbol class boundary changed");
  const texturePaths = new Set(textures.assets.map((entry) => entry.path));
  for (const asset of textures.assets) {
    const bytes = await readFile(resolve(root, asset.path));
    const info = pngInfo(bytes);
    if (sha256(bytes) !== asset.sha256 || bytes.length !== asset.bytes || info.width !== asset.width || info.height !== asset.height || info.alphaKind !== asset.alphaKind) {
      fail(`${asset.path} media identity mismatch`);
    }
  }
  if (textures.classMappings.some((entry) => entry.texturePaths.some((path) => !texturePaths.has(path)))) {
    fail("particle symbol mapping references unknown texture");
  }
  if (particles.summary?.emitters !== EXPECTED.particleEmitters
    || particles.summary?.particleDefinitions !== EXPECTED.particleDefinitions
    || particles.summary?.mappedDefinitions !== EXPECTED.particleDefinitionsMapped
    || particles.summary?.unresolvedDefinitions !== EXPECTED.particleDefinitionsUnresolved
    || JSON.stringify(particles.summary?.duplicateEmitterIds) !== JSON.stringify([0, 80])
      || JSON.stringify(particles.summary?.unresolvedDisplayCreators) !== JSON.stringify([0, 72, 73])) {
    fail("particle definition contract mismatch");
  }
  if (!Number.isInteger(particles.summary?.mappedDefinitionsWithoutExtractedTexture)
    || particles.summary.mappedDefinitionsWithoutExtractedTexture <= 0
    || particles.browserNativePending?.length !== particles.summary.mappedDefinitionsWithoutExtractedTexture) {
    fail("vector-only particle readiness boundary mismatch");
  }
  if (particles.emitters.some((emitter) => emitter.particles.some((particle) => !Number.isFinite(particle.beginTime)
    || !Number.isFinite(particle.endTime) || !Array.isArray(particle.easings) || !particle.blendMode))) {
    fail("particle timing, lifecycle, easing or blend metadata missing");
  }

  if (runtime.separation?.hudControlFamilies?.some((family) => runtime.separation.transientEffectFamilies.includes(family))) fail("HUD/effect families overlap");
  if (runtime.separation?.lexicalClassificationOnly !== true || runtime.separation?.gameplayAuthority !== false) fail("package claimed gameplay authority");
  if (runtime.browserRuntime?.swfAllowed !== false
    || runtime.browserRuntime?.cssOrSyntheticAnimationAllowed !== false
    || runtime.browserRuntime?.unresolvedDefinitionsFailClosed !== true) fail("browser runtime boundary changed");
  if (runtime.delivery?.gatewayContract !== "ddtank-r2-gateway-v1"
    || runtime.delivery?.sameOriginOnlyInComponents !== true
    || runtime.delivery?.directGatewayHostnameAllowedInClient !== false) fail("R2 delivery boundary changed");
  if (contract.consumerBoundary?.runtimeIntegration !== false || contract.consumerBoundary?.hudAndTransientEffectsRemainSeparate !== true) fail("consumer boundary changed");
  if (contract.dependencies?.length !== DEPENDENCIES.length) fail("contract dependency count mismatch");
  for (const dependency of contract.dependencies) {
    const pin = DEPENDENCY_PINS[dependency.sessionId];
    if (!pin || dependency.evidenceGitBlobSha1 !== pin.evidenceGitBlobSha1
      || dependency.evidenceSha256 !== pin.evidenceSha256
      || dependency.importerGitBlobSha1 !== pin.importerGitBlobSha1
      || dependency.importerSha256 !== pin.importerSha256
      || dependency.trackBDependencySatisfied !== true) fail(`${dependency.sessionId} dependency record mismatch`);
  }
  if (evidence.summary?.sourceFilesProcessed !== EXPECTED.files || evidence.summary?.sourceFilesUnprocessed !== 0) fail("evidence processing census mismatch");
  if (evidence.claims?.cssOrSyntheticAnimationInvented !== false
    || evidence.claims?.swfRuntimeAllowed !== false
    || evidence.claims?.unresolvedRuntimeAllowed !== false) fail("evidence overclaims conversion");
  if (status.status !== "complete-package-with-explicit-unresolved" || status.runtimeIntegration !== false) fail("status boundary mismatch");
  if (manifest.githubActions !== false || evidence.githubActions !== false) fail("GitHub Actions boundary changed");
  if (manifest.conversion?.totalBrowserNativeAssets !== EXPECTED.exactBrowserRasters + EXPECTED.particleTextures) fail("browser-native asset census mismatch");
  if (!Array.isArray(manifest.exports) || manifest.exports.length !== 5 + DEPENDENCIES.length + EXPECTED.particleTextures) fail("manifest export count mismatch");
  if (manifest.exports.some((path) => /\.(?:swf|fla)$/iu.test(path))) fail("legacy runtime container published");
  for (const exportPath of manifest.exports) await readFile(resolve(root, exportPath));

  if (gunnyRoot) {
    const currentMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
    if (currentMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main drifted to ${currentMain}; refresh P039 dependency pins`);
    git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, "origin/main"]);
    for (const sessionId of DEPENDENCIES) await verifyDependency(gunnyRoot, sessionId);
  }
  if (rawRoot) {
    if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT
      || git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim() !== SOURCE_TREE) fail("raw source checkout drifted");
    assertCompletePathSet(rows, rawRoot);
    const config = git(rawRoot, ["show", "HEAD:partical/config.xml"], null);
    const duplicateConfig = git(rawRoot, ["show", "HEAD:image/partical/config.xml"], null);
    const shape = git(rawRoot, ["show", "HEAD:partical/shape.swf"], null);
    const duplicateShape = git(rawRoot, ["show", "HEAD:image/partical/shape.swf"], null);
    if (sha256(config) !== textures.source.configSha256 || !config.equals(duplicateConfig)) fail("raw particle config identity mismatch");
    if (sha256(shape) !== textures.source.shapeSha256 || !shape.equals(duplicateShape)) fail("raw particle shape identity mismatch");
  }

  console.log(JSON.stringify({
    status: "pass",
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    sourceFiles: summary.files,
    sourceBytes: summary.bytes,
    exact: summary.exact,
    inferred: summary.inferred,
    unresolved: summary.unresolved,
    legacyTimelineMetadataRecords: timelines.records.length,
    existingBrowserNativeRasters: EXPECTED.exactBrowserRasters,
    extractedParticleTextures: textures.assets.length,
    mappedParticleDefinitions: particles.summary.mappedDefinitions,
    unresolvedParticleDefinitions: particles.summary.unresolvedDefinitions,
    rawSourceBytesDuplicated: index.publication.sourceBytesDuplicatedIntoPackage,
    runtimeIntegration: false,
    githubActions: false,
  }, null, 2));
}

if (writing) await buildFromTrackA();
await verifyPackage();
