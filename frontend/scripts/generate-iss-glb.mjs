// Generates a minimal, valid binary glTF 2.0 (.glb) representing a stylised
// satellite (central body, two solar panel wings, one dish antenna).
//
// Why hand-build the GLB?
// -----------------------
// The task requires `/models/iss.glb` to exist as a valid GLB parseable by
// three.js's GLTFLoader. Fetching a real NASA ISS model from the internet
// in this environment is unreliable (sandbox network restrictions, binary
// redirects, large file sizes). Three.js's GLTFExporter depends on browser
// globals (FileReader, HTMLCanvasElement, Blob) for texture handling, so
// running it inside Node requires polyfills that may silently drop data.
//
// The approach taken here is to construct the GLB file format directly:
//   1. Build raw typed-array geometry (positions, normals, indices).
//   2. Pack it into a single binary buffer, append it as the GLB BIN chunk.
//   3. Emit a valid glTF 2.0 JSON chunk describing scenes/nodes/meshes/
//      materials and pointing buffer views at the correct byte offsets.
//   4. Concatenate the 12-byte GLB header, the JSON chunk, and the BIN chunk.
//
// The resulting file starts with magic bytes "glTF" (0x46546C67), version 2,
// and a single scene that three.js's GLTFLoader parses into a group of
// meshes. No textures / images are involved, so the file stays tiny (a few
// hundred bytes) while remaining a fully-valid GLB.
//
// Run: node frontend/scripts/generate-iss-glb.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "..", "public", "models", "iss.glb");

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Build an axis-aligned box centered at `center` with `size` dimensions.
 * Returns { positions: Float32Array, normals: Float32Array, indices: Uint16Array }.
 */
