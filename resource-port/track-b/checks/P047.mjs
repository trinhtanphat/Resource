#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

const root = process.cwd();
const packagePrefix = "exports/resource-port/audio-localization";
const packageRoot = resolve(root, packagePrefix);
const contractPath = "resource-port/track-b/contracts/audio-localization.json";
const evidencePath = "resource-port/track-b/evidence/P047.json";
const statusPath = "resource-port/track-b/status/P047.json";
const checkerPath = "resource-port/track-b/checks/P047.mjs";
const sourceCommit = "519c35a293745b6a0477c4f6ea03110a89de2318";
const sourceTree = "9a99b5163ca02ef04f82b9d3a3a246baa8a5e344";
const reviewedGunnyMain = "894d7ba12b3b4966342195afbd6b1917b5c94c61";
const dependency = Object.freeze({
  sessionId: "R035",
  implementationCommit: "3d7a049655847ab6b7802541560ef227e17df1ed",
  findingsCommit: "1221419cc1f0ce4f50012b4c5b175ab84f6a8170",
  evidenceGitBlobSha1: "c6da41d64ac046765f4e48c44a6244ab40a45e44",
  dispatchSha256: "b043c6e636114e4ef78ef4a802d4d83ebf658d953bf943d1d0744ac36330bc10",
  verifiedOnGunnyMain: reviewedGunnyMain,
});
const expectedTools = Object.freeze({
  ffmpeg: "1326dde4c84ff1f96fe6b8916c5bed29e163e9b5dccf995f6f3db069d143ec5e",
  ffprobe: "b49ccc7c6547b141ad5a2f6ec69cc04323d7133d7704d70b331b904c63eecb07",
  ffdec: "090ab695053ad94cba6408574c7d7eea20ec60b6ae789ee6056a23f45106762f",
});
const writeMode = process.argv.includes("--write");
const replaceMode = process.argv.includes("--replace");
const deepMode = process.argv.includes("--deep");

const fail = (message) => {
  throw new Error(`P047 package invalid: ${message}`);
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

function readTree(revision) {
  const output = run("git", ["ls-tree", "-r", "-l", revision, "--", "sound", "xml"], {
    label: `git ls-tree ${revision}`,
  });
  const rows = output.split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(\d+)\s+blob\s+([0-9a-f]{40})\s+(\d+)\t(.+)$/u.exec(line);
    if (!match) fail(`cannot parse git tree row: ${line}`);
    return {
      mode: match[1],
      blob: match[2],
      bytes: Number(match[3]),
      path: match[4],
    };
  });
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}

function pinnedBlob(path) {
  const bytes = run("git", ["cat-file", "blob", `${sourceCommit}:${path}`], {
    binary: true,
    label: `git blob ${path}`,
  });
  if (!Buffer.isBuffer(bytes)) fail(`${path} was not read as bytes`);
  return bytes;
}

async function canonicalSourceBytes(row) {
  const working = await readFile(native(row.path));
  if (gitBlobSha1(working) === row.blob) return working;
  const canonical = pinnedBlob(row.path);
  if (gitBlobSha1(canonical) !== row.blob) fail(`${row.path} pinned blob identity mismatch`);
  return canonical;
}

function assertSourcePin() {
  const actualTree = run("git", ["show", "-s", "--format=%T", sourceCommit], {
    label: "source tree pin",
  }).trim();
  if (actualTree !== sourceTree) fail(`source tree changed: ${actualTree}`);
  const pinned = readTree(sourceCommit);
  const current = new Map(readTree("HEAD").map((row) => [row.path, row]));
  if (pinned.length !== 229) fail(`expected 229 pinned source files, found ${pinned.length}`);
  const bytes = pinned.reduce((sum, row) => sum + row.bytes, 0);
  if (bytes !== 220403442) fail(`pinned source byte total changed: ${bytes}`);
  for (const row of pinned) {
    const active = current.get(row.path);
    if (!active || active.blob !== row.blob || active.bytes !== row.bytes) {
      fail(`${row.path} differs from raw source pin on current main`);
    }
  }
  return pinned;
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
      sampleRate: numeric(stream.sample_rate),
      channels: stream.channels === undefined ? null : Number(stream.channels),
      channelLayout: stream.channel_layout ?? null,
      width: stream.width === undefined ? null : Number(stream.width),
      height: stream.height === undefined ? null : Number(stream.height),
      pixelFormat: stream.pix_fmt ?? null,
      frameRate: stream.avg_frame_rate ?? null,
      startTime: numeric(stream.start_time),
      duration: numeric(stream.duration),
      durationTs: numeric(stream.duration_ts),
      bitRate: numeric(stream.bit_rate),
    })).sort((left, right) => left.index - right.index),
  };
}

function probeFile(ffprobe, path) {
  return normalizeProbe(run(ffprobe, [
    "-v", "error",
    "-show_entries",
    "format=format_name,duration,size,bit_rate:stream=index,codec_type,codec_name,profile,sample_rate,channels,channel_layout,width,height,pix_fmt,avg_frame_rate,start_time,duration,duration_ts,bit_rate",
    "-of", "json",
    "--", path,
  ], { label: `ffprobe ${basename(path)}` }));
}

function probeAudio(probe) {
  return probe.streams.filter((stream) => stream.type === "audio");
}

function probeVideo(probe) {
  return probe.streams.filter((stream) => stream.type === "video");
}

function extractMp3FromFlv(flv) {
  if (flv.subarray(0, 3).toString("ascii") !== "FLV") fail("MP3 source is not FLV");
  let offset = flv.readUInt32BE(5) + 4;
  const chunks = [];
  while (offset + 11 <= flv.length) {
    const tagType = flv[offset];
    const dataSize = flv.readUIntBE(offset + 1, 3);
    const body = offset + 11;
    if (body + dataSize > flv.length) break;
    if (tagType === 8 && dataSize >= 1) {
      const format = flv[body] >>> 4;
      if (format === 2) chunks.push(flv.subarray(body + 1, body + dataSize));
    }
    offset = body + dataSize + 4;
  }
  if (chunks.length === 0) fail("FLV has no MP3 audio tags");
  return Buffer.concat(chunks);
}

async function walk(directory, suffix, base = directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path, suffix, base));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) output.push(path);
  }
  return output.sort((left, right) => left.localeCompare(right));
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/u).length;
}

