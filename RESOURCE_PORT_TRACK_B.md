# Resource Port Track B program

- Repository: `trinhtanphat/Resource`
- Raw asset pin: `519c35a293745b6a0477c4f6ea03110a89de2318`
- Coordination baseline: `7ca3ac34dd14022318ebf4785f419d11545dc038`
- Track A dispatcher source: `trinhtanphat/Gunny@b9505d1398fbae6cbf1ad11c77d8d0c499f90124`
- Sessions: `R038` through `R048`
- Program revision: `2`
- GitHub Actions: forbidden

## Purpose

This program divides Resource-side Track B into eleven non-overlapping sessions. Each session packages one runtime-owner family into deterministic browser-native outputs and a consumer contract.

Resource-side Track B may publish browser-native assets, provenance, geometry/state/timing/lifecycle contracts, deterministic checks and findings. It must not claim Gunny runtime wiring is complete and must not edit `trinhtanphat/Gunny`.

## Dependency map

| Session | Owner | Required Track A |
|---|---|---|
| `R038` | avatar-equipment | `R001`–`R024` |
| `R039` | battle-hud-effects | `R025`, `R026` |
| `R040` | pve-maps-npcs | `R027` |
| `R041` | guild-social-marriage | `R028` |
| `R042` | pet-farm | `R029` |
| `R043` | store-mail-economy | `R030`, `R031` |
| `R044` | quests-events | `R032` |
| `R045` | hall-room-world | `R033` |
| `R046` | common-ui | `R034` |
| `R047` | audio-localization | `R035` |
| `R048` | tutorial-video | `R036` |

`R037` remains unresolved and has no Track B consumer.

## Starting a session

1. Create branch `resource-port/RNNN-<owner>`.
2. Read `AGENTS.md`, this runbook, `session-map.json` and exactly one prompt section.
3. Verify every Track A dependency on current `trinhtanphat/Gunny/main`.
4. Record exact dependency commits and evidence SHA-256 values.
5. Fail closed when evidence, importer output or source identity is missing.
6. Modify only the exact session's `lockedPaths`.
7. Run the program verifier, session checker, importer/package `--check`, applicable media/image checks and `git diff --check`.
8. Commit `RNNN`.
9. Commit only the findings file as `RNNN-F`.
10. Rebase current `main`, push, open a current-base PR and rebase-merge after verification.

## Required outputs

Every session publishes:

- `exports/resource-port/<owner>/`;
- `resource-port/track-b/contracts/<owner>.json`;
- `resource-port/track-b/evidence/RNNN.json`;
- `resource-port/track-b/checks/RNNN.mjs`;
- `resource-port/track-b/findings/RNNN.md`;
- `resource-port/track-b/status/RNNN.json`.

`session-map.json` is coordinator-owned and immutable to workers.

## Evidence contract

Each artifact records exact source repository/commit/path/hash, Track A evidence and hash, format/bytes, applicable dimensions or timeline metadata, authored transforms/bounds/layers/masks/blends/states, output path/hash, classification `exact`/`inferred`/`unresolved`, and deterministic regeneration/check result.

## Completion boundary

A session completes only when all dependencies are merged and verified, outputs are reproducible, package/contract checks pass, raw source roots are unchanged, no filename-only guess is accepted, unresolved items are recorded, and the two-commit rule is preserved.

Completing a Resource package is not proof that the Gunny application consumes it.

## Shared coordinator files

Workers must not modify:

- `AGENTS.md`;
- `RESOURCE_PORT_TRACK_B.md`;
- `resource-port/track-b/session-map.json`;
- `resource-port/track-b/SESSION_PROMPTS.md`;
- `resource-port/track-b/verify.mjs`;
- another session's locked paths.
