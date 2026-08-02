const ALLOWED_PROFILES = new Set(["images", "full-resource"]);
const GATEWAY_CONTRACT = "ddtank-r2-gateway-v1";
const SAFE_PROFILE = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const ENCODED_PATH_ESCAPE = /%(?:00|2e|2f|5c)/iu;
const UNSAFE_PATH_CHARACTERS = /[\u0000-\u001f\u007f\\?#]/u;
const MAX_OBJECT_KEY_LENGTH = 2048;
const DEFAULT_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PUBLIC_ROOTS = new Set([
  "exports", "flash", "image", "partical", "sound", "video", "weekly", "xml",
  "screens", "pets", "effects", "public",
]);

const IMMUTABLE_FALLBACKS = Object.freeze([
  Object.freeze({
    repository: "trinhtanphat/Resource",
    releaseRef: "7dc16b70b4b868d6be709cca7d400def67f6d4b6",
    prefixes: Object.freeze(["screens/", "pets/", "effects/"]),
  }),
  Object.freeze({
    repository: "trinhtanphat/Resource",
    releaseRef: "7ca3ac34dd14022318ebf4785f419d11545dc038",
    prefixes: Object.freeze(["image/equip/", "image/arm/"]),
  }),
  Object.freeze({
    repository: "trinhtanphat/Resource",
    releaseRef: "3c05990a88d66ab3364a00b7e4cf71201f528cf4",
    prefixes: Object.freeze(["exports/resource-port/common-ui/"]),
  }),
  Object.freeze({
    repository: "trinhtanphat/Gunny",
    releaseRef: "669ddf6b462f79d16afbb020f6a5a3285685c987",
    prefixes: Object.freeze(["public/game-ui/audio/"]),
  }),
  Object.freeze({
    repository: "trinhtanphat/Gunny",
    releaseRef: "f2e1ff59b22f50935d3f70c0f42b608a8239432b",
    prefixes: Object.freeze([
      "public/game-ui/npc/", "public/game-ui/items/", "public/game-ui/weapons/", "public/game-ui/avatar/",
    ]),
  }),
]);

function jsonResponse(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-ddtank-resource-contract": GATEWAY_CONTRACT,
      ...headers,
    },
  });
}

function corsHeaders(headers = new Headers()) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", [
    "Accept-Ranges", "Content-Length", "Content-Range", "Content-Type", "ETag", "Last-Modified",
    "X-DDTank-Resource-Contract", "X-DDTank-Resource-Delivery", "X-DDTank-Resource-Key",
    "X-DDTank-Resource-Revision", "X-DDTank-Resource-Sha256",
  ].join(", "));
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  headers.set("Timing-Allow-Origin", "*");
  return headers;
}

function normalizeObjectKey(value) {
  if (
    typeof value !== "string" || value.length === 0 || value.length > MAX_OBJECT_KEY_LENGTH
    || value.startsWith("/") || value.endsWith("/")
    || ENCODED_PATH_ESCAPE.test(value) || UNSAFE_PATH_CHARACTERS.test(value)
  ) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(value).normalize("NFC");
  } catch {
    return null;
  }
  if (decoded.length === 0 || decoded.length > MAX_OBJECT_KEY_LENGTH || UNSAFE_PATH_CHARACTERS.test(decoded)) return null;
  const segments = decoded.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  if (!PUBLIC_ROOTS.has(segments[0])) return null;
  return decoded;
}

function fallbackForKey(key) {
  return IMMUTABLE_FALLBACKS.find((candidate) => candidate.prefixes.some((prefix) => key.startsWith(prefix))) ?? null;
}

function aliasMatchesFallback(repository, releaseRef, key) {
  const fallback = fallbackForKey(key);
  return fallback?.repository === repository && fallback.releaseRef === releaseRef;
}

