// Solmar Bay — combat: the pistol (hitscan raycast), melee swings, ammo,
// and the warehouse guards who fight back during the Harbor Heist.

SB.Combat = (function () {
  var raycaster = null;
  var tracer = null;
  var tracerLife = 0;

  function ensureRaycaster() {
    if (!raycaster) raycaster = new THREE.Raycaster();
    return raycaster;
  }

  function buildGuardMesh() {
    var g = new THREE.Group();
    var shirt = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
    var skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.55), shirt);
    body.position.y = 1.35; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skin);
    head.position.y = 2.2; g.add(head);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    legL.position.set(-0.22, 0.42, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.22; g.add(legR);
    // Health bar: green strip over a dark strip, scaled by health.
    var barBg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: 0x222831 }));
    barBg.position.y = 2.75; g.add(barBg);
    var barFg = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
    barFg.position.y = 2.75; g.add(barFg);
    g.userData.barFg = barFg;
    g.userData.legL = legL; g.userData.legR = legR;
    return g;
  }

  function spawnGuard(x, z) {
    var mesh = buildGuardMesh();
    mesh.position.set(x, 0, z);
    SB.actorGroup.add(mesh);
    var guard = {
      mesh: mesh,
      pos: mesh.position,
      health: 100,
      heading: SB.Rng.range(0, Math.PI * 2),
      shootCooldown: SB.Rng.range(1, 2.5),
      phase: SB.Rng.range(0, 6),
      alive: true,
    };
    SB.enemies.push(guard);
    return guard;
  }

  function fireTracer(from, to) {
    if (!tracer) {
      tracer = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 1),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
      );
      SB.effectGroup.add(tracer);
    }
    var mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    tracer.position.copy(mid);
    tracer.lookAt(to);
    tracer.scale.set(1, 1, from.distanceTo(to));
    tracer.visible = true;
    tracerLife = 0.08;
  }

  function shoot() {
    var p = SB.player;
    if (p.shootCooldown > 0 || p.inCar) return;
    if (p.ammo <= 0) {
      SB.Hud.flash('Out of ammo — press R to reload.');
      SB.Audio.blip();
      p.shootCooldown = 0.4;
      return;
    }
    p.ammo -= 1;
    p.shootCooldown = 0.28;
    SB.Audio.gunshot();
    var rc = ensureRaycaster();
    // Fire from the player's chest, level toward where the camera faces.
    // (A ray through the screen centre would dive into the ground past
    // the player, because the camera looks down at them from above.)
    var origin = new THREE.Vector3(p.pos.x, p.pos.y + 1.5, p.pos.z);
    var dir = new THREE.Vector3(Math.sin(SB.camYaw), -0.02, Math.cos(SB.camYaw)).normalize();
    rc.set(origin, dir);
    rc.far = 90;
    var targets = [];
    SB.enemies.forEach(function (e) { if (e.alive) targets.push(e.mesh); });
    SB.peds.forEach(function (pd) { if (pd.alive) targets.push(pd.mesh); });
    var hits = rc.intersectObjects(targets, true);
    var end = new THREE.Vector3();
    rc.ray.at(90, end);
    // Walls stop bullets — but only when the wall is closer than the
    // first thing the ray actually hits (a building behind the target
    // must not eat a shot that already struck the target).
    var wallT = SB.City.segmentHitsBuilding(p.pos.x, p.pos.z, end.x, end.z);
    var wallDist = wallT >= 0 ? wallT * 90 : Infinity;
    if (wallT >= 0 && (!hits.length || hits[0].distance > wallDist)) {
      end.set(
        p.pos.x + (end.x - p.pos.x) * wallT,
        1.5,
        p.pos.z + (end.z - p.pos.z) * wallT
      );
      SB.Effects.sparks(end.x, end.y, end.z);
      var wallFrom = new THREE.Vector3(
        p.pos.x + Math.sin(SB.camYaw) * 0.6,
        p.pos.y + 1.5,
        p.pos.z + Math.cos(SB.camYaw) * 0.6
      );
      fireTracer(wallFrom, end);
      SB.Effects.puff(p.pos.x, 1.6, p.pos.z, 0xffe9a8);
      return;
    }
    if (hits.length) {
      end.copy(hits[0].point);
      var hitObj = hits[0].object;
      // Walk up to the guard / pedestrian group root.
      var root = hitObj;
      while (root.parent && root.parent !== SB.actorGroup) root = root.parent;
      var guard = SB.enemies.find(function (e) { return e.mesh === root; });
      if (guard) {
        guard.health -= 34;
        SB.Effects.sparks(end.x, end.y, end.z);
        if (guard.health <= 0) {
          guard.alive = false;
          guard.mesh.visible = false;
          p.cash += 25;
          SB.Hud.flash('Guard down. +$25 lifted from his pocket.');
        }
      } else {
        var ped = SB.peds.find(function (pd) { return pd.mesh === root; });
        if (ped) {
          ped.alive = false;
          ped.mesh.visible = false;
          SB.Police.addWanted(1, 'shot a pedestrian');
          SB.Hud.flash('You shot a pedestrian! The police are coming.');
        }
      }
    }
    var from = new THREE.Vector3(
      p.pos.x + Math.sin(SB.camYaw) * 0.6,
      p.pos.y + 1.5,
      p.pos.z + Math.cos(SB.camYaw) * 0.6
    );
    fireTracer(from, end);
    // Muzzle flash puff at the player.
    SB.Effects.puff(p.pos.x, 1.6, p.pos.z, 0xffe9a8);
  }

  function melee() {
    var p = SB.player;
    if (p.meleeCooldown > 0 || p.inCar) return;
    p.meleeCooldown = 0.5;
    SB.Audio.melee();
    SB.enemies.forEach(function (e) {
      if (!e.alive) return;
      if (SB.dist2D(p.pos.x, p.pos.z, e.pos.x, e.pos.z) < 2.8) {
        e.health -= 25;
        SB.Effects.sparks(e.pos.x, 1.5, e.pos.z);
        if (e.health <= 0) { e.alive = false; e.mesh.visible = false; p.cash += 25; }
      }
    });
  }

  return {
    spawnGuards: function (cx, cz) {
      // Three guards on the open forecourt in front of the warehouse door.
      spawnGuard(cx - 6, cz + 14);
      spawnGuard(cx + 8, cz + 12);
      spawnGuard(cx - 2, cz + 20);
    },
    guardsLeft: function () {
      return SB.enemies.filter(function (e) { return e.alive; }).length;
    },
    update: function (dt) {
      var p = SB.player;
      p.shootCooldown -= dt;
      p.meleeCooldown -= dt;
      if (tracer) {
        tracerLife -= dt;
        if (tracerLife <= 0) tracer.visible = false;
      }
      if (SB.mode !== 'play' || p.dead) return;
      if (SB.Input.consumeClick() && !p.inCar) shoot();
      if (SB.Input.wasPressed('f')) melee();
      if (SB.Input.wasPressed('r')) {
        if (p.reserveAmmo > 0 && p.ammo < 12) {
          var need = 12 - p.ammo;
          var take = Math.min(need, p.reserveAmmo);
          p.ammo += take; p.reserveAmmo -= take;
          SB.Hud.flash('Reloaded. ' + p.ammo + '/12 in the mag.');
          SB.Audio.pickup();
        }
      }
      // Guards: approach the player and shoot back when close.
      SB.enemies.forEach(function (e) {
        if (!e.alive) return;
        var d = SB.dist2D(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
        e.mesh.userData.barFg.scale.x = Math.max(0.01, e.health / 100);
        if (d < 45) {
          var target = Math.atan2(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          e.heading = SB.angleLerp(e.heading, target, Math.min(1, dt * 4));
          if (d > 8) {
            e.pos.x += Math.sin(e.heading) * 4.5 * dt;
            e.pos.z += Math.cos(e.heading) * 4.5 * dt;
            e.phase += dt * 9;
            e.mesh.userData.legL.rotation.x = Math.sin(e.phase) * 0.5;
            e.mesh.userData.legR.rotation.x = -Math.sin(e.phase) * 0.5;
          }
          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0 && d < 32) {
            e.shootCooldown = SB.Rng.range(1.4, 2.6);
            // Guards cannot shoot through buildings.
            if (SB.City.segmentHitsBuilding(e.pos.x, e.pos.z, p.pos.x, p.pos.z) < 0) {
              SB.Audio.gunshot();
              if (p.invulnerable <= 0) {
                p.health -= SB.Rng.range(6, 12);
                SB.Hud.damageFlash();
                if (p.health <= 0) SB.GameFlow.wasted();
              }
            }
          }
        }
        e.mesh.position.copy(e.pos);
        e.mesh.rotation.y = e.heading;
      });
    },
  };
})();
