# Resource Package session prompts

Each chat copies exactly one block. `P038–P048` are Resource package sessions. `R038–R048` remain separate Gunny runtime integration sessions. `resource-port/track-b/session-map.json` is coordinator-owned and workers must not edit it.

## P038 — avatar-equipment

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P038.

Chỉ làm Resource package owner avatar-equipment. Đây là package session P038, không phải Gunny runtime integration R038. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R001–R024 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P038.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P038 trong session-map. Tạo package, contract, evidence, checker, findings và status/P038.json. Khóa icon/show/game variants, sex/style/action/frame, rig offsets, anchors, layers, masks, transforms, bounds, states và fallback. Không chọn theo tên file hoặc chỉ dựa vào nhìn hình. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P038, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P038-avatar-equipment. Dùng đúng hai commit: P038 cho package/contract/evidence/checker/status và P038-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R038 runtime integration đã hoàn thành.
```

## P039 — battle-hud-effects

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P039.

Chỉ làm Resource package owner battle-hud-effects. Đây là package session P039, không phải Gunny runtime integration R039. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R025 và R026 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P039.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P039 trong session-map. Tạo package, contract, evidence, checker, findings và status/P039.json. Tách HUD control khỏi transient effect; giữ frame/timeline, anchor, duration, playback rate, blend, mask, z-order, states, lifecycle và fallback. Không thay Flash behavior bằng CSS hoặc animation tự bịa. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P039, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P039-battle-hud-effects. Dùng đúng hai commit: P039 cho package/contract/evidence/checker/status và P039-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R039 runtime integration đã hoàn thành.
```

## P040 — pve-maps-npcs

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P040.

Chỉ làm Resource package owner pve-maps-npcs. Đây là package session P040, không phải Gunny runtime integration R040. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R027 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P040.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P040 trong session-map. Tạo package, contract, evidence, checker, findings và status/P040.json. Publish background, foreground, parallax, layer, authored coordinates, terrain, collision, spawn metadata, map identity và NPC presentation khi có bằng chứng. Không suy collision, spawn hoặc gameplay behavior từ hình. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P040, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P040-pve-maps-npcs. Dùng đúng hai commit: P040 cho package/contract/evidence/checker/status và P040-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R040 runtime integration đã hoàn thành.
```

## P041 — guild-social-marriage

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P041.

Chỉ làm Resource package owner guild-social-marriage. Đây là package session P041, không phải Gunny runtime integration R041. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R028 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P041.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P041 trong session-map. Tạo package, contract, evidence, checker, findings và status/P041.json. Publish church, wedding, guild scenes, control states, room/ceremony/guild lifecycle, authored geometry, transforms và z-order có bằng chứng. Đối chiếu foundation hiện có nhưng missing symbol/control/interaction phải unresolved. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P041, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P041-guild-social-marriage. Dùng đúng hai commit: P041 cho package/contract/evidence/checker/status và P041-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R041 runtime integration đã hoàn thành.
```

## P042 — pet-farm

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P042.

Chỉ làm Resource package owner pet-farm. Đây là package session P042, không phải Gunny runtime integration R042. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R029 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P042.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P042 trong session-map. Tạo package, contract, evidence, checker, findings và status/P042.json. Publish pet, farm, mount animation, stages, actions, equipment slots, follow layers, states, timelines và fallback. Đối chiếu PetsBag nhưng không tự đánh dấu phần thiếu là hoàn thành; tách icon tĩnh khỏi animation thật. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P042, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P042-pet-farm. Dùng đúng hai commit: P042 cho package/contract/evidence/checker/status và P042-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R042 runtime integration đã hoàn thành.
```

## P043 — store-mail-economy

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P043.

Chỉ làm Resource package owner store-mail-economy. Đây là package session P043, không phải Gunny runtime integration R043. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R030 và R031 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P043.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P043 trong session-map. Tạo package, contract, evidence, checker, findings và status/P043.json. Publish item-card, gift, shop và mail surfaces cùng selected/disabled/hover/rarity states khi có bằng chứng. Tách decorative art khỏi transaction semantics; không suy giá, currency hoặc business rule từ artwork. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P043, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P043-store-mail-economy. Dùng đúng hai commit: P043 cho package/contract/evidence/checker/status và P043-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R043 runtime integration đã hoàn thành.
```

