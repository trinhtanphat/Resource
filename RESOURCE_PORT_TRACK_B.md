# Resource Port Track B program

- Repository: `trinhtanphat/Resource`
- Raw asset pin: `519c35a293745b6a0477c4f6ea03110a89de2318`
- Coordination baseline: `7ca3ac34dd14022318ebf4785f419d11545dc038`
- Track A dispatcher source: `trinhtanphat/Gunny@b9505d1398fbae6cbf1ad11c77d8d0c499f90124`
- Sessions: `R038` through `R048`
- Program revision: `1`
- GitHub Actions: forbidden

## Purpose

This program divides Resource-side Track B into eleven non-overlapping sessions. Each session packages one runtime-owner family into deterministic browser-native outputs and a consumer contract.

This repository does **not** contain the Gunny application runtime. Therefore a Resource-side Track B session may publish:

- browser-native assets;
- exact source and provenance metadata;
- geometry, state, z-order, timing and lifecycle contracts;
- deterministic import/check scripts;
- unresolved and fidelity findings.

It must not claim that Gunny runtime wiring is complete and must not edit `trinhtanphat/Gunny`.

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

`R037` is unresolved-source review and intentionally has no Track B consumer. No unresolved asset may enter an owner package until exact evidence assigns it.

## Starting a session

1. Create branch `resource-port/RNNN-<owner>`.
2. Read:
   - `AGENTS.md`;
   - this runbook;
   - `resource-port/track-b/session-map.json`;
   - the exact section in `resource-port/track-b/SESSION_PROMPTS.md`.
3. Verify every Track A dependency on current `trinhtanphat/Gunny/main`.
4. Record the exact dependency commit and evidence SHA-256 values in the session evidence.
5. Fail closed when evidence, importer output or source identity is missing.
6. Modify only the session's locked paths.
7. Run:
   - `node resource-port/track-b/verify.mjs`;
   - the session checker;
   - deterministic importer/package `--check`;
   - applicable media/image validation;
   - `git diff --check`.
8. Commit `RNNN`.
9. Commit only the findings file as `RNNN-F`.
10. Rebase against current `main`, push, open a PR and rebase-merge after verification.

## Required outputs

Every session must publish:

- `exports/resource-port/<owner>/` — browser-native package;
- `resource-port/track-b/contracts/<owner>.json` — consumer contract;
- `resource-port/track-b/evidence/RNNN.json` — dependency/source/output evidence;
- `resource-port/track-b/checks/RNNN.mjs` — deterministic local checker;
- `resource-port/track-b/findings/RNNN.md` — append-only findings;
- an updated entry in `resource-port/track-b/session-map.json`.

## Evidence contract

Each selected or generated artifact must include:

- exact source repository, commit, path and source hash;
- Track A evidence session and evidence hash;
- detected format and byte count;
- bitmap dimensions/alpha or media/timeline metadata where applicable;
- authored transforms, bounds, layers, masks, blends and states where available;
- output path and output SHA-256;
- classification: `exact`, `inferred` or `unresolved`;
- deterministic regeneration command and check result.

## Completion boundary

A session is complete only when:

- all dependencies are merged and verified;
- every output is reproducible from pinned evidence;
- package and contract checks pass;
- no raw source asset was modified;
- no filename-only or visual-only guess was accepted;
- all unresolved items are recorded;
- the two-commit rule is preserved.

Completing a Resource package is not proof that the Gunny application consumes it. Gunny-side wiring and production behavior require a separate integration change in `trinhtanphat/Gunny`.

## Shared coordinator files

Workers must not modify:

- `AGENTS.md`;
- `RESOURCE_PORT_TRACK_B.md`;
- `resource-port/track-b/SESSION_PROMPTS.md`;
- `resource-port/track-b/verify.mjs`;
- another session's evidence, checker, findings or output directory.
