# AGENTS.md — Resource Packaging

This repository is the immutable source-art and browser-native packaging boundary for Gunny Resource work.

## Mandatory rules

1. Read `RESOURCE_PORT_TRACK_B.md`, `resource-port/track-b/session-map.json` and the exact `PNNN` section in `resource-port/track-b/SESSION_PROMPTS.md` before changing files.
2. Work only on the requested `RESOURCE_SESSION_ID=P038` through `P048`. Do not adopt another package session.
3. `R001–R037` are Track A evidence sessions in `trinhtanphat/Gunny`; `R038–R048` are Gunny runtime integration sessions. Never reuse those `R` IDs for Resource packaging.
4. Treat source asset roots as read-only:
   - `flash/`
   - `image/`
   - `partical/`
   - `sound/`
   - `video/`
   - `weekly/`
   - `xml/`
5. Write generated or curated outputs only to the exact package session entry's `lockedPaths` in `resource-port/track-b/session-map.json`.
6. Never choose an asset by filename alone. Every selection needs Track A evidence, exact source identity and provenance.
7. Never invent art, animation, geometry, labels, states or business behavior.
8. Classify every result as `exact`, `inferred` or `unresolved`.
9. A package session remains blocked until every listed Track A dependency is merged and its evidence/importer checks pass.
10. Resource packaging publishes browser-native bundles and consumer contracts. It does not modify `trinhtanphat/Gunny` and does not prove runtime wiring.
11. Use exactly two logical commits:
    - `PNNN` for package, contract, evidence, checker and status.
    - `PNNN-F` for only `resource-port/track-b/findings/PNNN.md`.
12. Rebase on current `main`, open a current-base PR and use rebase merge only after checks pass.
13. Do not use GitHub Actions.
14. Do not force-push `main`, edit another session's locked paths, modify `session-map.json`, or overwrite shared coordinator files.
