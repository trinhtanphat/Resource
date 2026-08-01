# Resource Port Track B session prompts

Mỗi chat chỉ copy đúng một khối dưới đây. Không gộp hai session. Mọi prompt đều kế thừa đầy đủ `AGENTS.md`, `RESOURCE_PORT_TRACK_B.md` và `resource-port/track-b/session-map.json`.

## R038 — Avatar, equipment and bag

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R038.

Chỉ làm Resource-side Track B owner avatar-equipment. Không làm session khác và không sửa trinhtanphat/Gunny.

Chỉ bắt đầu khi R001–R024 đã merge trên current trinhtanphat/Gunny/main và toàn bộ evidence/importer tương ứng pass. Ghi exact dependency commit SHA và SHA-256 từng evidence vào resource-port/track-b/evidence/R038.json; thiếu bất kỳ evidence nào thì fail-closed.

Đối chiếu raw Resource pin 519c35a293745b6a0477c4f6ea03110a89de2318, chỉ đọc flash/characterdefine.xml, image/arm/, image/equip/, image/virtual/, image/weapon/, weekly/weapon/ đã được Track A chứng minh. Tạo browser-native package exports/resource-port/avatar-equipment/, contract resource-port/track-b/contracts/avatar-equipment.json, checker R038 và findings R038.

Khóa icon/show/game variants, sex/style/action/frame, rig offsets, anchors, layers, masks và fallback. Không chọn theo tên, không bịa frame/geometry. Chạy verifier, checker, importer --check và git diff --check; không dùng GitHub Actions.

Branch resource-port/R038-avatar-equipment. Commit R038 cho package/contract/evidence/checker/session-map; commit R038-F chỉ cho findings. Rebase-merge, không squash, không push thẳng main. Không tuyên bố Gunny runtime đã tích hợp.
```

## R039 — Battle HUD, props and effects

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R039.

Chỉ làm owner battle-hud-effects. Chỉ bắt đầu khi R025 và R026 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hashes vào resource-port/track-b/evidence/R039.json, nếu thiếu thì fail-closed.

Chỉ đọc các file Track A chứng minh trong image/bomb/, image/buff/, image/celleffect/, image/game/, image/gameasset/, image/partical/, image/prop/, image/rune/, image/skilleffect/, image/specialprop/, image/weather/, partical/. Tạo package exports/resource-port/battle-hud-effects/, contract battle-hud-effects.json, evidence, checker và findings R039.

Contract phải tách HUD control khỏi transient effect và giữ frame/timeline, anchor, duration, playback rate, blend, mask, z-order, states. Không thay Flash behavior bằng CSS tự bịa. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R039-battle-hud-effects; hai commit R039 và R039-F; rebase-merge, không squash, không sửa Gunny.
```

## R040 — PvE maps, terrain and NPC presentation

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R040.

Chỉ làm owner pve-maps-npcs. Chỉ bắt đầu khi R027 đã merge và evidence/importer pass. Ghi exact dependency commit/evidence hash; thiếu thì fail-closed.

Chỉ đọc image/map/, image/tilemap/ và các NPC presentation file được chính R027 gán. Không kéo asset ngoài evidence. Tạo exports/resource-port/pve-maps-npcs/, contract pve-maps-npcs.json, evidence R040, checker và findings.

Publish background/foreground/parallax/layer, authored coordinates, collision/terrain/spawn metadata khi có bằng chứng, map/NPC identity và unresolved. Không suy đoán collision hay spawn từ hình. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R040-pve-maps-npcs; commit R040 và R040-F riêng; rebase-merge, không squash, không sửa Gunny.
```

## R041 — Guild, social, marriage and church

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R041.

Chỉ làm owner guild-social-marriage. Chỉ bắt đầu khi R028 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc Track A evidence thuộc image/church/, image/consortiaicon/, image/consortiamap/. Tạo exports/resource-port/guild-social-marriage/, contract guild-social-marriage.json, evidence, checker và findings R041.

Publish church/wedding/guild scene, control states, room/ceremony/guild lifecycle, geometry và z-order được chứng minh. Đối chiếu foundation Church/Wedding hiện có nhưng không tự đánh dấu parity. Missing symbol/interaction phải unresolved. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R041-guild-social-marriage; hai commit R041 và R041-F; rebase-merge, không squash, không sửa Gunny.
```

## R042 — Pet, farm, mounts and companions

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R042.

Chỉ làm owner pet-farm. Chỉ bắt đầu khi R029 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc evidence thuộc image/elf/, image/farm/, image/mounts/, image/pet/, image/petequip/, image/petfollow/, image/petskill/, image/tool/petequip/. Tạo exports/resource-port/pet-farm/, contract pet-farm.json, evidence, checker và findings R042.

