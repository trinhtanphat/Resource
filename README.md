# Gunny web assets (extracted)

Bitmaps extracted from the original Flash SWFs in this repository, in the form
the HTML5 client consumes. Kept on a separate orphan branch so the main history
stays untouched.

| Folder | Contents | Source |
|---|---|---|
| `screens/<screen>/` | UI screen bitmaps (116 screens) | `Gunny92/Flash/ui/spain/swf/<screen>.swf` |
| `pets/sprites/<petNNN>/` | Pet sprites (73) | `image/gameasset/petNNN.swf` |
| `effects/skills/<effectNNN>/` | Skill effect sprites (114) | `image/skilleffect/effectNNN.swf` |
| `effects/particles/` | Particle textures (600) | `Gunny92/Flash/shape.swf` |

Served to the game through jsDelivr:
`https://cdn.jsdelivr.net/gh/trinhtanphat/Resource@web-assets/<path>`

These live outside the game repository because Cloudflare Worker Static Assets
allows at most 20,000 files per Worker.