## P044 — quests-events

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P044.

Chỉ làm Resource package owner quests-events. Đây là package session P044, không phải Gunny runtime integration R044. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R032 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P044.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P044 trong session-map. Tạo package, contract, evidence, checker, findings và status/P044.json. Publish quest, event, rank và activity surfaces, states và timelines có bằng chứng. Không suy server date, reward, eligibility, reset schedule hoặc progression semantics từ ảnh; retired/duplicate/unresolved phải ghi rõ. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P044, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P044-quests-events. Dùng đúng hai commit: P044 cho package/contract/evidence/checker/status và P044-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R044 runtime integration đã hoàn thành.
```

## P045 — hall-room-world

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P045.

Chỉ làm Resource package owner hall-room-world. Đây là package session P045, không phải Gunny runtime integration R045. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R033 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P045.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P045 trong session-map. Tạo package, contract, evidence, checker, findings và status/P045.json. Publish scene, room, world navigation layers, authored coordinates, hotspots, z-order, transitions, masks và states. Đối chiếu Hot Spring foundations nhưng không tuyên bố control/interaction còn thiếu đã hoàn thành; tách scene art khỏi gameplay authority. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P045, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P045-hall-room-world. Dùng đúng hai commit: P045 cho package/contract/evidence/checker/status và P045-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R045 runtime integration đã hoàn thành.
```

## P046 — common-ui

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P046.

Chỉ làm Resource package owner common-ui. Đây là package session P046, không phải Gunny runtime integration R046. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R034 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P046.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P046 trong session-map. Tạo package, contract, evidence, checker, findings và status/P046.json. Publish exact dimensions, alpha, states, semantic names, hotspot hoặc interaction role chỉ khi evidence hỗ trợ. Không rename theo nhìn hình, không redraw source art và không tự tạo state không có nguồn. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P046, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P046-common-ui. Dùng đúng hai commit: P046 cho package/contract/evidence/checker/status và P046-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R046 runtime integration đã hoàn thành.
```

## P047 — audio-localization

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P047.

Chỉ làm Resource package owner audio-localization. Đây là package session P047, không phải Gunny runtime integration R047. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R035 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P047.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P047 trong session-map. Tạo package, contract, evidence, checker, findings và status/P047.json. Publish audio codec, duration, channels, sample rate, event-owner mapping và XML encoding/schema/locale provenance. Browser-compatible derivative phải deterministic; không tự dịch, normalize, sửa nội dung hoặc đổi semantics XML. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P047, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P047-audio-localization. Dùng đúng hai commit: P047 cho package/contract/evidence/checker/status và P047-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R047 runtime integration đã hoàn thành.
```

## P048 — tutorial-video

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=P048.

Chỉ làm Resource package owner tutorial-video. Đây là package session P048, không phải Gunny runtime integration R048. Không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R036 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/P048.json; thiếu bất kỳ bằng chứng nào thì fail-closed, không tự suy đoán và không đóng session giả.

Dùng raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318 read-only. Chỉ đọc sourceFamilies và chỉ sửa lockedPaths của P048 trong session-map. Tạo package, contract, evidence, checker, findings và status/P048.json. Publish codec, duration, dimensions, frame rate, playback states và source provenance. Browser derivative phải deterministic; autoplay/loop/skip/completion/caption chỉ ghi khi có bằng chứng, không bịa tutorial step. Không bịa art, geometry, animation, labels hoặc behavior.

Chạy node resource-port/track-b/verify.mjs, checker P048, importer/package --check, applicable media/image validation và git diff --check. Không dùng GitHub Actions.

Tạo branch resource-port/P048-tutorial-video. Dùng đúng hai commit: P048 cho package/contract/evidence/checker/status và P048-F chỉ cho findings. Rebase current main, push branch, mở PR current-base và rebase-merge. Không squash, không push trực tiếp main, không sửa Gunny và không tuyên bố R048 runtime integration đã hoàn thành.
```
