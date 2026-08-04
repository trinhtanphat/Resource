#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";

const PACKAGE_ID = "P043";
const RUNTIME_ID = "R043";
const OWNER = "store-mail-economy";
const SOURCE_COMMIT = "519c35a293745b6a0477c4f6ea03110a89de2318";
const SOURCE_TREE = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const GUNNY_VERIFIED_MAIN = "e2552ddf57beca13d9ab2dca1b168fda0161f337";
const TRACK_A_PUBLICATION = Object.freeze({
  path: "exports/resource-port/store-mail-economy/track-a/publication.json",
  bytes: 2858,
  sha256: "30c5e75afb1bcf00771d6a543f6cee0c90f2700592f13502a1a7b8d194c7d0d1",
  verifiedOnGunnyMain: "969d7b2d33df7bbd51f7d9b0c3c6674969a79994",
  sessions: 2,
  stagedFiles: 2,
  stagedBytes: 4959,
});
const DEPENDENCIES = Object.freeze(["R030", "R031"]);
const DEPENDENCY_PINS = Object.freeze({
  R030: Object.freeze({
    implementationCommit: "3d7a049655847ab6b7802541560ef227e17df1ed",
    evidencePath: "config/resource-port-evidence/R030.json",
    evidenceGitBlobSha1: "4bc9d98db71fc14ae656d61c15bc097bb84cc685",
    evidenceSha256: "9b0abf854107ff2fbba7871b6091cf3c000e10d0dd83bcc2e9a30d3d35d10ce8",
    importerPath: "scripts/import-resource-port-r030.mjs",
    importerGitBlobSha1: "cd939de2e05d972a7b6e528081b01a56be0298fe",
    importerSha256: "776cc115dd846de3f95ac32d0d645a84a45fcfd5f62df0d3a1a0c02e29fc9705",
    shardPath: "config/resource-port-dispatch/shards/store-mail-economy-001.json",
    shardSha256: "54636cfb5ccd6b11d2f3b21b78ade42fa940111dcd7d7f683ff2ad5f1fd90876",
    files: 4096,
    bytes: 29627845,
  }),
  R031: Object.freeze({
    implementationCommit: "3d7a049655847ab6b7802541560ef227e17df1ed",
    evidencePath: "config/resource-port-evidence/R031.json",
    evidenceGitBlobSha1: "fd1f3ac3934eff756aab27884721f14cb895bccb",
    evidenceSha256: "620586a52a8991cbbb5a7d8cbdaabe815bd1ae1b17a7a39279face4512921157",
    importerPath: "scripts/import-resource-port-r031.mjs",
    importerGitBlobSha1: "16ae11d6d9aafa0410215ac81916887f7e26fda2",
    importerSha256: "fa3f422c18c3ab52717a5241dd42c44e256edb2bd6ab8e4d32d86376be3bfb60",
    shardPath: "config/resource-port-dispatch/shards/store-mail-economy-002.json",
    shardSha256: "721fb1577863e47b0507df0c56398c855adb5434104c0a898b3ed88eb0c01600",
    files: 639,
    bytes: 5567858,
  }),
});
const SOURCE_FAMILIES = Object.freeze([
  "image/card/",
  "image/cardbox/",
  "image/gift/",
  "image/oneshopping/",
  "image/unfrightprop/",
]);
const LOCKED_PATHS = Object.freeze([
  "exports/resource-port/store-mail-economy/**",
  "resource-port/track-b/contracts/store-mail-economy.json",
  "resource-port/track-b/evidence/P043.json",
  "resource-port/track-b/checks/P043.mjs",
  "resource-port/track-b/findings/P043.md",
  "resource-port/track-b/status/P043.json",
]);
const EXPECTED = Object.freeze({
  files: 4735,
  bytes: 35195703,
  uniqueBlobs: 3470,
  trackAExact: 4631,
  trackAInferred: 0,
  trackAUnresolved: 104,
  packageExact: 4724,
  packageInferred: 0,
  packageUnresolved: 11,
  aliasMappings: 78,
  correctedMappings: 15,
  correctedObjects: 12,
  correctedBytes: 93842,
  rasterProfile: 4709,
  binaryUnknownProfile: 25,
  textDataProfile: 1,
  cardAssets: 216,
  cardIds: 132,
  cardBoxAssets: 84,
  cardBoxIds: 84,
  sharedCardIds: 83,
  cardOnlyIds: 49,
  cardBoxOnlyIds: 1,
  giftAssets: 142,
  shopDecorationAssets: 15,
  itemIconAssets: 4267,
  foundationFiles: 195,
  foundationBytes: 1517862,
});
const EXPECTED_FAMILIES = Object.freeze({
  "image/card/": Object.freeze({ files: 216, bytes: 2304628, exact: 216, unresolved: 0 }),
  "image/cardbox/": Object.freeze({ files: 84, bytes: 473690, exact: 84, unresolved: 0 }),
  "image/gift/": Object.freeze({ files: 143, bytes: 748630, exact: 142, unresolved: 1 }),
  "image/oneshopping/": Object.freeze({ files: 15, bytes: 184771, exact: 15, unresolved: 0 }),
  "image/unfrightprop/": Object.freeze({ files: 4277, bytes: 31483984, exact: 4267, unresolved: 10 }),
});
const FOUNDATION_ROOTS = Object.freeze({
  "public/game-ui/kit/shop": Object.freeze({
    files: 34,
    bytes: 277149,
    uniqueBlobs: 34,
    identitySha256: "436e79958855b1058700bbb3407fe362a17ba988f63286e605f895d0161e0b08",
  }),
  "public/game-ui/mail": Object.freeze({
    files: 57,
    bytes: 195070,
    uniqueBlobs: 57,
    identitySha256: "a770f73b1025b224adc34e2455398084af1ba052b365153e642b51bdce130ccd",
  }),
  "public/game-ui/gift": Object.freeze({
    files: 40,
    bytes: 303089,
    uniqueBlobs: 40,
    identitySha256: "b9e4b78876ef62e20a4a09caf63ac473f2e54eaa86eb73f1c4646c4f0a57056e",
  }),
  "public/game-ui/store-embed": Object.freeze({
    files: 64,
    bytes: 742554,
    uniqueBlobs: 64,
    identitySha256: "2651fef3bacfbe7bff34dabbe2749df46a02fd728b68f3599e0d9e19f82b3935",
  }),
});
const GUNNY_CONTEXT_PINS = Object.freeze({
  "src/client/source-shop-paged.ts": Object.freeze({
    blob: "d310cd6295f641dac887d3d1bcf55a0b50645f7a",
    bytes: 19902,
    sha256: "c9de74f0ffbd144eb84a3d1bf861a71b0d736e30ecc91b8b070e2b12677b1efb",
  }),
  "src/client/source-shop-resource-icons.ts": Object.freeze({
    blob: "603a1d7b89e6b266596725ce3679bc33a436e191",
    bytes: 2365,
    sha256: "8ee4cdb0e6796247075f72da95028fb830ad7fe783662af28adabb818420485c",
  }),
  "src/client/source-shop-good-item.css": Object.freeze({
    blob: "06b3fd38fd1c700244a21a884b79b03fb1941224",
    bytes: 6336,
    sha256: "c4102925a244cbc57876a4097ea7a6ce059283a3f85e5b2cb42646dd57c30750",
  }),
  "src/client/account.css": Object.freeze({
    blob: "c79ded65f6b36d905a5b8525af759f58c1f2b5e3",
    bytes: 25197,
    sha256: "9cdaa0f511ecd192569bbcb8e509e2c9aa909244f97f761123a8fdcbbb8b1694",
  }),
  "src/client/shop-gift.ts": Object.freeze({
    blob: "a638fb607e3bd788b7a2ee7953e59fae770252f9",
    bytes: 12387,
    sha256: "49c956db4018ed0b80a00d6f30d53421000cd14e305048e9c36377d73293491c",
  }),
  "src/client/source-mail.ts": Object.freeze({
    blob: "9125000b685dadd6597444c0de1dc0943d94895f",
    bytes: 46146,
    sha256: "1509393cb7656869c01f1134988bb5de51db4ab8fbc5ee5e5c85f4d2d94303b6",
  }),
  "src/client/source-store-embed-view.ts": Object.freeze({
    blob: "c9d9ccacdf0cfbba27210a2ab0f4af9ffaba81b2",
    bytes: 22564,
    sha256: "fa242e8631007176f4d6ffbd243f53b4d60063204a6ce6444913542f5ea21f00",
  }),
  "src/worker/item-routes.ts": Object.freeze({
    blob: "1b1e1738e5c1d0ea870ab3f026ab9676c2eba2f1",
    bytes: 13781,
    sha256: "12ccac39d7165358caf564a8c2f4146e559356b568bac94906255997412ef900",
  }),
  "src/worker/shop-gift-routes.ts": Object.freeze({
    blob: "601b81202867e881cd5a6b5e8f17f2b3e2803323",
    bytes: 10350,
    sha256: "af1968bd8e74f2501abc4edaf52b92cc9043e3011e13f1499f1e2793531842f3",
  }),
  "src/worker/legacy-content.ts": Object.freeze({
    blob: "3e2622fcc42aa44e454344fa8e75cbe060ea8bea",
    bytes: 13008,
    sha256: "0c3ca0abb31a12a0840c44ebace76df4ab6c51e02073b0b423d186926293dfed",
  }),
  "public/game-ui/kit/shop/good-item-manifest.json": Object.freeze({
    blob: "d5aaadf442884a2b6163d4a8622ef7071ac8d937",
    bytes: 5525,
    sha256: "0dba5f29b474467f35ec1e034ade9e8b23be59a9b023e625ef7a903067e1b12a",
  }),
  "public/game-ui/store-embed/manifest.json": Object.freeze({
    blob: "a513f19d74f20913d2766709168361477030ba79",
    bytes: 46225,
    sha256: "3d9253f18fcc2f12dde4e5d5be41f93ecd387b10d608796ff885315c80b975b1",
  }),
});
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
  "canonicalSourcePath",
  "packageOutput",
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
const exportRoot = resolve(root, "exports/resource-port/store-mail-economy");
const fail = (message) => { throw new Error(PACKAGE_ID + " package invalid: " + message); };
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stableJson = (value) => JSON.stringify(value, null, 2) + "\n";
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
  const boundary = resolve(parent) + sep;
  if (!child.startsWith(boundary)) fail(label + " escaped " + parent);
}

