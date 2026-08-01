# AGENTS.md — Resource Port

This repository is the immutable source-art and browser-native packaging boundary for Gunny Resource work.

## Mandatory rules

1. Read `RESOURCE_PORT_TRACK_B.md` and the exact `resource-port/track-b/sessions/RNNN.json` before changing files.
2. Work only on the requested `RESOURCE_SESSION_ID`. Do not adopt another session.
3. Treat source asset roots as read-only:
   - `flash/`
   - `image/`
   - `partical/`
   - `sound/`
   - `video/`
   - `weekly/`
   - `xml/`
4. Write generated or curated outputs only to the session's `lockedPaths`.
5. Never choose an asset by filename alone. Every selection needs Track A evidence, exact source identity and provenance.
6. Never invent art, animation, geometry, labels, states or business behavior.
7. Classify every result as `exact`, `inferred` or `unresolved`.
8. A Track B session remains blocked until every listed Track A dependency is merged and its evidence/importer checks pass.
9. Resource-side Track B publishes browser-native bundles and consumer contracts. It does not modify `trinhtanphat/Gunny`.
10. Use exactly two logical commits:
    - `RNNN` for package, contract, checker and the session manifest update.
    - `RNNN-F` for only `resource-port/track-b/findings/RNNN.md`.
11. Rebase on current `main`, open a current-base PR and use rebase merge only after checks pass.
12. Do not use GitHub Actions.
13. Do not force-push `main`, edit another session's locked paths or overwrite shared coordinator files.
