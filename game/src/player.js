// Solmar Bay — the player on foot: a low-poly character, WASD movement,
// running, jumping, and the walk-cycle animation.

SB.Player = (function () {
  var mesh = null;
  var legL = null, legR = null, armL = null, armR = null;
  var body = null;

  function buildMesh() {
    var g = new THREE.Group();
    var skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    var shirt = new THREE.MeshLambertMaterial({ color: SB.PALETTE.playerShirt });
    var pants = new THREE.MeshLambertMaterial({ color: SB.PALETTE.playerPants });
    // Legs (animated when walking).
    legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.34), pants);
    legL.position.set(-0.22, 0.42, 0); g.add(legL);
    legR = legL.clone(); legR.position.x = 0.22; g.add(legR);
    // Torso + head.
    body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.5), shirt);
    body.position.y = 1.35; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skin);
    head.position.y = 2.2; g.add(head);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.16, 12), new THREE.MeshLambertMaterial({ color: 0xf2c230 }));
    cap.position.y = 2.45; g.add(cap);
    var brim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), new THREE.MeshLambertMaterial({ color: 0xf2c230 }));
    brim.position.set(0, 2.4, 0.42); g.add(brim);
    // Arms.
    armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), shirt);
    armL.position.set(-0.62, 1.35, 0); g.add(armL);
    armR = armL.clone(); armR.position.x = 0.62; g.add(armR);
    // A green backpack so the player reads at a distance.
    var pack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.28), new THREE.MeshLambertMaterial({ color: 0x1e8449 }));
    pack.position.set(0, 1.4, -0.38); g.add(pack);
    g.traverse(function (o) { o.castShadow = false; });
    return g;
  }

  function spawn() {
    var p = SB.player;
    if (!mesh) {
      mesh = buildMesh();
      SB.actorGroup.add(mesh);
    }
    if (!p.pos) p.pos = new THREE.Vector3(6, 0, 6);
    mesh.position.copy(p.pos);
    mesh.rotation.y = p.heading;
    mesh.visible = true;
  }

  return {
    spawn: spawn,
    mesh: function () { return mesh; },
    hide: function () { if (mesh) mesh.visible = false; },
    show: function () { if (mesh) mesh.visible = true; },
    update: function (dt) {
      var p = SB.player;
      if (p.inCar || p.dead || SB.mode !== 'play') return;
      var ax = SB.Input.axis();
      var run = SB.Input.isDown('shift');
      var speed = run ? SB.CFG.runSpeed : SB.CFG.walkSpeed;
      // Movement is relative to the camera yaw.
      var sin = Math.sin(SB.camYaw), cos = Math.cos(SB.camYaw);
      var mx = (ax.x * cos - ax.y * sin);
      var mz = (ax.x * sin + ax.y * cos);
      var len = Math.sqrt(mx * mx + mz * mz);
      if (len > 0.01) {
        mx /= len; mz /= len;
        var targetHeading = Math.atan2(mx, mz);
        p.heading = SB.angleLerp(p.heading, targetHeading, Math.min(1, dt * 12));
        var nx = p.pos.x + mx * speed * dt;
        var nz = p.pos.z + mz * speed * dt;
        // Keep the player inside the island and out of buildings.
        nx = SB.clamp(nx, -205, 335);
        nz = SB.clamp(nz, -205, 205);
        var fixed = SB.City.collide(nx, nz, 0.7);
        p.pos.x = fixed.x; p.pos.z = fixed.z;
        p.walkPhase += dt * speed * 1.6;
        p.speed = speed;
      } else {
        p.speed = 0;
      }
      // Jump.
      if (SB.Input.wasPressed(' ') && p.onGround) {
        p.velY = 7.5;
        p.onGround = false;
      }
      if (!p.onGround) {
        p.velY -= 22 * dt;
        p.pos.y += p.velY * dt;
        if (p.pos.y <= 0) { p.pos.y = 0; p.velY = 0; p.onGround = true; }
      }
      // Animate the walk cycle.
      var swing = p.speed > 0.1 ? Math.sin(p.walkPhase) * 0.55 : 0;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.7;
      armR.rotation.x = swing * 0.7;
      body.position.y = 1.35 + (p.speed > 0.1 ? Math.abs(Math.sin(p.walkPhase)) * 0.07 : 0);
      mesh.position.copy(p.pos);
      mesh.rotation.y = p.heading;
      // Footstep dust puffs while running.
      if (p.speed > 8 && Math.random() < dt * 6) SB.Effects.puff(p.pos.x, 0.15, p.pos.z, 0xcfc4a8);
    },
    // Place the player at a spot (used by respawns and shot presets).
    teleport: function (x, z, heading) {
      var p = SB.player;
      p.pos.set(x, 0, z);
      p.heading = heading || 0;
      p.velY = 0; p.onGround = true;
      if (mesh) { mesh.position.copy(p.pos); mesh.rotation.y = p.heading; }
    },
  };
})();