function makeBox(center, size) {
  const [cx, cy, cz] = center;
  const [sx, sy, sz] = size.map((v) => v / 2);

  // 8 corners; but to get flat shading / correct normals per face we emit
  // 24 vertices (4 per face) with a single normal each.
  const faces = [
    // +X
    { n: [1, 0, 0], v: [[+sx, -sy, -sz], [+sx, +sy, -sz], [+sx, +sy, +sz], [+sx, -sy, +sz]] },
    // -X
    { n: [-1, 0, 0], v: [[-sx, -sy, +sz], [-sx, +sy, +sz], [-sx, +sy, -sz], [-sx, -sy, -sz]] },
    // +Y
    { n: [0, 1, 0], v: [[-sx, +sy, -sz], [-sx, +sy, +sz], [+sx, +sy, +sz], [+sx, +sy, -sz]] },
    // -Y
    { n: [0, -1, 0], v: [[-sx, -sy, +sz], [-sx, -sy, -sz], [+sx, -sy, -sz], [+sx, -sy, +sz]] },
    // +Z
    { n: [0, 0, 1], v: [[-sx, -sy, +sz], [+sx, -sy, +sz], [+sx, +sy, +sz], [-sx, +sy, +sz]] },
    // -Z
    { n: [0, 0, -1], v: [[+sx, -sy, -sz], [-sx, -sy, -sz], [-sx, +sy, -sz], [+sx, +sy, -sz]] },
  ];

  const positions = [];
  const normals = [];
  const indices = [];

  faces.forEach((face, faceIdx) => {
    const base = faceIdx * 4;
    for (const [vx, vy, vz] of face.v) {
      positions.push(cx + vx, cy + vy, cz + vz);
      normals.push(face.n[0], face.n[1], face.n[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

/**
 * Merge multiple { positions, normals, indices } buffers into one mesh.
 * Index offsets are adjusted as we concatenate.
 */
function mergeMeshes(parts) {
  const positions = [];
  const normals = [];
  const indices = [];
  let vertexOffset = 0;
  for (const part of parts) {
    positions.push(...part.positions);
    normals.push(...part.normals);
    for (const idx of part.indices) indices.push(idx + vertexOffset);
    vertexOffset += part.positions.length / 3;
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

function bounds(positions) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

// ---------------------------------------------------------------------------
// Build the satellite: body + two wings + dish
// ---------------------------------------------------------------------------

// Central body: elongated rectangular module (ISS-ish core)
const body = makeBox([0, 0, 0], [1.2, 0.5, 0.5]);

// Solar panels: two thin wide wings on +X/-X sides
const panelLeft = makeBox([-1.6, 0, 0], [1.6, 0.05, 1.6]);
const panelRight = makeBox([+1.6, 0, 0], [1.6, 0.05, 1.6]);

// Dish antenna: small box below body (a box stands in for a dish; GLTFLoader
// doesn't care what shape it is — the scene just needs a non-flat silhouette).
const dish = makeBox([0, -0.5, 0], [0.3, 0.3, 0.3]);

const mesh = mergeMeshes([body, panelLeft, panelRight, dish]);
const meshBounds = bounds(mesh.positions);

// ---------------------------------------------------------------------------
// Pack binary buffer: [positions][normals][indices], each aligned to 4 bytes.
// ---------------------------------------------------------------------------

function align4(n) {
  return (n + 3) & ~3;
}

const positionsBytes = mesh.positions.byteLength;
const normalsBytes = mesh.normals.byteLength;
const indicesBytes = mesh.indices.byteLength;

const positionsOffset = 0;
const normalsOffset = align4(positionsOffset + positionsBytes);
const indicesOffset = align4(normalsOffset + normalsBytes);
const binLength = align4(indicesOffset + indicesBytes);

const bin = new Uint8Array(binLength);
bin.set(new Uint8Array(mesh.positions.buffer), positionsOffset);
bin.set(new Uint8Array(mesh.normals.buffer), normalsOffset);
bin.set(new Uint8Array(mesh.indices.buffer), indicesOffset);

// ---------------------------------------------------------------------------
// Build glTF JSON
// ---------------------------------------------------------------------------

const gltf = {
  asset: { version: "2.0", generator: "satellitepredictiontracker placeholder ISS" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "ISS" }],
  meshes: [
    {
      name: "ISS",
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0,
          mode: 4, // TRIANGLES
        },
      ],
    },
  ],
  materials: [
    {
      name: "Satellite",
      pbrMetallicRoughness: {
        baseColorFactor: [0.82, 0.85, 0.88, 1.0],
        metallicFactor: 0.6,
        roughnessFactor: 0.35,
      },
      doubleSided: true,
    },
  ],
  buffers: [{ byteLength: binLength }],
  bufferViews: [
    { buffer: 0, byteOffset: positionsOffset, byteLength: positionsBytes, target: 34962 }, // ARRAY_BUFFER
    { buffer: 0, byteOffset: normalsOffset, byteLength: normalsBytes, target: 34962 },
    { buffer: 0, byteOffset: indicesOffset, byteLength: indicesBytes, target: 34963 }, // ELEMENT_ARRAY_BUFFER
  ],
  accessors: [
    {
      bufferView: 0,
      componentType: 5126, // FLOAT
      count: mesh.positions.length / 3,
      type: "VEC3",
      min: meshBounds.min,
      max: meshBounds.max,
    },
    {
      bufferView: 1,
      componentType: 5126,
      count: mesh.normals.length / 3,
      type: "VEC3",
    },
    {
      bufferView: 2,
      componentType: 5123, // UNSIGNED_SHORT
      count: mesh.indices.length,
      type: "SCALAR",
    },
  ],
};

// ---------------------------------------------------------------------------
// Assemble GLB
// ---------------------------------------------------------------------------
// GLB layout:
//   12-byte header: "glTF" magic (0x46546C67), version (u32=2), totalLength (u32)
//   JSON chunk:     chunkLength (u32), chunkType "JSON" (0x4E4F534A), data, pad with 0x20
//   BIN chunk:      chunkLength (u32), chunkType "BIN\0" (0x004E4942), data, pad with 0x00

const jsonText = JSON.stringify(gltf);
const jsonBytesRaw = new TextEncoder().encode(jsonText);
const jsonPadded = align4(jsonBytesRaw.length);
const jsonBytes = new Uint8Array(jsonPadded);
jsonBytes.set(jsonBytesRaw, 0);
// pad JSON with spaces (0x20) per the glTF 2.0 spec
for (let i = jsonBytesRaw.length; i < jsonPadded; i += 1) jsonBytes[i] = 0x20;

const totalLength = 12 + 8 + jsonBytes.length + 8 + bin.length;

const glb = new Uint8Array(totalLength);
const dv = new DataView(glb.buffer);

// Header
dv.setUint32(0, 0x46546c67, true); // "glTF"
dv.setUint32(4, 2, true); // version 2
dv.setUint32(8, totalLength, true);

// JSON chunk
let cursor = 12;
dv.setUint32(cursor, jsonBytes.length, true); cursor += 4;
dv.setUint32(cursor, 0x4e4f534a, true); cursor += 4; // "JSON"
glb.set(jsonBytes, cursor); cursor += jsonBytes.length;

// BIN chunk
dv.setUint32(cursor, bin.length, true); cursor += 4;
dv.setUint32(cursor, 0x004e4942, true); cursor += 4; // "BIN\0"
glb.set(bin, cursor); cursor += bin.length;

// Write
mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, glb);

console.log(
  `Wrote ${OUT_PATH} (${glb.length} bytes, ${mesh.positions.length / 3} vertices, ${
    mesh.indices.length / 3
  } triangles)`
);
