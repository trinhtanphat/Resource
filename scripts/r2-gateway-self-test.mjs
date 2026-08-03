#!/usr/bin/env node
import { createR2Gateway, __R2_GATEWAY_TESTING__ } from "../src/r2-deployer-worker.mjs";

const encoder = new TextEncoder();
const CONTRACT = "ddtank-r2-gateway-v1";
const SCREEN_REF = "7dc16b70b4b868d6be709cca7d400def67f6d4b6";
const SHOW_REF = "7ca3ac34dd14022318ebf4785f419d11545dc038";
const R033_REF = "3c35db1200d5f52ac37e7c5f8fc7afdf58ebea4a";
const P045_REF = "2c85526303c15dbff0585c5976823aef7c9da33d";
const R033_KEY = "resource-port-assets/hall-room-world/r033/manifest.json";
const bytesByKey = new Map([
  ["screens/Login/bg.png", encoder.encode("PNGDATA")],
  ["image/equip/1/show.png", encoder.encode("SHOW")],
  [R033_KEY, encoder.encode("R033-MANIFEST")],
  ["_deployment/manifests/full-resource.json.gz", encoder.encode("MANIFEST")],
]);
const calls = [];

function metadata(key, bytes, range = null, body = true) {
  const etag = `\"etag-${key.replaceAll("/", "-")}\"`;
  const object = {
    key,
    size: bytes.byteLength,
    httpEtag: etag,
    uploaded: new Date("2026-08-02T00:00:00.000Z"),
    customMetadata: key.startsWith("_deployment/")
      ? { sourcecommit: "c5049bc212b9e41f3ca3b77f88212f744241fb2c", complete: "1", filecount: "3" }
      : {
          sourcecommit: key.startsWith("resource-port-assets/")
            ? R033_REF
            : key.startsWith("image/")
              ? "f".repeat(40)
              : "0cd1dd48f1a05ab876111f629492b2fcf98122f0",
          sha256: "a".repeat(64),
        },
    range,
    writeHttpMetadata(headers) {
      headers.set("content-type", key.endsWith(".png") ? "image/png" : "application/json");
      if (key.startsWith("_deployment/")) headers.set("content-encoding", "gzip");
    },
  };
  if (body) object.body = new Response(bytes).body;
  return object;
}

const bucket = {
  async head(key) {
    calls.push({ method: "head", key });
    const bytes = bytesByKey.get(key);
    return bytes ? metadata(key, bytes, null, false) : null;
  },
  async get(key, options = {}) {
    calls.push({ method: "get", key, headers: Object.fromEntries(options.onlyIf ?? []) });
    const bytes = bytesByKey.get(key);
    if (!bytes) return null;
    const etag = `\"etag-${key.replaceAll("/", "-")}\"`;
    if (options.onlyIf?.get?.("if-none-match") === etag) return null;
    const range = options.range?.get?.("range");
    if (range === "bytes=1-3") {
      const sliced = bytes.slice(1, 4);
      const result = metadata(key, bytes, { offset: 1, length: sliced.byteLength }, true);
      result.body = new Response(sliced).body;
      return result;
    }
    return metadata(key, bytes);
  },
};

const fallbackCalls = [];
const gateway = createR2Gateway({
  async fetchImpl(url, init) {
    fallbackCalls.push({ url: String(url), init });
    return new Response("FALLBACK", {
      status: 200,
      headers: {
        "content-type": "image/png",
        etag: '"fallback"',
        "content-length": "8",
      },
    });
  },
});
const env = { RESOURCE_BUCKET: bucket, R2_MANIFEST_PREFIX: "_deployment/manifests" };

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  return gateway.fetch(new Request(`https://gateway.example${path}`, init), env);
}

let response = await request("/health");
assert(response.status === 200, "health must be ready");
const health = await response.json();
assert(health.mode === "r2-object-gateway", "health must advertise the gateway mode");
assert(health.gatewayContract === CONTRACT, "health must advertise the stable gateway contract");
assert(response.headers.get("x-ddtank-resource-contract") === CONTRACT, "health contract header missing");
assert(health.manifestComplete === true, "health must require a complete manifest");
assert(health.capabilities.includes("range"), "health must advertise range support");

response = await request("/objects/screens/Login/bg.png");
assert(response.status === 200, "canonical object GET must succeed");
assert(response.headers.get("x-ddtank-resource-contract") === CONTRACT, "object contract header missing");
assert(response.headers.get("x-ddtank-resource-delivery") === "r2", "canonical object must prefer R2");
assert(response.headers.get("x-ddtank-resource-key") === "screens/Login/bg.png", "canonical key header missing");
assert(response.headers.get("x-ddtank-resource-alias") === "canonical", "canonical alias evidence missing");
assert(await response.text() === "PNGDATA", "canonical object body mismatch");

response = await request(`/trinhtanphat/Resource/${SCREEN_REF}/screens/Login/bg.png`);
assert(response.status === 200, "legacy repository alias must resolve");
assert(response.headers.get("x-ddtank-resource-alias") === "legacy-repository", "legacy repository alias evidence missing");

response = await request(`/gh/trinhtanphat/Resource@${SCREEN_REF}/screens/Login/bg.png`);
assert(response.status === 200, "legacy gh alias must resolve");
assert(response.headers.get("x-ddtank-resource-alias") === "legacy-gh", "legacy gh alias evidence missing");

response = await request("/image/equip/1/show.png");
assert(response.status === 200, "direct catalog key must resolve");
assert(response.headers.get("x-ddtank-resource-alias") === "direct", "direct alias evidence missing");
assert(response.headers.get("x-ddtank-resource-revision") === "f".repeat(40), "object provenance may advance independently");
assert(response.headers.get("x-ddtank-resource-contract") === CONTRACT, "advanced object revision must retain contract");

