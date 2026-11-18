// Solmar Bay — the wanted system: stars rise with crimes, the Solmar PD
// sends cars and foot officers to chase the player, and the heat cools off
// when the player stays out of sight.

SB.Police = (function () {
  var bustedTimer = 0;
  var lastCrimeAt = -999;
  var spawnCooldown = 0;

  function spawnPoliceCar() {
    var p = SB.player;
    // Appear on a road a short way from the player, facing them.
    var road = SB.Rng.pick(SB.CFG.roads);
    var along = SB.Rng.pick([-1, 1]) * SB.Rng.range(40, 70);
    var vertical = SB.Rng.chance(0.5);
    var x = vertical ? road : SB.clamp(p.pos.x + along, -190, 190);
    var z = vertical ? SB.clamp(p.pos.z + along, -190, 190) : road;
    var heading = Math.atan2(p.pos.x - x, p.pos.z - z);
    var car = SB.Vehicles.makeCar(x, z, heading, SB.PALETTE.policeCar, { police: true });
    car.speed = 10;
    var cop = { car: car, foot: false, bustedHold: 0, sirenPhase: SB.Rng.range(0, 6) };
    SB.police.push(cop);
    return cop;
  }

  function spawnFootOfficer() {
    var p = SB.player;
    var a = SB.Rng.range(0, Math.PI * 2);
    var x = SB.clamp(p.pos.x + Math.sin(a) * SB.Rng.range(25, 40), -195, 200);
    var z = SB.clamp(p.pos.z + Math.cos(a) * SB.Rng.range(25, 40), -195, 195);
    var g = new THREE.Group();
    var navy = new THREE.MeshLambertMaterial({ color: 0x1e2a3a });
    var skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.05, 0.5), navy);
    body.position.y = 1.35; g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skin);
    head.position.y = 2.2; g.add(head);
    var hat = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.39, 0.18, 12), navy);
    hat.position.y = 2.48; g.add(hat);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), navy);
    legL.position.set(-0.22, 0.42, 0); g.add(legL);
    var legR = legL.clone(); legR.position.x = 0.22; g.add(legR);
    g.position.set(x, 0, z);
    SB.actorGroup.add(g);
    var cop = { mesh: g, foot: true, pos: g.position, heading: 0, speed: 0, legL: legL, legR: legR, phase: 0, bustedHold: 0 };
    SB.police.push(cop);
    return cop;
  }

  function desiredPoliceCount() {
    var w = SB.player.wanted;
    if (w <= 0) return 0;
    if (w === 1) return 1;
    if (w === 2) return 2;
    if (w === 3) return 3;
    if (w === 4) return 4;
    return 5;
  }

  function removeCop(cop) {
    var idx = SB.police.indexOf(cop);
    if (idx >= 0) SB.police.splice(idx, 1);
    if (cop.car) { SB.actorGroup.remove(cop.car.mesh); }
    if (cop.mesh) SB.actorGroup.remove(cop.mesh);
  }

  return {
    addWanted: function (stars, reason) {
      var p = SB.player;
      if (SB.mode !== 'play' && SB.shotMode === null) return;
      if (stars > 0) {
        p.wanted = SB.clamp(p.wanted + stars, 0, 5);
        p.wantedHeat = 0;
        lastCrimeAt = SB.elapsed;
        if (reason) SB.Hud.flash('Wanted level up! ' + reason + ' — ' + p.wanted + ' star' + (p.wanted > 1 ? 's' : ''));
      }
    },

    update: function (dt) {
      var p = SB.player;
      if (SB.mode !== 'play') return;
      spawnCooldown -= dt;
      // Keep the right number of police on the streets.
      var want = desiredPoliceCount();
      if (SB.police.length < want && spawnCooldown <= 0) {
        // Foot officers only make sense when the player is on foot; a car
        // chase needs cruisers.
        if (!p.inCar && p.wanted >= 2 && SB.Rng.chance(0.3)) spawnFootOfficer();
        else spawnPoliceCar();
        spawnCooldown = 2.5;
      }
      if (SB.police.length > want) removeCop(SB.police[SB.police.length - 1]);
      // Wanted cooldown: stay unseen and the heat dies down.
      if (p.wanted > 0) {
        p.wantedHeat += dt;
        var nearest = 999;
        SB.police.forEach(function (cop) {
          var pos = cop.car ? cop.car.pos : cop.pos;
          nearest = Math.min(nearest, SB.dist2D(p.pos.x, p.pos.z, pos.x, pos.z));
        });
        if (nearest > 70 && p.wantedHeat > SB.CFG.starDecaySeconds) {
          p.wanted -= 1;
          p.wantedHeat = 0;
          SB.Hud.flash(p.wanted > 0 ? 'The heat is dying down...' : 'You lost the police. You are clean — for now.');
        }
      }
      // Chase behaviour.
      SB.police.forEach(function (cop) {
        if (cop.foot) {
          var d = SB.dist2D(cop.pos.x, cop.pos.z, p.pos.x, p.pos.z);
          if (!p.inCar && d < 3) {
            // The officer has caught you: he stops and makes the arrest.
            cop.bustedHold += dt;
            cop.legL.rotation.x = 0;
            cop.legR.rotation.x = 0;
            if (cop.bustedHold > SB.CFG.bustedSeconds) SB.GameFlow.busted();
          } else {
            cop.bustedHold = 0;
            var target = Math.atan2(p.pos.x - cop.pos.x, p.pos.z - cop.pos.z);
            cop.heading = SB.angleLerp(cop.heading, target, Math.min(1, dt * 5));
            var speed = d > 6 ? 7.5 : 5;
            cop.pos.x += Math.sin(cop.heading) * speed * dt;
            cop.pos.z += Math.cos(cop.heading) * speed * dt;
            cop.phase += dt * speed * 2;
            cop.legL.rotation.x = Math.sin(cop.phase) * 0.5;
            cop.legR.rotation.x = -Math.sin(cop.phase) * 0.5;
          }
          cop.mesh.position.copy(cop.pos);
          cop.mesh.rotation.y = cop.heading;
        } else {
          var car = cop.car;
          var d = SB.dist2D(car.pos.x, car.pos.z, p.pos.x, p.pos.z);
          var target = Math.atan2(p.pos.x - car.pos.x, p.pos.z - car.pos.z);
          car.heading = SB.angleLerp(car.heading, target, Math.min(1, dt * 1.8));
          var targetSpeed = d > 30 ? SB.CFG.policeSpeed : 24;
          car.speed += SB.clamp(targetSpeed - car.speed, -20 * dt, 12 * dt);
          car.pos.x += Math.sin(car.heading) * car.speed * dt;
          car.pos.z += Math.cos(car.heading) * car.speed * dt;
          var fixed = SB.City.collide(car.pos.x, car.pos.z, 2.2);
          car.pos.x = fixed.x; car.pos.z = fixed.z;
          car.mesh.position.set(car.pos.x, 0, car.pos.z);
          car.mesh.rotation.y = car.heading;
          car.mesh.userData.wheels.forEach(function (w) { w.rotation.x += car.speed * dt * 2; });
          // Ram the player's car; catch the player on foot.
          if (p.inCar && p.car && d < 4.6) {
            p.car.speed *= 0.55;
            car.speed *= 0.7;
            SB.Audio.crash();
            SB.Effects.sparks(p.car.pos.x, 1, p.car.pos.z);
            p.health -= 6 * dt * 10;
            if (p.health <= 0) SB.GameFlow.wasted();
          }
          if (!p.inCar && d < 5) {
            // The cruiser pulls up and blocks you: the arrest is on.
            car.speed += (0 - car.speed) * Math.min(1, dt * 6);
            bustedTimer += dt;
            if (bustedTimer > SB.CFG.bustedSeconds) SB.GameFlow.busted();
          } else if (!p.inCar) bustedTimer = 0;
          // Police cars give up far away so the chase can be lost.
          if (d > 260) removeCop(cop);
        }
      });
      // On foot, the police never catch a car: despawn foot cops when driving.
      if (p.inCar) {
        bustedTimer = 0;
        for (var i = SB.police.length - 1; i >= 0; i--) {
          if (SB.police[i].foot) removeCop(SB.police[i]);
        }
      }
    },

    clearAll: function () {
      while (SB.police.length) removeCop(SB.police[0]);
      SB.player.wanted = 0;
      SB.player.wantedHeat = 0;
      bustedTimer = 0;
    },

    // Spawn cruisers at once (used by the chase screenshot preset).
    spawnChase: function (n) {
      for (var i = 0; i < n; i++) spawnPoliceCar();
    },
  };
})();
