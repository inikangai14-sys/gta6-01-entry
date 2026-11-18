// Solmar Bay — pedestrians: low-poly walkers on the sidewalks who stroll,
// turn at corners, and run away when a car or a gunshot gets too close.

SB.Pedestrians = (function () {
  function buildPedMesh(shirtColor) {
    var g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: SB.Rng.pick([0xd9a066, 0x8a5a3b, 0xe8b88a, 0xc98a5a]) });
    var shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
    var pants = new THREE.MeshLambertMaterial({ color: SB.Rng.pick([0x2c3e50, 0x5d4037, 0x37474f, 0x6d4c41]) });
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 0.3), pants);
    legL.position.set(-0.18, 0.38, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.18; g.add(legR);
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.45), shirt);
    body.position.y = 1.2; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
    head.position.y = 1.95; g.add(head);
    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), shirt);
    armL.position.set(-0.55, 1.2, 0); g.add(armL);
    var armR = armL.clone(); armR.position.x = 0.55; g.add(armR);
    g.userData = { legL: legL, legR: legR, armL: armL, armR: armR };
    return g;
  }

  function spawnOne(x, z) {
    var vertical = SB.Rng.chance(0.5);
    var mesh = buildPedMesh(SB.Rng.pick(SB.PALETTE.pedShirts));
    mesh.position.set(x, 0, z);
    SB.actorGroup.add(mesh);
    var ped = {
      mesh: mesh,
      pos: mesh.position,
      heading: SB.Rng.range(0, Math.PI * 2),
      speed: SB.Rng.range(1.2, 2.4),
      walkPhase: SB.Rng.range(0, 6),
      alive: true,
      fleeing: 0,
      vertical: vertical,
    };
    SB.peds.push(ped);
    return ped;
  }

  return {
    spawn: function (n) {
      for (var i = 0; i < n; i++) {
        // Sidewalk spots: just off a road centreline.
        var road = SB.Rng.pick(SB.CFG.roads);
        var along = SB.Rng.range(-180, 180);
        var side = SB.Rng.chance(0.5) ? 1 : -1;
        var x, z;
        if (SB.Rng.chance(0.5)) { x = road + side * 9.5; z = along; }
        else { x = along; z = road + side * 9.5; }
        spawnOne(x, z);
      }
      // A few beach strollers for the cover shot.
      spawnOne(218, 40); spawnOne(222, -30); spawnOne(214, 90);
    },
    update: function (dt) {
      var p = SB.player;
      SB.peds.forEach(function (ped) {
        if (!ped.alive) return;
        // Flee from the player's car or from nearby gunfire.
        var threat = SB.dist2D(ped.pos.x, ped.pos.z, p.pos.x, p.pos.z);
        var fleeing = (p.inCar && threat < 12 && Math.abs(p.car ? p.car.speed : 0) > 4) || threat < 3;
        if (fleeing) {
          ped.fleeing = 1.2;
          var away = Math.atan2(ped.pos.x - p.pos.x, ped.pos.z - p.pos.z);
          ped.heading = SB.angleLerp(ped.heading, away, Math.min(1, dt * 6));
        }
        var speed = ped.fleeing > 0 ? 5.5 : ped.speed;
        ped.fleeing -= dt;
        ped.pos.x += Math.sin(ped.heading) * speed * dt;
        ped.pos.z += Math.cos(ped.heading) * speed * dt;
        // Turn at intersections so walkers stay on the sidewalks.
        var roads = SB.CFG.roads;
        var onX = null, onZ = null;
        for (var i = 0; i < roads.length; i++) {
          if (Math.abs(ped.pos.x - (roads[i] + 9.5)) < 1 || Math.abs(ped.pos.x - (roads[i] - 9.5)) < 1) onX = ped.pos.x;
          if (Math.abs(ped.pos.z - (roads[i] + 9.5)) < 1 || Math.abs(ped.pos.z - (roads[i] - 9.5)) < 1) onZ = ped.pos.z;
        }
        if ((onX !== null && onZ !== null) && SB.Rng.chance(dt * 0.5)) {
          ped.heading += Math.PI / 2 * (SB.Rng.chance(0.5) ? 1 : -1);
        }
        if (ped.pos.x > 232 || ped.pos.x < -200 || ped.pos.z > 200 || ped.pos.z < -200) {
          ped.heading += Math.PI;
          ped.pos.x = SB.clamp(ped.pos.x, -198, 230);
          ped.pos.z = SB.clamp(ped.pos.z, -198, 198);
        }
        ped.walkPhase += dt * speed * 2.4;
        var swing = Math.sin(ped.walkPhase) * 0.5;
        ped.mesh.userData.legL.rotation.x = swing;
        ped.mesh.userData.legR.rotation.x = -swing;
        ped.mesh.userData.armL.rotation.x = -swing * 0.7;
        ped.mesh.userData.armR.rotation.x = swing * 0.7;
        ped.mesh.position.set(ped.pos.x, 0, ped.pos.z);
        ped.mesh.rotation.y = ped.heading;
      });
    },
  };
})();
