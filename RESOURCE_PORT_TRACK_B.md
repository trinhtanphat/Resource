# Resource Package program

- Repository: `trinhtanphat/Resource`
- Raw asset pin: `519c35a293745b6a0477c4f6ea03110a89de2318`
- Track A evidence source: `trinhtanphat/Gunny`, sessions `R001–R037`
- Resource package sessions: `P038–P048`
- Gunny runtime integration sessions: `R038–R048`
- Program revision: `3`
- GitHub Actions: forbidden

## Purpose and ID boundary

This program divides Resource-side packaging into eleven non-overlapping sessions. Each `PNNN` session converts only Track A-proven assets into deterministic browser-native outputs and a consumer contract.

The ID namespaces are deliberately separate:

- `R001–R037`: local Track A inspection, evidence and importers;
- `P038–P048`: browser-native package creation in `trinhtanphat/Resource`;
- `R038–R048`: runtime consumption and production integration in `trinhtanphat/Gunny`.

A completed `P038` package is input to Gunny `R038`; it is not a replacement for `R038` and does not prove that the game consumes the package.

## Dependency and handoff map

| Package | Owner | Required Track A | Next Gunny integration |
|---|---|---|---|
| `P038` | `avatar-equipment` | `R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016, R017, R018, R019, R020, R021, R022, R023, R024` | `R038` |
| `P039` | `battle-hud-effects` | `R025, R026` | `R039` |
| `P040` | `pve-maps-npcs` | `R027` | `R040` |
| `P041` | `guild-social-marriage` | `R028` | `R041` |
| `P042` | `pet-farm` | `R029` | `R042` |
| `P043` | `store-mail-economy` | `R030, R031` | `R043` |
| `P044` | `quests-events` | `R032` | `R044` |
| `P045` | `hall-room-world` | `R033` | `R045` |
| `P046` | `common-ui` | `R034` | `R046` |
| `P047` | `audio-localization` | `R035` | `R047` |
| `P048` | `tutorial-video` | `R036` | `R048` |

`R037` remains unresolved and has no package or runtime consumer until exact evidence assigns an owner.

## Starting a package session

1. Create branch `resource-port/PNNN-<owner>`.
2. Read `AGENTS.md`, this runbook, `resource-port/track-b/session-map.json` and exactly one `PNNN` prompt section.
3. Verify every Track A dependency on current `trinhtanphat/Gunny/main`.
4. Record exact dependency commit SHAs and evidence SHA-256 values.
5. Fail closed when evidence, importer output or source identity is missing.
6. Modify only the exact package session's `lockedPaths`.
7. Run the program verifier, package checker, importer/package `--check`, applicable media/image validation and `git diff --check`.
8. Commit `PNNN`.
9. Commit only the findings file as `PNNN-F`.
10. Rebase current `main`, push, open a current-base PR and rebase-merge after verification.

## Required outputs

Every package session publishes:

- `exports/resource-port/<owner>/`;
- `resource-port/track-b/contracts/<owner>.json`;
- `resource-port/track-b/evidence/PNNN.json`;
- `resource-port/track-b/checks/PNNN.mjs`;
- `resource-port/track-b/findings/PNNN.md`;
- `resource-port/track-b/status/PNNN.json`.

`session-map.json` is coordinator-owned and immutable to workers.

## Evidence contract

Each artifact records exact source repository, commit, path and hash; Track A evidence session and hash; format and byte count; applicable dimensions or timeline metadata; authored transforms, bounds, layers, masks, blends and states; output path and SHA-256; classification `exact`, `inferred` or `unresolved`; and deterministic regeneration/check results.

## Completion boundary

A package session completes only when all dependencies are merged and verified, outputs are reproducible, package and contract checks pass, raw source roots are unchanged, no filename-only or visual-only guess is accepted, unresolved items are recorded and the two-commit rule is preserved.

Completing all `P038–P048` still leaves the following work in `trinhtanphat/Gunny`:

1. execute runtime integrations `R038–R048`;
2. mount owner modules through a coordinator-only shared bootstrap change;
3. run visual/runtime review across login, hall, bag, store, social, battle, PvE, pet, events, audio and tutorial surfaces;
4. run full typecheck/build/tests and deployed browser smoke without GitHub Actions;
5. prove there are no packages that exist but are not runtime-wired.

## Shared coordinator files

Workers must not modify:

- `AGENTS.md`;
- `RESOURCE_PORT_TRACK_B.md`;
- `resource-port/track-b/session-map.json`;
- `resource-port/track-b/SESSION_PROMPTS.md`;
- `resource-port/track-b/verify.mjs`;
- another package session's locked paths.
