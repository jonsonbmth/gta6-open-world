// SOLMAR BAY — shared tuning, layout and palette.
// One source of truth for the city plan so the 3D world, the minimap and the
// big map all draw the same streets, districts and checkpoints.

export const CFG = {
  title: 'SOLMAR BAY',
  subtitle: 'A Golden Hour in Neon',
  seed: 20261120,

  // World extents in metres. x runs west(-) to east(+), z runs north(-) to
  // south(+). The ocean sits on the east edge; the marina on the south-east.
  world: { minX: -320, maxX: 320, minZ: -320, maxZ: 320, ground: 700 },

  // North-south avenues (x positions) and east-west streets (z positions).
  avenues: [
    { x: -240, name: 'Coral Ave' },
    { x: -160, name: 'Hibiscus St' },
    { x: -80, name: 'Flamingo Ave' },
    { x: 0, name: 'Sunset Blvd' },
    { x: 80, name: 'Palmetto Ave' },
    { x: 160, name: 'Royal Palm Ave' },
    { x: 235, name: 'Ocean Drive', width: 16 },
  ],
  streets: [
    { z: -240, name: 'North Bay Rd' },
    { z: -160, name: 'Harbor St' },
    { z: -80, name: 'Meridian Ave' },
    { z: 0, name: 'Central Ave' },
    { z: 80, name: 'Gull St' },
    { z: 160, name: 'Marina Way' },
    { z: 240, name: 'South Pointe Dr' },
  ],
  roadWidth: 12,

  beach: { x0: 252, x1: 320 }, // sand strip; ocean starts at x = 320
  ocean: { x0: 320, x1: 720 },

  districts: [
    { name: 'DOWNTOWN', x0: -120, z0: -320, x1: 120, z1: -40, color: '#7fb2d9' },
    { name: 'OLD TOWN', x0: -320, z0: -320, x1: -120, z1: -40, color: '#d9a07f' },
    { name: 'HARBOR HEIGHTS', x0: -320, z0: -40, x1: -120, z1: 320, color: '#9fd97f' },
    { name: 'SUNSET FLATS', x0: -120, z0: -40, x1: 120, z1: 320, color: '#d9d07f' },
    { name: 'PALM ROW', x0: 120, z0: -320, x1: 200, z1: 320, color: '#7fd9b2' },
    { name: 'SOLMAR BEACH', x0: 200, z0: -320, x1: 320, z1: 120, color: '#f2d492' },
    { name: 'MARINA BAY', x0: 200, z0: 120, x1: 320, z1: 320, color: '#8fd0e8' },
  ],

  // Player spawn: Ocean Drive heading north, in the right-hand lane, camera
  // to the south, sun in the south-west behind the camera so the car's
  // camera side is always lit.
  spawn: { x: 238, z: 60, heading: Math.PI }, // heading PI = facing -z (north)

  // Sunset Sprint checkpoint loop.
  checkpoints: [
    { x: 235, z: -200, name: 'Ocean Drive North' },
    { x: 80, z: -240, name: 'Downtown Gate' },
    { x: -240, z: -160, name: 'Coral Corner' },
    { x: -240, z: 160, name: 'Harbor Bend' },
    { x: 0, z: 240, name: 'South Pointe' },
    { x: 160, z: 200, name: 'Marina Approach' },
  ],
  missionTime: 150, // seconds for the whole loop
  checkpointBonus: 12, // seconds added per checkpoint

  // Arcade driving tuning.
  car: {
    maxSpeed: 56, // m/s
    maxReverse: 13,
    accel: 24,
    brake: 38,
    drag: 0.42,
    rollDrag: 1.6,
    steerMax: 0.62,
    steerSpeed: 2.6,
    grip: 8.5, // lateral grip; lower while drifting
    driftGrip: 2.1,
    handbrakeDecel: 9,
  },
  onFoot: { walkSpeed: 5.2, runSpeed: 8.5 },

  police: { maxCars: 4, chaseSpeed: 47, ramRange: 7, bustTime: 3 },
  traffic: { count: 14, speed: 11 },

  palette: {
    fog: 0xf6c489,
    sky: 0xffd9a0,
    sun: 0xffd9a3,
    sunIntensity: 2.2,
    hemiSky: 0xffe3b3,
    hemiGround: 0x8a6a4f,
    heroRed: 0xd92027,
    asphalt: 0x3b3b42,
    sand: 0xe9d29e,
    ocean: 0x2e7f9e,
    glass: 0x9fc6dd,
  },
};

// District lookup for a world position.
export function districtAt(x, z) {
  for (const d of CFG.districts) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.name;
  }
  return 'SOLMAR BAY';
}
