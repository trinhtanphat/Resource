#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

const root = process.cwd();
const packagePrefix = "exports/resource-port/tutorial-video";
const packageRoot = resolve(root, packagePrefix);
const contractPath = "resource-port/track-b/contracts/tutorial-video.json";
const evidencePath = "resource-port/track-b/evidence/P048.json";
const statusPath = "resource-port/track-b/status/P048.json";
const checkerPath = "resource-port/track-b/checks/P048.mjs";
const sourceCommit = "519c35a293745b6a0477c4f6ea03110a89de2318";
const sourceTree = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const reviewedGunnyMain = "f813311182e55cd8df46953c914b9a11aa517c12";
const dependency = Object.freeze({
  sessionId: "R036",
  implementationCommit: "3d7a049655847ab6b7802541560ef227e17df1ed",
  findingsCommit: "1221419cc1f0ce4f50012b4c5b175ab84f6a8170",
  evidencePath: "config/resource-port-evidence/R036.json",
  evidenceGitBlobSha1: "6bbb36e24af8feae1438008a518fb6045a0aecee",
  evidenceSha256: "cc17a78c30b898380d4c5403b2e3227117249235fefd4f5678e3bd0838c52bda",
  dispatchPath: "config/resource-port-dispatch/shards/tutorial-video-001.json",
  dispatchSha256: "8a8d2c044a50970259def03f65f94c90d409863d8a9947c283f191fc0539184a",
  verifiedOnGunnyMain: reviewedGunnyMain,
});
const expectedTools = Object.freeze({
  ffmpeg: "1326dde4c84ff1f96fe6b8916c5bed29e163e9b5dccf995f6f3db069d143ec5e",
  ffprobe: "b49ccc7c6547b141ad5a2f6ec69cc04323d7133d7704d70b331b904c63eecb07",
});
const sourceIdentity = Object.freeze({
  paths: Object.freeze([
    "image/video/simpletutorial.flv",
    "video/simpletutorial.flv",
  ]),
  gitBlobSha1: "5ceb67ede18f9156fd20503933830b3537b2c9a1",
  sha256: "076f85950f84749a34d5af167219cd32cfb7fda367d55ac78ccbed11ca1bf558",
  bytes: 576_117,
});
const expectedDerivative = Object.freeze({
  videoSha256: "f066ea603f9daf60a12deb5b98303aea944b354b01bb9348c0395804a33b405a",
  videoBytes: 1_471_331,
  posterSha256: "180054569db73e5267d1f1ee158816b5e833c5084637ba26718b363fcbd25557",
  posterBytes: 155_649,
});

const writeMode = process.argv.includes("--write");
const deepMode = process.argv.includes("--deep");

const fail = (message) => {
  throw new Error(`P048 package invalid: ${message}`);
};
const posix = (path) => path.split(sep).join("/");
const native = (path) => resolve(root, ...path.split("/"));
const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const canonicalAuditBytes = (path, bytes) => /(?:\.json|\.mjs|\.md|\.gitattributes)$/u.test(path)
  ? Buffer.from(bytes.toString("utf8").replace(/\r\n/gu, "\n"), "utf8")
  : bytes;
const gitBlobSha1 = (bytes) => createHash("sha1")
  .update(`blob ${bytes.length}\0`)
  .update(bytes)
  .digest("hex");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: options.binary ? null : "utf8",
    maxBuffer: options.maxBuffer ?? 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) fail(`${options.label ?? command}: ${result.error.message}`);
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : result.stderr;
    const stdout = Buffer.isBuffer(result.stdout)
      ? result.stdout.toString("utf8")
      : result.stdout;
    fail(`${options.label ?? command} exited ${result.status}: ${(stderr || stdout || "no output").trim()}`);
  }
  return result.stdout;
}

function resolveExecutable(envName, fallback) {
  const requested = process.env[envName] || fallback;
  if (isAbsolute(requested)) return resolve(requested);
  const command = process.platform === "win32" ? "where.exe" : "which";
  const located = run(command, [requested], { label: `${envName} lookup` })
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find(Boolean);
  if (!located) fail(`${envName} executable was not found`);
  return resolve(located);
}

