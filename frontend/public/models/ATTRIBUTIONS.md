# 3D Model Attributions

This directory holds 3D model assets used by the Satellite Tracker frontend (Earth + orbiting satellite hero scene). Every binary asset shipped here MUST be listed below with its source, license, and the exact attribution string required by the license. Do not commit a model file to this directory without also updating this document.

## Assets

### `iss.glb`

- **Asset name:** International Space Station (ISS) — placeholder / TBD
- **File path:** `frontend/public/models/iss.glb` (served at `/models/iss.glb` by Vite)
- **Used by:** `frontend/src/components/3d/EarthGlobe.jsx` (loaded via `GLTFLoader` as the orbiting satellite in the Globe Hero scene)
- **Source URL:** _TODO — fill in once the file is committed_
  - Preferred source: [NASA 3D Resources](https://nasa3d.arc.nasa.gov/) (e.g. the ISS model) or the [NASA ISS Mimic](https://github.com/ISS-Mimic/Mimic) project on GitHub.
  - Acceptable fallback: any CC0 / CC-BY communication satellite GLB from a reputable source (for example Sketchfab assets released under CC0 or CC-BY).
- **License:** _TODO — one of:_
  - U.S. Government work / Public Domain (typical for NASA-produced assets)
  - CC0 1.0 Universal (no attribution required, but we still record provenance here)
  - CC-BY 4.0 (attribution required — use the exact string below in-app and/or in the site credits)
- **Required attribution string:** _TODO — fill in verbatim as required by the license._
  - Example for a NASA-sourced asset: `Image credit: NASA`
  - Example for a CC-BY asset: `"<Asset Name>" by <Author> is licensed under CC-BY 4.0 (<link to license>)`
- **License URL:** _TODO — link to the specific license text (e.g. `https://creativecommons.org/licenses/by/4.0/`)_
- **Retrieved on:** _TODO — YYYY-MM-DD_
- **Modifications:** _TODO — describe any modifications (e.g. "compressed with gltfpack -c", "removed unused animations", "rebaked textures"). If unmodified, write "None"._
- **Compression:** Skipped (per task 3.3 optional guidance). The current `iss.glb` is a procedurally-generated placeholder at ~3.6 KB (3608 bytes), which is already several orders of magnitude below the 4 MB payload ceiling called out in Req 4.2. Running `gltfpack -c` or `gltf-transform draco` on a hand-built GLB this small would at best be a no-op and at worst could corrupt the simple mesh/materials, so compression was intentionally not applied. **Re-evaluate this decision** when a real NASA ISS GLB (typically 8–15 MB) replaces the placeholder — at that point, run `npx gltfpack -i iss.glb -o iss.glb -c` (or `gltf-transform draco`), verify the payload stays ≤ 4 MB, visually confirm materials/geometry still look correct, and update this section with the resulting file size and the exact compression command used.

### Procedural / placeholder fallback

If no external model is used and `iss.glb` was generated procedurally as a placeholder by this project (for example, a GLB authored in-repo to satisfy the loader until a real asset is sourced):

- **Asset name:** Satellite Tracker — procedural satellite placeholder
- **Source:** Authored in-repo for the Satellite Tracker project
- **License:** Owned by this project and released under the same license as the Satellite Tracker repository
- **Required attribution string:** None required beyond the project's own license notice
- **Notes:** This placeholder should be replaced by a real, credited asset before any production deployment. Update this document when that replacement happens.

## How to update this file

When you add, replace, or modify a model in this directory:

1. Add or update the asset's entry above. Do not remove previous entries without replacing them — keep a clear audit trail.
2. Fill in every `TODO` field. Do not ship an asset with unresolved TODOs.
3. Copy the **Required attribution string** verbatim into any user-visible credit surface that the license mandates (for example an "About" / "Credits" section, an on-screen tooltip, or the page footer). CC0 and public-domain assets do not require on-screen attribution, but their provenance MUST still be recorded here.
4. If the license is CC-BY (or any other attribution-required license), open a follow-up task to surface the attribution string in the UI before the feature ships.
5. If you compress or otherwise modify the binary (e.g. `gltfpack`, `gltf-transform draco`), record that under **Modifications** and keep the original source URL so the provenance chain is preserved.
6. Commit the updated `ATTRIBUTIONS.md` in the same change as the asset itself.

## Related requirements

- `requirements.md` Req 4.1 — A realistic 3D satellite model is loaded from a glTF/GLB asset under `frontend/public/`.
- `requirements.md` Req 4.2 — The asset is bundled with the frontend as a static asset; this file records its provenance and license.