async function buildEventAuthority(gunny92Root, flvPaths) {
  const sourceRoot = resolve(gunny92Root, "flashbaseSrc", "src");
  const soundManagerPath = resolve(sourceRoot, "ddt", "manager", "SoundManager.as");
  const mapInfoPath = resolve(sourceRoot, "ddt", "data", "map", "MapInfo.as");
  const sourceManagerBytes = await readFile(soundManagerPath);
  const mapInfoBytes = await readFile(mapInfoPath);
  const sourceManager = sourceManagerBytes.toString("utf8");
  const mapInfo = mapInfoBytes.toString("utf8");
  const calls = [];
  const authorityFiles = new Map();
  const matcher = /SoundManager\.instance\.(playMusic|playGameBackMusic)\(([^;\r\n]*)\);/gu;
  for (const path of await walk(sourceRoot, ".as")) {
    const bytes = await readFile(path);
    const text = bytes.toString("utf8");
    const matches = [...text.matchAll(matcher)];
    if (matches.length === 0) continue;
    const canonical = posix(relative(gunny92Root, path));
    authorityFiles.set(canonical, sha256(bytes));
    for (const match of matches) {
      const expression = match[2].trim();
      const argumentsList = expression.split(",").map((value) => value.trim());
      const literal = /^"([^"]+)"$/u.exec(argumentsList[0])?.[1] ?? null;
      const defaultLoop = match[1] === "playMusic";
      const explicitLoop = argumentsList[1] === "true"
        ? true
        : argumentsList[1] === "false"
          ? false
          : null;
      calls.push({
        method: match[1],
        expression,
        literalEventName: literal,
        loop: match[1] === "playGameBackMusic"
          ? "source-game-playlist-repeat"
          : explicitLoop ?? defaultLoop,
        path: canonical,
        line: lineNumber(text, match.index),
      });
    }
  }
  authorityFiles.set(posix(relative(gunny92Root, soundManagerPath)), sha256(sourceManagerBytes));
  authorityFiles.set(posix(relative(gunny92Root, mapInfoPath)), sha256(mapInfoBytes));

  const defaultBackMusic = /BackMusic:String\s*=\s*"([^"]+)"/u.exec(mapInfo)?.[1];
  if (defaultBackMusic !== "050") fail(`MapInfo BackMusic default changed: ${defaultBackMusic}`);
  const literalEvents = new Set(calls.map((call) => call.literalEventName).filter(Boolean));
  literalEvents.add(defaultBackMusic);
  const expectedLiteral = ["050", "062", "065", "12019", "140", "3001", "3002", "3003", "3004"];
  if (JSON.stringify([...literalEvents].sort()) !== JSON.stringify(expectedLiteral)) {
    fail(`literal music event census changed: ${[...literalEvents].sort().join(",")}`);
  }
  const hasWorldBossPattern = calls.some((call) => call.expression.includes('"worldbossroom-"'));
  if (!hasWorldBossPattern) fail("world-boss dynamic music authority is missing");
  if (!sourceManager.includes('SITE_MAIN + "sound/" + this._currentMusic + ".flv"')) {
    fail("SoundManager event-to-source resolver changed");
  }
  if (!sourceManager.includes("this._musicLoop = param2")) fail("SoundManager loop authority changed");
  if (!sourceManager.includes("this._musicVolume / 100")) fail("SoundManager volume authority changed");

  const events = flvPaths.map((path) => {
    const eventName = basename(path, ".flv");
    const classification = literalEvents.has(eventName)
      ? "exact"
      : hasWorldBossPattern && /^worldbossroom-\d+$/u.test(eventName)
        ? "inferred"
        : "unresolved";
    return {
      eventName,
      sourcePath: path,
      eventNameClassification: "exact",
      consumerClassification: classification,
      callsites: calls.filter((call) => call.literalEventName === eventName),
      loopContract: {
        mode: "whole-file-restart-on-NetStream.Play.Stop",
        startSeconds: 0,
        end: "decoded-duration",
        sourceDefault: true,
        callerOverrideAllowed: true,
      },
      volumeContract: {
        channel: "music",
        source: "SoundManager._musicVolume / 100",
        perEventGain: 1,
      },
    };
  });
  const counts = Object.fromEntries(["exact", "inferred", "unresolved"].map((kind) => [
    kind,
    events.filter((event) => event.consumerClassification === kind).length,
  ]));
  if (counts.exact !== 9 || counts.inferred !== 2 || counts.unresolved !== 211) {
    fail(`event consumer census changed: ${JSON.stringify(counts)}`);
  }
  return {
    resolver: {
      eventName: "exact filename stem",
      sourceTemplate: "sound/<eventName>.flv",
      loop: "whole-file restart; no embedded loop-point metadata is consumed",
      volume: "global music percentage divided by 100; no per-event gain",
    },
    authorityFiles: [...authorityFiles.entries()]
      .map(([path, digest]) => ({ path, sha256: digest }))
      .sort((left, right) => left.path.localeCompare(right.path)),
    calls: calls.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line),
    dynamicCalls: calls.filter((call) => call.literalEventName === null),
    events,
    summary: counts,
  };
}

function xmlAttribute(tag, name) {
  return new RegExp(`${name}="([^"]*)"`, "u").exec(tag)?.[1] ?? null;
}

function parseFfdecSoundXml(text, expectedSymbol) {
  const define = /<item type="DefineSoundTag"[^>]*\/>/u.exec(text)?.[0];
  if (!define) fail(`${expectedSymbol} FFDec XML has no DefineSound`);
  const symbolBlock = /<item type="SymbolClassTag"[\s\S]*?<\/item>\s*<item type="SoundStreamHead2Tag"/u.exec(text)?.[0] ?? "";
  if (!symbolBlock.includes(`<item>${expectedSymbol}</item>`)) fail(`${expectedSymbol} SymbolClass missing`);
  const rateCode = Number(xmlAttribute(define, "soundRate"));
  const sampleRates = [5512, 11025, 22050, 44100];
  return {
    characterId: Number(xmlAttribute(define, "soundId")),
    symbol: expectedSymbol,
    soundFormat: Number(xmlAttribute(define, "soundFormat")),
    sampleRate: sampleRates[rateCode],
    sampleSize: xmlAttribute(define, "soundSize") === "true" ? 16 : 8,
    channels: xmlAttribute(define, "soundType") === "true" ? 2 : 1,
    sampleCount: Number(xmlAttribute(define, "soundSampleCount")),
  };
}

async function removeGeneratedTargets() {
  const exactPackage = resolve(root, "exports", "resource-port", "audio-localization");
  if (packageRoot !== exactPackage || !packageRoot.startsWith(`${resolve(root, "exports", "resource-port")}${sep}`)) {
    fail("refusing unsafe package replacement target");
  }
  if (await exists(packageRoot)) await rm(packageRoot, { recursive: true, force: false });
  for (const path of [contractPath, evidencePath, statusPath]) {
    const target = native(path);
    if (await exists(target)) await unlink(target);
  }
}

