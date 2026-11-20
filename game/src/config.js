// SOLMAR BAY — shared constants: city layout, districts, palette, physics.
// Every number here is the game's own invention: an original coastal city at golden hour.

var SB = window.SB || (window.SB = {});

SB.config = {
  // World: a 700 x 700 m coastal city. North is -z, east is +x.
  worldHalf: 350,
  beachX: 280, // sand starts here
  seaX: 330, // open water starts here
  marina: { x: 255, z: 265 }, // marina basin centre (south-east)

  // Streets: a grid every 80 m, roads 12 m wide, sidewalks 4 m.
  streets: [-320, -240, -160, -80, 0, 80, 160, 240, 320],
  roadHalf: 6,

  // Golden hour, CLEAR AIR (V15's fix): thin fog only, so the skyline stays crisp.
  // Linear fog: nothing is fogged closer than 380 m; even the far edge of the city
  // (700 m away) is only about a quarter fogged. No whiteout.
  fogColor: 0xf0d9ae,
  fogNear: 380,
  fogFar: 1500,
  skyTop: 0x7fb2e0, // pale blue zenith
  skyHorizon: 0xffd9a0, // warm gold at the horizon
  sunColor: 0xffdca6,
  sunIntensity: 2.4,
  // Sun in the south-west, behind and above the chase camera.
  sunPos: [-260, 240, 260],
  hemiSky: 0xbfd9ee,
  hemiGround: 0x8a7a5e,
  hemiIntensity: 0.85,

  // Seven named districts (rectangles in world coordinates).
  districts: [
    { name: 'OLD TOWN', x0: -350, z0: -350, x1: -80, z1: -80, color: '#c98a4b' },
    { name: 'DOWNTOWN', x0: -80, z0: -350, x1: 200, z1: -80, color: '#4b7fc9' },
    { name: 'SOLMAR BEACH', x0: 200, z0: -350, x1: 350, z1: 100, color: '#e0b96a' },
    { name: 'PALM ROW', x0: -80, z0: -80, x1: 200, z1: 120, color: '#5aa864' },
    { name: 'HARBOR HEIGHTS', x0: -350, z0: -80, x1: -80, z1: 120, color: '#8a6fc9' },
    { name: 'SUNSET FLATS', x0: -80, z0: 120, x1: 200, z1: 350, color: '#c96a5a' },
    { name: 'MARINA BAY', x0: 200, z0: 100, x1: 350, z1: 350, color: '#4ba8c9' },
  ],

  // Named avenues for the map (street coordinate -> name).
  streetNames: {
    '-320': 'NORTH BAY RD', '-240': 'CORAL LANE', '-160': 'GULL STREET',
    '-80': 'PALM AVENUE', '0': 'CENTRAL AVE', '80': 'SUNSET BLVD',
    '160': 'HARBOR ROAD', '240': 'OCEAN DRIVE', '320': 'BAY STREET',
  },

  // Sunset Sprint: six checkpoints, in order, with the mission timer.
  mission: {
    name: 'SUNSET SPRINT',
    timeLimit: 150,
    checkpoints: [
      { name: 'Ocean Drive North', x: 240, z: -280 },
      { name: 'Downtown Plaza', x: 80, z: -200 },
      { name: 'Palm Row', x: 40, z: 0 },
      { name: 'Harbor Heights', x: -240, z: 40 },
      { name: 'Sunset Flats', x: 0, z: 240 },
      { name: 'Marina Bay', x: 250, z: 265 },
    ],
  },

  // Hero car: bright red, arcade handling.
  car: {
    color: 0xd21f26,
    accel: 16,
    brake: 26,
    maxSpeed: 38, // ~137 km/h
    maxReverse: 11,
    steerMax: 0.55,
    // How fast the velocity direction chases the heading (per second):
    // 8 normally (grippy), 2.5 on the handbrake (the tail steps out = drift).
    alignNormal: 8,
    alignDrift: 2.5,
  },

  // Population.
  pedestrians: 20,
  trafficCars: 12,
  policeCars: 3,
  marinaBoats: 6,
  marinaCrew: 3,

  // Palette for buildings and props (warm, sun-soaked; no purple, no magenta).
  buildingColors: [0xe8dcc8, 0xd9c4a5, 0xcbb89a, 0xead9b8, 0xcfd8de, 0xb8c8d4, 0xe0cfa8],
  trafficColors: [0x2e6fb0, 0xe8b93c, 0x3c8a5a, 0xd8d8d8, 0x333333, 0xb0703c, 0x7a4a8a],
  peopleColors: [0xe8b93c, 0x3c8a5a, 0x2e6fb0, 0xd25a5a, 0x8a6fc9, 0xe8e8e8, 0x333333],
  boatHulls: [0x1f3a5f, 0xa32a2a, 0x1f6a4a, 0xe8e8e8, 0xd98a2b, 0x2a6a8a],
};