function resolveRequestTarget(pathname) {
  const rawPath = pathname.replace(/^\/+|\/+$/gu, "");
  if (!rawPath || rawPath === "health") return Object.freeze({ kind: "health" });
  const manifestMatch = /^manifests\/([a-z0-9][a-z0-9-]{0,63})$/u.exec(rawPath);
  if (manifestMatch) {
    const profile = manifestMatch[1];
    return ALLOWED_PROFILES.has(profile)
      ? Object.freeze({ kind: "manifest", profile })
      : Object.freeze({ kind: "invalid", status: 404, error: "unknown profile" });
  }
  if (rawPath.startsWith("objects/")) {
    const key = normalizeObjectKey(rawPath.slice("objects/".length));
    return key
      ? Object.freeze({ kind: "object", key, alias: "canonical" })
      : Object.freeze({ kind: "invalid", status: 400, error: "invalid object key" });
  }
  const ghMatch = /^gh\/([^/]+)\/([^/@]+)@([0-9a-f]{40})\/(.+)$/u.exec(rawPath);
  if (ghMatch) {
    const repository = `${ghMatch[1]}/${ghMatch[2]}`;
    const releaseRef = ghMatch[3];
    const key = normalizeObjectKey(ghMatch[4]);
    return key && aliasMatchesFallback(repository, releaseRef, key)
      ? Object.freeze({ kind: "object", key, alias: "legacy-gh", repository, releaseRef })
      : Object.freeze({ kind: "invalid", status: 404, error: "unknown immutable alias" });
  }
  const repositoryMatch = /^([^/]+)\/([^/]+)\/([0-9a-f]{40})\/(.+)$/u.exec(rawPath);
  if (repositoryMatch) {
    const repository = `${repositoryMatch[1]}/${repositoryMatch[2]}`;
    const releaseRef = repositoryMatch[3];
    const key = normalizeObjectKey(repositoryMatch[4]);
    return key && aliasMatchesFallback(repository, releaseRef, key)
      ? Object.freeze({ kind: "object", key, alias: "legacy-repository", repository, releaseRef })
      : Object.freeze({ kind: "invalid", status: 404, error: "unknown immutable alias" });
  }
  const key = normalizeObjectKey(rawPath);
  return key
    ? Object.freeze({ kind: "object", key, alias: "direct" })
    : Object.freeze({ kind: "invalid", status: 404, error: "route not found" });
}

function manifestKey(env, profile) {
  const prefix = String(env.R2_MANIFEST_PREFIX ?? "_deployment/manifests").replace(/^\/+|\/+$/gu, "");
  return `${prefix}/${profile}.json.gz`;
}

function metadataHeaders(object, key, delivery, cacheControl) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Last-Modified", object.uploaded.toUTCString());
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", headers.get("cache-control") || cacheControl);
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-DDTank-Resource-Contract", GATEWAY_CONTRACT);
  headers.set("X-DDTank-Resource-Delivery", delivery);
  headers.set("X-DDTank-Resource-Key", key);
  const revision = object.customMetadata?.sourcecommit?.trim().toLowerCase() ?? "";
  const sha256 = object.customMetadata?.sha256?.trim().toLowerCase() ?? "";
  if (/^[0-9a-f]{7,64}$/u.test(revision)) headers.set("X-DDTank-Resource-Revision", revision);
  if (/^[0-9a-f]{64}$/u.test(sha256)) headers.set("X-DDTank-Resource-Sha256", sha256);
  return corsHeaders(headers);
}

function conditionalStatus(request) {
  return request.headers.has("if-none-match") || request.headers.has("if-modified-since") ? 304 : 412;
}

function matchesHeadCondition(request, object) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) {
    const values = ifNoneMatch.split(",").map((value) => value.trim());
    if (values.includes("*") || values.includes(object.httpEtag) || values.includes(`W/${object.httpEtag}`)) return 304;
  }
  const ifMatch = request.headers.get("if-match");
  if (ifMatch) {
    const values = ifMatch.split(",").map((value) => value.trim());
    if (!values.includes("*") && !values.includes(object.httpEtag)) return 412;
  }
  const ifModifiedSince = Date.parse(request.headers.get("if-modified-since") ?? "");
  if (Number.isFinite(ifModifiedSince) && object.uploaded.getTime() <= ifModifiedSince) return 304;
  const ifUnmodifiedSince = Date.parse(request.headers.get("if-unmodified-since") ?? "");
  if (Number.isFinite(ifUnmodifiedSince) && object.uploaded.getTime() > ifUnmodifiedSince) return 412;
  return null;
}

function rangeHeaders(headers, object) {
  const offset = Number(object.range?.offset);
  const length = Number(object.range?.length);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(length) || length < 1) return false;
  headers.set("Content-Length", String(length));
  headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
  return true;
}

async function serveR2Object(request, env, key) {
  if (request.method === "HEAD") {
    let object;
    try { object = await env.RESOURCE_BUCKET.head(key); } catch { return null; }
    if (!object) return null;
    const headers = metadataHeaders(object, key, "r2", DEFAULT_CACHE_CONTROL);
    headers.set("Content-Length", String(object.size));
    return new Response(null, { status: matchesHeadCondition(request, object) ?? 200, headers });
  }
  let object;
  try {
    object = await env.RESOURCE_BUCKET.get(key, { onlyIf: request.headers, range: request.headers });
  } catch {
    return request.headers.has("range")
      ? new Response("Range Not Satisfiable", {
          status: 416,
          headers: corsHeaders(new Headers({
            "cache-control": "no-store",
            "x-ddtank-resource-contract": GATEWAY_CONTRACT,
          })),
        })
      : null;
  }
  if (!object) return null;
  const headers = metadataHeaders(object, key, "r2", DEFAULT_CACHE_CONTROL);
  if (!("body" in object)) return new Response(null, { status: conditionalStatus(request), headers });
  const ranged = request.headers.has("range") && rangeHeaders(headers, object);
  if (!ranged) headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: ranged ? 206 : 200, headers });
}

