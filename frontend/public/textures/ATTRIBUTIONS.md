# Texture Attributions

This directory holds Earth texture assets used by the Satellite Tracker
frontend. Every binary texture shipped here must be listed with source and
provenance.

## Assets

### `earth/earth-4k.jpg`, `earth/earth-2k.jpg`, `earth/earth-1k.jpg`

- **Asset name:** Blue Marble: Next Generation, Base Map, September 2004
- **File paths:**
  - `frontend/public/textures/earth/earth-4k.jpg`
  - `frontend/public/textures/earth/earth-2k.jpg`
  - `frontend/public/textures/earth/earth-1k.jpg`
- **Source:** NASA Earth Observatory, Blue Marble: Next Generation
- **Source URL:** https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- **Direct source asset:** https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/september/world.200409.3x21600x10800.jpg
- **Credit:** NASA Earth Observatory, Reto Stockli, NASA Goddard Space Flight Center
- **License / usage:** NASA content, generally not subject to U.S. copyright; use must follow NASA Images and Media Usage Guidelines.
- **Retrieved on:** 2026-05-10
- **Modifications:** Downsampled from the NASA 21600x10800 source image using macOS `sips` to produce 4096x2048, 2048x1024, and 1024x512 local LOD textures.

## Usage Notes

- These textures are used in a factual, non-endorsement context. NASA should be
  acknowledged as the source when credits are surfaced.
- The full-resolution source image is not committed; only the generated
  frontend-ready LOD derivatives are stored here.