Publish pet/farm/mount animation, stage/action, equipment slot, follow-layer và state mapping. Đối chiếu PetsBag foundation nhưng không tuyên bố phần thiếu hoàn thành. Tách icon tĩnh khỏi animation. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R042-pet-farm; commit R042 và R042-F riêng; rebase-merge, không squash, không sửa Gunny.
```

## R043 — Store, mail, gifts and economy

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R043.

Chỉ làm owner store-mail-economy. Chỉ bắt đầu khi R030 và R031 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hashes, thiếu thì fail-closed.

Chỉ đọc evidence thuộc image/card/, image/cardbox/, image/gift/, image/oneshopping/, image/unfrightprop/. Tạo exports/resource-port/store-mail-economy/, contract store-mail-economy.json, evidence, checker và findings R043.

Publish item-card/gift/shop surface, rarity và selected/disabled/hover states khi có bằng chứng; tách decorative art khỏi transaction semantics. Không suy giá, currency hoặc business rule từ artwork. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R043-store-mail-economy; hai commit R043 và R043-F; rebase-merge, không squash, không sửa Gunny.
```

## R044 — Quests, events, ranks and activities

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R044.

Chỉ làm owner quests-events. Chỉ bắt đầu khi R032 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc các family được R032 chứng minh: image/badgerole/, image/badge/, image/binglong/, image/cardcollect/, image/collectiontask/, image/ddqiyuan/, image/dice/, image/explorermanual/, image/honorbackground/, image/leaguerank/, image/sevendouble/, image/task/, image/weekly/, image/yearfood/. Tạo package/contract/evidence/checker/findings R044.

Publish quest/event/rank surfaces, states và timelines được chứng minh. Không suy server date, reward hay eligibility từ ảnh. Retired/duplicate/unresolved phải ghi rõ. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R044-quests-events; commit R044 và R044-F riêng; rebase-merge, không squash, không sửa Gunny.
```

## R045 — Hall, room and world navigation

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R045.

Chỉ làm owner hall-room-world. Chỉ bắt đầu khi R033 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc evidence thuộc image/camp/, image/campbattle/, image/escort/, image/factionwar/, image/house/, image/scene/, image/world/, image/worldboss/. Tạo exports/resource-port/hall-room-world/, contract hall-room-world.json, evidence, checker và findings R045.

Publish scene/room/navigation layers, authored coordinates, hotspots, z-order và transitions. Đối chiếu Hot Spring foundations nhưng không tuyên bố control thiếu đã xong. Tách scene art khỏi room/gameplay authority. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R045-hall-room-world; hai commit R045 và R045-F; rebase-merge, không squash, không sửa Gunny.
```

## R046 — Common UI

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R046.

Chỉ làm owner common-ui. Chỉ bắt đầu khi R034 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc evidence thuộc image/interfaceicons/. Tạo exports/resource-port/common-ui/, contract common-ui.json, evidence, checker và findings R046.

Publish exact dimensions, alpha, states và semantic name chỉ khi source/evidence hỗ trợ. Không rename theo nhìn hình, không redraw source art. Duplicate/unresolved phải ghi rõ. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R046-common-ui; commit R046 và R046-F riêng; rebase-merge, không squash, không sửa Gunny.
```

## R047 — Audio, localization and configuration

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R047.

Chỉ làm owner audio-localization. Chỉ bắt đầu khi R035 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc evidence thuộc sound/ và xml/. Tạo exports/resource-port/audio-localization/, contract audio-localization.json, evidence, checker và findings R047.

Publish audio codec/duration/channels/event-owner và XML encoding/schema/locale provenance. Giữ nguyên source, derivative browser-compatible phải deterministic. Không tự dịch, normalize hoặc rewrite nội dung. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R047-audio-localization; hai commit R047 và R047-F; rebase-merge, không squash, không sửa Gunny.
```

## R048 — Tutorial and video

```text
Dựa vào AGENTS.md, RESOURCE_PORT_TRACK_B.md, resource-port/track-b/session-map.json và current main của trinhtanphat/Resource, hãy thực thi RESOURCE_SESSION_ID=R048.

Chỉ làm owner tutorial-video. Chỉ bắt đầu khi R036 đã merge và evidence/importer pass; ghi exact dependency commit/evidence hash, thiếu thì fail-closed.

Chỉ đọc evidence thuộc image/video/ và video/. Tạo exports/resource-port/tutorial-video/, contract tutorial-video.json, evidence, checker và findings R048.

Publish codec, duration, dimensions, frame rate và playback states. Browser derivative phải deterministic, source giữ nguyên. Autoplay/loop/skip/completion chỉ ghi khi có bằng chứng; không bịa tutorial step hoặc caption. Chạy verifier/checker/importer --check/git diff --check, không Actions.

Branch resource-port/R048-tutorial-video; commit R048 và R048-F riêng; rebase-merge, không squash, không sửa Gunny.
```