function encodedFallbackUrl(fallback, key) {
  const encodedPath = key.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${fallback.repository}/${fallback.releaseRef}/${encodedPath}`;
}

async function serveFallback(request, key, fetchImpl) {
  const fallback = fallbackForKey(key);
  if (!fallback) return null;
  const forwarded = new Headers({
    Accept: request.headers.get("accept") ?? "*/*",
    "User-Agent": "DDTank-R2-Gateway/2.1",
  });
  for (const name of ["if-match", "if-none-match", "if-modified-since", "if-unmodified-since", "range"]) {
    const value = request.headers.get(name);
    if (value) forwarded.set(name, value);
  }
  let upstream;
  try {
    upstream = await fetchImpl(encodedFallbackUrl(fallback, key), {
      method: request.method,
      headers: forwarded,
      redirect: "error",
      cf: { cacheEverything: true, cacheTtl: 31_536_000 },
    });
  } catch {
    return null;
  }
  if (![200, 206, 304].includes(upstream.status)) {
    upstream.body?.cancel().catch(() => undefined);
    return null;
  }
  const headers = new Headers();
  for (const name of ["accept-ranges", "content-length", "content-range", "content-type", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", IMMUTABLE_CACHE_CONTROL);
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-DDTank-Resource-Contract", GATEWAY_CONTRACT);
  headers.set("X-DDTank-Resource-Delivery", "immutable-fallback");
  headers.set("X-DDTank-Resource-Key", key);
  headers.set("X-DDTank-Resource-Revision", fallback.releaseRef);
  corsHeaders(headers);
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, headers });
}

async function serveManifest(request, env, profile) {
  const key = manifestKey(env, profile);
  const response = await serveR2Object(request, env, key);
  if (!response) return jsonResponse({ status: "not-ready", profile, manifestKey: key }, 503);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
}

async function health(request, env) {
  const requested = new URL(request.url).searchParams.get("profile") ?? "full-resource";
  const profile = SAFE_PROFILE.test(requested) && ALLOWED_PROFILES.has(requested) ? requested : null;
  if (!profile) return jsonResponse({ status: "error", error: "invalid profile" }, 400);
  const key = manifestKey(env, profile);
  let manifest = null;
  try { manifest = await env.RESOURCE_BUCKET.head(key); } catch { manifest = null; }
  const complete = manifest?.customMetadata?.complete === "1";
  const ready = manifest !== null && complete;
  return jsonResponse({
    status: ready ? "ok" : "not-ready",
    service: "ddtank-r2-deployer",
    mode: "r2-object-gateway",
    gatewayContract: GATEWAY_CONTRACT,
    bucket: "ddtank-resource",
    profile,
    manifestKey: key,
    manifestUploaded: manifest !== null,
    manifestComplete: complete,
    manifestFileCount: manifest?.customMetadata?.filecount ?? null,
    manifestSize: manifest?.size ?? null,
    manifestUploadedAt: manifest?.uploaded?.toISOString?.() ?? null,
    capabilities: ["get", "head", "conditional", "range", "immutable-fallback"],
  }, ready ? 200 : 503);
}

export function createR2Gateway({ fetchImpl = fetch } = {}) {
  return {
    async fetch(request, env) {
      if (!env?.RESOURCE_BUCKET) return jsonResponse({ status: "error", error: "RESOURCE_BUCKET binding is unavailable" }, 503);
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(new Headers({
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Accept, If-Match, If-None-Match, If-Modified-Since, If-Unmodified-Since, Range",
            "Access-Control-Max-Age": "86400",
            "X-DDTank-Resource-Contract": GATEWAY_CONTRACT,
          })),
        });
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return jsonResponse({ status: "error", error: "method not allowed" }, 405, { Allow: "GET, HEAD, OPTIONS" });
      }
      const target = resolveRequestTarget(new URL(request.url).pathname);
      if (target.kind === "invalid") return jsonResponse({ status: "error", error: target.error }, target.status);
      if (target.kind === "health") return health(request, env);
      if (target.kind === "manifest") return serveManifest(request, env, target.profile);
      const preferred = await serveR2Object(request, env, target.key);
      if (preferred) {
        const headers = new Headers(preferred.headers);
        headers.set("X-DDTank-Resource-Alias", target.alias);
        return new Response(request.method === "HEAD" ? null : preferred.body, { status: preferred.status, headers });
      }
      const fallback = await serveFallback(request, target.key, fetchImpl);
      if (fallback) {
        const headers = new Headers(fallback.headers);
        headers.set("X-DDTank-Resource-Alias", target.alias);
        return new Response(request.method === "HEAD" ? null : fallback.body, { status: fallback.status, headers });
      }
      return jsonResponse({ status: "not-found", key: target.key }, 404);
    },
  };
}

export const __R2_GATEWAY_TESTING__ = Object.freeze({
  fallbackForKey,
  gatewayContract: GATEWAY_CONTRACT,
  normalizeObjectKey,
  resolveRequestTarget,
});

export default createR2Gateway();
