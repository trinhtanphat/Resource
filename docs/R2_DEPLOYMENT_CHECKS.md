# R2 deployment validation

Validated before merge:

- Node syntax checks for the manual and Workers Builds R2 deployment scripts
- configuration validation for account, bucket, profiles, package commands, build matrix, and Wrangler binding
- upload planning against a local fixture
- manual rclone upload and verification command construction against a mock executable
- incremental S3 deployment against a persistent mock R2 endpoint
- first upload with checkpoint manifest creation
- second deployment with zero re-uploads for unchanged objects
- uploaded-object size and SHA-256 metadata verification
- complete-manifest verification
- non-`main` branch publishing guard
- deletion protection without explicit `R2_ALLOW_DELETE=1`

The validation confirmed that object keys preserve their source-root prefix, credentials remain environment-only, checkpoint manifests permit resumable bootstrap builds, and a final manifest is marked complete only after upload verification succeeds.

No source asset roots were modified. No GitHub Actions were used.
