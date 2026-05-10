# HDRI Space Background Files

This directory contains High Dynamic Range Image (HDRI) files used as space environment backgrounds for the 3D satellite visualization.

## Setup

Place `.hdr` files in this directory to enhance the space visualization with realistic lighting and backgrounds.

### Recommended HDRI Sources

1. **Polyhaven** (Free)
   - URL: https://polyhaven.com/hdris
   - Search: "space", "stars", "night sky"
   - License: CC0 (public domain)
   - Recommended: "sunset_light_sphere_1k.hdr", "empty_warehouse_01_1k.hdr"

2. **ambientcg** (Free)
   - URL: https://ambientcg.com/
   - Search: "sky", "night"
   - License: CC0 (public domain)

3. **NASA Imagery** (Free)
   - Direct space imagery from NASA
   - Search: NASA Earth/Space HDR or high-res panoramas
   - Convert to HDRI format using tonemapping tools

### How to Use

1. Download an HDRI file in `.hdr` format
2. Place it in this directory with a descriptive name
3. Update `frontend/src/components/3d/EarthGlobe.jsx` line ~130:
   ```javascript
   loadHDRIEnvironment(
     THREE,
     scene,
     "/hdri/your_hdri_filename.hdr",  // ← Change this path
     0.85,
   )
   ```

### Fallback Behavior

If no HDRI file is found, the application automatically renders a procedurally generated starfield background with 2500 stars using realistic color temperatures. This ensures the visualization works seamlessly even without HDRI assets.

### Recommended File

For this project, we recommend the **Polyhaven "starmap_16k.hdr"** or similar space/night sky HDRIs that provide:
- Deep space aesthetics
- Realistic star distribution
- Subtle atmospheric effects
- 1k-4k resolution for performance balance

### Performance Considerations

- Use 1k resolution for mobile/web (best performance)
- Use 2k-4k for desktop (best quality)
- HDRI files are loaded asynchronously and don't block initialization
- Fallback starfield activates automatically if loading fails

---

Current fallback: **Procedural Starfield** (2500 stars, real-time generation)