async function checkedTool(path, expected, label) {
  const bytes = await readFile(path);
  const digest = sha256(bytes);
  if (digest !== expected) fail(`${label} SHA-256 mismatch: ${digest}`);
  return { bytes: bytes.length, sha256: digest };
}

function readSourceTree(revision) {
  const output = run("git", [
    "ls-tree", "-r", "-l", revision, "--", ...sourceIdentity.paths,
  ], { label: `git ls-tree ${revision}` });
  const rows = output.split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(\d+)\s+blob\s+([0-9a-f]{40})\s+(\d+)\t(.+)$/u.exec(line);
    if (!match) fail(`cannot parse git tree row: ${line}`);
    return {
      mode: match[1],
      blob: match[2],
      bytes: Number(match[3]),
      path: match[4],
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  if (rows.length !== 2) fail(`expected two source paths, found ${rows.length}`);
  for (const row of rows) {
    if (
      row.mode !== "100644"
      || row.blob !== sourceIdentity.gitBlobSha1
      || row.bytes !== sourceIdentity.bytes
      || !sourceIdentity.paths.includes(row.path)
    ) fail(`${row.path} source identity drift`);
  }
  return rows;
}

function pinnedBlob(path) {
  const bytes = run("git", ["cat-file", "blob", `${sourceCommit}:${path}`], {
    binary: true,
    label: `git blob ${path}`,
  });
  if (!Buffer.isBuffer(bytes)) fail(`${path} was not read as bytes`);
  if (
    bytes.length !== sourceIdentity.bytes
    || sha256(bytes) !== sourceIdentity.sha256
    || gitBlobSha1(bytes) !== sourceIdentity.gitBlobSha1
  ) fail(`${path} pinned bytes changed`);
  return bytes;
}

function assertSourcePin() {
  const actualTree = run("git", ["show", "-s", "--format=%T", sourceCommit], {
    label: "source tree pin",
  }).trim();
  if (actualTree !== sourceTree) fail(`source tree changed: ${actualTree}`);
  const pinned = readSourceTree(sourceCommit);
  const current = readSourceTree("HEAD");
  if (JSON.stringify(pinned) !== JSON.stringify(current)) {
    fail("current raw source paths differ from the immutable source pin");
  }
  const primary = pinnedBlob(sourceIdentity.paths[0]);
  const duplicate = pinnedBlob(sourceIdentity.paths[1]);
  if (!primary.equals(duplicate)) fail("duplicate tutorial source paths differ");
  return { rows: pinned, bytes: primary };
}

function normalizeProbe(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const numeric = (value) => value === undefined ? null : String(value);
  return {
    format: {
      names: String(parsed.format?.format_name ?? "").split(",").filter(Boolean),
      duration: numeric(parsed.format?.duration),
      size: numeric(parsed.format?.size),
      bitRate: numeric(parsed.format?.bit_rate),
    },
    streams: (parsed.streams ?? []).map((stream) => ({
      index: Number(stream.index),
      type: stream.codec_type ?? null,
      codec: stream.codec_name ?? null,
      profile: stream.profile ?? null,
      width: stream.width === undefined ? null : Number(stream.width),
      height: stream.height === undefined ? null : Number(stream.height),
      pixelFormat: stream.pix_fmt ?? null,
      realFrameRate: stream.r_frame_rate ?? null,
      averageFrameRate: stream.avg_frame_rate ?? null,
      startTime: numeric(stream.start_time),
      duration: numeric(stream.duration),
      bitRate: numeric(stream.bit_rate),
      frames: numeric(stream.nb_frames),
      decodedFrames: numeric(stream.nb_read_frames),
    })).sort((left, right) => left.index - right.index),
  };
}

function probeFile(ffprobe, path, countFrames = false) {
  const args = ["-v", "error"];
  if (countFrames) args.push("-count_frames");
  args.push(
    "-show_entries",
    "format=format_name,duration,size,bit_rate:stream=index,codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,start_time,duration,bit_rate,nb_frames,nb_read_frames",
    "-of", "json", "--", path,
  );
  return normalizeProbe(run(ffprobe, args, { label: `ffprobe ${basename(path)}` }));
}

function assertSourceProbe(probe) {
  const video = probe.streams.filter((stream) => stream.type === "video");
  const audio = probe.streams.filter((stream) => stream.type === "audio");
  if (
    JSON.stringify(probe.format.names) !== JSON.stringify(["flv"])
    || probe.format.duration !== "18.000000"
    || probe.format.size !== "576117"
    || probe.format.bitRate !== "256052"
    || video.length !== 1
    || audio.length !== 0
  ) fail("source FLV container or stream census changed");
  const stream = video[0];
  if (
    stream.codec !== "vp6f"
    || stream.width !== 350
    || stream.height !== 350
    || stream.pixelFormat !== "yuv420p"
    || stream.realFrameRate !== "30/1"
    || stream.averageFrameRate !== "30/1"
    || stream.startTime !== "0.000000"
    || stream.bitRate !== "204800"
    || stream.decodedFrames !== "541"
  ) fail("source VP6 video metadata changed");
}

function assertVideoProbe(probe, bytes) {
  const video = probe.streams.filter((stream) => stream.type === "video");
  const audio = probe.streams.filter((stream) => stream.type === "audio");
  if (
    JSON.stringify(probe.format.names) !== JSON.stringify(["mov", "mp4", "m4a", "3gp", "3g2", "mj2"])
    || probe.format.duration !== "18.033333"
    || probe.format.size !== String(bytes)
    || video.length !== 1
    || audio.length !== 0
  ) fail("browser MP4 container or stream census changed");
  const stream = video[0];
  if (
    stream.codec !== "h264"
    || stream.profile !== "High"
    || stream.width !== 350
    || stream.height !== 350
    || stream.pixelFormat !== "yuv420p"
    || stream.realFrameRate !== "30/1"
    || stream.averageFrameRate !== "30/1"
    || stream.startTime !== "0.000000"
    || stream.duration !== "18.033333"
    || stream.frames !== "541"
    || stream.decodedFrames !== "541"
  ) fail("browser H.264 video metadata changed");
}

function assertPosterProbe(probe, bytes) {
  if (probe.format.size !== String(bytes) || probe.streams.length !== 1) {
    fail("poster container changed");
  }
  const stream = probe.streams[0];
  if (
    stream.type !== "video"
    || stream.codec !== "png"
    || stream.width !== 350
    || stream.height !== 350
    || stream.pixelFormat !== "rgb24"
  ) fail("poster image metadata changed");
}

async function buildDerivative(ffmpeg, ffprobe, sourceBytes, label) {
  const temporary = await mkdtemp(join(tmpdir(), `resource-p048-${label}-`));
  const sourcePath = join(temporary, "simpletutorial.flv");
  const videoPath = join(temporary, "simpletutorial.mp4");
  const posterPath = join(temporary, "simpletutorial.png");
  try {
    await writeFile(sourcePath, sourceBytes);
    run(ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-fflags", "+bitexact", "-i", sourcePath,
      "-map", "0:v:0", "-an",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-threads", "1",
      "-map_metadata", "-1", "-map_chapters", "-1",
      "-movflags", "+faststart", "-flags:v", "+bitexact",
      "-metadata", "encoder=", videoPath,
    ], { label: "deterministic VP6 to H.264 conversion" });
    run(ffmpeg, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-fflags", "+bitexact", "-i", sourcePath,
      "-map", "0:v:0", "-frames:v", "1", "-c:v", "png", "-threads", "1",
      "-map_metadata", "-1", "-map_chapters", "-1", "-flags:v", "+bitexact",
      posterPath,
    ], { label: "deterministic first-frame poster" });
    const [videoBytes, posterBytes] = await Promise.all([
      readFile(videoPath),
      readFile(posterPath),
    ]);
    if (
      sha256(videoBytes) !== expectedDerivative.videoSha256
      || videoBytes.length !== expectedDerivative.videoBytes
    ) fail(`browser MP4 bytes changed: ${sha256(videoBytes)} / ${videoBytes.length}`);
    if (
      sha256(posterBytes) !== expectedDerivative.posterSha256
      || posterBytes.length !== expectedDerivative.posterBytes
    ) fail(`poster bytes changed: ${sha256(posterBytes)} / ${posterBytes.length}`);
    const [sourceProbe, videoProbe, posterProbe] = await Promise.all([
      Promise.resolve(probeFile(ffprobe, sourcePath, true)),
      Promise.resolve(probeFile(ffprobe, videoPath, true)),
      Promise.resolve(probeFile(ffprobe, posterPath, false)),
    ]);
    assertSourceProbe(sourceProbe);
    assertVideoProbe(videoProbe, videoBytes.length);
    assertPosterProbe(posterProbe, posterBytes.length);
    return { videoBytes, posterBytes, sourceProbe, videoProbe, posterProbe };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function gitBytesAt(repository, revision, path) {
  const bytes = run("git", ["cat-file", "blob", `${revision}:${path}`], {
    cwd: repository,
    binary: true,
    label: `dependency blob ${path}`,
  });
  if (!Buffer.isBuffer(bytes)) fail(`${path} dependency bytes unavailable`);
  return bytes;
}

async function validateDeepDependency() {
  if (!deepMode) return;
  const gunnyRoot = resolve(process.env.P048_GUNNY_ROOT || "E:\\Gunny\\Gunny");
  for (const commit of [
    dependency.implementationCommit,
    dependency.findingsCommit,
    dependency.verifiedOnGunnyMain,
  ]) {
    run("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {
      cwd: gunnyRoot,
      label: `Gunny dependency ${commit}`,
    });
  }
  const evidence = gitBytesAt(gunnyRoot, reviewedGunnyMain, dependency.evidencePath);
  const dispatch = gitBytesAt(gunnyRoot, reviewedGunnyMain, dependency.dispatchPath);
  if (
    sha256(evidence) !== dependency.evidenceSha256
    || gitBlobSha1(evidence) !== dependency.evidenceGitBlobSha1
  ) fail("R036 evidence identity changed");
  if (sha256(dispatch) !== dependency.dispatchSha256) fail("R036 dispatch identity changed");
  const parsed = JSON.parse(evidence.toString("utf8"));
  if (
    parsed.sessionId !== "R036"
    || parsed.owner !== "tutorial-video"
    || parsed.completion?.evidenceComplete !== true
    || parsed.completion?.publicationReady !== true
    || parsed.completion?.trackBDependencySatisfied !== true
    || parsed.summary?.files !== 2
    || parsed.summary?.bytes !== 1_152_234
    || parsed.summary?.unresolved !== 2
  ) fail("R036 evidence no longer satisfies P048");

  const gunny92Root = resolve(process.env.P048_GUNNY92_ROOT || "E:\\Gunny\\Gunny92-001\\Gunny92");
  const sourceRoot = resolve(gunny92Root, "flashbaseSrc", "src");
  const files = await walkFiles(sourceRoot, ".as");
  const matches = [];
  for (const path of files) {
    const text = await readFile(path, "utf8");
    const lines = text.split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (/simpletutorial|tutorial\.flv/iu.test(line)) {
        matches.push({ path: posix(relative(sourceRoot, path)), line: index + 1, text: line.trim() });
      }
    });
  }
  if (matches.length !== 0) {
    fail(`new literal tutorial-video consumer requires review: ${JSON.stringify(matches.slice(0, 10))}`);
  }
}

