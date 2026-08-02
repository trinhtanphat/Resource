# Browser-native asset coverage and R2 publication — 2026-08-02

## Decision

Cloudflare R2 is the runtime storage boundary. `trinhtanphat/Resource` owns the publication pipeline, while `trinhtanphat/Gunny` owns runtime code and behavior.

The publication pipeline distinguishes:

1. raw Resource input (`flash/`, `image/`, `partical/`, `sound/`, `video/`, `weekly/`, `xml/`);
2. Resource-owned browser packages under `exports/`;
3. already-converted browser runtime subsets retained at immutable historical commits.

Uploading a raw SWF proves storage only. It does not make the SWF executable in Chrome, Chromium or Cốc Cốc.

## Runtime bridge published by Resource

Until every Track B package is complete, the R2 build materializes these reviewed browser-ready subsets from immutable commits:

| Runtime groups | Immutable source | R2 object-key roots |
|---|---|---|
| screens, pets, effects | `trinhtanphat/Resource@7dc16b70b4b868d6be709cca7d400def67f6d4b6` | `screens/`, `pets/`, `effects/` |
| audio | `trinhtanphat/Gunny@669ddf6b462f79d16afbb020f6a5a3285685c987` | `public/game-ui/audio/` |
| npc, items, weapons, avatar | `trinhtanphat/Gunny@f2e1ff59b22f50935d3f70c0f42b608a8239432b` | `public/game-ui/npc/`, `public/game-ui/items/`, `public/game-ui/weapons/`, `public/game-ui/avatar/` |

These are migration inputs, not mutable dependencies. The build fetches only immutable 40-character SHAs, uses sparse checkout, stages the exact paths temporarily, uploads them with the existing R2 manifest, and removes the temporary paths after the command.

A future pin change must be reviewed and committed in `r2-deployment.json`. Changes in another repository do not silently change production bytes.

## Conversion completeness

The browser conversion is **not complete**.

The canonical Track B map contains eleven package sessions:

| Session | Owner | Current repository evidence |
|---|---|---|
| P038 | avatar-equipment | package/status absent on current `main` |
| P039 | battle-hud-effects | package/status absent on current `main` |
| P040 | pve-maps-npcs | package/status absent on current `main` |
| P041 | guild-social-marriage | package/status absent on current `main` |
| P042 | pet-farm | package/status absent on current `main` |
| P043 | store-mail-economy | package/status absent on current `main` |
| P044 | quests-events | package/status absent on current `main` |
| P045 | hall-room-world | package complete with fail-closed interactions; 97 unique SWF timelines remain non-browser-native |
| P046 | common-ui | package complete; 47 browser PNG outputs, but all 47 consumer mappings remain unresolved |
| P047 | audio-localization | package/status absent on current `main` |
| P048 | tutorial-video | package/status absent on current `main` |

Therefore:

- the R2 bridge can publish assets that have already been converted;
- raw PNG/JPG/WebP and supported audio can also be stored and consumed directly when mapped;
- raw SWF timelines, ActionScript behavior, unsupported embedded audio/video, masks, filters and MovieClip lifecycle are not automatically converted by this deployment;
- storage completeness must never be reported as browser-conversion completeness.

## Completion rule

The conversion may be called complete only when all of the following are true:

1. P038–P048 each have a checked package, evidence, status and immutable publication commit;
2. every SWF-dependent visual or sound used by Gunny has a browser-native output or an explicit unresolved disposition;
3. runtime R038–R048 consume the Resource package contracts;
4. representative R2 responses return `X-Gunny-Asset-Delivery: ddtank-r2`;
5. browser smoke verifies login, character creation, hall, inventory/shop, PvE, battle, pets, social, events, audio and tutorial/video;
6. fallback to historical Gunny asset commits is no longer needed for successful player-visible flows.

The former Gunny commits remain immutable fallback and provenance until this evidence exists. They must not be described as the final ownership model.
