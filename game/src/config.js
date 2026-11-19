// SOLMAR BAY — configuration: palette, names, districts, missions data.
// Every name here is invented for this game. Nothing is copied from any
// commercial game or from any other entry.
(function () {
  'use strict';
  window.SB = window.SB || {};
  SB.config = {
    // --- palette: bright night-neon-rain, never muddy ---
    skyTop: 0x070a24,
    skyHorizon: 0x2a1e5e,
    fogColor: 0x0b102e,
    fogDensity: 0.0032,
    roadColor: 0x0b0e1c,
    roadRoughness: 0.18,
    roadMetalness: 0.75,
    heroRed: 0xe62129,
    neonPink: 0xff2d95,
    neonCyan: 0x00e5ff,
    neonYellow: 0xffd23f,
    neonGreen: 0x2eff8f,
    neonOrange: 0xff7a1a,
    policeRed: 0xff2020,
    policeBlue: 0x2080ff,
    lampWarm: 0xffb347,
    cashGreen: 0x39ff88,

    // --- city layout ---
    cityHalfX: 170,
    cityHalfZ: 200,
    avenueX: 0,
    avenueWidth: 16,
    streetEvery: 40,
    blockSize: 40,

    // --- districts (our own names) ---
    districts: [
      { name: 'LUMEN STRIP', color: '#ff2d95', x: -40, z: -20, w: 120, h: 160 },
      { name: 'MARINA DEL SOL', color: '#00e5ff', x: -150, z: 120, w: 120, h: 90 },
      { name: 'VISTA HEIGHTS', color: '#ffd23f', x: 60, z: -160, w: 150, h: 110 },
      { name: 'OLD HARBOUR', color: '#ff7a1a', x: -150, z: -140, w: 130, h: 110 },
      { name: 'CORAL DOCKS', color: '#2eff8f', x: 60, z: 120, w: 150, h: 100 },
    ],

    // --- neon shops along Lumen Avenue (invented names) ---
    shops: [
      { name: 'LUMEN LANES', color: '#ff2d95', kind: 'bowling' },
      { name: 'AQUA BAR', color: '#00e5ff', kind: 'bar' },
      { name: 'CORAL CLUB', color: '#ff7a1a', kind: 'club' },
      { name: 'VELVET OCTOPUS', color: '#b26bff', kind: 'bar' },
      { name: 'PIER 9 DINER', color: '#ffd23f', kind: 'diner' },
      { name: 'MIDNIGHT RAMEN', color: '#ff2d55', kind: 'food' },
      { name: 'SOLMAR SUSHI', color: '#2eff8f', kind: 'food' },
      { name: 'GALAXY BOWL', color: '#00e5ff', kind: 'bowling' },
      { name: 'BRASS ANCHOR', color: '#ffb347', kind: 'bar' },
      { name: 'HOTEL MIRAMAR', color: '#ff2d95', kind: 'hotel' },
      { name: 'CINEMA LUNA', color: '#7ab8ff', kind: 'cinema' },
      { name: 'VOLTA CAFE', color: '#ffd23f', kind: 'cafe' },
      { name: 'TURBO TACOS', color: '#ff7a1a', kind: 'food' },
      { name: 'DRIFT GARAGE', color: '#2eff8f', kind: 'garage' },
      { name: "SAILOR'S REST", color: '#00e5ff', kind: 'hotel' },
      { name: 'PALM LIQUOR', color: '#ff2d55', kind: 'shop' },
    ],

    // --- radio (invented stations, procedural music) ---
    radio: [
      { name: 'WAVEFORM 88.1', dj: 'DJ MARISOL', genre: 'synthwave', bpm: 112 },
      { name: 'CORAL FM 102.4', dj: 'EL CAPITAN', genre: 'latin', bpm: 96 },
      { name: 'STATIC 107.7', dj: 'NADIA VOLT', genre: 'rock', bpm: 128 },
    ],

    // --- cars ---
    heroCar: { name: 'VULPINE S', color: 0xe62129, topSpeed: 62, accel: 26 },
    policeCar: { name: 'INTERCEPTOR', topSpeed: 56, accel: 24 },
    trafficCars: [
      { name: 'CORALLO', color: 0x2e6fd8 },
      { name: 'PIERROT', color: 0xd8d8d8 },
      { name: 'MAMBA', color: 0x1fae5f },
      { name: 'SOLMAR CAB', color: 0xffd23f },
      { name: 'BRISA', color: 0xb26bff },
      { name: 'DELFIN', color: 0x00b8a9 },
    ],

    // --- crew ---
    crew: {
      rico: { name: 'RICO MARIN', role: 'wheelman', coat: '#ffd23f' },
      rosa: { name: 'MAMA ROSA', role: 'fixer', coat: '#ff2d95' },
      lena: { name: 'LENA "WRENCH" ORTIZ', role: 'mechanic', coat: '#00e5ff' },
      dario: { name: 'DARIO "FUZE" KANE', role: 'muscle', coat: '#2eff8f' },
    },

    // --- police units ---
    units: ['UNIT 7', 'UNIT 12', 'UNIT 21', 'UNIT 4', 'UNIT 9'],

    // --- the 7 story jobs ---
    missions: [
      {
        id: 1, title: 'ONE LAST JOB', chapter: 'CH 1',
        brief: 'Mama Rosa calls. Meet her at the Coral Docks. One last job, Rico.',
        stages: [
          { text: 'Get in the VULPINE S', type: 'enter_car' },
          { text: 'Drive to Coral Docks', type: 'reach', x: 120, z: 150, r: 12 },
          { text: 'Talk to Mama Rosa', type: 'reach', x: 118, z: 156, r: 6 },
        ],
        pay: 1200, respect: 120,
        dialogue: [
          { who: 'rosa', text: 'Rico. One last job and we are square. Meet me at the docks.' },
          { who: 'rico', text: 'Last time you said that, I spent a night in a cell.' },
        ],
      },
      {
        id: 2, title: "WRENCH'S FAVOR", chapter: 'CH 1',
        brief: 'Lena needs a gearbox from Vista Heights. Fetch it, bring it to the garage.',
        stages: [
          { text: 'Pick up the gearbox', type: 'reach', x: 110, z: -140, r: 10 },
          { text: 'Deliver it to Drift Garage', type: 'reach', x: -14, z: 30, r: 10 },
        ],
        pay: 900, respect: 100,
        dialogue: [
          { who: 'lena', text: 'Gearbox is at the Vista Heights yard. Do not scratch the paint.' },
        ],
      },
      {
        id: 3, title: 'NIGHT RUN', chapter: 'CH 2',
        brief: 'Three checkpoints, one timer. The Strip is watching. Show them the VULPINE S.',
        stages: [
          { text: 'Checkpoint 1: Lumen Strip', type: 'reach', x: 0, z: -80, r: 10, timer: 75 },
          { text: 'Checkpoint 2: Old Harbour', type: 'reach', x: -110, z: -120, r: 10 },
          { text: 'Checkpoint 3: Marina del Sol', type: 'reach', x: -120, z: 140, r: 10 },
        ],
        pay: 1800, respect: 160,
        dialogue: [
          { who: 'dario', text: 'Timer is running, Rico. Drive like you stole it. You did.' },
        ],
      },
      {
        id: 4, title: 'HEAT WAVE', chapter: 'CH 2',
        brief: 'The cops are all over the Strip. Lose a 3-star wanted level and vanish.',
        stages: [
          { text: 'Raise the heat: reach 3 stars', type: 'wanted_at_least', stars: 3 },
          { text: 'Lose the cops', type: 'lose_heat' },
          { text: 'Reach the safehouse', type: 'reach', x: -60, z: 60, r: 10 },
        ],
        pay: 2200, respect: 200,
        dialogue: [
          { who: 'lena', text: 'Three stars and counting. Break their line of sight, Rico.' },
        ],
      },
      {
        id: 5, title: 'HARBOR LIGHTS', chapter: 'CH 3',
        brief: 'A package is coming in by boat at Old Harbour. Collect it, deliver to the marina.',
        stages: [
          { text: 'Collect the package', type: 'reach', x: -140, z: -130, r: 10 },
          { text: 'Deliver to Marina del Sol', type: 'reach', x: -130, z: 150, r: 10 },
        ],
        pay: 2600, respect: 220,
        dialogue: [
          { who: 'rosa', text: 'The boat docks at midnight. Do not keep the harbour waiting.' },
        ],
      },
      {
        id: 6, title: 'THE LONG WAY HOME', chapter: 'CH 3',
        brief: 'Dario is in trouble downtown. Pick him up and drive him home through the heat.',
        stages: [
          { text: 'Pick up Dario downtown', type: 'reach', x: 40, z: -170, r: 10 },
          { text: 'Drive Dario home', type: 'reach', x: -90, z: 170, r: 10 },
        ],
        pay: 3200, respect: 260,
        dialogue: [
          { who: 'dario', text: 'I am at the tower, Rico. Cops everywhere. Bring the fast car.' },
        ],
      },
      {
        id: 7, title: 'SOLMAR RUN', chapter: 'CH 4',
        brief: 'The finale. Five stars, one city, one last run to the safehouse. Finish it.',
        stages: [
          { text: 'Grab the case at Coral Docks', type: 'reach', x: 130, z: 160, r: 10 },
          { text: 'Outrun the 5-star hunt', type: 'wanted_at_least', stars: 5 },
          { text: 'Reach the safehouse', type: 'reach', x: -60, z: 60, r: 10 },
        ],
        pay: 5000, respect: 400,
        dialogue: [
          { who: 'rosa', text: 'Five stars, Rico. This is the run they will talk about.' },
          { who: 'rico', text: 'Then let them talk. VULPINE S, full send.' },
        ],
      },
    ],

    // --- landmarks for the AAA map ---
    landmarks: [
      { name: 'LUMEN TOWER', icon: 'tower', x: 30, z: -170 },
      { name: 'PIER 9', icon: 'pier', x: -140, z: 150 },
      { name: 'PELICAN ISLE', icon: 'isle', x: 195, z: -40 },
      { name: 'DRIFT GARAGE', icon: 'garage', x: -14, z: 30 },
      { name: 'CINEMA LUNA', icon: 'cinema', x: 14, z: -50 },
      { name: 'SAFEHOUSE', icon: 'house', x: -60, z: 60 },
      { name: 'CORAL DOCKS', icon: 'anchor', x: 120, z: 155 },
      { name: 'OLD HARBOUR', icon: 'boat', x: -140, z: -130 },
    ],

    startCash: 42780,
    startRespect: 320,
    respectMax: 1000,
  };
})();
