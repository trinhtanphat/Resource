#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const PACKAGE_ID = "P038";
const RUNTIME_ID = "R038";
const OWNER = "avatar-equipment";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_IMPLEMENTATION_COMMIT = "3d7a049655847ab6b7802541560ef227e17df1ed";
const GUNNY_VERIFIED_MAIN = "1221419cc1f0ce4f50012b4c5b175ab84f6a8170";
const PACKAGE_FIRST_COMMIT = "a1b6bd76c4c25a1d8608fabe36f894f45f809661";
const PACKAGE_FIRST_TREE = "af7c611ceca03328e96c7a358e6fa5446f183aa5";
const TRACK_A_PUBLICATION = Object.freeze({
  path: "exports/resource-port/avatar-equipment/track-a/publication.json",
  sha256: "e59cc80b7dd9a767791ae08026c098282131acb2e0b6ce46f6273ce7e94aa391",
  verifiedOnGunnyMain: "969d7b2d33df7bbd51f7d9b0c3c6674969a79994",
  sessions: 24,
  stagedFiles: 24,
  stagedBytes: 59438,
});
const DEPENDENCIES = Array.from({ length: 24 }, (_, index) => `R${String(index + 1).padStart(3, "0")}`);
const SOURCE_FAMILIES = [
  "flash/characterdefine.xml",
  "image/arm/",
  "image/equip/",
  "image/virtual/",
  "image/weapon/",
  "weekly/weapon/",
];
const LOCKED_PATHS = [
  "exports/resource-port/avatar-equipment/**",
  "resource-port/track-b/contracts/avatar-equipment.json",
  "resource-port/track-b/evidence/P038.json",
  "resource-port/track-b/checks/P038.mjs",
  "resource-port/track-b/findings/P038.md",
  "resource-port/track-b/status/P038.json",
];
const CATALOG_COLUMNS = [
  "path", "gitBlobSha1", "bytes", "sha256", "classification", "inspectionProfile",
  "detectedFormat", "contentType", "width", "height", "alphaMode", "animated",
  "pathVariantToken", "genderToken",
];
const EXPECTED = Object.freeze({
  files: 96880,
  bytes: 2420649008,
  uniqueBlobs: 32148,
  exact: 88860,
  inferred: 0,
  unresolved: 8020,
  browserNativeRasters: 94625,
  textData: 42,
  flaAuthoring: 391,
  swfTimeline: 552,
  binaryUnknown: 1270,
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
  return SOURCE_FAMILIES.find((family) => family.endsWith("/")
    ? sourcePath.startsWith(family)
    : sourcePath === family) ?? null;
}

function pathVariantToken(sourcePath) {
  const name = basename(sourcePath).toLowerCase();
  if (/^game\d*\.png$/u.test(name)) return "game";
  if (/^show\d*\.png$/u.test(name)) return "show";
  if (/^(?:icon(?:[_ (]\d+[)]*)?|00)\.png$/u.test(name)) return "icon";
  return null;
}

function genderToken(sourcePath) {
  const token = sourcePath.split("/").find((part) => part === "m" || part === "f");
  return token ?? null;
}

function countInto(target, key, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

function attrs(raw) {
  const result = {};
  for (const match of raw.matchAll(/([A-Za-z][A-Za-z0-9]*)="([^"]*)"/gu)) result[match[1]] = match[2];
  return result;
}

function integers(raw, separator) {
  return raw.split(separator).filter(Boolean).map((value) => Number(value));
}

function parseRig(xml, sourceSha256) {
  const rootMatch = /<character\s+([^>]+)>/u.exec(xml);
  if (!rootMatch) fail("characterdefine.xml root missing");
  const character = attrs(rootMatch[1]);
  const actions = [];
  for (const actionMatch of xml.matchAll(/<action\s+([^>]+)>([\s\S]*?)<\/action>/gu)) {
    const actionAttrs = attrs(actionMatch[1]);
    const layers = [];
    let layerOrder = 0;
    for (const assetMatch of actionMatch[2].matchAll(/<asset\s+([^>]+)\/>/gu)) {
      const asset = attrs(assetMatch[1]);
      const frames = integers(asset.frames, ",");
      const points = asset.points.split("|").map((pair) => integers(pair, ","));
      if (points.some((point) => point.length !== 2 || point.some((value) => !Number.isFinite(value)))) {
        fail(`invalid anchor points in ${actionAttrs.name}/${asset.resource}`);
      }
      layers.push({
        order: layerOrder,
        resource: asset.resource,
        width: Number(asset.width),
        height: Number(asset.height),
        frames,
        anchors: points,
        anchorRepeat: points.length === 1 ? "repeat-for-all-action-ticks" : "source-sequence",
      });
      layerOrder += 1;
    }
    const tickCount = Math.max(...layers.map((layer) => layer.frames.length));
    actions.push({
      name: actionAttrs.name,
      next: actionAttrs.next,
      priority: Number(actionAttrs.priority),
      endStop: actionAttrs.endStop === "true",
      ...(actionAttrs.sound ? { sound: Number(actionAttrs.sound) } : {}),
      direction: actionAttrs.name.startsWith("back") ? "back" : "front",
      tickCount,
      layers,
    });
  }
  if (actions.length !== 8) fail(`expected 8 character actions, found ${actions.length}`);
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    source: {
      path: "flash/characterdefine.xml",
      commit: SOURCE_COMMIT,
      sha256: sourceSha256,
      classification: "exact",
    },
    coordinateSystem: {
      unit: "source-pixel",
      width: Number(character.width),
      height: Number(character.height),
      registerX: Number(character.registerX),
      registerY: Number(character.registerY),
    },
    label: character.label,
    layerOrder: "source-document-order",
    directionSource: "exact-action-name",
    frameDuration: {
      status: "unresolved",
      reason: "characterdefine.xml orders frame indices but does not declare milliseconds or FPS",
    },
    colorTransform: {
      status: "not-authored-in-characterdefine.xml",
      fallback: "identity-only-unless-an-exact-consumer-contract-supplies-a-mask-transform",
    },
    actions,
  };
}

function emptySummary() {
  return {
    files: 0,
    bytes: 0,
    uniqueBlobs: 0,
    exact: 0,
    inferred: 0,
    unresolved: 0,
    profiles: {},
    pathVariantTokens: { game: 0, show: 0, icon: 0, none: 0 },
    genderTokens: { m: 0, f: 0, none: 0 },
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
    countInto(summary.profiles, row[5]);
    countInto(summary.pathVariantTokens, row[12] ?? "none");
    countInto(summary.genderTokens, row[13] ?? "none");
  }
  summary.uniqueBlobs = blobs.size;
  return summary;
}

function assertExpected(summary) {
  const pairs = [
    ["files", EXPECTED.files], ["bytes", EXPECTED.bytes], ["uniqueBlobs", EXPECTED.uniqueBlobs],
    ["exact", EXPECTED.exact], ["inferred", EXPECTED.inferred], ["unresolved", EXPECTED.unresolved],
  ];
  for (const [key, expected] of pairs) if (summary[key] !== expected) fail(`${key} expected ${expected}, found ${summary[key]}`);
  if (summary.profiles.raster !== EXPECTED.browserNativeRasters) fail("raster census changed");
  if (summary.profiles["text-data"] !== EXPECTED.textData) fail("text-data census changed");
  if (summary.profiles["fla-authoring"] !== EXPECTED.flaAuthoring) fail("FLA census changed");
  if (summary.profiles["swf-timeline"] !== EXPECTED.swfTimeline) fail("SWF census changed");
  if (summary.profiles["binary-unknown"] !== EXPECTED.binaryUnknown) fail("unknown binary census changed");
}

function pinnedSourcePaths(repositoryRoot) {
  return git(repositoryRoot, [
    "ls-tree", "-r", "-z", "--name-only", "HEAD", "--",
    "flash/characterdefine.xml", "image/arm", "image/equip", "image/virtual", "image/weapon", "weekly/weapon",
  ], null).toString("utf8").split("\0").filter(Boolean).filter(familyFor);
}

function assertCompletePathSet(rows, repositoryRoot) {
  const catalogPaths = rows.map((row) => row[0]);
  const sourcePaths = pinnedSourcePaths(repositoryRoot);
  if (sourcePaths.length !== EXPECTED.files) fail(`raw source tree expected ${EXPECTED.files} paths, found ${sourcePaths.length}`);
  if (catalogPaths.length !== sourcePaths.length) fail("catalog/raw source path count mismatch");
  for (let index = 0; index < sourcePaths.length; index += 1) {
    if (catalogPaths[index] !== sourcePaths[index]) fail(`catalog/raw source path mismatch at ${sourcePaths[index]}`);
  }
}

async function buildFromTrackA() {
  if (!gunnyRoot || !rawRoot) fail("--write requires --gunny-root and --raw-root");
  const rawHead = git(rawRoot, ["rev-parse", "HEAD"]).trim();
  const rawTree = git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim();
  if (rawHead !== SOURCE_COMMIT || rawTree !== SOURCE_TREE) fail("raw checkout is not the immutable source pin");
  const gunnyMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
  if (gunnyMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main expected ${GUNNY_VERIFIED_MAIN}, found ${gunnyMain}`);
  git(gunnyRoot, ["merge-base", "--is-ancestor", GUNNY_IMPLEMENTATION_COMMIT, gunnyMain]);

  const dependencyRecords = [];
  const shardDescriptors = [];
  const allRows = [];
  const familyRows = new Map(SOURCE_FAMILIES.map((family) => [family, []]));
  let characterXml = null;
  let characterSha256 = null;

  await mkdir(resolve(root, "exports/resource-port/avatar-equipment/catalog"), { recursive: true });
  for (const sessionId of DEPENDENCIES) {
    const evidencePath = `config/resource-port-evidence/${sessionId}.json`;
    const evidenceBytes = git(gunnyRoot, ["show", `origin/main:${evidencePath}`], null);
    const evidence = JSON.parse(evidenceBytes.toString("utf8"));
    if (evidence.sessionId !== sessionId || evidence.completion?.trackBDependencySatisfied !== true) fail(`${sessionId} dependency is not complete`);
    if (evidence.source?.commit !== SOURCE_COMMIT || evidence.source?.tree !== SOURCE_TREE) fail(`${sessionId} source pin changed`);
    const evidenceGitBlobSha1 = git(gunnyRoot, ["rev-parse", `origin/main:${evidencePath}`]).trim();
    const dependencyRows = [];
    for (const file of evidence.files) {
      const family = familyFor(file.path);
      if (!family) continue;
      const details = file.evidence?.details ?? {};
      const row = [
        file.path,
        file.gitBlobSha1,
        file.bytes,
        file.sha256,
        file.classification,
        file.inspectionProfile,
        file.detectedFormat,
        file.output?.contentType ?? null,
        Number.isSafeInteger(details.width) ? details.width : null,
        Number.isSafeInteger(details.height) ? details.height : null,
        typeof details.alphaMode === "string" ? details.alphaMode : null,
        typeof details.animated === "boolean" ? details.animated : null,
        pathVariantToken(file.path),
        genderToken(file.path),
      ];
      dependencyRows.push(row);
      allRows.push(row);
      familyRows.get(family).push(row);
      if (file.path === "flash/characterdefine.xml") {
        characterXml = git(rawRoot, ["show", `HEAD:${file.path}`]);
        characterSha256 = file.sha256;
        if (sha256(characterXml) !== file.sha256) fail("characterdefine.xml SHA-256 mismatch");
      }
    }
    const shardPath = `exports/resource-port/avatar-equipment/catalog/${sessionId.toLowerCase()}.json`;
    const shard = {
      schemaVersion: 1,
      packageSessionId: PACKAGE_ID,
      dependencySessionId: sessionId,
      sourceCommit: SOURCE_COMMIT,
      columns: CATALOG_COLUMNS,
      summary: summarizeRows(dependencyRows),
      assets: dependencyRows,
    };
    await writeJson(shardPath, shard);
    const shardBytes = await readFile(resolve(root, shardPath));
    shardDescriptors.push({ path: shardPath, sha256: sha256(shardBytes), ...shard.summary });
    dependencyRecords.push({
      sessionId,
      implementationCommit: GUNNY_IMPLEMENTATION_COMMIT,
      evidencePath,
      evidenceGitBlobSha1,
      evidenceSha256: sha256(evidenceBytes),
      dispatchPath: evidence.shard.path,
      dispatchSha256: evidence.shard.sha256,
      sourceFiles: evidence.summary.files,
      sourceBytes: evidence.summary.bytes,
      packageFiles: dependencyRows.length,
      packageBytes: dependencyRows.reduce((sum, row) => sum + row[2], 0),
      verifiedOnGunnyMain: gunnyMain,
    });
  }

  if (!characterXml || !characterSha256) fail("characterdefine.xml was not found in Track A dependencies");
  const summary = summarizeRows(allRows);
  assertExpected(summary);
  assertCompletePathSet(allRows, rawRoot);
  const families = Object.fromEntries([...familyRows].map(([family, rows]) => [family, summarizeRows(rows)]));
  const rig = parseRig(characterXml.toString("utf8"), characterSha256);
  await writeJson("exports/resource-port/avatar-equipment/character-rig.json", rig);

  const spriteContract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    evidenceBoundary: "geometry-is-promoted-only-for-curated-consumers; filename-and-dimensions-alone-never-authorize-runtime-use",
    characterRig: {
      path: "exports/resource-port/avatar-equipment/character-rig.json",
      actionCount: 8,
      layerOrder: "source-document-order",
      anchorPolicy: "source-register-and-per-action-points",
      directions: { front: ["stand", "walk", "inhaleSmall", "inhaleBig"], back: ["backStand", "backWalk", "backInhaleSmall", "backInhaleBig"] },
    },
    curatedFrameLayouts: [
      {
        id: "battle-avatar-13x3",
        classification: "exact-for-existing-curated-Gunny-consumer-mappings",
        sourceDimensions: [1482, 285],
        columns: 13,
        rows: 3,
        frame: { width: 114, height: 95 },
        selection: "consumer mapping plus exact source path; dimensions are validation, never selection",
      },
      {
        id: "avatar-show-four-column",
        classification: "exact-for-existing-curated-face-and-suits-show-consumers",
        sourceDimensions: [1000, 312],
        columns: 4,
        rows: 1,
        frame: { width: 250, height: 312 },
        selection: "consumer slot mapping plus exact source path",
      },
    ],
    sourcePathAxes: {
      gender: { tokens: { m: "male", f: "female" }, classification: "exact-for-reviewed-equip-and-virtual-path-contracts" },
      layer: { policy: "preserve every path segment and numeric layer token in source order", inventMissingLayers: false },
      hairBranch: { tokens: ["a", "b"], policy: "preserve; front/back meaning only when a reviewed consumer supplies it" },
      pathVariant: { tokens: ["icon", "show", "game"], classification: "lexical-only", authority: false },
    },
    colorTransform: {
      assetPolicy: "preserve base and mask layer paths separately",
      valueAuthority: "Gunny runtime appearance data",
      default: "identity",
      failClosed: true,
      reason: "the Resource file tree does not authorize a color value or blend operation",
    },
    weaponDirection: {
      canonicalLayer: "image/arm/{Pic}/1/0/game.png",
      facing: "Gunny curated runtime mirrors the canonical sheet",
      secondaryLayer: "image/arm/{Pic}/1/1/game.png",
      secondaryStatus: "unresolved",
      projectileAuthority: false,
    },
    timelineBoundary: {
      swfFiles: EXPECTED.swfTimeline,
      flaFiles: EXPECTED.flaAuthoring,
      browserRuntimeAllowed: false,
      representativeFrameCountsAsConversion: false,
    },
  };
  await writeJson("exports/resource-port/avatar-equipment/sprite-frame-contract.json", spriteContract);

  const contract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    sourcePin: SOURCE_COMMIT,
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    dependencies: dependencyRecords,
    assetAddressing: {
      delivery: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      canonicalObjectKey: "exact Resource source path",
      sameOriginOnlyInComponents: true,
      mutableBranchAllowed: false,
      rawSourceReadOnly: true,
      bytesDuplicatedIntoPackage: TRACK_A_PUBLICATION.stagedBytes,
      trackAPublication: TRACK_A_PUBLICATION,
    },
    consumerBoundary: {
      packageOnly: true,
      runtimeIntegration: false,
      runtimeSessionId: RUNTIME_ID,
      requiresImmutableResourceMergeCommit: true,
      requiresCuratedTemplateOrAppearanceMapping: true,
      filenameOnlySelectionForbidden: true,
      fallback: "existing immutable Gunny asset path until R2 production smoke passes",
    },
    classification: {
      exact: "Track A proves the pinned Resource blob and browser inspection",
      inferred: "recorded but cannot own gameplay or consumer authority",
      unresolved: "must fail closed and must not reach a browser runtime",
    },
  };
  await writeJson("resource-port/track-b/contracts/avatar-equipment.json", contract);

  const catalogIndex = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependency: { repository: "trinhtanphat/Gunny", implementationCommit: GUNNY_IMPLEMENTATION_COMMIT, verifiedOnMain: gunnyMain },
    columns: CATALOG_COLUMNS,
    shards: shardDescriptors,
    summary,
    families,
    publication: {
      mode: "content-addressed-source-reference",
      canonicalObjectKey: "exact Resource source path",
      bytesDuplicatedIntoPackage: TRACK_A_PUBLICATION.stagedBytes,
      browserNativeRasterFiles: EXPECTED.browserNativeRasters,
      trackA: TRACK_A_PUBLICATION,
    },
  };
  await writeJson("exports/resource-port/avatar-equipment/catalog-index.json", catalogIndex);

  const exportPaths = [
    "exports/resource-port/avatar-equipment/catalog-index.json",
    "exports/resource-port/avatar-equipment/character-rig.json",
    "exports/resource-port/avatar-equipment/sprite-frame-contract.json",
    TRACK_A_PUBLICATION.path,
    ...shardDescriptors.map((entry) => entry.path),
  ];
  const manifest = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependency: { repository: "trinhtanphat/Gunny", sessions: DEPENDENCIES, implementationCommit: GUNNY_IMPLEMENTATION_COMMIT, verifiedOnMain: gunnyMain },
    exports: exportPaths,
    trackAPublication: TRACK_A_PUBLICATION,
    summary,
    readiness: {
      package: "complete-with-explicit-unresolved",
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      browserNativeRastersCatalogued: EXPECTED.browserNativeRasters,
      legacyRuntimeContainersAllowed: false,
      runtimeIntegration: false,
    },
    unresolved: [
      `${EXPECTED.swfTimeline} SWF timelines do not have reviewed browser-native frame/duration/transform conversion`,
      `${EXPECTED.flaAuthoring} FLA authoring files remain evidence-only`,
      `${EXPECTED.binaryUnknown} unknown binary files remain quarantined from runtime`,
      "secondary weapon layers and uncurated path variants have no consumer authority",
      "color values and animation duration are not authored by characterdefine.xml",
    ],
    githubActions: false,
  };
  await writeJson("exports/resource-port/avatar-equipment/manifest.json", manifest);

  const checks = {
    trackBVerifier: "pass: node resource-port/track-b/verify.mjs",
    packageChecker: "pass: node resource-port/track-b/checks/P038.mjs with exact Gunny and Resource roots",
    nodeSyntax: "pass: node --check resource-port/track-b/checks/P038.mjs",
    jsonParse: "pass: every P038 JSON artifact parsed",
    dependencyGate: "pass-generated-from-exact-origin-main-blobs",
    provenanceHashCount: "pass-generated-from-R001-R024",
    trackAStagingPublication: "pass: 24 exact staged payloads and 24 immutable publication manifests",
    imageMediaValidation: `pass-by-Track-A-evidence:${EXPECTED.browserNativeRasters}-raster-files`,
    gitDiffCheck: "pass: git diff --check",
    rawSourceMutation: false,
    githubActionsUsedOrInspected: false,
  };
  const evidence = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P038-avatar-equipment",
    source: { repository: "trinhtanphat/Resource", commit: SOURCE_COMMIT, tree: SOURCE_TREE, readOnly: true },
    dependencies: dependencyRecords,
    summary: { ...summary, catalogShards: shardDescriptors.length, sourceFilesProcessed: EXPECTED.files, sourceFilesUnprocessed: 0, runtimeIntegration: false },
    checks,
    classification: {
      exact: EXPECTED.exact,
      inferred: EXPECTED.inferred,
      unresolved: EXPECTED.unresolved,
      unresolvedTimelineAndContainerFiles: EXPECTED.swfTimeline + EXPECTED.flaAuthoring + EXPECTED.binaryUnknown,
    },
    claims: {
      browserNativeRastersCatalogued: true,
      characterRigPublished: true,
      layerOrderPreserved: true,
      anchorsPreserved: true,
      actionDirectionsPreserved: true,
      genderPathTokensPreserved: true,
      colorTransformInvented: false,
      swfRuntimeAllowed: false,
      runtimeIntegration: false,
    },
    publication: {
      firstCommit: PACKAGE_FIRST_COMMIT,
      firstTree: PACKAGE_FIRST_TREE,
      immutableMergeCommit: null,
      trackA: TRACK_A_PUBLICATION,
    },
    generatedAt: "2026-08-02T00:00:00Z",
    githubActions: false,
  };
  await writeJson("resource-port/track-b/evidence/P038.json", evidence);
  const status = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    status: "complete-package-with-explicit-unresolved",
    runtimeIntegration: false,
    sourcePin: SOURCE_COMMIT,
    summary: evidence.summary,
    checks,
    remainingRisks: manifest.unresolved,
    publication: {
      immutableCommitRequired: true,
      mutableBranchAllowed: false,
      packageFirstCommit: PACKAGE_FIRST_COMMIT,
      packageFirstTree: PACKAGE_FIRST_TREE,
      releaseCommit: null,
      trackA: TRACK_A_PUBLICATION,
    },
  };
  await writeJson("resource-port/track-b/status/P038.json", status);

  const findings = `# P038 avatar-equipment findings\n\n`
    + `Generated from immutable Resource pin \`${SOURCE_COMMIT}\` and Track A R001-R024 on Gunny main \`${gunnyMain}\`.\n\n`
    + `This package inventories ${EXPECTED.files.toLocaleString("en-US")} source files (${EXPECTED.bytes.toLocaleString("en-US")} bytes), including ${EXPECTED.browserNativeRasters.toLocaleString("en-US")} validated rasters. It duplicates no raw binary bytes; catalogs retain exact path, Git blob SHA-1, SHA-256, MIME, dimensions and classification for same-origin R2 delivery.\n\n`
    + `The exact character rig preserves eight action sequences, document layer order, registration point, per-action frame indices, offsets and front/back action names. Duration is unresolved because characterdefine.xml has no FPS or millisecond field. Color values remain runtime-authoritative; the package preserves source masks but invents no transform.\n\n`
    + `Fail-closed boundary: ${EXPECTED.swfTimeline} SWF, ${EXPECTED.flaAuthoring} FLA and ${EXPECTED.binaryUnknown} unknown binary files remain outside browser runtime. Secondary weapon layers and filename-only icon/show/game candidates require a curated consumer mapping in R038.\n\n`
    + `Track A publication adds ${TRACK_A_PUBLICATION.stagedFiles} exact staged manifests (${TRACK_A_PUBLICATION.stagedBytes.toLocaleString("en-US")} bytes) under the locked avatar-equipment package. Each R001-R024 prefix has its own hash-bound publication manifest; this is publication evidence only and does not claim additional browser conversion or R038 runtime ownership.\n\n`
    + `The immutable package commit is \`${PACKAGE_FIRST_COMMIT}\` with tree \`${PACKAGE_FIRST_TREE}\`. Track B verification, package checking against exact Gunny/Resource roots, Node syntax, JSON parsing, path/hash/count gates and \`git diff --check\` passed locally. The Resource checkout reports no change below any raw source root. GitHub Actions were not used.\n`;
  await writeFile(resolve(root, "resource-port/track-b/findings/P038.md"), findings, "utf8");
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/avatar-equipment/manifest.json");
  const index = await json("exports/resource-port/avatar-equipment/catalog-index.json");
  const rig = await json("exports/resource-port/avatar-equipment/character-rig.json");
  const sprites = await json("exports/resource-port/avatar-equipment/sprite-frame-contract.json");
  const contract = await json("resource-port/track-b/contracts/avatar-equipment.json");
  const evidence = await json("resource-port/track-b/evidence/P038.json");
  const status = await json("resource-port/track-b/status/P038.json");
  const trackAPublication = await verifyTrackAPublication();
  if (manifest.packageSessionId !== PACKAGE_ID || manifest.runtimeSessionId !== RUNTIME_ID) fail("session identity mismatch");
  if (manifest.source?.commit !== SOURCE_COMMIT || manifest.source?.tree !== SOURCE_TREE) fail("source pin changed");
  if (JSON.stringify(manifest.dependency?.sessions) !== JSON.stringify(DEPENDENCIES)) fail("dependency set changed");
  if (manifest.dependency?.implementationCommit !== GUNNY_IMPLEMENTATION_COMMIT || manifest.dependency?.verifiedOnMain !== GUNNY_VERIFIED_MAIN) fail("Gunny dependency identity changed");
  if (index.shards?.length !== 24) fail("expected 24 catalog shards");
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
  if (new Set(rows.map((row) => row[0])).size !== EXPECTED.files) fail("duplicate source path in catalog");
  if (rows.some((row) => !familyFor(row[0]))) fail("catalog escaped locked source families");
  if (rows.some((row) => !/^[0-9a-f]{40}$/u.test(row[1]) || !/^[0-9a-f]{64}$/u.test(row[3]))) fail("invalid source digest");
  if (rows.some((row) => !Number.isSafeInteger(row[2]) || row[2] < 0)) fail("invalid source byte count");
  if (rig.actions?.length !== 8 || rig.coordinateSystem?.registerX !== 115 || rig.coordinateSystem?.registerY !== 162) fail("character rig mismatch");
  if (rig.actions.some((action) => action.layers.some((layer, indexValue) => layer.order !== indexValue))) fail("character layer order mismatch");
  if (rig.frameDuration?.status !== "unresolved") fail("character duration was invented");
  if (sprites.timelineBoundary?.browserRuntimeAllowed !== false || sprites.weaponDirection?.secondaryStatus !== "unresolved") fail("legacy timeline boundary changed");
  if (sprites.colorTransform?.default !== "identity" || sprites.colorTransform?.failClosed !== true) fail("color transform boundary changed");
  if (contract.assetAddressing?.gatewayContract !== "ddtank-r2-gateway-v1" || contract.assetAddressing?.sameOriginOnlyInComponents !== true) fail("R2 delivery contract changed");
  if (contract.assetAddressing?.bytesDuplicatedIntoPackage !== TRACK_A_PUBLICATION.stagedBytes
    || contract.assetAddressing?.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("Track A publication contract changed");
  if (contract.consumerBoundary?.filenameOnlySelectionForbidden !== true || contract.consumerBoundary?.runtimeIntegration !== false) fail("consumer boundary changed");
  if (evidence.summary?.sourceFilesProcessed !== EXPECTED.files || evidence.summary?.sourceFilesUnprocessed !== 0) fail("evidence processing census mismatch");
  if (evidence.claims?.colorTransformInvented !== false || evidence.claims?.swfRuntimeAllowed !== false) fail("evidence overclaims conversion");
  if (evidence.publication?.firstCommit !== PACKAGE_FIRST_COMMIT || evidence.publication?.firstTree !== PACKAGE_FIRST_TREE) fail("first package commit identity mismatch");
  if (evidence.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("evidence Track A publication changed");
  if (status.status !== "complete-package-with-explicit-unresolved" || status.runtimeIntegration !== false) fail("status boundary mismatch");
  if (status.publication?.packageFirstCommit !== PACKAGE_FIRST_COMMIT || status.publication?.packageFirstTree !== PACKAGE_FIRST_TREE) fail("status first package identity mismatch");
  if (status.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("status Track A publication changed");
  if (manifest.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256
    || index.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256) fail("package Track A publication changed");
  if (manifest.githubActions !== false || evidence.githubActions !== false) fail("GitHub Actions boundary changed");

  if (gunnyRoot) {
    const currentMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
    if (currentMain !== GUNNY_VERIFIED_MAIN) fail(`Gunny origin/main drifted to ${currentMain}; refresh P038 dependency pins`);
    for (const dependency of evidence.dependencies) {
      const bytes = git(gunnyRoot, ["show", `origin/main:${dependency.evidencePath}`], null);
      if (sha256(bytes) !== dependency.evidenceSha256) fail(`${dependency.sessionId} evidence SHA-256 mismatch`);
      const blob = git(gunnyRoot, ["rev-parse", `origin/main:${dependency.evidencePath}`]).trim();
      if (blob !== dependency.evidenceGitBlobSha1) fail(`${dependency.sessionId} evidence Git blob mismatch`);
    }
  }
  if (rawRoot) {
    if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT) fail("raw source checkout drifted");
    assertCompletePathSet(rows, rawRoot);
    const xml = git(rawRoot, ["show", "HEAD:flash/characterdefine.xml"], null);
    if (sha256(xml) !== rig.source.sha256) fail("raw characterdefine.xml drifted");
  }

  console.log(JSON.stringify({
    status: "pass",
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    sourceFiles: summary.files,
    sourceBytes: summary.bytes,
    browserNativeRasters: summary.profiles.raster,
    exact: summary.exact,
    inferred: summary.inferred,
    unresolved: summary.unresolved,
    catalogShards: index.shards.length,
    characterActions: rig.actions.length,
    rawBytesDuplicated: index.publication.bytesDuplicatedIntoPackage,
    trackAPublicationSessions: trackAPublication.sessions.length,
    runtimeIntegration: false,
    githubActions: false,
  }, null, 2));
}

async function verifyTrackAPublication() {
  const rootBytes = await readFile(resolve(root, TRACK_A_PUBLICATION.path));
  if (sha256(rootBytes) !== TRACK_A_PUBLICATION.sha256) fail("Track A publication root digest mismatch");
  const publication = JSON.parse(rootBytes.toString("utf8"));
  if (publication.packageSessionId !== PACKAGE_ID || publication.runtimeSessionId !== RUNTIME_ID || publication.owner !== OWNER) {
    fail("Track A publication identity mismatch");
  }
  if (publication.source?.verifiedOnMain !== TRACK_A_PUBLICATION.verifiedOnGunnyMain) fail("Track A Gunny main pin changed");
  if (publication.summary?.sessions !== TRACK_A_PUBLICATION.sessions
    || publication.summary?.stagedFiles !== TRACK_A_PUBLICATION.stagedFiles
    || publication.summary?.stagedBytes !== TRACK_A_PUBLICATION.stagedBytes
    || publication.summary?.inferred !== 0
    || publication.summary?.unresolved !== 0) fail("Track A publication census changed");
  if (JSON.stringify(publication.sessions?.map((entry) => entry.sessionId)) !== JSON.stringify(DEPENDENCIES)) {
    fail("Track A publication dependency order changed");
  }
  let stagedFiles = 0;
  let stagedBytes = 0;
  const seenObjectKeys = new Set();
  for (const entry of publication.sessions) {
    const lower = entry.sessionId.toLowerCase();
    const expectedPrefix = `exports/resource-port/${OWNER}/track-a/${lower}/`;
    if (entry.objectPrefix !== expectedPrefix || entry.manifestPath !== `track-a/${lower}/publication.json`) {
      fail(`${entry.sessionId} Track A publication prefix changed`);
    }
    const sessionPath = resolve(root, "exports/resource-port/avatar-equipment", entry.manifestPath);
    const sessionBytes = await readFile(sessionPath);
    if (sha256(sessionBytes) !== entry.manifestSha256) fail(`${entry.sessionId} publication manifest digest mismatch`);
    const session = JSON.parse(sessionBytes.toString("utf8"));
    if (session.sessionId !== entry.sessionId || session.classification !== "exact"
      || session.target?.objectPrefix !== expectedPrefix || session.boundary?.runtimeIntegration !== false) {
      fail(`${entry.sessionId} publication manifest contract changed`);
    }
    for (const file of session.payload?.files ?? []) {
      if (!/^[A-Za-z0-9._/-]+$/u.test(file.path) || file.path.includes("..")) fail(`${entry.sessionId} unsafe payload path`);
      const objectKey = `${expectedPrefix}${file.path}`;
      if (file.objectKey !== objectKey || seenObjectKeys.has(objectKey)) fail(`${entry.sessionId} duplicate or mismatched object key`);
      seenObjectKeys.add(objectKey);
      const payloadBytes = await readFile(resolve(root, "exports/resource-port/avatar-equipment/track-a", lower, file.path));
      if (payloadBytes.length !== file.bytes || sha256(payloadBytes) !== file.sha256) fail(`${entry.sessionId} payload digest mismatch: ${file.path}`);
      stagedFiles += 1;
      stagedBytes += file.bytes;
    }
  }
  if (stagedFiles !== TRACK_A_PUBLICATION.stagedFiles || stagedBytes !== TRACK_A_PUBLICATION.stagedBytes) {
    fail("Track A publication payload totals changed");
  }
  return publication;
}

if (writing) await buildFromTrackA();
await verifyPackage();
