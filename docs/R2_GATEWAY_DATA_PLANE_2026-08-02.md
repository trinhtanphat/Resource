# Cloudflare R2 gateway data plane — 2026-08-02

## Purpose

`ddtank-r2-deployer` is the cross-account Resource data plane for Gunny. The Worker is bound to `RESOURCE_BUCKET -> ddtank-resource` in the Resource Cloudflare account. Gunny uses HTTPS because its Worker is deployed from another account.

## Stable contract versus object provenance

Every gateway response carries:

```text
X-DDTank-Resource-Contract: ddtank-r2-gateway-v1
```

This stable contract identifies the response schema and validation behavior. It is intentionally separate from:

```text
X-DDTank-Resource-Revision: <object source commit>
```

The object revision may differ between keys and may advance after any Resource publication. Consumers must validate the stable contract and record the object revision as provenance; they must not require every R2 object to keep the first deployment commit forever.

## Routes

- `GET|HEAD /objects/<canonical-key>` — object delivery;
- `GET|HEAD /manifests/<profile>` — compressed deployment manifest;
- `GET|HEAD /health` and `/` — readiness and capability report;
- `OPTIONS` — restricted CORS preflight.

The gateway also accepts legacy immutable repository aliases only when repository, 40-character commit and key prefix match a reviewed fallback. They exist for compatibility and rollback, not for new consumers.

## Security and correctness

The gateway:

- allows only reviewed top-level Resource roots;
- normalizes keys to UTF-8 NFC;
- rejects traversal, encoded separators, backslashes, control characters, empty segments and query/hash injection;
- supports ETag conditions, HEAD and byte ranges;
- streams object bodies from R2;
- emits stable contract, canonical key, delivery, object revision and SHA-256 metadata;
- never exposes R2 credentials;
- uses immutable fallback only for reviewed browser-ready prefixes;
- includes exact SHOW fallback only for `image/equip/` and `image/arm/`;
- does not become a generic GitHub proxy.

Preferred responses contain:

```text
X-DDTank-Resource-Contract: ddtank-r2-gateway-v1
X-DDTank-Resource-Delivery: r2
X-DDTank-Resource-Key: <canonical key>
X-DDTank-Resource-Revision: <object source commit>
```

Fallback responses retain the same contract, use `X-DDTank-Resource-Delivery: immutable-fallback`, and expose the reviewed fallback revision.

## Deployment gate

`npm run cloudflare:deploy:r2` runs:

1. `npm run r2:validate`;
2. full-resource materialization/upload and manifest verification;
3. `wrangler deploy` for the gateway.

`r2:validate` executes configuration validation plus `scripts/r2-gateway-self-test.mjs`. The self-test covers stable contract identity, changing object provenance, health, canonical GET, legacy aliases, SHOW fallback, conditional GET, Range/206, traversal rejection, unknown roots, method rejection and CORS.

GitHub Actions are intentionally not used. Cloudflare Workers Builds remains the production deployment path.

## Browser-conversion boundary

The full R2 profile includes raw Resource roots and selected browser-ready runtime exports. A raw SWF or ActionScript file in R2 is storage evidence, not browser-native behavior. Gunny runtime adoption and visual/behavior parity remain separate evidence.
