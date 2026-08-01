# Resource Port Track B session prompts

Mỗi chat chỉ copy đúng một khối. `resource-port/track-b/session-map.json` là coordinator-owned và worker không được sửa; trạng thái riêng ghi tại `resource-port/track-b/status/RNNN.json`.

## R038 — avatar-equipment

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R038.

Chỉ làm Resource-side Track B owner avatar-equipment. Chỉ bắt đầu khi R001–R024 đã merge trên current trinhtanphat/Gunny/main và evidence/importer tương ứng pass; ghi exact dependency commit SHA và SHA-256 evidence vào resource-port/track-b/evidence/R038.json, thiếu bằng chứng thì fail-closed.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của R038 trong session-map. Tạo package, contract, evidence, checker, findings và status/R038.json. Khóa icon/show/game variants, sex/style/action/frame, rig offsets, anchors, layers, masks và fallback. Không chọn theo tên hoặc bịa visual.

Chạy node resource-port/track-b/verify.mjs, checker R038, importer/package --check và git diff --check. Không dùng GitHub Actions. Branch resource-port/R038-avatar-equipment; commit R038 cho package/contract/evidence/checker/status, R038-F chỉ cho findings; rebase-merge, không squash, không sửa Gunny và không tuyên bố Gunny runtime đã tích hợp.
```

## R039 — battle-hud-effects

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R039.

Chỉ làm owner battle-hud-effects. Chỉ bắt đầu khi R025 và R026 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hashes, thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths của R039. Tạo package/contract/evidence/checker/findings/status. Tách HUD control khỏi transient effect; giữ frame/timeline, anchor, duration, playback rate, blend, mask, z-order và states; không thay Flash behavior bằng CSS tự bịa.

Chạy verifier, checker R039, importer --check, git diff --check; không Actions. Branch resource-port/R039-battle-hud-effects; commit R039 và R039-F riêng; rebase-merge, không squash, không sửa Gunny.
```

## R040 — pve-maps-npcs

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R040.

Chỉ làm owner pve-maps-npcs sau khi R027 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R040. Tạo package/contract/evidence/checker/findings/status. Publish background/foreground/parallax/layer, authored coordinates, collision/terrain/spawn metadata khi có bằng chứng; không kéo NPC/map ngoài R027 và không suy collision từ hình.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R040-pve-maps-npcs; commit R040 và R040-F riêng; rebase-merge, không sửa Gunny.
```

## R041 — guild-social-marriage

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R041.

Chỉ làm owner guild-social-marriage sau khi R028 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R041. Tạo package/contract/evidence/checker/findings/status. Publish church/wedding/guild scene, control states, room/ceremony/guild lifecycle, geometry và z-order; đối chiếu foundation hiện có nhưng missing symbol/interaction phải unresolved.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R041-guild-social-marriage; commit R041 và R041-F riêng; rebase-merge, không sửa Gunny.
```

## R042 — pet-farm

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R042.

Chỉ làm owner pet-farm sau khi R029 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R042. Tạo package/contract/evidence/checker/findings/status. Publish pet/farm/mount animation, stage/action, equipment slot, follow-layer và state mapping; đối chiếu PetsBag nhưng không tự đánh dấu phần thiếu hoàn thành.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R042-pet-farm; commit R042 và R042-F riêng; rebase-merge, không sửa Gunny.
```

## R043 — store-mail-economy

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R043.

Chỉ làm owner store-mail-economy sau khi R030 và R031 merge và evidence/importer pass. Ghi exact dependency commit/evidence hashes; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R043. Tạo package/contract/evidence/checker/findings/status. Publish item-card/gift/shop surfaces và evidenced states; tách decorative art khỏi transaction semantics, không suy giá/currency/business rule từ artwork.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R043-store-mail-economy; commit R043 và R043-F riêng; rebase-merge, không sửa Gunny.
```

## R044 — quests-events

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R044.

Chỉ làm owner quests-events sau khi R032 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R044. Tạo package/contract/evidence/checker/findings/status. Publish quest/event/rank surfaces, states và timelines; không suy server date, reward hoặc eligibility từ ảnh; retired/duplicate/unresolved phải ghi rõ.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R044-quests-events; commit R044 và R044-F riêng; rebase-merge, không sửa Gunny.
```

## R045 — hall-room-world

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R045.

Chỉ làm owner hall-room-world sau khi R033 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R045. Tạo package/contract/evidence/checker/findings/status. Publish scene/room/navigation layers, authored coordinates, hotspots, z-order và transitions; đối chiếu Hot Spring nhưng không tuyên bố control thiếu đã xong.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R045-hall-room-world; commit R045 và R045-F riêng; rebase-merge, không sửa Gunny.
```

## R046 — common-ui

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R046.

Chỉ làm owner common-ui sau khi R034 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R046. Tạo package/contract/evidence/checker/findings/status. Publish exact dimensions, alpha, states và semantic names chỉ khi evidence hỗ trợ; không rename theo nhìn hình, không redraw source art.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R046-common-ui; commit R046 và R046-F riêng; rebase-merge, không sửa Gunny.
```

## R047 — audio-localization

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R047.

Chỉ làm owner audio-localization sau khi R035 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R047. Tạo package/contract/evidence/checker/findings/status. Publish audio codec/duration/channels/event-owner và XML encoding/schema/locale provenance; derivative browser-compatible phải deterministic, không tự dịch/normalize/rewrite.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R047-audio-localization; commit R047 và R047-F riêng; rebase-merge, không sửa Gunny.
```

## R048 — tutorial-video

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R048.

Chỉ làm owner tutorial-video sau khi R036 merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Dùng raw pin read-only; chỉ đọc sourceFamilies và sửa lockedPaths R048. Tạo package/contract/evidence/checker/findings/status. Publish codec, duration, dimensions, frame rate và playback states; derivative phải deterministic; autoplay/loop/skip/completion chỉ ghi khi có bằng chứng, không bịa tutorial step/caption.

Chạy verifier/checker/importer --check/git diff --check, không Actions. Branch resource-port/R048-tutorial-video; commit R048 và R048-F riêng; rebase-merge, không sửa Gunny.
```