async function walkFiles(directory, suffix, base = directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walkFiles(path, suffix, base));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) output.push(path);
  }
  return output.sort((left, right) => left.localeCompare(right));
}

async function packageFiles() {
  if (!await exists(packageRoot)) return [];
  return (await walkFiles(packageRoot, "")).map((path) => posix(relative(root, path))).sort();
}

function outputRecord(path, bytes) {
  return { path, sha256: sha256(canonicalAuditBytes(path, bytes)), bytes: bytes.length };
}

function binaryAggregate(records) {
  const canonical = records
    .map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`)
    .join("");
  return sha256(Buffer.from(canonical, "utf8"));
}

async function buildExpected() {
  const source = assertSourcePin();
  const ffmpeg = resolveExecutable("P048_FFMPEG", "ffmpeg");
  const ffprobe = resolveExecutable("P048_FFPROBE", "ffprobe");
  const [ffmpegTool, ffprobeTool] = await Promise.all([
    checkedTool(ffmpeg, expectedTools.ffmpeg, "ffmpeg"),
    checkedTool(ffprobe, expectedTools.ffprobe, "ffprobe"),
  ]);
  await validateDeepDependency();
  const derivative = await buildDerivative(ffmpeg, ffprobe, source.bytes, "primary");
  if (deepMode) {
    const repeated = await buildDerivative(ffmpeg, ffprobe, source.bytes, "repeat");
    if (
      !derivative.videoBytes.equals(repeated.videoBytes)
      || !derivative.posterBytes.equals(repeated.posterBytes)
    ) fail("repeat conversion was not byte-for-byte deterministic");
  }

  const videoPath = `${packagePrefix}/video/${expectedDerivative.videoSha256}.mp4`;
  const posterPath = `${packagePrefix}/poster/${expectedDerivative.posterSha256}.png`;
  const tutorialPath = `${packagePrefix}/tutorial.json`;
  const attributesPath = `${packagePrefix}/.gitattributes`;
  const manifestPath = `${packagePrefix}/manifest.json`;
  const attributesBytes = Buffer.from([
    ".gitattributes text eol=lf",
    "*.json text eol=lf",
    "video/** -text",
    "poster/** -text",
    "",
  ].join("\n"), "utf8");

  const tutorial = {
    schemaVersion: 1,
    packageSessionId: "P048",
    runtimeSessionId: "R048",
    owner: "tutorial-video",
    source: {
      repository: "trinhtanphat/Resource",
      commit: sourceCommit,
      tree: sourceTree,
      paths: source.rows.map((row) => ({
        path: row.path,
        gitMode: row.mode,
        gitBlobSha1: row.blob,
        sha256: sourceIdentity.sha256,
        bytes: row.bytes,
        classification: "exact",
      })),
      duplicatePaths: 2,
      uniqueBlobs: 1,
      container: "flv",
      videoCodec: "vp6f",
      audioStreams: 0,
      width: 350,
      height: 350,
      frameRate: "30/1",
      decodedFrames: 541,
      metadataDurationSeconds: 18,
      probe: derivative.sourceProbe,
    },
    browserVideo: {
      path: videoPath,
      sha256: expectedDerivative.videoSha256,
      bytes: expectedDerivative.videoBytes,
      mime: "video/mp4",
      container: "mp4",
      videoCodec: "h264",
      videoProfile: "High",
      audioCodec: null,
      width: 350,
      height: 350,
      pixelFormat: "yuv420p",
      frameRate: "30/1",
      decodedFrames: 541,
      durationSeconds: 18.033333,
      conversion: "pinned-ffmpeg-vp6-to-h264-crf18-single-thread-bitexact-faststart",
      classification: "exact",
      probe: derivative.videoProbe,
    },
    poster: {
      path: posterPath,
      sha256: expectedDerivative.posterSha256,
      bytes: expectedDerivative.posterBytes,
      mime: "image/png",
      width: 350,
      height: 350,
      frameIndex: 0,
      timestampSeconds: 0,
      selection: "first decoded source frame without crop, resize, or authored overlay",
      classification: "exact",
      probe: derivative.posterProbe,
    },
    content: {
      visualText: "burned into the source video frames",
      separateCaptionTrack: false,
      localizationClassification: "unresolved",
    },
    playbackAndInteraction: {
      consumerClassification: "unresolved",
      literalAssetCallsites: [],
      reviewedSourceRoot: "Gunny92/flashbaseSrc/src/**/*.as",
      reviewedSearchTerms: ["simpletutorial", "tutorial.flv"],
      autoplay: null,
      loop: null,
      skip: null,
      completionSignal: null,
      captionBehavior: null,
      playerDefault: "disabled-until-R048-explicit-consumer-authority",
      reason: "No ActionScript literal binds either source path to a tutorial lifecycle or player state.",
    },
    runtimeBoundary: {
      browserNativeMedia: true,
      browserNativePoster: true,
      rawFlvRuntimeAllowed: false,
      packageOnly: true,
      runtimeIntegration: false,
      unresolvedConsumersFailClosed: true,
    },
  };
  const tutorialBytes = Buffer.from(jsonText(tutorial), "utf8");

  const contract = {
    schemaVersion: 1,
    packageSessionId: "P048",
    runtimeSessionId: "R048",
    owner: "tutorial-video",
    packageManifest: manifestPath,
    assetAddressing: {
      kind: "immutable-commit-relative-path",
      repository: "trinhtanphat/Resource",
      mutableBranchAllowed: false,
    },
    media: {
      sourceContainer: "flv",
      forbiddenRuntimeContainers: ["flv", "swf"],
      browserContainer: "mp4",
      browserVideoCodec: "h264",
      browserAudioCodec: null,
      posterMime: "image/png",
      preserveDimensions: true,
      preserveFrameRate: true,
      preserveAllDecodedFrames: true,
    },
    playback: {
      autoplay: "unresolved-disabled",
      loop: "unresolved-disabled",
      skip: "unresolved-disabled",
      completion: "unresolved-disabled",
      captions: "no separate track; burned-in source text retained without invented localization",
    },
    consumers: {
      exact: 0,
      inferred: 0,
      unresolved: 1,
      failClosed: true,
    },
    handoffRequirements: [
      "Pin the immutable Resource merge commit.",
      "Load the MP4 and poster only through the central same-origin package resolver.",
      "Keep raw FLV and every unresolved playback or completion behavior inactive.",
      "Require explicit reviewed consumer authority before mounting the tutorial player.",
      "Do not treat the burned-in source text as a separate caption or localization contract.",
    ],
  };
  const contractBytes = Buffer.from(jsonText(contract), "utf8");

  const status = {
    schemaVersion: 1,
    packageSessionId: "P048",
    runtimeSessionId: "R048",
    owner: "tutorial-video",
    status: "complete-package",
    runtimeIntegration: false,
    sourcePin: sourceCommit,
    dependency,
    summary: {
      sourceFiles: 2,
      sourceBytes: 1_152_234,
      uniqueSourceBlobs: 1,
      sourceFlvFiles: 2,
      browserVideoOutputs: 1,
      browserVideoBytes: expectedDerivative.videoBytes,
      posterOutputs: 1,
      posterBytes: expectedDerivative.posterBytes,
      exactAssetSelections: 2,
      exactBrowserDerivatives: 2,
      inferredConsumerMappings: 0,
      unresolvedConsumerMappings: 1,
      runtimeIntegration: false,
    },
    publication: {
      repository: "trinhtanphat/Resource",
      immutableCommitRequired: true,
      mutableBranchAllowed: false,
      releaseCommit: null,
    },
    checks: {
      r036Importer: "pass on reviewed Gunny main; two pinned paths remain explicit Track A inputs",
      sourcePinAndTree: "pass",
      ffprobeSourceAndOutputs: "pass",
      deterministicCodecConversion: "pass: repeated MP4 and poster bytes",
      packageChecker: "pass after generation; rerun with pinned P048_FFMPEG and P048_FFPROBE",
      interactionAuthority: "unresolved and disabled; no literal source consumer found",
      programVerifier: "coordinator-owned session map unchanged",
      githubActionsUsedOrInspected: false,
    },
  };
  const statusBytes = Buffer.from(jsonText(status), "utf8");
  const checkerBytes = canonicalAuditBytes(checkerPath, await readFile(native(checkerPath)));

  const manifest = {
    schemaVersion: 1,
    packageSessionId: "P048",
    runtimeSessionId: "R048",
    owner: "tutorial-video",
    source: {
      repository: "trinhtanphat/Resource",
      commit: sourceCommit,
      tree: sourceTree,
      families: ["image/video/", "video/"],
    },
    trackAEvidence: {
      repository: "trinhtanphat/Gunny",
      ...dependency,
    },
    toolchain: {
      ffmpeg: ffmpegTool,
      ffprobe: ffprobeTool,
      versions: {
        ffmpeg: run(ffmpeg, ["-version"], { label: "ffmpeg version" }).split(/\r?\n/u)[0],
        ffprobe: run(ffprobe, ["-version"], { label: "ffprobe version" }).split(/\r?\n/u)[0],
        node: process.version,
      },
    },
    catalogs: [
      { path: tutorialPath, sha256: sha256(tutorialBytes), tutorials: 1 },
    ],
    binaryOutputs: {
      count: 2,
      bytes: expectedDerivative.videoBytes + expectedDerivative.posterBytes,
      aggregateSha256: binaryAggregate([
        { path: videoPath, sha256: expectedDerivative.videoSha256, bytes: expectedDerivative.videoBytes },
        { path: posterPath, sha256: expectedDerivative.posterSha256, bytes: expectedDerivative.posterBytes },
      ]),
      contentAddressed: true,
    },
    summary: status.summary,
    runtimeBoundary: {
      packageOnly: true,
      nextSession: "R048",
      failClosedForUnresolvedConsumers: true,
      rawFlvRuntimeAllowed: false,
      mutableBranchAllowed: false,
    },
  };
  const manifestBytes = Buffer.from(jsonText(manifest), "utf8");

  const evidenceOutputs = [
    outputRecord(attributesPath, attributesBytes),
    outputRecord(manifestPath, manifestBytes),
    outputRecord(tutorialPath, tutorialBytes),
    outputRecord(contractPath, contractBytes),
    outputRecord(checkerPath, checkerBytes),
    outputRecord(statusPath, statusBytes),
  ];
  const evidence = {
    schemaVersion: 1,
    packageSessionId: "P048",
    runtimeSessionId: "R048",
    owner: "tutorial-video",
    source: manifest.source,
    dependency,
    toolchain: manifest.toolchain,
    summary: status.summary,
    outputs: evidenceOutputs,
    binaryOutputs: manifest.binaryOutputs,
    classification: {
      assetSelection: { exact: 2, inferred: 0, unresolved: 0 },
      browserDerivatives: { exact: 2, inferred: 0, unresolved: 0 },
      consumerMappings: { exact: 0, inferred: 0, unresolved: 1 },
      playbackBehaviors: {
        autoplay: "unresolved",
        loop: "unresolved",
        skip: "unresolved",
        completion: "unresolved",
        captions: "unresolved-no-separate-track",
      },
    },
    validation: {
      pinnedGitBlobBytes: "pass including two case-sensitive source paths with one identical blob",
      ffprobeSource: "pass: VP6-only FLV, 350x350, 30 fps, 541 decoded frames",
      deterministicH264Mp4: "pass: two pinned-tool conversions matched byte-for-byte",
      deterministicPoster: "pass: first decoded frame, no crop or resize",
      consumerAuthority: "unresolved: no simpletutorial or tutorial.flv literal in reviewed ActionScript source",
      githubActionsUsedOrInspected: false,
    },
  };
  const evidenceBytes = Buffer.from(jsonText(evidence), "utf8");

  return new Map([
    [attributesPath, attributesBytes],
    [manifestPath, manifestBytes],
    [tutorialPath, tutorialBytes],
    [videoPath, derivative.videoBytes],
    [posterPath, derivative.posterBytes],
    [contractPath, contractBytes],
    [evidencePath, evidenceBytes],
    [statusPath, statusBytes],
  ]);
}

async function writeExpected(expected) {
  for (const [path, bytes] of expected) {
    await mkdir(dirname(native(path)), { recursive: true });
    await writeFile(native(path), bytes);
  }
}

async function checkExpected(expected) {
  for (const [path, bytes] of expected) {
    if (!await exists(native(path))) fail(`missing ${path}`);
    const actual = await readFile(native(path));
    if (!canonicalAuditBytes(path, actual).equals(canonicalAuditBytes(path, bytes))) {
      fail(`${path} differs from deterministic output`);
    }
  }
  const expectedPackageFiles = [...expected.keys()]
    .filter((path) => path.startsWith(`${packagePrefix}/`))
    .sort();
  const actualPackageFiles = await packageFiles();
  if (JSON.stringify(actualPackageFiles) !== JSON.stringify(expectedPackageFiles)) {
    fail(`package file set changed: ${JSON.stringify(actualPackageFiles)}`);
  }
}

const expected = await buildExpected();
if (writeMode) await writeExpected(expected);
await checkExpected(expected);

console.log(JSON.stringify({
  status: "pass",
  packageSessionId: "P048",
  runtimeSessionId: "R048",
  owner: "tutorial-video",
  sourceFiles: 2,
  uniqueSourceBlobs: 1,
  browserVideoOutputs: 1,
  posterOutputs: 1,
  exactAssetSelections: 2,
  exactBrowserDerivatives: 2,
  unresolvedConsumerMappings: 1,
  deterministicRepeat: deepMode,
  wrote: writeMode,
  githubActions: false,
}, null, 2));
