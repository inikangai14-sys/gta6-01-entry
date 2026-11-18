// Solmar Bay — quick visual effects: dust puffs, impact sparks and the
// floating cash/health pickups scattered around the city.

SB.Effects = (function () {
  var puffs = [];
  var sparks = [];
  var puffGeo = null;
  var sparkGeo = null;

  function getPuffGeo() {
    if (!puffGeo) puffGeo = new THREE.SphereGeometry(0.45, 6, 5);
    return puffGeo;
  }
  function getSparkGeo() {
    if (!sparkGeo) sparkGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    return sparkGeo;
  }

  return {
    puff: function (x, y, z, color) {
      var m = new THREE.Mesh(getPuffGeo(), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.7 }));
      m.position.set(x, y, z);
      SB.effectGroup.add(m);
      puffs.push({ mesh: m, life: 0.6, max: 0.6 });
    },
    sparks: function (x, y, z) {
      for (var i = 0; i < 10; i++) {
        var m = new THREE.Mesh(getSparkGeo(), new THREE.MeshBasicMaterial({ color: 0xffd76e }));
        m.position.set(x, y, z);
        m.userData.vx = SB.Rng.range(-6, 6);
        m.userData.vy = SB.Rng.range(2, 8);
        m.userData.vz = SB.Rng.range(-6, 6);
        SB.effectGroup.add(m);
        sparks.push({ mesh: m, life: 0.5, max: 0.5 });
      }
    },
    update: function (dt) {
      for (var i = puffs.length - 1; i >= 0; i--) {
        var p = puffs[i];
        p.life -= dt;
        if (p.life <= 0) { SB.effectGroup.remove(p.mesh); puffs.splice(i, 1); continue; }
        p.mesh.scale.setScalar(1 + (1 - p.life / p.max) * 1.6);
        p.mesh.material.opacity = 0.7 * (p.life / p.max);
        p.mesh.position.y += dt * 0.8;
      }
      for (var j = sparks.length - 1; j >= 0; j--) {
        var s = sparks[j];
        s.life -= dt;
        if (s.life <= 0) { SB.effectGroup.remove(s.mesh); sparks.splice(j, 1); continue; }
        s.mesh.userData.vy -= 20 * dt;
        s.mesh.position.x += s.mesh.userData.vx * dt;
        s.mesh.position.y += s.mesh.userData.vy * dt;
        s.mesh.position.z += s.mesh.userData.vz * dt;
        if (s.mesh.position.y < 0.1) s.mesh.position.y = 0.1;
      }
    },
    // Floating pickups: green cross = health, yellow $ = cash, grey box = ammo.
    spawnPickups: function () {
      var spots = [
        { x: -14, z: -14, kind: 'health' },
        { x: 14, z: -150, kind: 'ammo' },
        { x: -150, z: 14, kind: 'cash' },
        { x: 110, z: 110, kind: 'health' },
        { x: 196, z: 90, kind: 'cash' },
        { x: -90, z: -110, kind: 'ammo' },
        { x: 60, z: 150, kind: 'cash' },
        { x: -170, z: 60, kind: 'health' },
      ];
      spots.forEach(function (s) {
        var g = new THREE.Group();
        var color = s.kind === 'health' ? 0x2ecc71 : (s.kind === 'cash' ? 0xf2c230 : 0x9aa0a3);
        var box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: color }));
        box.position.y = 1.1; g.add(box);
        var glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.25 }));
        glow.position.y = 1.1; g.add(glow);
        g.position.set(s.x, 0, s.z);
        SB.effectGroup.add(g);
        SB.pickups.push({ mesh: g, kind: s.kind, x: s.x, z: s.z, taken: false, phase: SB.Rng.range(0, 6) });
      });
    },
    updatePickups: function (dt) {
      var p = SB.player;
      SB.pickups.forEach(function (pk) {
        if (pk.taken) return;
        pk.phase += dt;
        pk.mesh.position.y = Math.sin(pk.phase * 2) * 0.25;
        pk.mesh.rotation.y += dt * 1.2;
        if (SB.dist2D(p.pos.x, p.pos.z, pk.x, pk.z) < 2.2 && !p.inCar) {
          pk.taken = true;
          pk.mesh.visible = false;
          if (pk.kind === 'health') {
            p.health = Math.min(p.maxHealth, p.health + 40);
            SB.Hud.flash('Picked up a medkit. +40 health.');
          } else if (pk.kind === 'cash') {
            p.cash += 75;
            SB.Hud.flash('Found $75 stashed in an alley.');
          } else {
            p.reserveAmmo += 24;
            SB.Hud.flash('Picked up ammo. +24 rounds.');
          }
          SB.Audio.pickup();
        }
      });
    },
  };
})();