function sourceFamily(path) {
  return SOURCE_FAMILIES.find((prefix) => path.startsWith(prefix)) ?? null;
}

function consumerRole(path) {
  if (path.startsWith("image/card/")) return "item-card-art";
  if (path.startsWith("image/cardbox/")) return "item-card-box-art";
  if (path.startsWith("image/gift/")) return "gift-presentation-art";
  if (path.startsWith("image/oneshopping/")) return "shop-decoration-art";
  return "item-icon-art";
}

function contentTypeFor(format) {
  if (format === "png") return "image/png";
  if (format === "jpeg") return "image/jpeg";
  return null;
}

function correctedOutput(file) {
  const extension = file.detectedFormat === "jpeg" ? "jpg" : "png";
  return "exports/resource-port/store-mail-economy/raster/" + file.sha256 + "." + extension;
}

function resolutionRecords(files) {
  const exactBySha256 = new Map();
  for (const file of files) {
    if (file.classification !== "exact" || !file.output) continue;
    const matches = exactBySha256.get(file.sha256) ?? [];
    matches.push(file);
    exactBySha256.set(file.sha256, matches);
  }
  return files.map((file) => {
    const alias = file.classification === "unresolved"
      ? (exactBySha256.get(file.sha256) ?? [])
        .filter((candidate) => candidate.path !== file.path)
        .sort((left, right) => left.path.localeCompare(right.path, "en"))[0] ?? null
      : null;
    const correction = !alias
      && file.classification === "unresolved"
      && file.evidence?.valid === true
      && (file.detectedFormat === "png" || file.detectedFormat === "jpeg");
    const packageClassification = file.classification === "exact" || alias || correction
      ? "exact"
      : file.classification;
    const details = file.evidence?.details ?? {};
    return {
      file,
      packageClassification,
      contentType: alias?.output?.contentType
        ?? file.output?.contentType
        ?? (correction ? contentTypeFor(file.detectedFormat) : null),
      width: details.width ?? alias?.evidence?.details?.width ?? null,
      height: details.height ?? alias?.evidence?.details?.height ?? null,
      canonicalSourcePath: alias?.path ?? (file.classification === "exact" ? file.path : null),
      packageOutput: correction ? correctedOutput(file) : null,
      aliasOf: alias?.path ?? null,
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
    sourceFamily(file.path),
    consumerRole(file.path),
    record.canonicalSourcePath,
    record.packageOutput,
    file.dependencySessionId,
  ];
}

function summarize(records) {
  const summary = {
    files: records.length,
    bytes: records.reduce((total, record) => total + record.file.bytes, 0),
    uniqueBlobs: new Set(records.map((record) => record.file.gitBlobSha1)).size,
    trackA: { exact: 0, inferred: 0, unresolved: 0 },
    package: { exact: 0, inferred: 0, unresolved: 0 },
    profiles: {},
    families: {},
    aliasMappings: records.filter((record) => record.aliasOf).length,
    correctedMappings: records.filter((record) => record.packageOutput).length,
    correctedObjects: new Set(records.filter((record) => record.packageOutput).map((record) => record.packageOutput)).size,
  };
  for (const record of records) {
    const family = sourceFamily(record.file.path);
    if (!family) fail("path outside P043 source families: " + record.file.path);
    summary.trackA[record.file.classification] += 1;
    summary.package[record.packageClassification] += 1;
    summary.profiles[record.file.inspectionProfile] = (summary.profiles[record.file.inspectionProfile] ?? 0) + 1;
    const familySummary = summary.families[family] ?? { files: 0, bytes: 0, exact: 0, inferred: 0, unresolved: 0 };
    familySummary.files += 1;
    familySummary.bytes += record.file.bytes;
    familySummary[record.packageClassification] += 1;
    summary.families[family] = familySummary;
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
    || summary.aliasMappings !== EXPECTED.aliasMappings
    || summary.correctedMappings !== EXPECTED.correctedMappings
    || summary.correctedObjects !== EXPECTED.correctedObjects
    || summary.profiles.raster !== EXPECTED.rasterProfile
    || summary.profiles["binary-unknown"] !== EXPECTED.binaryUnknownProfile
    || summary.profiles["text-data"] !== EXPECTED.textDataProfile
  ) fail("R030/R031 P043 census changed");
  for (const [family, expected] of Object.entries(EXPECTED_FAMILIES)) {
    if (JSON.stringify(summary.families[family]) !== JSON.stringify({
      files: expected.files,
      bytes: expected.bytes,
      exact: expected.exact,
      inferred: 0,
      unresolved: expected.unresolved,
    })) fail("P043 family census changed: " + family);
  }
}

function imageDimensions(bytes, contentType, label) {
  if (contentType === "image/png") {
    if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
      || bytes.subarray(12, 16).toString("ascii") !== "IHDR") fail(label + " is not PNG");
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (contentType !== "image/jpeg" || bytes.length < 4
    || bytes[0] !== 0xff || bytes[1] !== 0xd8
    || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) fail(label + " is not JPEG");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  fail(label + " JPEG dimensions are missing");
}

function verifyDependency(repositoryRoot, sessionId) {
  const pin = DEPENDENCY_PINS[sessionId];
  const evidenceBytes = git(repositoryRoot, ["show", "origin/main:" + pin.evidencePath], null);
  const importerBytes = git(repositoryRoot, ["show", "origin/main:" + pin.importerPath], null);
  const evidenceBlob = git(repositoryRoot, ["rev-parse", "origin/main:" + pin.evidencePath]).trim();
  const importerBlob = git(repositoryRoot, ["rev-parse", "origin/main:" + pin.importerPath]).trim();
  if (evidenceBlob !== pin.evidenceGitBlobSha1 || sha256(evidenceBytes) !== pin.evidenceSha256) {
    fail(sessionId + " evidence pin mismatch");
  }
  if (importerBlob !== pin.importerGitBlobSha1 || sha256(importerBytes) !== pin.importerSha256) {
    fail(sessionId + " importer pin mismatch");
  }
  const evidence = JSON.parse(evidenceBytes.toString("utf8"));
  if (
    evidence.sessionId !== sessionId
    || evidence.owner !== OWNER
    || evidence.status !== "complete-with-explicit-unresolved"
    || evidence.source?.commit !== SOURCE_COMMIT
    || evidence.source?.tree !== SOURCE_TREE
    || evidence.shard?.path !== pin.shardPath
    || evidence.shard?.sha256 !== pin.shardSha256
    || evidence.summary?.files !== pin.files
    || evidence.summary?.bytes !== pin.bytes
    || evidence.completion?.trackBDependencySatisfied !== true
  ) fail(sessionId + " dependency contract mismatch");
  return {
    evidence,
    record: {
      sessionId,
      implementationCommit: pin.implementationCommit,
      verifiedOnGunnyMain: GUNNY_VERIFIED_MAIN,
      evidencePath: pin.evidencePath,
      evidenceGitBlobSha1: pin.evidenceGitBlobSha1,
      evidenceSha256: pin.evidenceSha256,
      importerPath: pin.importerPath,
      importerGitBlobSha1: pin.importerGitBlobSha1,
      importerSha256: pin.importerSha256,
      shardPath: pin.shardPath,
      shardSha256: pin.shardSha256,
      sourceFiles: pin.files,
      sourceBytes: pin.bytes,
      trackBDependencySatisfied: true,
    },
  };
}

function verifyContextPins(repositoryRoot) {
  const output = [];
  const text = {};
  for (const [path, pin] of Object.entries(GUNNY_CONTEXT_PINS)) {
    const bytes = git(repositoryRoot, ["show", "origin/main:" + path], null);
    const blob = git(repositoryRoot, ["rev-parse", "origin/main:" + path]).trim();
    if (blob !== pin.blob || bytes.length !== pin.bytes || sha256(bytes) !== pin.sha256) {
      fail("Gunny context pin changed: " + path);
    }
    output.push({ path, ...pin });
    if (path.endsWith(".ts") || path.endsWith(".css")) text[path] = bytes.toString("utf8");
  }
  const shop = text["src/client/source-shop-paged.ts"] ?? "";
  const shopCss = text["src/client/source-shop-good-item.css"] ?? "";
  const accountCss = text["src/client/account.css"] ?? "";
  const gift = text["src/client/shop-gift.ts"] ?? "";
  const mail = text["src/client/source-mail.ts"] ?? "";
  if (!shop.includes('data-selected="') || !shop.includes("aria-pressed=")
    || !shop.includes("purchaseBlockReason") || !shop.includes("/api/shop")) {
    fail("shop presentation context no longer proves selected/disabled/server data states");
  }
  if (!shopCss.includes('[data-selected="true"]') || !shopCss.includes("):disabled")) {
    fail("shop GoodItem state CSS changed");
  }
  if (!accountCss.includes(".source-shop-item:hover")
    || !accountCss.includes(".rarity-rare") || !accountCss.includes(".rarity-epic")) {
    fail("shop hover/rarity foundation changed");
  }
  if (!gift.includes("data-shop-transaction-pending") || !gift.includes("/api/shop/gift")
    || !gift.includes("button.disabled = pending")) fail("gift pending state foundation changed");
  if (!mail.includes('row.dataset.state = entry.status === "unread" ? "unread" : "read"')
    || !mail.includes('row.setAttribute("aria-selected"')
    || !mail.includes("/api/mail") || !mail.includes("button.disabled = true")) {
    fail("mail selected/read/disabled foundation changed");
  }
  return output;
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

function foundationAudit(repositoryRoot, contextPins) {
  const roots = [];
  const allEntries = [];
  for (const [rootPath, expected] of Object.entries(FOUNDATION_ROOTS)) {
    const entries = parseTreeEntries(
      git(repositoryRoot, ["ls-tree", "-lr", "-z", "origin/main", "--", rootPath], null),
      rootPath,
    );
    const identity = entries.map((entry) => (
      entry.path + "\0" + entry.gitBlobSha1 + "\0" + entry.bytes + "\n"
    )).join("");
    const summary = {
      files: entries.length,
      bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
      uniqueBlobs: new Set(entries.map((entry) => entry.gitBlobSha1)).size,
      identitySha256: sha256(Buffer.from(identity)),
    };
    if (JSON.stringify(summary) !== JSON.stringify(expected)) {
      fail("Gunny foundation root changed: " + rootPath);
    }
    roots.push({ path: rootPath, ...summary, files: entries });
    allEntries.push(...entries);
  }
  if (allEntries.length !== EXPECTED.foundationFiles
    || allEntries.reduce((total, entry) => total + entry.bytes, 0) !== EXPECTED.foundationBytes) {
    fail("Gunny foundation aggregate changed");
  }
  return {
    repository: "trinhtanphat/Gunny",
    immutableCommit: GUNNY_VERIFIED_MAIN,
    roots,
    contextPins,
    summary: {
      files: EXPECTED.foundationFiles,
      bytes: EXPECTED.foundationBytes,
      uniqueBlobs: new Set(allEntries.map((entry) => entry.gitBlobSha1)).size,
      duplicatedIntoP043: 0,
    },
  };
}

function assertRawTree(records) {
  if (!rawRoot) fail("--raw-root is required while generating P043");
  if (git(rawRoot, ["rev-parse", "HEAD"]).trim() !== SOURCE_COMMIT
    || git(rawRoot, ["rev-parse", "HEAD^{tree}"]).trim() !== SOURCE_TREE) {
    fail("raw source checkout drifted");
  }
  const familyPaths = SOURCE_FAMILIES.map((family) => family.slice(0, -1));
  const rawStatus = git(rawRoot, ["status", "--porcelain", "--", ...familyPaths]);
  if (rawStatus.trim()) fail("raw P043 source families are dirty");
  const entries = new Map();
  const tree = git(rawRoot, ["ls-tree", "-lr", "-z", "HEAD", "--", ...familyPaths], null);
  for (const record of parseTreeEntries(tree, "raw")) {
    entries.set(record.path, { blob: record.gitBlobSha1, bytes: record.bytes });
  }
  if (entries.size !== EXPECTED.files) fail("raw source path count changed to " + entries.size);
  for (const record of records) {
    const entry = entries.get(record.file.path);
    if (!entry || entry.blob !== record.file.gitBlobSha1 || entry.bytes !== record.file.bytes) {
      fail("raw source identity changed: " + record.file.path);
    }
  }
}

async function materializeCorrections(records) {
  const unique = new Map();
  for (const record of records.filter((entry) => entry.packageOutput)) {
    if (!unique.has(record.packageOutput)) unique.set(record.packageOutput, record);
  }
  let bytesTotal = 0;
  for (const [outputPath, record] of unique) {
    assertInside(resolve(root, outputPath), exportRoot, "corrected raster output");
    const bytes = git(rawRoot, ["show", "HEAD:" + record.file.path], null);
    if (bytes.length !== record.file.bytes || sha256(bytes) !== record.file.sha256) {
      fail("corrected raster source changed: " + record.file.path);
    }
    const dimensions = imageDimensions(bytes, record.contentType, record.file.path);
    if (dimensions.width !== record.width || dimensions.height !== record.height) {
      fail("corrected raster dimensions changed: " + record.file.path);
    }
    await mkdir(dirname(resolve(root, outputPath)), { recursive: true });
    await writeFile(resolve(root, outputPath), bytes);
    bytesTotal += bytes.length;
  }
  if (unique.size !== EXPECTED.correctedObjects || bytesTotal !== EXPECTED.correctedBytes) {
    fail("corrected raster aggregate changed");
  }
}

function effectiveObjectKey(record) {
  return record.packageOutput ?? record.canonicalSourcePath;
}

function cardCatalog(records) {
  const cardRecords = records.filter((record) => (
    record.packageClassification === "exact" && record.file.path.startsWith("image/card/")
  ));
  const boxRecords = records.filter((record) => (
    record.packageClassification === "exact" && record.file.path.startsWith("image/cardbox/")
  ));
  const groups = new Map();
  const add = (record, kind) => {
    const sourceId = record.file.path.split("/")[2];
    const group = groups.get(sourceId) ?? { sourceId, cardAssets: [], boxAssets: [] };
    group[kind].push({
      sourcePath: record.file.path,
      objectKey: effectiveObjectKey(record),
      bytes: record.file.bytes,
      sha256: record.file.sha256,
      contentType: record.contentType,
      width: record.width,
      height: record.height,
      classification: "exact",
    });
    groups.set(sourceId, group);
  };
  for (const record of cardRecords) add(record, "cardAssets");
  for (const record of boxRecords) add(record, "boxAssets");
  const items = [...groups.values()].sort((left, right) => left.sourceId.localeCompare(right.sourceId, "en"));
  const summary = {
    cardAssets: cardRecords.length,
    cardIds: new Set(cardRecords.map((record) => record.file.path.split("/")[2])).size,
    cardBoxAssets: boxRecords.length,
    cardBoxIds: new Set(boxRecords.map((record) => record.file.path.split("/")[2])).size,
    sharedIds: items.filter((item) => item.cardAssets.length && item.boxAssets.length).length,
    cardOnlyIds: items.filter((item) => item.cardAssets.length && !item.boxAssets.length).length,
    cardBoxOnlyIds: items.filter((item) => !item.cardAssets.length && item.boxAssets.length).length,
  };
  if (
    summary.cardAssets !== EXPECTED.cardAssets
    || summary.cardIds !== EXPECTED.cardIds
    || summary.cardBoxAssets !== EXPECTED.cardBoxAssets
    || summary.cardBoxIds !== EXPECTED.cardBoxIds
    || summary.sharedIds !== EXPECTED.sharedCardIds
    || summary.cardOnlyIds !== EXPECTED.cardOnlyIds
    || summary.cardBoxOnlyIds !== EXPECTED.cardBoxOnlyIds
  ) fail("item-card catalog changed");
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    identity: "exact-shared-source-directory-id-only",
    items,
    summary,
    semantics: {
      sourceIdIsDisplayLabel: false,
      sourceIdDefinesRarity: false,
      artworkDefinesPrice: false,
      artworkDefinesCurrency: false,
      artworkDefinesTransactionRules: false,
    },
  };
}

function minimalAsset(record) {
  const parts = record.file.path.split("/");
  const filename = parts.at(-1) ?? "";
  const sourceId = record.file.path.startsWith("image/oneshopping/")
    ? filename.slice(0, Math.max(0, filename.length - extname(filename).length))
    : parts.at(-2) ?? null;
  return {
    sourcePath: record.file.path,
    sourceId,
    objectKey: effectiveObjectKey(record),
    bytes: record.file.bytes,
    sha256: record.file.sha256,
    contentType: record.contentType,
    width: record.width,
    height: record.height,
    classification: "exact",
  };
}

function assetCatalog(records, family, expected, kind) {
  const assets = records
    .filter((record) => record.packageClassification === "exact" && record.file.path.startsWith(family))
    .map(minimalAsset);
  if (assets.length !== expected || assets.some((asset) => !asset.objectKey)) {
    fail(kind + " catalog changed");
  }
  return {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    kind,
    assets,
    summary: { assets: assets.length, exact: assets.length, inferred: 0, unresolved: 0 },
    semantics: {
      sourceIdIsDisplayLabel: false,
      artworkDefinesPrice: false,
      artworkDefinesCurrency: false,
      artworkDefinesTransactionRules: false,
    },
  };
}

async function artifact(path) {
  const bytes = await readFile(resolve(root, path));
  const extension = extname(path).toLowerCase();
  const contentType = extension === ".json" ? "application/json"
    : extension === ".png" ? "image/png"
      : extension === ".jpg" ? "image/jpeg"
        : "application/octet-stream";
  if (contentType === "application/json") JSON.parse(bytes.toString("utf8"));
  return { path, bytes: bytes.length, sha256: sha256(bytes), contentType };
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
  if (currentMain !== GUNNY_VERIFIED_MAIN) fail("Gunny origin/main changed to " + currentMain + "; refresh P043 pins");
  for (const sessionId of DEPENDENCIES) {
    git(gunnyRoot, ["merge-base", "--is-ancestor", DEPENDENCY_PINS[sessionId].implementationCommit, "origin/main"]);
  }
  const verifiedDependencies = DEPENDENCIES.map((sessionId) => verifyDependency(gunnyRoot, sessionId));
  const contextPins = verifyContextPins(gunnyRoot);
  const foundation = foundationAudit(gunnyRoot, contextPins);
  const sourceFiles = verifiedDependencies.flatMap(({ evidence }) => (
    evidence.files.map((file) => ({ ...file, dependencySessionId: evidence.sessionId }))
  ));
  if (new Set(sourceFiles.map((file) => file.path)).size !== EXPECTED.files) fail("dependency source paths overlap or changed");
  const records = resolutionRecords(sourceFiles);
  const summary = summarize(records);
  assertSummary(summary);
  assertRawTree(records);

  assertInside(exportRoot, resolve(root, "exports/resource-port"), "P043 export root");
  await rm(exportRoot, { recursive: true, force: true });
  await mkdir(exportRoot, { recursive: true });
  await writeFile(resolve(exportRoot, ".gitattributes"), "* -text whitespace=cr-at-eol\n", "utf8");
  await materializeCorrections(records);

  const shardDescriptors = [];
  for (const sessionId of DEPENDENCIES) {
    const shardRecords = records.filter((record) => record.file.dependencySessionId === sessionId);
    const path = "exports/resource-port/store-mail-economy/catalog/" + sessionId.toLowerCase() + ".json";
    await writeJson(path, {
      schemaVersion: 1,
      packageSessionId: PACKAGE_ID,
      dependencySessionId: sessionId,
      columns: CATALOG_COLUMNS,
      assets: shardRecords.map(catalogRow),
    });
    shardDescriptors.push({
      dependencySessionId: sessionId,
      ...await artifact(path),
      sourceFiles: shardRecords.length,
      sourceBytes: shardRecords.reduce((total, record) => total + record.file.bytes, 0),
    });
  }

  await writeJson("exports/resource-port/store-mail-economy/catalog-index.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    columns: CATALOG_COLUMNS,
    shards: shardDescriptors,
    summary,
    resolution: {
      aliasMappings: EXPECTED.aliasMappings,
      correctedMappings: EXPECTED.correctedMappings,
      correctedObjects: EXPECTED.correctedObjects,
      correctedBytes: EXPECTED.correctedBytes,
      unresolvedObjects: EXPECTED.packageUnresolved,
      policy: "exact blob alias or validated content-addressed raster only; otherwise unresolved",
    },
    publication: { trackA: TRACK_A_PUBLICATION },
  });
  await writeJson("exports/resource-port/store-mail-economy/item-card-catalog.json", cardCatalog(records));
  await writeJson(
    "exports/resource-port/store-mail-economy/gift-catalog.json",
    assetCatalog(records, "image/gift/", EXPECTED.giftAssets, "gift-presentation"),
  );
  await writeJson(
    "exports/resource-port/store-mail-economy/shop-decoration-catalog.json",
    assetCatalog(records, "image/oneshopping/", EXPECTED.shopDecorationAssets, "shop-decoration"),
  );
  await writeJson(
    "exports/resource-port/store-mail-economy/item-icon-catalog.json",
    assetCatalog(records, "image/unfrightprop/", EXPECTED.itemIconAssets, "item-icon"),
  );
  await writeJson("exports/resource-port/store-mail-economy/foundation-audit.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    foundation,
    coverage: {
      shop: "referenced-existing-Gunny-foundation",
      gift: "referenced-existing-Gunny-foundation",
      mail: "referenced-existing-Gunny-foundation",
      storeEmbed: "referenced-existing-Gunny-foundation",
      bytesDuplicatedIntoP043: 0,
    },
  });
  await writeJson("exports/resource-port/store-mail-economy/presentation-state-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    evidence: {
      GunnyCommit: GUNNY_VERIFIED_MAIN,
      contextPins,
      rawArtworkStateMetadata: "absent",
    },
    itemCard: {
      selected: "exact-existing-data-selected-and-aria-pressed-foundation",
      hover: "exact-existing-css-hover-foundation",
      disabled: "exact-existing-native-disabled-and-pending-foundation",
      rarity: "server-item-field-only-existing-css-presentation",
      rarityFromArtwork: false,
    },
    shop: {
      selectedTabs: "exact-existing-selected-and-idle-assets",
      pending: "exact-existing-aria-busy-and-disabled-controls",
      sourceDecorationsDefineTransactions: false,
    },
    gift: {
      pending: "exact-existing-data-shop-transaction-pending-and-disabled-buttons",
      resultStates: ["pending", "success", "error"],
      sourceGiftArtDefinesRecipientPriceOrSettlement: false,
    },
    mail: {
      selected: "exact-existing-aria-selected",
      readStates: ["unread", "read"],
      disabled: "exact-existing-busy-pagination-expiry-and-claim-controls",
      sourceFamiliesContainReviewedMailSurfaceArt: false,
      referencedMailFoundationFiles: FOUNDATION_ROOTS["public/game-ui/mail"].files,
    },
    authority: {
      price: "Gunny Worker/API",
      currency: "Gunny Worker/API",
      rarity: "Gunny Worker/API",
      inventory: "Gunny Worker/API",
      gifting: "Gunny Worker/API",
      mailLifecycle: "Gunny Worker/API",
      clientBusinessAuthority: false,
    },
  });
  await writeJson("exports/resource-port/store-mail-economy/runtime-contract.json", {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    packageOnly: true,
    publication: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      sourceObjectKeys: "exact Resource source paths",
      packageObjectKeys: "immutable exports/resource-port/store-mail-economy paths",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
      immutableFallbackRequired: true,
    },
    consumerBoundary: {
      itemCardCatalogReady: true,
      giftCatalogReady: true,
      shopDecorationCatalogReady: true,
      itemIconCatalogReady: true,
      mailFoundationReferenced: true,
      stateContractReady: true,
      runtimeIntegration: false,
    },
    prohibited: {
      swfRuntime: true,
      filenameOnlyBusinessSemantics: true,
      artworkDerivedPrice: true,
      artworkDerivedCurrency: true,
      artworkDerivedRarity: true,
      artworkDerivedTransactionRules: true,
      clientBusinessAuthority: true,
      unresolvedRuntimeAssets: true,
    },
  });

  const exportPaths = (await listFiles(exportRoot))
    .map((path) => path.slice(root.length + 1).split(sep).join("/"))
    .sort();
  const exports = [];
  for (const path of exportPaths) exports.push(await artifact(path));
  const dependencyRecords = verifiedDependencies.map((entry) => entry.record);
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
    dependencies: dependencyRecords,
    trackAPublication: TRACK_A_PUBLICATION,
    summary,
    conversion: {
      exactSourceObjects: EXPECTED.trackAExact,
      exactAliasMappings: EXPECTED.aliasMappings,
      correctedRasterMappings: EXPECTED.correctedMappings,
      correctedRasterObjects: EXPECTED.correctedObjects,
      correctedRasterBytes: EXPECTED.correctedBytes,
      exactBrowserNativeMappings: EXPECTED.packageExact,
      unresolvedObjects: EXPECTED.packageUnresolved,
      referencedFoundationFiles: EXPECTED.foundationFiles,
      foundationBytesDuplicatedIntoP043: 0,
    },
    readiness: {
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      itemCardGiftShopMailSurfacesContracted: true,
      selectedDisabledHoverStatesEvidenceBacked: true,
      rarityFromArtwork: false,
      businessAuthorityInClient: false,
      legacyRuntimeContainersAllowed: false,
      runtimeIntegration: false,
    },
    exports,
    githubActions: false,
  };
  await writeJson("exports/resource-port/store-mail-economy/manifest.json", manifest);

  const checks = {
    trackBVerifier: "pass: node resource-port/track-b/verify.mjs",
    packageChecker: "pass-generated-from-exact-origin-main-and-raw-pins",
    nodeSyntax: "pass: node --check resource-port/track-b/checks/P043.mjs",
    dependencyGate: "pass-exact-R030-R031-evidence-importer-shard-and-implementation-pins",
    importerChecks: "pass: R030 4096 files; R031 639 files",
    mediaValidation: "pass-78-exact-aliases-15-corrected-mappings-12-content-addressed-raster-objects",
    foundationAudit: "pass-195-existing-Gunny-shop-mail-gift-store-embed-files",
    trackAStagingPublication: "pass: 2 exact staged payloads and 2 immutable publication manifests",
    rawSourceMutation: false,
    githubActionsUsedOrInspected: false,
  };
  const contract = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    sourcePin: SOURCE_COMMIT,
    sourceFamilies: SOURCE_FAMILIES,
    lockedPaths: LOCKED_PATHS,
    dependencies: dependencyRecords,
    contextPins,
    assetAddressing: {
      mode: "cloudflare-r2-gateway",
      gatewayContract: "ddtank-r2-gateway-v1",
      canonicalObjectKey: "exact Resource source path or immutable content-addressed package output",
      sameOriginOnlyInComponents: true,
      directGatewayHostnameAllowedInClient: false,
      trackAPublication: TRACK_A_PUBLICATION,
    },
    consumerBoundary: {
      packageOnly: true,
      runtimeIntegration: false,
      sourceRasterCatalogReady: true,
      itemCardGiftShopMailSurfaceContractReady: true,
      presentationStatesEvidenceBacked: true,
      artworkDefinesBusinessSemantics: false,
      clientBusinessAuthority: false,
      swfRuntimeAllowed: false,
      unresolvedRuntimeAllowed: false,
    },
  };
  await writeJson("resource-port/track-b/contracts/store-mail-economy.json", contract);
  const evidence = {
    schemaVersion: 1,
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    owner: OWNER,
    branch: "resource-port/P043-store-mail-economy",
    source: manifest.source,
    dependencies: dependencyRecords,
    contextPins,
    foundationSummary: foundation.summary,
    summary: {
      ...summary,
      catalogShards: DEPENDENCIES.length,
      sourceFilesProcessed: EXPECTED.files,
      sourceFilesUnprocessed: 0,
      runtimeIntegration: false,
    },
    conversion: manifest.conversion,
    checks,
    claims: {
      exactBrowserNativeMappings: EXPECTED.packageExact,
      exactAliasMappings: EXPECTED.aliasMappings,
      contentAddressedRasterCorrections: EXPECTED.correctedObjects,
      selectedDisabledHoverEvidenceBacked: true,
      rarityInferredFromArtwork: false,
      priceCurrencyOrBusinessRulesInferredFromArtwork: false,
      p043SwfBehaviorClaimedPorted: false,
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
  await writeJson("resource-port/track-b/evidence/P043.json", evidence);
  await writeJson("resource-port/track-b/status/P043.json", {
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
      "4 truncated PNG objects remain disabled",
      "4 files detected as SWF but lacking a valid SWF or known Gunny wrapper remain disabled",
      "3 zero-byte objects remain disabled",
      "raw artwork contains no authoritative price, currency, rarity, recipient, inventory or settlement rules",
      "mail surface art is referenced from the exact existing Gunny foundation because P043 source families contain no reviewed mail surface family",
      "existing Gunny shop, gift, mail and store-embed foundations are referenced and not duplicated into P043",
      "runtime selection and all business lifecycle authority belong to R043 and the Gunny Worker",
    ],
    publication: {
      immutableCommitRequired: true,
      mutableBranchAllowed: false,
      releaseCommit: null,
      trackA: TRACK_A_PUBLICATION,
    },
  });
  await mkdir(resolve(root, "resource-port/track-b/findings"), { recursive: true });
  await writeFile(
    resolve(root, "resource-port/track-b/findings/P043.md"),
    "# P043 store-mail-economy findings\n\nPending immutable package commit. Generated evidence is authoritative for census and conversion claims; this file is finalized by the findings-only P043-F commit.\n",
    "utf8",
  );
}