async function buildPackage() {
  const pinned = assertSourcePin();
  if (replaceMode) await removeGeneratedTargets();
  for (const path of [packageRoot, native(contractPath), native(evidencePath), native(statusPath)]) {
    if (await exists(path)) fail(`${posix(relative(root, path))} already exists; use --replace explicitly`);
  }

  const ffmpeg = resolveExecutable("P047_FFMPEG", "ffmpeg");
  const ffprobe = resolveExecutable("P047_FFPROBE", "ffprobe");
  const ffdec = resolve(process.env.P047_FFDEC_JAR || "");
  const java = resolveExecutable("P047_JAVA", "java");
  const gunny92Root = resolve(process.env.P047_GUNNY92_ROOT || "");
  if (!process.env.P047_FFDEC_JAR || !await exists(ffdec)) fail("P047_FFDEC_JAR is required");
  if (!process.env.P047_GUNNY92_ROOT || !await exists(gunny92Root)) fail("P047_GUNNY92_ROOT is required");
  const toolchain = {
    ffmpeg: await checkedTool(ffmpeg, expectedTools.ffmpeg, "FFmpeg"),
    ffprobe: await checkedTool(ffprobe, expectedTools.ffprobe, "ffprobe"),
    ffdec: await checkedTool(ffdec, expectedTools.ffdec, "FFDec"),
    versions: {
      ffmpeg: run(ffmpeg, ["-version"], { label: "FFmpeg version" }).split(/\r?\n/u)[0],
      ffprobe: run(ffprobe, ["-version"], { label: "ffprobe version" }).split(/\r?\n/u)[0],
      ffdec: "JPEXS Free Flash Decompiler 26.2.1",
      java: run(java, ["--version"], { label: "Java version" }).split(/\r?\n/u)[0],
      node: process.version,
    },
  };

  const stageRoot = await mkdtemp(resolve(root, ".p047-stage-"));
  const stagePackageRoot = resolve(stageRoot, packagePrefix);
  const mediaTemp = resolve(stageRoot, ".media");
  const binaries = new Map();
  const stageNative = (path) => resolve(stageRoot, ...path.split("/"));
  const writeStage = async (path, bytes) => {
    const target = stageNative(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  };
  const writeStageJson = async (path, value) => writeStage(path, Buffer.from(jsonText(value), "utf8"));
  const storeBinary = async (kind, extension, bytes) => {
    const digest = sha256(bytes);
    const path = `${packagePrefix}/${kind}/${digest}.${extension}`;
    if (!binaries.has(path)) {
      await writeStage(path, bytes);
      binaries.set(path, { path, sha256: digest, bytes: bytes.length });
    }
    return binaries.get(path);
  };

  try {
    await mkdir(mediaTemp, { recursive: true });
    const attributesPath = `${packagePrefix}/.gitattributes`;
    await writeStage(attributesPath, Buffer.from([
      ".gitattributes text eol=lf",
      "*.json text eol=lf",
      "audio/** -text",
      "video/** -text",
      "xml/** -text",
      "support/** -text",
      "",
    ].join("\n"), "utf8"));
    const flvRows = pinned.filter((row) => extname(row.path).toLowerCase() === ".flv");
    const flvGroups = new Map();
    for (const row of flvRows) {
      const group = flvGroups.get(row.blob) ?? { representative: row, rows: [] };
      group.rows.push(row);
      flvGroups.set(row.blob, group);
    }
    if (flvRows.length !== 222 || flvGroups.size !== 202) fail("FLV source census changed");
    const eventAuthority = await buildEventAuthority(gunny92Root, flvRows.map((row) => row.path));
    const audioGroups = [];
    let groupIndex = 0;
    for (const group of [...flvGroups.values()].sort((left, right) => left.representative.path.localeCompare(right.representative.path))) {
      groupIndex += 1;
      const source = await canonicalSourceBytes(group.representative);
      if (gitBlobSha1(source) !== group.representative.blob) fail(`${group.representative.path} source blob drift`);
      const inputPath = resolve(mediaTemp, `flv-${String(groupIndex).padStart(3, "0")}.flv`);
      await writeFile(inputPath, source);
      const sourceProbe = probeFile(ffprobe, inputPath);
      const audioStreams = probeAudio(sourceProbe);
      const videoStreams = probeVideo(sourceProbe);
      if (audioStreams.length !== 1 || videoStreams.length > 1) fail(`${group.representative.path} unexpected stream census`);
      const audioCodec = audioStreams[0].codec;
      let audioBytes;
      let audioExtension;
      let conversion;
      if (audioCodec === "mp3") {
        audioBytes = extractMp3FromFlv(source);
        audioExtension = "mp3";
        conversion = "lossless-flv-mp3-tag-extraction";
      } else if (audioCodec === "aac") {
        const temporaryOutput = resolve(mediaTemp, `audio-${String(groupIndex).padStart(3, "0")}.ogg`);
        run(ffmpeg, [
          "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
          "-i", inputPath,
          "-map", "0:a:0", "-vn", "-map_metadata", "-1",
          "-c:a", "libvorbis", "-q:a", "5",
          "-fflags", "+bitexact", "-flags:a", "+bitexact",
          temporaryOutput,
        ], { label: `${group.representative.path} AAC to Ogg` });
        audioBytes = await readFile(temporaryOutput);
        audioExtension = "ogg";
        conversion = "deterministic-aac-to-vorbis";
      } else {
        fail(`${group.representative.path} unsupported audio codec ${audioCodec}`);
      }
      const browserAudio = await storeBinary("audio", audioExtension, audioBytes);
      browserAudio.container = audioExtension === "mp3" ? "mp3" : "ogg";
      browserAudio.codec = audioExtension === "mp3" ? "mp3" : "vorbis";
      browserAudio.probe = probeFile(ffprobe, stageNative(browserAudio.path));
      browserAudio.conversion = conversion;

      let browserVideo = null;
      if (videoStreams.length === 1) {
        const temporaryVideo = resolve(mediaTemp, `video-${String(groupIndex).padStart(3, "0")}.mp4`);
        if (videoStreams[0].codec === "h264" && audioCodec === "aac") {
          run(ffmpeg, [
            "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
            "-i", inputPath,
            "-map", "0:v:0", "-map", "0:a:0", "-c", "copy",
            "-map_metadata", "-1", "-movflags", "+faststart", "-fflags", "+bitexact",
            temporaryVideo,
          ], { label: `${group.representative.path} H.264/AAC remux` });
          conversion = "lossless-h264-aac-remux";
        } else if (videoStreams[0].codec === "vp6f" && audioCodec === "mp3") {
          run(ffmpeg, [
            "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
            "-i", inputPath,
            "-map", "0:v:0", "-map", "0:a:0", "-map_metadata", "-1",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18",
            "-pix_fmt", "yuv420p", "-threads", "1",
            "-c:a", "aac", "-b:a", "64k", "-ar", "22050",
            "-movflags", "+faststart", "-fflags", "+bitexact",
            "-flags:v", "+bitexact", "-flags:a", "+bitexact",
            temporaryVideo,
          ], { label: `${group.representative.path} VP6/MP3 transcode` });
          conversion = "deterministic-vp6-mp3-to-h264-aac";
        } else {
          fail(`${group.representative.path} unsupported multimedia combination`);
        }
        const videoBytes = await readFile(temporaryVideo);
        browserVideo = await storeBinary("video", "mp4", videoBytes);
        browserVideo.container = "mp4";
        browserVideo.videoCodec = "h264";
        browserVideo.audioCodec = "aac";
        browserVideo.probe = probeFile(ffprobe, stageNative(browserVideo.path));
        browserVideo.conversion = conversion;
        browserVideo.consumerClassification = "unresolved";
      }
      audioGroups.push({
        sourceBlobSha1: group.representative.blob,
        sourceSha256: sha256(source),
        sourceBytes: source.length,
        sourcePaths: group.rows.map((row) => row.path).sort(),
        sourceProbe,
        browserAudio,
        browserVideo,
      });
    }

    const ffdecRecords = [];
    for (const id of ["201", "202"]) {
      const row = pinned.find((entry) => entry.path === `sound/sound${id}.swf`);
      if (!row) fail(`sound${id}.swf missing from pin`);
      const source = await canonicalSourceBytes(row);
      const swfPath = resolve(mediaTemp, `sound${id}.swf`);
      const exportRoot = resolve(mediaTemp, `ffdec-sound${id}`);
      const xmlPath = resolve(mediaTemp, `sound${id}.xml`);
      await writeFile(swfPath, source);
      await mkdir(exportRoot, { recursive: true });
      run(java, ["-Djava.awt.headless=true", "-jar", ffdec, "-export", "sound", exportRoot, swfPath], {
        label: `FFDec sound${id} sound export`,
      });
      run(java, ["-Djava.awt.headless=true", "-jar", ffdec, "-swf2xml", swfPath, xmlPath], {
        label: `FFDec sound${id} XML export`,
      });
      const metadata = parseFfdecSoundXml(await readFile(xmlPath, "utf8"), `Sound${id}`);
      const intermediatePath = resolve(exportRoot, id === "201" ? "1_Sound201.flv" : "1_Sound202.mp3");
      const intermediate = await readFile(intermediatePath);
      let outputBytes;
      let extension;
      let conversion;
      if (id === "201") {
        if (metadata.soundFormat !== 1 || metadata.sampleRate !== 5512 || metadata.sampleCount !== 32935) {
          fail(`Sound201 metadata changed: ${JSON.stringify(metadata)}`);
        }
        const converted = resolve(mediaTemp, "Sound201.ogg");
        run(ffmpeg, [
          "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
          "-i", intermediatePath,
          "-map_metadata", "-1", "-vn", "-af", `atrim=end_sample=${metadata.sampleCount}`,
          "-c:a", "libvorbis", "-q:a", "4",
          "-fflags", "+bitexact", "-flags:a", "+bitexact",
          converted,
        ], { label: "Sound201 ADPCM to Ogg" });
        outputBytes = await readFile(converted);
        extension = "ogg";
        conversion = "ffdec-adpcm-export-then-sample-count-trimmed-vorbis";
      } else {
        if (metadata.soundFormat !== 2 || metadata.sampleRate !== 11025 || metadata.sampleCount !== 50799) {
          fail(`Sound202 metadata changed: ${JSON.stringify(metadata)}`);
        }
        outputBytes = intermediate;
        extension = "mp3";
        conversion = "lossless-ffdec-mp3-DefineSound-extraction";
      }
      const browserAudio = await storeBinary("audio", extension, outputBytes);
      browserAudio.container = extension === "mp3" ? "mp3" : "ogg";
      browserAudio.codec = extension === "mp3" ? "mp3" : "vorbis";
      browserAudio.probe = probeFile(ffprobe, stageNative(browserAudio.path));
      browserAudio.conversion = conversion;
      ffdecRecords.push({
        sourcePath: row.path,
        sourceBlobSha1: row.blob,
        sourceSha256: sha256(source),
        sourceBytes: source.length,
        eventName: id,
        sourceSymbol: `Sound${id}`,
        metadata,
        ffdecIntermediate: {
          format: extname(intermediatePath).slice(1),
          bytes: intermediate.length,
          sha256: sha256(intermediate),
        },
        browserAudio,
        consumerClassification: "unresolved",
        loopContract: {
          mode: "Sound.play loop-count",
          sourceDefaultLoops: 0,
          customLoopPoints: null,
        },
        volumeContract: {
          channel: "sound",
          source: "SoundManager.soundVolumn / 100",
          perEventGain: 1,
        },
      });
    }

    const xmlRecords = [];
    for (const path of ["xml/config.xml", "xml/update/desktopupdate.xml"]) {
      const row = pinned.find((entry) => entry.path === path);
      const bytes = await canonicalSourceBytes(row);
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const output = await storeBinary("xml", "xml", bytes);
      let parsed;
      if (path === "xml/config.xml") {
        const emitters = [...text.matchAll(/<emitter\s+([^>]+)>?/gu)].map((match) => ({
          name: xmlAttribute(match[0], "name"),
          id: xmlAttribute(match[0], "id"),
        }));
        if (emitters.length !== 20 || emitters[0]?.name !== "炮单飞行") fail("config.xml UTF-8 emitter census changed");
        parsed = {
          kind: "particle-emitter-catalog",
          root: "list",
          emitterCount: emitters.length,
          emitterIds: emitters.map((emitter) => emitter.id),
          duplicateEmitterIds: [...new Set(emitters.map((emitter) => emitter.id)
            .filter((id, index, all) => all.indexOf(id) !== index))].sort(),
          firstEmitterName: emitters[0].name,
          localizationCatalog: false,
        };
      } else {
        const version = /<version>([^<]+)<\/version>/u.exec(text)?.[1] ?? null;
        const lastPublic = /<lastpublic>([^<]+)<\/lastpublic>/u.exec(text)?.[1] ?? null;
        if (version !== "1.2" || lastPublic !== "ddtLuncher.png") fail("desktopupdate.xml values changed");
        parsed = {
          kind: "legacy-launcher-update",
          root: "example",
          version,
          lastPublic,
          actualSourcePath: "xml/update/ddtluncher.png",
          caseSensitiveReferenceMatches: lastPublic === "ddtluncher.png",
          localizationCatalog: false,
        };
      }
      xmlRecords.push({
        sourcePath: path,
        sourceBlobSha1: row.blob,
        sourceSha256: sha256(bytes),
        sourceBytes: bytes.length,
        browserDocument: output,
        conversion: "identity-pinned-git-blob-UTF-8",
        parsed,
        runtimeConsumerClassification: "unresolved-until-R047-browser-parser",
      });
    }

    const launcherRow = pinned.find((entry) => entry.path === "xml/update/ddtluncher.png");
    const launcherBytes = await canonicalSourceBytes(launcherRow);
    const airMime = "application/vnd.adobe.air-application-installer-package+zip";
    const firstEntryNameLength = launcherBytes.readUInt16LE(26);
    const firstEntryExtraLength = launcherBytes.readUInt16LE(28);
    const firstEntrySize = launcherBytes.readUInt32LE(18);
    const firstEntryStart = 30 + firstEntryNameLength + firstEntryExtraLength;
    const firstEntryName = launcherBytes.subarray(30, 30 + firstEntryNameLength).toString("ascii");
    const firstEntry = launcherBytes.subarray(firstEntryStart, firstEntryStart + firstEntrySize).toString("ascii");
    if (launcherBytes.subarray(0, 4).toString("hex") !== "504b0304" || firstEntryName !== "mimetype" || firstEntry !== airMime) {
      fail("misnamed launcher payload is not the expected Adobe AIR package");
    }
    const launcherOutput = await storeBinary("support", "air", launcherBytes);
    const authoring = pinned.filter((row) => extname(row.path).toLowerCase() === ".fla").map((row) => ({
      sourcePath: row.path,
      sourceBlobSha1: row.blob,
      sourceBytes: row.bytes,
      disposition: "evidence-only-authoring-container",
      browserOutput: null,
    }));
    if (authoring.length !== 2) fail("FLA authoring census changed");

    const audioShards = [];
    for (let index = 0; index < 4; index += 1) {
      const start = Math.floor(index * audioGroups.length / 4);
      const end = Math.floor((index + 1) * audioGroups.length / 4);
      const path = `${packagePrefix}/audio-assets-${String(index + 1).padStart(2, "0")}.json`;
      const value = {
        schemaVersion: 1,
        packageSessionId: "P047",
        owner: "audio-localization",
        groups: audioGroups.slice(start, end),
      };
      await writeStageJson(path, value);
      audioShards.push({ path, sha256: sha256(await readFile(stageNative(path))), groups: value.groups.length });
    }
    const eventsPath = `${packagePrefix}/events.json`;
    const documentsPath = `${packagePrefix}/documents.json`;
    const embeddedPath = `${packagePrefix}/embedded-swf-audio.json`;
    const supportPath = `${packagePrefix}/support-assets.json`;
    await writeStageJson(eventsPath, {
      schemaVersion: 1,
      packageSessionId: "P047",
      owner: "audio-localization",
      ...eventAuthority,
      embeddedEvents: ffdecRecords.map((record) => ({
        eventName: record.eventName,
        sourcePath: record.sourcePath,
        sourceSymbol: record.sourceSymbol,
        consumerClassification: record.consumerClassification,
        loopContract: record.loopContract,
        volumeContract: record.volumeContract,
      })),
    });
    await writeStageJson(documentsPath, {
      schemaVersion: 1,
      packageSessionId: "P047",
      documents: xmlRecords,
      localizationCatalogs: 0,
      note: "The pinned XML family contains a particle emitter catalog and a legacy launcher descriptor, not a locale string catalog.",
    });
    await writeStageJson(embeddedPath, {
      schemaVersion: 1,
      packageSessionId: "P047",
      importer: "JPEXS FFDec DefineSound export plus pinned FFmpeg conversion",
      records: ffdecRecords,
    });
    await writeStageJson(supportPath, {
      schemaVersion: 1,
      packageSessionId: "P047",
      authoring,
      launcherPayload: {
        sourcePath: launcherRow.path,
        sourceBlobSha1: launcherRow.blob,
        sourceSha256: sha256(launcherBytes),
        sourceBytes: launcherBytes.length,
        detectedFormat: "adobe-air-installer-zip",
        detectedMime: airMime,
        misleadingSourceExtension: ".png",
        publishedSupportObject: launcherOutput,
        conversion: "identity-pinned-git-blob-renamed-to-.air",
        browserRuntimeAllowed: false,
        consumerClassification: "unresolved-legacy-launcher-only",
      },
      multimediaSources: audioGroups.filter((group) => group.browserVideo).map((group) => ({
        sourcePaths: group.sourcePaths,
        sourceProbe: group.sourceProbe,
        browserVideo: group.browserVideo,
        consumerClassification: "unresolved-non-audio-stream",
      })),
    });

    const catalogPaths = [eventsPath, documentsPath, embeddedPath, supportPath];
    const catalogs = [
      ...audioShards,
      ...await Promise.all(catalogPaths.map(async (path) => ({
        path,
        sha256: sha256(await readFile(stageNative(path))),
      }))),
    ];
    const binaryRecords = [...binaries.values()].sort((left, right) => left.path.localeCompare(right.path));
    const binaryBytes = binaryRecords.reduce((sum, record) => sum + record.bytes, 0);
    const binaryAggregateSha256 = sha256(Buffer.from(binaryRecords
      .map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`)
      .join(""), "utf8"));
    const outputAudioPaths = new Set(audioGroups.map((group) => group.browserAudio.path));
    for (const record of ffdecRecords) outputAudioPaths.add(record.browserAudio.path);
    const manifest = {
      schemaVersion: 1,
      packageSessionId: "P047",
      runtimeSessionId: "R047",
      owner: "audio-localization",
      source: {
        repository: "trinhtanphat/Resource",
        commit: sourceCommit,
        tree: sourceTree,
        families: ["sound/", "xml/"],
      },
      trackAEvidence: {
        repository: "trinhtanphat/Gunny",
        ...dependency,
        path: "config/resource-port-evidence/R035.json",
      },
      toolchain,
      catalogs,
      binaryOutputs: {
        count: binaryRecords.length,
        bytes: binaryBytes,
        aggregateSha256: binaryAggregateSha256,
        contentAddressed: true,
      },
      summary: {
        sourceFiles: pinned.length,
        sourceBytes: pinned.reduce((sum, row) => sum + row.bytes, 0),
        flvFiles: flvRows.length,
        uniqueFlvBlobs: flvGroups.size,
        flvMp3Blobs: audioGroups.filter((group) => probeAudio(group.sourceProbe)[0].codec === "mp3").length,
        flvAacBlobs: audioGroups.filter((group) => probeAudio(group.sourceProbe)[0].codec === "aac").length,
        audioOnlyFlvBlobs: audioGroups.filter((group) => probeVideo(group.sourceProbe).length === 0).length,
        multimediaFlvBlobs: audioGroups.filter((group) => probeVideo(group.sourceProbe).length === 1).length,
        uniqueBrowserAudioOutputs: outputAudioPaths.size,
        browserVideoOutputs: audioGroups.filter((group) => group.browserVideo).length,
        embeddedSwfAudioOutputs: ffdecRecords.length,
        xmlDocuments: xmlRecords.length,
        localizationCatalogs: 0,
        identityRasterOutputs: 0,
        legacyLauncherSupportObjects: 1,
        evidenceOnlyFla: authoring.length,
        exactConsumerMappings: eventAuthority.summary.exact,
        inferredConsumerMappings: eventAuthority.summary.inferred,
        unresolvedConsumerMappings: eventAuthority.summary.unresolved + ffdecRecords.length,
        runtimeIntegration: false,
      },
      runtimeBoundary: {
        packageOnly: true,
        nextSession: "R047",
        failClosedForUnresolvedConsumers: true,
        xmlRequiresBrowserParser: true,
        mutableBranchAllowed: false,
      },
    };
    const manifestPath = `${packagePrefix}/manifest.json`;
    await writeStageJson(manifestPath, manifest);

    const contract = {
      schemaVersion: 1,
      packageSessionId: "P047",
      runtimeSessionId: "R047",
      owner: "audio-localization",
      packageManifest: manifestPath,
      assetAddressing: {
        kind: "immutable-commit-relative-path",
        repository: "trinhtanphat/Resource",
        mutableBranchAllowed: false,
      },
      audio: {
        browserContainers: ["mp3", "ogg"],
        forbiddenRuntimeContainers: ["flv", "swf", "fla"],
        mp3Policy: "copy FLV/SWF MP3 frames without re-encoding",
        unsupportedCodecPolicy: "decode through pinned FFDec/FFmpeg and encode deterministic Ogg Vorbis",
        eventName: "exact source filename stem or exact SWF SoundNNN symbol mapping",
        loop: "preserve caller loop semantics; whole-file loop starts at 0 and ends at decoded duration",
        volume: "preserve source music/sound percentage channels; no invented per-event gain",
      },
      xml: {
        encoding: "UTF-8",
        parser: "browser DOMParser application/xml",
        preserveOrderAndDuplicateIds: true,
        directCaseInsensitiveUrlResolutionForbidden: true,
        localizationCatalogs: 0,
      },
      consumers: {
        exact: eventAuthority.summary.exact,
        inferred: eventAuthority.summary.inferred,
        unresolved: eventAuthority.summary.unresolved + ffdecRecords.length,
        failClosed: true,
      },
      handoffRequirements: [
        "Pin the immutable Resource merge commit.",
        "Load every audio path through the central asset resolver and browser Audio APIs.",
        "Consume XML through the typed R047 browser parser; never inject XML as HTML.",
        "Keep unresolved event consumers and all four non-audio FLV streams inactive.",
        "Preserve the source music/sound settings channels and whole-file loop contract.",
      ],
    };
    const status = {
      schemaVersion: 1,
      packageSessionId: "P047",
      runtimeSessionId: "R047",
      owner: "audio-localization",
      status: "complete-package",
      runtimeIntegration: false,
      sourcePin: sourceCommit,
      dependency,
      summary: manifest.summary,
      publication: {
        repository: "trinhtanphat/Resource",
        immutableCommitRequired: true,
        mutableBranchAllowed: false,
        releaseCommit: null,
      },
      checks: {
        r035Importer: "pass on reviewed Gunny main with external staging",
        sourcePinAndTree: "pass",
        ffprobeInventory: "pass: every unique FLV source and browser media output",
        ffdecEmbeddedAudio: "pass: Sound201 and Sound202 symbol exports",
        deterministicCodecConversion: "pass",
        xmlUtf8Parsing: "pass",
        packageChecker: "pass after generation; rerun checker with pinned P047_FFPROBE",
        programVerifier: "coordinator-owned session map unchanged",
        githubActionsUsedOrInspected: false,
      },
    };
    await writeStageJson(contractPath, contract);
    await writeStageJson(statusPath, status);

    const jsonOutputs = [attributesPath, manifestPath, ...catalogs.map((entry) => entry.path), contractPath, checkerPath, statusPath];
    const outputDigests = [];
    for (const path of jsonOutputs) {
      const sourceBytes = path === checkerPath ? await readFile(native(path)) : await readFile(stageNative(path));
      const bytes = canonicalAuditBytes(path, sourceBytes);
      outputDigests.push({ path, sha256: sha256(bytes), bytes: bytes.length });
    }
    const evidence = {
      schemaVersion: 1,
      packageSessionId: "P047",
      runtimeSessionId: "R047",
      owner: "audio-localization",
      source: manifest.source,
      dependency,
      toolchain,
      summary: manifest.summary,
      outputs: outputDigests,
      binaryOutputs: manifest.binaryOutputs,
      classification: {
        assetSelection: { exact: 229, inferred: 0, unresolved: 0 },
        eventNames: { exact: 224, inferred: 0, unresolved: 0 },
        consumerMappings: {
          exact: eventAuthority.summary.exact,
          inferred: eventAuthority.summary.inferred,
          unresolved: eventAuthority.summary.unresolved + ffdecRecords.length,
        },
        xmlDocuments: { exact: 2, localizationCatalogs: 0, runtimeConsumers: 0 },
      },
      validation: {
        pinnedGitBlobBytes: "pass including LF-canonical XML rather than CRLF checkout bytes",
        ffprobeAllUniqueFlvBlobs: "pass",
        losslessMp3TagExtraction: "pass",
        deterministicAacAndAdpcmVorbis: "pass",
        deterministicMultimediaConversion: "pass",
        ffdecSymbolAndSampleMetadata: "pass",
        browserXmlParseContract: "pass-package; runtime parser required in R047",
        githubActionsUsedOrInspected: false,
      },
    };
    await writeStageJson(evidencePath, evidence);

    await mkdir(dirname(packageRoot), { recursive: true });
    await rename(stagePackageRoot, packageRoot);
    for (const path of [contractPath, statusPath, evidencePath]) {
      await mkdir(dirname(native(path)), { recursive: true });
      await rename(stageNative(path), native(path));
    }
  } finally {
    if (stageRoot.startsWith(`${root}${sep}.p047-stage-`)) {
      await rm(stageRoot, { recursive: true, force: true });
    }
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function verifyPackage() {
  const pinned = assertSourcePin();
  const ffprobe = resolveExecutable("P047_FFPROBE", "ffprobe");
  await checkedTool(ffprobe, expectedTools.ffprobe, "ffprobe");
  const manifest = JSON.parse(await readFile(native(`${packagePrefix}/manifest.json`), "utf8"));
  const contract = JSON.parse(await readFile(native(contractPath), "utf8"));
  const evidence = JSON.parse(await readFile(native(evidencePath), "utf8"));
  const status = JSON.parse(await readFile(native(statusPath), "utf8"));
  if (manifest.packageSessionId !== "P047" || manifest.runtimeSessionId !== "R047") fail("session identity mismatch");
  if (manifest.source?.commit !== sourceCommit || manifest.source?.tree !== sourceTree) fail("raw source pin changed");
  if (manifest.trackAEvidence?.dispatchSha256 !== dependency.dispatchSha256) fail("R035 dispatch digest mismatch");
  if (contract.consumers?.failClosed !== true || contract.assetAddressing?.mutableBranchAllowed !== false) fail("contract must fail closed and forbid mutable publication");
  if (status.status !== "complete-package" || status.runtimeIntegration !== false) fail("status boundary mismatch");
  if (evidence.validation?.githubActionsUsedOrInspected !== false) fail("GitHub Actions boundary changed");
  if (!sameJson(status.summary, manifest.summary) || !sameJson(evidence.summary, manifest.summary)) fail("manifest/status/evidence summaries diverge");
  for (const output of evidence.outputs ?? []) {
    const bytes = canonicalAuditBytes(output.path, await readFile(native(output.path)));
    if (bytes.length !== output.bytes || sha256(bytes) !== output.sha256) fail(`${output.path} evidence digest mismatch`);
  }

  const groups = [];
  for (const shard of manifest.catalogs.filter((entry) => /audio-assets-\d+\.json$/u.test(entry.path))) {
    const bytes = canonicalAuditBytes(shard.path, await readFile(native(shard.path)));
    if (sha256(bytes) !== shard.sha256) fail(`${shard.path} digest mismatch`);
    const parsed = JSON.parse(bytes.toString("utf8"));
    groups.push(...parsed.groups);
  }
  if (groups.length !== 202) fail(`expected 202 unique FLV groups, found ${groups.length}`);
  const sourcePaths = groups.flatMap((group) => group.sourcePaths);
  if (sourcePaths.length !== 222 || new Set(sourcePaths).size !== 222) fail("FLV source path census mismatch");
  for (const entry of manifest.catalogs.filter((candidate) => !/audio-assets-\d+\.json$/u.test(candidate.path))) {
    const bytes = canonicalAuditBytes(entry.path, await readFile(native(entry.path)));
    if (sha256(bytes) !== entry.sha256) fail(`${entry.path} digest mismatch`);
  }

  const outputRecords = new Map();
  const acceptOutput = async (record, expectedProbe = null) => {
    const bytes = await readFile(native(record.path));
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) fail(`${record.path} identity mismatch`);
    if (!record.path.includes(`/${record.sha256}.`)) fail(`${record.path} is not content-addressed`);
    if (expectedProbe) {
      const actualProbe = probeFile(ffprobe, native(record.path));
      if (!sameJson(actualProbe, expectedProbe)) fail(`${record.path} ffprobe inventory drift`);
    }
    outputRecords.set(record.path, { path: record.path, sha256: record.sha256, bytes: record.bytes });
    return bytes;
  };
  let mp3Groups = 0;
  let aacGroups = 0;
  let multimediaGroups = 0;
  for (const group of groups) {
    const row = pinned.find((entry) => entry.path === group.sourcePaths[0]);
    if (!row || row.blob !== group.sourceBlobSha1) fail(`${group.sourcePaths[0]} source row mismatch`);
    const source = await canonicalSourceBytes(row);
    if (source.length !== group.sourceBytes || sha256(source) !== group.sourceSha256) fail(`${row.path} source digest mismatch`);
    const sourceProbe = probeFile(ffprobe, native(row.path));
    if (!sameJson(sourceProbe, group.sourceProbe)) fail(`${row.path} source codec inventory drift`);
    const codec = probeAudio(sourceProbe)[0]?.codec;
    const browserAudio = await acceptOutput(group.browserAudio, group.browserAudio.probe);
    if (codec === "mp3") {
      mp3Groups += 1;
      if (!browserAudio.equals(extractMp3FromFlv(source))) fail(`${row.path} MP3 extraction is not lossless`);
      if (group.browserAudio.conversion !== "lossless-flv-mp3-tag-extraction") fail(`${row.path} MP3 conversion label mismatch`);
    } else if (codec === "aac") {
      aacGroups += 1;
      if (browserAudio.subarray(0, 4).toString("ascii") !== "OggS") fail(`${row.path} AAC derivative is not Ogg`);
      if (group.browserAudio.probe.streams[0]?.codec !== "vorbis") fail(`${row.path} AAC derivative is not Vorbis`);
    } else {
      fail(`${row.path} unexpected codec ${codec}`);
    }
    if (group.browserVideo) {
      multimediaGroups += 1;
      await acceptOutput(group.browserVideo, group.browserVideo.probe);
      const streams = group.browserVideo.probe.streams;
      if (!streams.some((stream) => stream.type === "video" && stream.codec === "h264")) fail(`${row.path} video derivative is not H.264`);
      if (!streams.some((stream) => stream.type === "audio" && stream.codec === "aac")) fail(`${row.path} video derivative audio is not AAC`);
      if (group.browserVideo.consumerClassification !== "unresolved") fail(`${row.path} video consumer was guessed`);
    }
  }
  if (mp3Groups !== 200 || aacGroups !== 2 || multimediaGroups !== 4) fail("FLV codec census mismatch");

  const embedded = JSON.parse(await readFile(native(`${packagePrefix}/embedded-swf-audio.json`), "utf8"));
  if (embedded.records.length !== 2) fail("embedded SWF audio census mismatch");
  for (const record of embedded.records) {
    const row = pinned.find((entry) => entry.path === record.sourcePath);
    const source = await canonicalSourceBytes(row);
    if (gitBlobSha1(source) !== record.sourceBlobSha1 || sha256(source) !== record.sourceSha256) fail(`${record.sourcePath} SWF source mismatch`);
    await acceptOutput(record.browserAudio, record.browserAudio.probe);
    if (record.consumerClassification !== "unresolved") fail(`${record.sourcePath} consumer was guessed`);
  }

  const documents = JSON.parse(await readFile(native(`${packagePrefix}/documents.json`), "utf8"));
  if (documents.documents.length !== 2 || documents.localizationCatalogs !== 0) fail("XML document census mismatch");
  for (const record of documents.documents) {
    const row = pinned.find((entry) => entry.path === record.sourcePath);
    const canonical = await canonicalSourceBytes(row);
    const output = await acceptOutput(record.browserDocument);
    if (!canonical.equals(output)) fail(`${record.sourcePath} is not the canonical pinned Git blob`);
    new TextDecoder("utf-8", { fatal: true }).decode(output);
  }
  const support = JSON.parse(await readFile(native(`${packagePrefix}/support-assets.json`), "utf8"));
  if (support.authoring.length !== 2 || support.launcherPayload.consumerClassification !== "unresolved-legacy-launcher-only") fail("support asset boundary mismatch");
  if (support.launcherPayload.browserRuntimeAllowed !== false || support.launcherPayload.detectedFormat !== "adobe-air-installer-zip") fail("legacy launcher was misclassified as browser media");
  const launcher = await acceptOutput(support.launcherPayload.publishedSupportObject);
  if (launcher.subarray(0, 4).toString("hex") !== "504b0304") fail("launcher support object is not ZIP/AIR");

  const events = JSON.parse(await readFile(native(`${packagePrefix}/events.json`), "utf8"));
  if (events.summary.exact !== 9 || events.summary.inferred !== 2 || events.summary.unresolved !== 211) fail("event mapping census mismatch");
  if (events.embeddedEvents.some((event) => event.consumerClassification !== "unresolved")) fail("embedded event consumer was guessed");
  const unresolved = events.summary.unresolved + events.embeddedEvents.length;
  if (manifest.summary.unresolvedConsumerMappings !== unresolved || contract.consumers.unresolved !== unresolved) fail("unresolved consumer totals mismatch");

  const binaryRecords = [...outputRecords.values()].sort((left, right) => left.path.localeCompare(right.path));
  const aggregate = sha256(Buffer.from(binaryRecords.map((record) => `${record.path}\0${record.sha256}\0${record.bytes}\n`).join(""), "utf8"));
  const totalBytes = binaryRecords.reduce((sum, record) => sum + record.bytes, 0);
  if (binaryRecords.length !== manifest.binaryOutputs.count || totalBytes !== manifest.binaryOutputs.bytes || aggregate !== manifest.binaryOutputs.aggregateSha256) {
    fail("binary output aggregate mismatch");
  }
  const forbidden = (await walk(packageRoot, ".flv")).length
    + (await walk(packageRoot, ".swf")).length
    + (await walk(packageRoot, ".fla")).length;
  if (forbidden !== 0) fail("legacy runtime containers leaked into browser package");

  if (deepMode) await deepVerifyEmbedded(embedded.records);
  console.log(JSON.stringify({
    status: "pass",
    packageSessionId: "P047",
    sourceFiles: 229,
    flvFiles: 222,
    uniqueFlvBlobs: 202,
    mp3LosslessGroups: mp3Groups,
    aacVorbisGroups: aacGroups,
    multimediaVideoOutputs: multimediaGroups,
    embeddedSwfAudioOutputs: 2,
    xmlDocuments: 2,
    localizationCatalogs: 0,
    binaryOutputs: binaryRecords.length,
    binaryBytes: totalBytes,
    exactConsumers: events.summary.exact,
    inferredConsumers: events.summary.inferred,
    unresolvedConsumers: unresolved,
    runtimeIntegration: false,
    deepFfdec: deepMode,
    githubActions: false,
  }, null, 2));
}

async function deepVerifyEmbedded(records) {
  const ffmpeg = resolveExecutable("P047_FFMPEG", "ffmpeg");
  const ffdec = resolve(process.env.P047_FFDEC_JAR || "");
  const java = resolveExecutable("P047_JAVA", "java");
  if (!process.env.P047_FFDEC_JAR || !await exists(ffdec)) fail("P047_FFDEC_JAR is required for --deep");
  await checkedTool(ffmpeg, expectedTools.ffmpeg, "FFmpeg");
  await checkedTool(ffdec, expectedTools.ffdec, "FFDec");
  const temporary = await mkdtemp(resolve(root, ".p047-deep-"));
  try {
    for (const record of records) {
      const source = pinnedBlob(record.sourcePath);
      const id = record.eventName;
      const swf = resolve(temporary, `sound${id}.swf`);
      const out = resolve(temporary, `sound${id}`);
      const xml = resolve(temporary, `sound${id}.xml`);
      await writeFile(swf, source);
      await mkdir(out, { recursive: true });
      run(java, ["-Djava.awt.headless=true", "-jar", ffdec, "-export", "sound", out, swf], { label: `deep FFDec Sound${id}` });
      run(java, ["-Djava.awt.headless=true", "-jar", ffdec, "-swf2xml", swf, xml], { label: `deep FFDec XML Sound${id}` });
      const metadata = parseFfdecSoundXml(await readFile(xml, "utf8"), `Sound${id}`);
      if (!sameJson(metadata, record.metadata)) fail(`Sound${id} FFDec metadata drift`);
      const intermediate = resolve(out, id === "201" ? "1_Sound201.flv" : "1_Sound202.mp3");
      const intermediateBytes = await readFile(intermediate);
      if (sha256(intermediateBytes) !== record.ffdecIntermediate.sha256 || intermediateBytes.length !== record.ffdecIntermediate.bytes) fail(`Sound${id} FFDec export drift`);
      if (id === "201") {
        const converted = resolve(temporary, "Sound201-deep.ogg");
        run(ffmpeg, [
          "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
          "-i", intermediate,
          "-map_metadata", "-1", "-vn", "-af", `atrim=end_sample=${metadata.sampleCount}`,
          "-c:a", "libvorbis", "-q:a", "4",
          "-fflags", "+bitexact", "-flags:a", "+bitexact",
          converted,
        ], { label: "deep Sound201 conversion" });
        if (sha256(await readFile(converted)) !== record.browserAudio.sha256) fail("Sound201 deterministic derivative drift");
      } else if (!intermediateBytes.equals(await readFile(native(record.browserAudio.path)))) {
        fail("Sound202 lossless derivative drift");
      }
    }
  } finally {
    if (temporary.startsWith(`${root}${sep}.p047-deep-`)) await rm(temporary, { recursive: true, force: true });
  }
}

if (writeMode) await buildPackage();
await verifyPackage();