response = await request(`/objects/${R033_KEY}`);
assert(response.status === 200, "R033 manifest GET must succeed");
assert(response.headers.get("x-ddtank-resource-delivery") === "r2", "R033 manifest must prefer R2");
assert(response.headers.get("x-ddtank-resource-key") === R033_KEY, "R033 manifest key header missing");
assert(response.headers.get("x-ddtank-resource-revision") === R033_REF, "R033 manifest revision must match the immutable payload commit");
assert(await response.text() === "R033-MANIFEST", "R033 manifest body mismatch");

response = await request(`/objects/${R033_KEY}`, { method: "HEAD" });
assert(response.status === 200, "R033 manifest HEAD must succeed");
assert(response.headers.get("x-ddtank-resource-delivery") === "r2", "R033 HEAD must prefer R2");
assert(response.headers.get("content-length") === String(bytesByKey.get(R033_KEY).byteLength), "R033 HEAD length mismatch");
assert(await response.text() === "", "R033 HEAD must not return a body");

const conditionalCallStart = calls.length;
response = await request("/objects/screens/Login/bg.png", {
  headers: { "If-None-Match": '"etag-screens-Login-bg.png"' },
});
assert(response.status === 304, "conditional GET must return 304");
const conditionalCalls = calls.slice(conditionalCallStart);
assert(conditionalCalls.some((entry) => entry.method === "head"), "R2 conditional GET must use HEAD preflight");
assert(!conditionalCalls.some((entry) => entry.method === "get"), "R2 conditional 304 must not fall through to GET");

response = await request("/objects/screens/Login/bg.png", {
  headers: { Range: "bytes=1-3" },
});
assert(response.status === 206, "range GET must return 206");
assert(response.headers.get("content-range") === "bytes 1-3/7", "range content header mismatch");
assert(await response.text() === "NGD", "range body mismatch");

response = await request("/objects/screens/Missing.png");
assert(response.status === 200, "known missing R2 key must use immutable fallback");
assert(response.headers.get("x-ddtank-resource-contract") === CONTRACT, "fallback contract header missing");
assert(response.headers.get("x-ddtank-resource-delivery") === "immutable-fallback", "fallback delivery evidence missing");
assert(fallbackCalls[0].url.includes(`/trinhtanphat/Resource/${SCREEN_REF}/screens/Missing.png`), "screen fallback URL must remain immutable");

response = await request("/objects/image/equip/m/head/missing/show.png");
assert(response.status === 200, "missing SHOW key must use reviewed immutable fallback");
assert(fallbackCalls[1].url.includes(`/trinhtanphat/Resource/${SHOW_REF}/image/equip/m/head/missing/show.png`), "SHOW fallback URL must remain immutable");

response = await request("/objects/resource-port-assets/hall-room-world/r033/raster/missing.png");
assert(response.status === 200, "missing R033 key must use reviewed immutable fallback");
assert(response.headers.get("x-ddtank-resource-delivery") === "immutable-fallback", "R033 fallback delivery evidence missing");
assert(fallbackCalls[2].url.includes(`/trinhtanphat/Resource/${R033_REF}/resource-port-assets/hall-room-world/r033/raster/missing.png`), "R033 fallback URL must remain immutable");

response = await request("/objects/exports/resource-port/hall-room-world/media/svg/missing.svg");
assert(response.status === 200, "missing P045 key must use reviewed immutable fallback");
assert(response.headers.get("x-ddtank-resource-delivery") === "immutable-fallback", "P045 fallback delivery evidence missing");
assert(fallbackCalls[3].url.includes(`/trinhtanphat/Resource/${P045_REF}/exports/resource-port/hall-room-world/media/svg/missing.svg`), "P045 fallback URL must remain immutable");

response = await request("/objects/%252e%252e/screens/Login/bg.png");
assert(response.status === 400, "encoded traversal must be rejected");
response = await request("/objects/unknown/file.png");
assert(response.status === 400, "unknown object root must be rejected");
response = await request(`/gh/trinhtanphat/Resource@${"1".repeat(40)}/screens/Login/bg.png`);
assert(response.status === 404, "unreviewed immutable alias must be rejected");
response = await request("/objects/screens/Login/bg.png", { method: "POST" });
assert(response.status === 405, "mutating methods must be rejected");
response = await request("/objects/screens/Login/bg.png", { method: "OPTIONS" });
assert(response.status === 204, "CORS preflight must succeed");
assert(response.headers.get("x-ddtank-resource-contract") === CONTRACT, "preflight contract header missing");

assert(__R2_GATEWAY_TESTING__.gatewayContract === CONTRACT, "exported gateway contract drift");
assert(__R2_GATEWAY_TESTING__.normalizeObjectKey("screens/Login/bg.png") === "screens/Login/bg.png", "safe key normalization failed");
assert(__R2_GATEWAY_TESTING__.normalizeObjectKey(R033_KEY) === R033_KEY, "R033 root normalization failed");
assert(__R2_GATEWAY_TESTING__.normalizeObjectKey("screens/../bg.png") === null, "unsafe key normalization accepted traversal");
assert(calls.some((entry) => entry.method === "get" && entry.key === "screens/Login/bg.png"), "R2 key was not read");

console.log(JSON.stringify({
  status: "ok",
  assertions: 58,
  gatewayContract: CONTRACT,
  r2Calls: calls.length,
  fallbackCalls: fallbackCalls.length,
}, null, 2));
