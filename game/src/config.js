// Solmar Bay — shared constants, world layout and the global game state.
// Every other module reads or writes through the single SB object defined here.

var SB = {
  // ---- runtime handles (filled in by main.js) ----
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  cityGroup: null,
  actorGroup: null,
  effectGroup: null,

  // ---- run state ----
  mode: 'title', // title | play | paused | dead | busted | complete
  started: false,
  elapsed: 0,
  gameMinutes: 9 * 60 + 5, // in-world clock starts 09:05
  muted: false,
  shotMode: null,
  seed: 7,
  frames: 0,

  // ---- camera ----
  camYaw: 0.6,
  camPitch: 0.32,
  camDist: 9,

  // ---- player ----
  player: {
    pos: null, // THREE.Vector3, set at boot
    heading: 0, // facing angle, radians
    speed: 0,
    velY: 0,
    onGround: true,
    health: 100,
    maxHealth: 100,
    cash: 120,
    wanted: 0,
    wantedHeat: 0, // seconds since last crime, drives cooldown
    inCar: false,
    car: null,
    ammo: 12,
    reserveAmmo: 48,
    meleeCooldown: 0,
    shootCooldown: 0,
    invulnerable: 0,
    walkPhase: 0,
    dead: false,
  },

  // ---- world actors ----
  cars: [], // parked + drivable cars (also includes traffic? no: traffic is separate)
  traffic: [], // AI cars on the roads
  peds: [], // pedestrians
  police: [], // police cars + foot officers chasing the player
  enemies: [], // mission thugs
  pickups: [], // health / ammo / cash pickups

  // ---- missions ----
  mission: {
    index: 0, // which mission is current (0..3)
    stage: 'idle', // idle | active | done | failed
    timer: 0,
    timerMax: 0,
    target: null, // THREE.Vector3 of the current objective
    targetLabel: '',
    passenger: false, // Rico riding along
    stashTaken: false,
    tailStars: 0,
  },
  missionsDone: 0,
  totalEarned: 0,

  // ---- save ----
  save: { bestCash: 0, missionsDone: 0, gamesPlayed: 0 },
};

// ---- world geometry constants ----
SB.CFG = {
  block: 80, // distance between road centrelines
  roadHalf: 7, // half width of a road
  roads: [-160, -80, 0, 80, 160], // road centreline coordinates (both axes)
  cityHalf: 200, // playable city extent (x and z, before the beach)
  beachX: 208, // sand starts here
  oceanX: 258, // water starts here
  pierZ: 0,
  walkSpeed: 6,
  runSpeed: 10,
  carAccel: 22,
  carMaxSpeed: 34,
  carMaxReverse: 12,
  trafficSpeed: 11,
  policeSpeed: 30,
  starDecaySeconds: 14,
  bustedSeconds: 1.6,
};

// ---- palette: sun-soaked coastal city, all original ----
SB.PALETTE = {
  skyTop: 0x3f8fd2,
  skyBottom: 0xbfd9ea,
  sun: 0xfff2c8,
  grass: 0x6fae5e,
  sand: 0xe8d29a,
  ocean: 0x2e7fa8,
  oceanDeep: 0x1d5c80,
  road: 0x3a3f46,
  roadLine: 0xf5d76e,
  sidewalk: 0x9aa0a3,
  building: [0xe8b48a, 0xd98f7a, 0x8fb8c9, 0xc9b458, 0xb08a9a, 0x7fb08a, 0xe0d6c2, 0x9a8fc9],
  glass: 0x9fc6d8,
  palmTrunk: 0x8a6b48,
  palmLeaf: 0x3f9e4d,
  carColors: [0xd23b3b, 0x2e6fd8, 0xf2c230, 0x3aa655, 0xe8e8e8, 0x222831, 0xd97b2e, 0x8a4fd0],
  policeCar: 0x1e2a3a,
  playerShirt: 0x27ae60,
  playerPants: 0x2c3e50,
  pedShirts: [0xe74c3c, 0x3498db, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0xe67e22],
};

// ---- mission catalogue (story: all original names) ----
SB.MISSIONS = [
  {
    name: 'First Job',
    briefing: 'Mara needs a package at the pier. Drive it there before the clock runs out — no questions, no stops.',
    intro: 'Pick up the package at the blue marker, then drive it to Solmar Pier.',
    targetLabel: 'Deliver the package to the pier',
    timeLimit: 150,
    reward: 250,
  },
  {
    name: 'Pick Up Rico',
    briefing: 'Your old friend Rico is waiting by the marina. Pick him up and get him to the hideout on Coral Row.',
    intro: 'Drive to Rico at the marina, then take him to the hideout.',
    targetLabel: 'Pick up Rico at the marina',
    timeLimit: 240,
    reward: 400,
  },
  {
    name: 'Lose the Tail',
    briefing: 'The Solmar PD is on you. Shake the tail — lose your wanted level and meet Mara at the hideout.',
    intro: 'You are being chased. Lose the police, then reach the hideout.',
    targetLabel: 'Lose your wanted level',
    timeLimit: 300,
    reward: 350,
  },
  {
    name: 'Harbor Heist',
    briefing: 'The harbor warehouse holds a stash of smuggled cash. Deal with the guards, grab it, and vanish.',
    intro: 'Fight through the warehouse guards, grab the stash, escape to the hideout.',
    targetLabel: 'Reach the harbor warehouse',
    timeLimit: 360,
    reward: 800,
  },
];

// ---- small shared helpers ----
SB.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
SB.lerp = function (a, b, t) { return a + (b - a) * t; };
SB.dist2D = function (ax, az, bx, bz) {
  var dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
};
SB.angleLerp = function (a, b, t) {
  var d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};
SB.formatClock = function (minutes) {
  var h = Math.floor(minutes / 60) % 24;
  var m = Math.floor(minutes % 60);
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
};
SB.formatCash = function (n) { return '$' + Math.floor(n).toLocaleString('en-US'); };
