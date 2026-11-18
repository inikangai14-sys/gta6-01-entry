// Solmar Bay — bootstrap and the main loop: renderer, camera follow,
// the per-frame update order, and the game-flow states (start, pause,
// busted, wasted, story complete, save/load).

SB.GameFlow = (function () {
  function loadSave() {
    try {
      var raw = localStorage.getItem('solmarbay-save');
      if (raw) {
        var s = JSON.parse(raw);
        SB.save.bestCash = s.bestCash || 0;
        SB.save.missionsDone = s.missionsDone || 0;
        SB.save.gamesPlayed = s.gamesPlayed || 0;
      }
    } catch (e) { /* fresh save */ }
  }

  function saveGame() {
    try {
      localStorage.setItem('solmarbay-save', JSON.stringify(SB.save));
    } catch (e) { /* storage unavailable; the game still plays */ }
  }

  function respawn() {
    var p = SB.player;
    var loc = SB.City.locations.hospital;
    if (p.inCar && p.car) { p.car.speed = 0; p.inCar = false; p.car = null; }
    SB.Player.show();
    SB.Player.teleport(loc.x + 8, loc.z + 24, 0); // south of the hospital, clear of its walls
    p.health = p.maxHealth;
    p.dead = false;
    p.invulnerable = 3;
    SB.Police.clearAll();
    SB.mode = 'play';
    SB.Hud.hideEnd();
  }

  return {
    loadSave: loadSave,
    saveGame: saveGame,

    startGame: function () {
      SB.Audio.unlock();
      SB.save.gamesPlayed += 1;
      saveGame();
      SB.mode = 'play';
      SB.started = true;
      SB.Hud.hideTitle();
      SB.Hud.hideEnd();
      SB.Missions.startMission(0);
      SB.Hud.flash('Welcome to Solmar Bay. Mara has a job for you — follow the gold marker.');
    },

    togglePause: function () {
      if (SB.mode === 'play') { SB.mode = 'paused'; SB.Hud.showPause(true); }
      else if (SB.mode === 'paused') { SB.mode = 'play'; SB.Hud.showPause(false); }
    },

    busted: function () {
      var p = SB.player;
      if (SB.mode !== 'play') return;
      SB.mode = 'busted';
      SB.Audio.busted();
      var fine = Math.min(p.cash, 150);
      p.cash -= fine;
      SB.Hud.showEnd('BUSTED!', 'The Solmar PD caught you. You paid ' + SB.formatCash(fine) + ' in fines and spent the night in a cell. Cash left: ' + SB.formatCash(p.cash) + '.');
      setTimeout(function () { if (SB.mode === 'busted') { respawn(); SB.Hud.flash('You are out. Mara is still waiting — get back to work.'); } }, 3500);
    },

    wasted: function () {
      var p = SB.player;
      if (SB.mode !== 'play' || p.dead) return;
      p.dead = true;
      SB.mode = 'dead';
      SB.Audio.fail();
      SB.Hud.showEnd('WASTED', 'Solmar Bay is unforgiving. You wake up at Solmar General, patched up and poorer.');
      setTimeout(function () { if (SB.mode === 'dead') { respawn(); SB.Hud.flash('Patched up. Do not make Mara wait twice.'); } }, 3500);
    },

    storyComplete: function () {
      SB.mode = 'complete';
      SB.save.bestCash = Math.max(SB.save.bestCash, SB.player.cash);
      saveGame();
      SB.Hud.showEnd('SOLMAR BAY IS YOURS', 'All four jobs done. You earned ' + SB.formatCash(SB.totalEarned) + ' and Mara owes you a drink at the pier. Free roam continues — keep the city.');
      setTimeout(function () {
        if (SB.mode === 'complete') { SB.mode = 'play'; SB.Hud.hideEnd(); SB.Missions.startMission(0); }
      }, 6000);
    },
  };
})();

