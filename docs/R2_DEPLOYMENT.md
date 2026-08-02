# Cloudflare R2 deployment

This repository is configured for:

- Cloudflare account: `trinhtanphat3333`
- Account ID: `291f5d12e63427644f59ac4a1d8f9664`
- R2 bucket: `ddtank-resource`
- Default upload profile: `images`

The existing fourteen Workers Static Assets deployments remain available as a fallback until R2 verification and public URL probing succeed.

## Profiles

`images` uploads only `image/`. It is the default because its current size and file count are already understood.

`full-resource` uploads these immutable source roots:

- `flash/`
- `image/`
- `partical/`
- `sound/`
- `video/`
- `weekly/`
- `xml/`

Always run the plan before selecting `full-resource` so storage usage is known before upload.

## Requirements

- Node.js 20 or newer
- `npm install`
- `rclone` installed and available on `PATH`
- An R2 S3 token scoped to Object Read & Write for `ddtank-resource`
- `CLOUDFLARE_API_TOKEN` or an authenticated Wrangler login for bucket administration

Never commit access keys or API tokens. `.env`, temporary rclone configuration, and generated reports are ignored by Git.

## Create and inspect the bucket

```bash
npm run r2:bucket:list
npm run r2:bucket:create
```

`r2:bucket:create` creates `ddtank-resource` in account `291f5d12e63427644f59ac4a1d8f9664`. If the bucket already exists, do not recreate it.

## Plan the upload

```bash
npm run r2:plan
```

The command scans the selected roots, prints file and byte totals, chooses a representative object, and writes `.r2/r2-report.json`.

PowerShell full-resource plan:

```powershell
$env:R2_PROFILE = "full-resource"
npm run r2:plan
```

## Configure S3 credentials

PowerShell:

```powershell
$env:R2_ACCESS_KEY_ID = "<R2 access key ID>"
$env:R2_SECRET_ACCESS_KEY = "<R2 secret access key>"
```

Bash:

```bash
export R2_ACCESS_KEY_ID='<R2 access key ID>'
export R2_SECRET_ACCESS_KEY='<R2 secret access key>'
```

The script creates a mode-0600 temporary rclone config and deletes it after each operation.

## Upload without deleting remote objects

```bash
npm run r2:upload
```

This uses `rclone copy`, parallel transfers, checksum comparison, and preserves each repository root as the first segment of the R2 object key. For example:

```text
image/game/example.png -> ddtank-resource/image/game/example.png
```

## Verify

```bash
npm run r2:verify
```

Verification checks that every local object exists remotely with matching content checksum. Extra remote objects are ignored.

Upload and verify together:

```bash
npm run r2:deploy
```

## Destructive synchronization

`r2:sync` removes remote-only objects. It is blocked unless deletion is explicitly confirmed.

PowerShell:

```powershell
$env:R2_ALLOW_DELETE = "1"
npm run r2:sync
```

Use normal `r2:upload` unless remote deletion is intentional.

## Public access and CDN

R2 buckets are private by default. For production, connect a custom domain to `ddtank-resource` from the R2 bucket settings. A custom domain enables Cloudflare Cache and avoids the development-only limits of `r2.dev`.

After the domain is active:

PowerShell:

```powershell
$env:R2_PUBLIC_BASE_URL = "https://assets.example.com"
npm run r2:probe
```

The probe sends a HEAD request to the representative object and requires HTTP 200. The default `images` profile also requires an `image/*` content type.

Do not remove the Workers shard deployments until:

1. `npm run r2:verify` passes.
2. `npm run r2:probe` passes through the intended public domain.
3. Gunny runtime asset resolution has been switched and regression-tested.
