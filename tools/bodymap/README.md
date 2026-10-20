# Body map model build

Generates `fitness-web/public/models/body.glb`, the 3D anatomy model on the dashboard.

## Source and licence

[BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/), © The Database Center for Life Science,
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (per the current licence page; the OBJ
headers in the 4.0 archives still mention the older CC BY-SA 2.1 JP). The web app shows the attribution under the model.

## Steps

```bash
mkdir bp3d-raw && cd bp3d-raw
BASE=https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST
curl -O $BASE/isa_BP3D_4.0_obj_99.zip  -O $BASE/partof_BP3D_4.0_obj_99.zip   # ~210 MB
curl -O $BASE/isa_element_parts.txt -O $BASE/isa_inclusion_relation_list.txt
unzip -q isa_BP3D_4.0_obj_99.zip -d isa && unzip -q partof_BP3D_4.0_obj_99.zip -d obj
cd ..

npm install
npm run inventory -- ./bp3d-raw            # writes bp3d-raw/inventory.json
npm run build -- ./bp3d-raw ../../fitness-web/public/models/body.glb   # ~3 min
```

## What the build changes

- Muscle meshes are grouped into the clickable muscles of `fitness-web/src/utils/muscles.ts` (`TARGETS` in
  `build.mjs`); other superficial muscles become the grey `base`; deep / head / hand / foot muscles are dropped.
- The skin (outer layer only) is pulled in onto the muscles so they show through; head, hands and feet keep the skin.
- BodyParts3D has no latissimus dorsi or rectus abdominis, so `lats` and `abs` are raised patches of that surface.
- Shorts and hair are added; everything is simplified (~250k triangles), ambient occlusion is baked into vertex
  colours, and the file is meshopt-compressed (`EXT_meshopt_compression`).
