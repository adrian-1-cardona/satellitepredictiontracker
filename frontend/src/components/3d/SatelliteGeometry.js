const TYPE_CONFIG = {
  leo: {
    body: [0.82, 0.48, 0.56],
    core: [0.52, 0.34, 0.62],
    panel: [1.06, 0.035, 0.42],
    panelOffset: 0.93,
    antennaHeight: 0.42,
    domeRadius: 0.11,
  },
  iridium: {
    body: [0.72, 0.56, 0.5],
    core: [0.48, 0.4, 0.56],
    panel: [0.96, 0.035, 0.5],
    panelOffset: 0.86,
    antennaHeight: 0.48,
    domeRadius: 0.1,
  },
  meo: {
    body: [0.94, 0.58, 0.66],
    core: [0.6, 0.42, 0.72],
    panel: [1.26, 0.04, 0.52],
    panelOffset: 1.08,
    antennaHeight: 0.5,
    domeRadius: 0.13,
  },
  geo: {
    body: [1.02, 0.64, 0.72],
    core: [0.66, 0.46, 0.78],
    panel: [1.48, 0.045, 0.56],
    panelOffset: 1.24,
    antennaHeight: 0.56,
    domeRadius: 0.15,
  },
};

function makeMaterial(THREE, params) {
  return new THREE.MeshStandardMaterial({
    emissive: 0x000000,
    emissiveIntensity: 0,
    ...params,
  });
}

function createBoxMesh(THREE, dimensions, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
}

function applyMeshDefaults(group) {
  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

function computeLongestSide(config) {
  const panelSpan = config.panelOffset * 2 + config.panel[0];
  const height =
    Math.max(config.body[1], config.core[1]) +
    config.antennaHeight +
    config.domeRadius * 2;
  const depth = Math.max(config.body[2], config.core[2], config.panel[2]);
  return Math.max(panelSpan, height, depth);
}

/**
 * Create a procedural satellite: metallic bus, dark solar arrays, small sensor
 * dome, and antenna hardware. Scaling is intentionally left to callers so the
 * same geometry can be sized against the Earth sphere in different scenes.
 */
export function createSatelliteGeometry(type, THREE, options = {}) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.leo;
  const group = new THREE.Group();
  group.name = `${type ?? "leo"}-procedural-satellite`;

  const bodyMaterial = makeMaterial(THREE, {
    color: 0xe8edf4,
    metalness: 0.72,
    roughness: 0.28,
  });
  const coreMaterial = makeMaterial(THREE, {
    color: 0x9aa9ba,
    metalness: 0.78,
    roughness: 0.25,
  });
  const panelMaterial = makeMaterial(THREE, {
    color: 0x1f4f67,
    metalness: 0.42,
    roughness: 0.48,
  });
  const antennaMaterial = makeMaterial(THREE, {
    color: 0xd79a22,
    metalness: 0.62,
    roughness: 0.34,
  });
  const beaconMaterial = makeMaterial(THREE, {
    color: options.accentColor ?? 0x00b4d8,
    metalness: 0.2,
    roughness: 0.38,
  });

  const body = createBoxMesh(THREE, config.body, bodyMaterial);
  group.add(body);

  const core = createBoxMesh(THREE, config.core, coreMaterial);
  core.position.z = 0.025;
  group.add(core);

  const leftPanel = createBoxMesh(THREE, config.panel, panelMaterial);
  leftPanel.position.x = -config.panelOffset;
  const rightPanel = createBoxMesh(THREE, config.panel, panelMaterial);
  rightPanel.position.x = config.panelOffset;
  group.add(leftPanel, rightPanel);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, config.antennaHeight, 10),
    antennaMaterial,
  );
  mast.position.y = config.body[1] / 2 + config.antennaHeight / 2;
  group.add(mast);

  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.045, 24),
    antennaMaterial,
  );
  dish.position.z = config.body[2] / 2 + 0.04;
  dish.rotation.x = Math.PI / 2;
  group.add(dish);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(config.domeRadius, 16, 12),
    beaconMaterial,
  );
  dome.position.set(0, -config.body[1] / 2 - config.domeRadius * 0.35, 0);
  group.add(dome);

  group.userData = {
    ...group.userData,
    isProceduralSatellite: true,
    satelliteType: type ?? "leo",
    longestSide: computeLongestSide(config),
  };

  applyMeshDefaults(group);
  return group;
}