SB.Main = (function () {
  var lastT = 0;
  var oceanPhase = 0;

  function setupRenderer() {
    var canvas = document.getElementById('game-canvas');
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    SB.renderer = renderer;
    window.addEventListener('resize', function () {
      SB.camera.aspect = window.innerWidth / window.innerHeight;
      SB.camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function setupCamera() {
    var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    camera.position.set(10, 8, 16);
    SB.camera = camera;
  }

  function updateCamera(dt) {
    var p = SB.player;
    // Mouse drag orbits the camera; the wheel zooms.
    var md = SB.Input.mouseDelta();
    SB.camYaw -= md.dx * 0.005;
    SB.camPitch = SB.clamp(SB.camPitch + md.dy * 0.004, 0.08, 0.9);
    var wheel = SB.Input.wheel();
    if (wheel) SB.camDist = SB.clamp(SB.camDist + wheel * 0.01, 6, 16);
    // When driving, the camera swings behind the car (camYaw = car heading
    // puts the camera on the opposite side of the car's forward vector).
    var targetYaw = SB.camYaw;
    if (p.inCar && p.car) {
      targetYaw = SB.angleLerp(SB.camYaw, p.car.heading, Math.min(1, dt * 1.2));
      SB.camYaw = targetYaw;
    }
    var dist = SB.camDist;
    var cx = p.pos.x - Math.sin(targetYaw) * Math.cos(SB.camPitch) * dist;
    var cz = p.pos.z - Math.cos(targetYaw) * Math.cos(SB.camPitch) * dist;
    var cy = p.pos.y + 2.2 + Math.sin(SB.camPitch) * dist;
    // Keep the camera out of buildings and above the ground.
    var fixed = SB.City.collide(cx, cz, 1.5);
    SB.camera.position.set(fixed.x, Math.max(cy, 1.6), fixed.z);
    // Look slightly past the player on foot, so the crosshair (screen
    // centre) aims level at what is ahead instead of down at the ground
    // just past the player's feet.
    var lookY = p.pos.y + (p.inCar ? 1.6 : 1.5);
    var lookX = p.pos.x, lookZ = p.pos.z;
    if (!p.inCar) {
      lookX = p.pos.x + Math.sin(SB.camYaw) * 6;
      lookZ = p.pos.z + Math.cos(SB.camYaw) * 6;
    }
    SB.camera.lookAt(lookX, lookY, lookZ);
  }

  function tick(t) {
    requestAnimationFrame(tick);
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    SB.elapsed += dt;
    SB.frames += 1;
    if (SB.mode === 'play') {
      SB.gameMinutes += dt * 0.9; // a game day passes in ~26 real minutes
      if (SB.player.invulnerable > 0) SB.player.invulnerable -= dt;
      SB.Player.update(dt);
      SB.Vehicles.updateDriving(dt);
      SB.Traffic.update(dt);
      SB.Pedestrians.update(dt);
      SB.Police.update(dt);
      SB.Missions.update(dt);
      SB.Combat.update(dt);
      SB.Effects.updatePickups(dt);
      if (SB.Input.wasPressed('e')) SB.Vehicles.tryEnterExit();
    }
    SB.Effects.update(dt);
    SB.Audio.update(dt);
    // Ocean shimmer: slow colour breathing.
    oceanPhase += dt;
    var om = SB.City.oceanMat();
    if (om) om.color.setHSL(0.55, 0.55, 0.42 + Math.sin(oceanPhase * 0.5) * 0.04);
    updateCamera(dt);
    SB.Hud.update();
    SB.Minimap.update();
    SB.renderer.render(SB.scene, SB.camera);
    SB.Input.endFrame();
  }

  function boot() {
    // The seed in the URL decides the city layout (?seed=7 default).
    var q = new URLSearchParams(window.location.search);
    var seed = parseInt(q.get('seed') || '7', 10);
    if (!isNaN(seed)) SB.Rng.reseed(seed);
    window.__solmarErrors = [];
    window.addEventListener('error', function (e) { window.__solmarErrors.push(String(e.message)); });

    SB.scene = new THREE.Scene();
    SB.actorGroup = new THREE.Group();
    SB.effectGroup = new THREE.Group();
    SB.scene.add(SB.actorGroup);
    SB.scene.add(SB.effectGroup);
    setupRenderer();
    setupCamera();
    SB.City.build(SB.scene);
    SB.GameFlow.loadSave();
    SB.player.pos = new THREE.Vector3(6, 0, 6);
    SB.Player.spawn();
    SB.Vehicles.spawnParkedCars();
    SB.Traffic.spawn(14);
    SB.Pedestrians.spawn(26);
    SB.Effects.spawnPickups();
    SB.Hud.build();
    SB.Minimap.build();
    SB.Input.bindCanvas(SB.renderer.domElement);
    document.getElementById('start-btn').addEventListener('click', function () { SB.GameFlow.startGame(); });
    document.getElementById('resume-btn').addEventListener('click', function () { SB.GameFlow.togglePause(); });
    document.getElementById('restart-btn').addEventListener('click', function () {
      SB.mode = 'play';
      SB.Hud.showPause(false);
      SB.Hud.hideEnd();
      SB.player.health = SB.player.maxHealth;
      SB.player.dead = false;
      SB.Police.clearAll();
      SB.Player.teleport(6, 6, 0);
    });
    document.getElementById('mute-btn').addEventListener('click', function () {
      SB.Audio.setMuted(!SB.muted);
      document.getElementById('mute-btn').textContent = SB.muted ? '🔇 Sound: Off (M)' : '🔊 Sound: On (M)';
    });
    // Screenshot presets stage the world, otherwise show the title screen.
    var shot = SB.Shots.initFromUrl();
    if (!shot) {
      SB.Hud.showTitle();
      setTimeout(function () { window.__solmarReady = true; }, 800);
    }
    lastT = performance.now();
    requestAnimationFrame(tick);
  }

  return { boot: boot };
})();

window.addEventListener('DOMContentLoaded', function () { SB.Main.boot(); });
