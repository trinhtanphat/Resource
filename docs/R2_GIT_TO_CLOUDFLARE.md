# GitHub to Cloudflare R2 through Workers Builds

This repository supports the following production flow without GitHub Actions:

```text
push to trinhtanphat/Resource main
  -> Cloudflare Workers Builds clones the repository
  -> the Node.js S3 uploader compares local SHA-256 hashes with the R2 manifest
  -> only new or changed objects are uploaded to ddtank-resource
  -> the manifest is verified and committed to R2
  -> ddtank-r2-deployer is deployed as a health endpoint
```

## Cloudflare resources

- Account: `trinhtanphat3333`
- Account ID: `291f5d12e63427644f59ac4a1d8f9664`
- R2 bucket: `ddtank-resource`
- Workers Builds project: `ddtank-r2-deployer`
- Production branch: `main`
- Default profile: `images`

`cloudflare-r2-builds.json` is the canonical dashboard configuration. Cloudflare does not import that file automatically, so the dashboard must be configured once with the matching values below.

## One-time dashboard configuration

Create the R2 bucket if it does not already exist:

```text
R2 Object Storage -> Create bucket -> ddtank-resource
```

Create an R2 API token restricted to Object Read & Write for `ddtank-resource`. Copy its Access Key ID and Secret Access Key once.

Create or open the Worker named `ddtank-r2-deployer`, connect GitHub repository `trinhtanphat/Resource`, and configure:

```text
Production branch: main
Root directory: /
Build command: npm install --ignore-scripts --no-audit --no-fund
Deploy command: npm run cloudflare:deploy:r2
Preview builds: disabled
```

Add encrypted build secrets:

```text
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

Add ordinary environment variables:

```text
R2_PROFILE=images
R2_UPLOAD_CONCURRENCY=48
R2_HASH_CONCURRENCY=8
R2_CHECKPOINT_EVERY_FILES=5000
R2_VERIFY_SAMPLE_SIZE=256
```

Do not commit either R2 credential to Git.

## Build watch paths

Use the include paths listed in `cloudflare-r2-builds.json`. At minimum they include the selected resource roots and the R2 deployment scripts/configuration. This prevents documentation-only commits from starting a large asset scan.

## Incremental behavior

The uploader stores a compressed manifest at:

```text
_deployment/manifests/images.json.gz
```

Each entry records object path, size, SHA-256, and content type. On later builds, an object is uploaded only when one of those values changes.

Remote-only objects are detected but are not deleted. Deletion requires the explicit environment variable:

```text
R2_ALLOW_DELETE=1
```

Leave it unset for normal production builds.

## Bootstrap and 20-minute build limit

The first deployment can contain more than 100,000 objects. Workers Builds has a maximum duration of 20 minutes, so the uploader writes an incomplete checkpoint every 5,000 successfully uploaded files.

If a bootstrap build times out, retry the build. The next run reads the incomplete manifest and skips the files already recorded in the checkpoint. It continues until the final manifest is marked complete.

The deployment health Worker returns `503 not-ready` while the manifest is incomplete and `200 ok` only after the final complete manifest exists.

## Health check

After the deployer Worker is live:

```text
https://ddtank-r2-deployer.ddtank.workers.dev/
```

Expected complete response:

```json
{
  "status": "ok",
  "service": "ddtank-r2-deployer",
  "bucket": "ddtank-resource",
  "profile": "images",
  "manifestComplete": true
}
```

A `503` response means the bootstrap is not finished or the manifest has not been created.

## Public asset domain

The bucket remains private until public access is configured. For production, connect a custom domain to `ddtank-resource`, then add the build variable:

```text
R2_PUBLIC_BASE_URL=https://assets.example.com
```

Once configured, each successful build probes one representative object and requires HTTP 200 plus the expected image content type.

## Local validation

These commands do not upload assets:

```bash
npm run r2:validate
npm run r2:self-test
npm run r2:plan:ci
```

The existing rclone commands remain available as a manual/VPS fallback. The fourteen Workers Static Assets shards should remain online until the R2 manifest is complete, the public probe succeeds, and the Gunny runtime has been switched and regression-tested.
