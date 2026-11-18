// Solmar Bay — missions and story: four jobs for Mara's crew, with a
// glowing beacon marker, timers, rewards and pass/fail screens.

SB.Missions = (function () {
  var beacon = null;
  var beaconRing = null;
  var beaconLight = null;
  var ricoMesh = null;
  var stashMesh = null;
  var packageMesh = null;

  function buildBeacon() {
    if (beacon) return;
    var g = new THREE.Group();
    var beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 2.4, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 30;
    g.add(beam);
    beaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.35, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xf2c230 })
    );
    beaconRing.rotation.x = Math.PI / 2;
    beaconRing.position.y = 0.3;
    g.add(beaconRing);
    beaconLight = new THREE.PointLight(0xf2c230, 30, 40);
    beaconLight.position.y = 4;
    g.add(beaconLight);
    g.visible = false;
    SB.effectGroup.add(g);
    beacon = g;
  }

  function setBeacon(x, z, visible) {
    buildBeacon();
    beacon.position.set(x, 0, z);
    beacon.visible = visible;
  }

  function buildRico() {
    if (ricoMesh) return;
    var g = new THREE.Group();
    var shirt = new THREE.MeshLambertMaterial({ color: 0x8a4fd0 });
    var skin = new THREE.MeshLambertMaterial({ color: 0x8a5a3b });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.5), shirt);
    body.position.y = 1.35; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skin);
    head.position.y = 2.2; g.add(head);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    legL.position.set(-0.22, 0.42, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.22; g.add(legR);
    var band = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 0.55), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
    band.position.y = 1.75; g.add(band);
    g.position.set(SB.City.locations.marina.x, 0, SB.City.locations.marina.z);
    SB.actorGroup.add(g);
    ricoMesh = g;
  }

  function buildPackageAndStash() {
    if (!packageMesh) {
      packageMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.8, 1.1),
        new THREE.MeshLambertMaterial({ color: 0x8a5a2e })
      );
      packageMesh.position.set(SB.City.locations.packageSpot.x, 0.6, SB.City.locations.packageSpot.z);
      SB.effectGroup.add(packageMesh);
    }
    if (!stashMesh) {
      stashMesh = new THREE.Group();
      for (var i = 0; i < 3; i++) {
        var bag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.9), new THREE.MeshLambertMaterial({ color: 0x2e8b6a }));
        bag.position.set(i * 1.4 - 1.4, 0.5, 0);
        bag.rotation.y = SB.Rng.range(-0.4, 0.4);
        stashMesh.add(bag);
      }
      stashMesh.position.set(SB.City.locations.warehouseDoor.x, 0, SB.City.locations.warehouseDoor.z + 4);
      stashMesh.visible = false;
      SB.effectGroup.add(stashMesh);
    }
  }

  function currentDef() { return SB.MISSIONS[SB.mission.index]; }

  function startMission(i) {
    var m = SB.mission;
    m.index = i;
    m.stage = 'active';
    m.timer = currentDef().timeLimit;
    m.timerMax = currentDef().timeLimit;
    m.passenger = false;
    m.stashTaken = false;
    m.packageGot = false;
    buildRico(); buildPackageAndStash();
    var loc = SB.City.locations;
    if (i === 0) { // First Job: grab the package, then the pier.
      m.target = new THREE.Vector3(loc.packageSpot.x, 0, loc.packageSpot.z);
      m.targetLabel = 'Pick up the package at the blue marker';
      packageMesh.visible = true;
      setBeacon(loc.packageSpot.x, loc.packageSpot.z, true);
      SB.Hud.showBriefing(currentDef());
    } else if (i === 1) { // Pick Up Rico.
      m.target = new THREE.Vector3(loc.marina.x, 0, loc.marina.z);
      m.targetLabel = 'Pick up Rico at the marina';
      ricoMesh.visible = true;
      setBeacon(loc.marina.x, loc.marina.z, true);
      SB.Hud.showBriefing(currentDef());
    } else if (i === 2) { // Lose the Tail.
      SB.Police.addWanted(2, 'the cops made you');
      m.target = new THREE.Vector3(loc.hideout.x, 0, loc.hideout.z);
      m.targetLabel = 'Lose your wanted level, then reach the hideout';
      setBeacon(loc.hideout.x, loc.hideout.z, true);
      SB.Hud.showBriefing(currentDef());
    } else { // Harbor Heist.
      m.target = new THREE.Vector3(loc.warehouseDoor.x, 0, loc.warehouseDoor.z);
      m.targetLabel = 'Reach the harbor warehouse';
      SB.Combat.spawnGuards(loc.warehouse.x, loc.warehouse.z);
      stashMesh.visible = true;
      setBeacon(loc.warehouse.x, loc.warehouse.z, true);
      SB.Hud.showBriefing(currentDef());
    }
    SB.Hud.setObjective(m.targetLabel);
  }

  function completeMission() {
    var m = SB.mission;
    var def = currentDef();
    m.stage = 'done';
    setBeacon(0, 0, false);
    SB.player.cash += def.reward;
    SB.totalEarned += def.reward;
    SB.missionsDone += 1;
    SB.save.missionsDone = Math.max(SB.save.missionsDone, SB.missionsDone);
    SB.save.bestCash = Math.max(SB.save.bestCash, SB.player.cash);
    SB.GameFlow.saveGame();
    SB.Audio.jingle();
    SB.Hud.showBanner('MISSION PASSED — ' + def.name, 'Reward ' + SB.formatCash(def.reward) + '  ·  ' + SB.formatCash(SB.player.cash) + ' total', true);
    if (SB.mission.index + 1 < SB.MISSIONS.length) {
      setTimeout(function () { startMission(SB.mission.index + 1); }, 4500);
    } else {
      setTimeout(function () { SB.GameFlow.storyComplete(); }, 4500);
    }
  }

  function failMission(reason) {
    var m = SB.mission;
    if (m.stage !== 'active') return;
    m.stage = 'failed';
    setBeacon(0, 0, false);
    SB.Audio.fail();
    SB.Hud.showBanner('MISSION FAILED', reason, false);
    setTimeout(function () { startMission(m.index); }, 4500); // retry the same job
  }

  function atTarget(radius) {
    var m = SB.mission;
    if (!m.target) return false;
    return SB.dist2D(SB.player.pos.x, SB.player.pos.z, m.target.x, m.target.z) < radius;
  }

  return {
    startMission: startMission,
    completeMission: completeMission,
    failMission: failMission,
    beacon: function () { return beacon; },

    update: function (dt) {
      var m = SB.mission;
      if (m.stage !== 'active' || SB.mode !== 'play') return;
      // Mission timer.
      m.timer -= dt;
      if (m.timer <= 0) { failMission('Out of time — Mara does not wait.'); return; }
      // Beacon pulse.
      if (beacon && beacon.visible) {
        var s = 1 + Math.sin(SB.elapsed * 4) * 0.12;
        beaconRing.scale.setScalar(s);
        beacon.rotation.y += dt * 0.8;
      }
      if (packageMesh && packageMesh.visible) packageMesh.rotation.y += dt;
      var loc = SB.City.locations;
      if (m.index === 0) {
        // Stage 1: pick up the package on foot or by car.
        if (!m.packageGot && atTarget(4)) {
          m.packageGot = true;
          packageMesh.visible = false;
          m.target = new THREE.Vector3(loc.pierBase.x, 0, loc.pierBase.z);
          m.targetLabel = 'Deliver the package to Solmar Pier';
          setBeacon(loc.pierBase.x, loc.pierBase.z, true);
          SB.Hud.setObjective(m.targetLabel);
          SB.Hud.flash('Package secured. Get it to the pier — fast.');
          SB.Audio.pickup();
        } else if (m.packageGot && atTarget(6)) {
          completeMission();
        }
      } else if (m.index === 1) {
        if (!m.passenger && atTarget(4)) {
          m.passenger = true;
          ricoMesh.visible = false;
          m.target = new THREE.Vector3(loc.hideout.x, 0, loc.hideout.z);
          m.targetLabel = 'Take Rico to the hideout on Coral Row';
          setBeacon(loc.hideout.x, loc.hideout.z, true);
          SB.Hud.setObjective(m.targetLabel);
          SB.Hud.flash('Rico: "Drive, man. The marina was getting hot."');
          SB.Audio.pickup();
        } else if (m.passenger && atTarget(6)) {
          completeMission();
        }
      } else if (m.index === 2) {
        if (SB.player.wanted === 0) {
          m.target = new THREE.Vector3(loc.hideout.x, 0, loc.hideout.z);
          m.targetLabel = 'Reach the hideout on Coral Row';
          setBeacon(loc.hideout.x, loc.hideout.z, true);
          SB.Hud.setObjective(m.targetLabel);
          if (atTarget(6)) completeMission();
        }
      } else if (m.index === 3) {
        if (!m.stashTaken) {
          if (SB.Combat.guardsLeft() === 0 && atTarget(10)) {
            m.stashTaken = true;
            stashMesh.visible = false;
            m.target = new THREE.Vector3(loc.hideout.x, 0, loc.hideout.z);
            m.targetLabel = 'Escape with the stash to the hideout';
            setBeacon(loc.hideout.x, loc.hideout.z, true);
            SB.Hud.setObjective(m.targetLabel);
            SB.Hud.flash('Stash grabbed! Lose the heat and get to the hideout.');
            SB.Police.addWanted(2, 'the warehouse alarm');
            SB.Audio.pickup();
          } else if (atTarget(10) && SB.Combat.guardsLeft() > 0) {
            SB.Hud.flash('Guards are still up — deal with them first.');
          }
        } else if (atTarget(6)) {
          completeMission();
        }
      }
    },
  };
})();