async function verifyArtifactDescriptor(descriptor) {
  const bytes = await readFile(resolve(root, descriptor.path));
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256) {
    fail("artifact changed: " + descriptor.path);
  }
  if (descriptor.contentType === "application/json") JSON.parse(bytes.toString("utf8"));
}

function rowsFromCatalog(shards) {
  return shards.flatMap((shard) => shard.assets.map((row) => {
    const file = {
      path: row[0],
      gitBlobSha1: row[1],
      bytes: row[2],
      sha256: row[3],
      classification: row[4],
      inspectionProfile: row[6],
      detectedFormat: row[7],
      dependencySessionId: row[15],
    };
    return {
      file,
      packageClassification: row[5],
      contentType: row[8],
      width: row[9],
      height: row[10],
      canonicalSourcePath: row[13],
      packageOutput: row[14],
      aliasOf: row[4] === "unresolved" && row[13] ? row[13] : null,
    };
  }));
}

async function verifyPackage() {
  const manifest = await json("exports/resource-port/store-mail-economy/manifest.json");
  const index = await json("exports/resource-port/store-mail-economy/catalog-index.json");
  const shards = await Promise.all(DEPENDENCIES.map((sessionId) => (
    json("exports/resource-port/store-mail-economy/catalog/" + sessionId.toLowerCase() + ".json")
  )));
  const cards = await json("exports/resource-port/store-mail-economy/item-card-catalog.json");
  const gifts = await json("exports/resource-port/store-mail-economy/gift-catalog.json");
  const shop = await json("exports/resource-port/store-mail-economy/shop-decoration-catalog.json");
  const items = await json("exports/resource-port/store-mail-economy/item-icon-catalog.json");
  const foundation = await json("exports/resource-port/store-mail-economy/foundation-audit.json");
  const states = await json("exports/resource-port/store-mail-economy/presentation-state-contract.json");
  const runtime = await json("exports/resource-port/store-mail-economy/runtime-contract.json");
  const contract = await json("resource-port/track-b/contracts/store-mail-economy.json");
  const evidence = await json("resource-port/track-b/evidence/P043.json");
  const status = await json("resource-port/track-b/status/P043.json");
  const trackAPublication = await verifyTrackAPublication();

  if (
    manifest.packageSessionId !== PACKAGE_ID
    || manifest.runtimeSessionId !== RUNTIME_ID
    || manifest.owner !== OWNER
    || manifest.status !== "complete-package-with-explicit-unresolved"
    || manifest.source?.commit !== SOURCE_COMMIT
    || manifest.source?.tree !== SOURCE_TREE
  ) fail("manifest identity mismatch");
  for (let indexValue = 0; indexValue < shards.length; indexValue += 1) {
    const shard = shards[indexValue];
    const sessionId = DEPENDENCIES[indexValue];
    if (
      shard.packageSessionId !== PACKAGE_ID
      || shard.dependencySessionId !== sessionId
      || JSON.stringify(shard.columns) !== JSON.stringify(CATALOG_COLUMNS)
      || shard.assets.length !== DEPENDENCY_PINS[sessionId].files
    ) fail("catalog shard mismatch: " + sessionId);
  }
  const records = rowsFromCatalog(shards);
  const summary = summarize(records);
  assertSummary(summary);
  if (new Set(records.map((record) => record.file.path)).size !== EXPECTED.files
    || records.some((record) => !sourceFamily(record.file.path)
      || !/^[0-9a-f]{40}$/u.test(record.file.gitBlobSha1)
      || !/^[0-9a-f]{64}$/u.test(record.file.sha256))) fail("catalog source identity invalid");
  if (JSON.stringify(index.summary) !== JSON.stringify(summary)
    || index.shards?.length !== DEPENDENCIES.length) fail("catalog index mismatch");
  for (const descriptor of index.shards) await verifyArtifactDescriptor(descriptor);

  if (
    cards.summary?.cardAssets !== EXPECTED.cardAssets
    || cards.summary?.cardIds !== EXPECTED.cardIds
    || cards.summary?.cardBoxAssets !== EXPECTED.cardBoxAssets
    || cards.summary?.cardBoxIds !== EXPECTED.cardBoxIds
    || cards.summary?.sharedIds !== EXPECTED.sharedCardIds
    || cards.semantics?.artworkDefinesPrice !== false
    || cards.semantics?.sourceIdDefinesRarity !== false
  ) fail("item-card contract mismatch");
  if (gifts.assets?.length !== EXPECTED.giftAssets
    || shop.assets?.length !== EXPECTED.shopDecorationAssets
    || items.assets?.length !== EXPECTED.itemIconAssets
    || gifts.semantics?.artworkDefinesTransactionRules !== false
    || shop.semantics?.artworkDefinesCurrency !== false
    || items.semantics?.artworkDefinesPrice !== false) fail("surface asset catalog mismatch");
  if (
    foundation.foundation?.immutableCommit !== GUNNY_VERIFIED_MAIN
    || foundation.foundation?.summary?.files !== EXPECTED.foundationFiles
    || foundation.foundation?.summary?.bytes !== EXPECTED.foundationBytes
    || foundation.foundation?.summary?.duplicatedIntoP043 !== 0
  ) fail("foundation audit mismatch");
  for (const rootEntry of foundation.foundation.roots ?? []) {
    const expected = FOUNDATION_ROOTS[rootEntry.path];
    if (!expected || rootEntry.files?.length !== expected.files
      || rootEntry.identitySha256 !== expected.identitySha256) fail("foundation root mismatch");
  }
  if (
    states.itemCard?.rarityFromArtwork !== false
    || states.shop?.sourceDecorationsDefineTransactions !== false
    || states.gift?.sourceGiftArtDefinesRecipientPriceOrSettlement !== false
    || states.mail?.sourceFamiliesContainReviewedMailSurfaceArt !== false
    || states.authority?.clientBusinessAuthority !== false
  ) fail("presentation state authority mismatch");
  if (
    runtime.packageOnly !== true
    || runtime.consumerBoundary?.runtimeIntegration !== false
    || runtime.prohibited?.swfRuntime !== true
    || runtime.prohibited?.artworkDerivedPrice !== true
    || runtime.prohibited?.clientBusinessAuthority !== true
  ) fail("runtime boundary mismatch");
  if (contract.dependencies?.length !== DEPENDENCIES.length
    || contract.sourcePin !== SOURCE_COMMIT
    || contract.consumerBoundary?.runtimeIntegration !== false
    || contract.consumerBoundary?.artworkDefinesBusinessSemantics !== false) fail("package contract mismatch");
  if (contract.assetAddressing?.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256) {
    fail("Track A publication contract changed");
  }
  for (const dependency of contract.dependencies) {
    const pin = DEPENDENCY_PINS[dependency.sessionId];
    if (!pin || dependency.implementationCommit !== pin.implementationCommit
      || dependency.evidenceSha256 !== pin.evidenceSha256
      || dependency.importerSha256 !== pin.importerSha256
      || dependency.shardSha256 !== pin.shardSha256) fail("dependency output pin mismatch");
  }
  if (
    evidence.summary?.sourceFilesProcessed !== EXPECTED.files
    || evidence.summary?.sourceFilesUnprocessed !== 0
    || evidence.claims?.priceCurrencyOrBusinessRulesInferredFromArtwork !== false
    || evidence.claims?.p043SwfBehaviorClaimedPorted !== false
    || status.status !== "complete-package-with-explicit-unresolved"
    || status.runtimeIntegration !== false
  ) fail("evidence or status overclaims P043");
  if (evidence.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256
    || status.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256
    || manifest.trackAPublication?.sha256 !== TRACK_A_PUBLICATION.sha256
    || index.publication?.trackA?.sha256 !== TRACK_A_PUBLICATION.sha256) {
    fail("Track A publication metadata changed");
  }
  for (const descriptor of manifest.exports) await verifyArtifactDescriptor(descriptor);
  const correctionRecords = records.filter((record) => record.packageOutput);
  const uniqueCorrections = new Map(correctionRecords.map((record) => [record.packageOutput, record]));
  let correctedBytes = 0;
  for (const [path, record] of uniqueCorrections) {
    const bytes = await readFile(resolve(root, path));
    const dimensions = imageDimensions(bytes, record.contentType, path);
    if (sha256(bytes) !== record.file.sha256
      || dimensions.width !== record.width || dimensions.height !== record.height) {
      fail("corrected raster output mismatch: " + path);
    }
    correctedBytes += bytes.length;
  }
  if (uniqueCorrections.size !== EXPECTED.correctedObjects || correctedBytes !== EXPECTED.correctedBytes) {
    fail("corrected raster output aggregate mismatch");
  }
  const exportFiles = await listFiles(exportRoot);
  if (exportFiles.some((path) => extname(path).toLowerCase() === ".swf")) {
    fail("P043 export contains a legacy SWF runtime container");
  }
  if (exportFiles.length !== manifest.exports.length + 5) {
    fail("export file count changed to " + exportFiles.length);
  }
  if (gunnyRoot) {
    const currentMain = git(gunnyRoot, ["rev-parse", "origin/main"]).trim();
    if (currentMain !== GUNNY_VERIFIED_MAIN) fail("Gunny origin/main drifted to " + currentMain);
    for (const sessionId of DEPENDENCIES) {
      git(gunnyRoot, ["merge-base", "--is-ancestor", DEPENDENCY_PINS[sessionId].implementationCommit, "origin/main"]);
      verifyDependency(gunnyRoot, sessionId);
    }
    const contextPins = verifyContextPins(gunnyRoot);
    foundationAudit(gunnyRoot, contextPins);
  }
  return {
    packageSessionId: PACKAGE_ID,
    runtimeSessionId: RUNTIME_ID,
    status: "pass",
    sourceFiles: EXPECTED.files,
    exactBrowserNativeMappings: EXPECTED.packageExact,
    exactAliasMappings: EXPECTED.aliasMappings,
    correctedRasterObjects: EXPECTED.correctedObjects,
    unresolvedObjects: EXPECTED.packageUnresolved,
    foundationFilesReferenced: EXPECTED.foundationFiles,
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
    || publication.summary?.sessions !== 2 || publication.summary?.stagedFiles !== 2
    || publication.summary?.stagedBytes !== TRACK_A_PUBLICATION.stagedBytes
    || publication.summary?.exact !== 2 || publication.summary?.inferred !== 0 || publication.summary?.unresolved !== 0
    || publication.boundary?.browserNativeConversionClaimed !== false || publication.boundary?.runtimeIntegration !== false) {
    fail("Track A publication contract changed");
  }
  if (JSON.stringify(publication.sessions?.map((entry) => entry.sessionId)) !== JSON.stringify(DEPENDENCIES)) {
    fail("Track A publication sessions changed");
  }
  for (const entry of publication.sessions) {
    const lower = entry.sessionId.toLowerCase();
    const expectedPrefix = `exports/resource-port/${OWNER}/track-a/${lower}/`;
    if (entry.objectPrefix !== expectedPrefix || entry.manifestPath !== `track-a/${lower}/publication.json`) {
      fail(`${entry.sessionId} publication prefix changed`);
    }
    const sessionBytes = await readFile(resolve(root, "exports/resource-port", OWNER, entry.manifestPath));
    if (sha256(sessionBytes) !== entry.manifestSha256) fail(`${entry.sessionId} publication manifest digest mismatch`);
    const session = JSON.parse(sessionBytes.toString("utf8"));
    if (session.classification !== "exact" || session.target?.objectPrefix !== expectedPrefix
      || session.boundary?.runtimeIntegration !== false || session.payload?.files?.length !== 1) {
      fail(`${entry.sessionId} publication manifest changed`);
    }
    const file = session.payload.files[0];
    const payloadBytes = await readFile(resolve(root, "exports/resource-port", OWNER, "track-a", lower, file.path));
    if (file.objectKey !== `${expectedPrefix}${file.path}` || file.contentType !== "application/json; charset=utf-8"
      || payloadBytes.length !== file.bytes || sha256(payloadBytes) !== file.sha256) {
      fail(`${entry.sessionId} payload identity changed`);
    }
    JSON.parse(payloadBytes.toString("utf8"));
  }
  return publication;
}

if (writing) await buildPackage();
console.log(JSON.stringify(await verifyPackage()));
