const allowedProfiles = new Set(["images", "full-resource"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const profile = url.searchParams.get("profile") ?? "images";
    if (!allowedProfiles.has(profile)) {
      return Response.json({ status: "error", error: "invalid profile" }, { status: 400 });
    }
    const prefix = String(env.R2_MANIFEST_PREFIX ?? "_deployment/manifests").replace(/^\/+|\/+$/gu, "");
    const manifestKey = `${prefix}/${profile}.json.gz`;
    const manifest = await env.RESOURCE_BUCKET.head(manifestKey);
    const complete = manifest?.customMetadata?.complete === "1";
    const ready = manifest !== null && complete;
    return Response.json({
      status: ready ? "ok" : "not-ready",
      service: "ddtank-r2-deployer",
      bucket: "ddtank-resource",
      profile,
      manifestKey,
      manifestUploaded: manifest !== null,
      manifestComplete: complete,
      manifestFileCount: manifest?.customMetadata?.filecount ?? null,
      manifestSize: manifest?.size ?? null,
      manifestUploadedAt: manifest?.uploaded?.toISOString?.() ?? null
    }, {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" }
    });
  }
};
