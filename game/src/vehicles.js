// Solmar Bay — cars: the factory that builds every car mesh, plus arcade
// driving physics for the car the player is in (enter with E, WASD to drive).

SB.Vehicles = (function () {
  var wheelGeo = null;

  function buildCarMesh(color, isPolice) {
    var g = new THREE.Group();
    var paint = new THREE.MeshLambertMaterial({ color: color });
    var dark = new THREE.MeshLambertMaterial({ color: 0x222831 });
    var glass = new THREE.MeshLambertMaterial({ color: 0x9fc6d8 });
    // Body + cabin + bumpers.
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
    body.position.y = 0.55; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2), glass);
    cabin.position.set(0, 1.05, -0.2); g.add(cabin);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.9), paint);
    roof.position.set(0, 1.4, -0.2); g.add(roof);
    var front = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 0.4), dark);
    front.position.set(0, 0.42, 2.25); g.add(front);
    var rear = front.clone(); rear.position.z = -2.25; g.add(rear);
    // Headlights / taillights.
    var lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), lightMat);
    hl.position.set(-0.65, 0.62, 2.42); g.add(hl);
    var hl2 = hl.clone(); hl2.position.x = 0.65; g.add(hl2);
    var tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    var tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    tl.position.set(-0.65, 0.62, -2.42); g.add(tl);
    var tl2 = tl.clone(); tl2.position.x = 0.65; g.add(tl2);
    // Police livery: white doors, light bar, black-and-white body.
    if (isPolice) {
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 3.2), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      stripe.position.y = 0.62; g.add(stripe);
      var bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0x2e6fd8 }));
      bar.position.set(0, 1.55, -0.2); g.add(bar);
      var bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
      bar2.position.set(0.7, 1.55, -0.2); g.add(bar2);
    }
    // Wheels.
    if (!wheelGeo) wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
    var wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    var wheels = [];
    [[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.45], [1.0, -1.45]].forEach(function (pos) {
      var w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(pos[0], 0.42, pos[1]);
      g.add(w); wheels.push(w);
    });
    g.traverse(function (o) { o.castShadow = false; });
    g.userData.wheels = wheels;
    return g;
  }

  function makeCar(x, z, heading, color, opts) {
    opts = opts || {};
    var mesh = buildCarMesh(color, !!opts.police);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    SB.actorGroup.add(mesh);
    var car = {
      mesh: mesh,
      pos: mesh.position,
      heading: heading,
      speed: 0,
      steer: 0,
      color: color,
      police: !!opts.police,
      traffic: !!opts.traffic,
      parked: !!opts.parked,
      route: opts.route || null,
      honkCooldown: 0,
    };
    return car;
  }

  function nearestCar(x, z, maxDist) {
    var best = null, bestD = maxDist;
    SB.cars.forEach(function (c) {
      var d = SB.dist2D(x, z, c.pos.x, c.pos.z);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  return {
    makeCar: makeCar,
    buildCarMesh: buildCarMesh,
    nearestCar: nearestCar,

    spawnParkedCars: function () {
      // Parked cars along the roads and at the plaza / marina / pier.
      var spots = [];
      SB.CFG.roads.forEach(function (c) {
        [-150, -70, 30, 110].forEach(function (t) {
          spots.push({ x: c + 9.5, z: t, h: 0 });
          spots.push({ x: t, z: c + 9.5, h: Math.PI / 2 });
        });
      });
      spots.push({ x: 14, z: 14, h: 0.4 });
      spots.push({ x: -14, z: 10, h: -0.6 });
      spots.push({ x: 196, z: -100, h: 1.57 });
      spots.push({ x: 216, z: 12, h: 1.57 });
      spots.push({ x: -108, z: 108, h: 0 });
      spots.forEach(function (s) {
        var car = makeCar(s.x, s.z, s.h, SB.Rng.pick(SB.PALETTE.carColors), { parked: true });
        SB.cars.push(car);
      });
    },

    enterCar: function (car) {
      var p = SB.player;
      p.inCar = true;
      p.car = car;
      car.parked = false;
      SB.Player.hide();
      SB.Hud.flash('You took the car — the owner will not be pleased.');
      SB.Police.addWanted(1, 'car theft');
      SB.Audio.horn();
    },

    exitCar: function () {
      var p = SB.player;
      if (!p.car) return;
      var car = p.car;
      var side = car.heading + Math.PI / 2;
      var x = car.pos.x + Math.sin(side) * 2.4;
      var z = car.pos.z + Math.cos(side) * 2.4;
      var fixed = SB.City.collide(x, z, 0.8);
      p.pos.set(fixed.x, 0, fixed.z);
      p.heading = car.heading;
      p.inCar = false;
      p.car = null;
      SB.Player.show();
      SB.Player.teleport(p.pos.x, p.pos.z, p.heading);
    },

    tryEnterExit: function () {
      var p = SB.player;
      if (p.dead || SB.mode !== 'play') return;
      if (p.inCar) { SB.Vehicles.exitCar(); return; }
      var car = nearestCar(p.pos.x, p.pos.z, 4.5);
      if (car) SB.Vehicles.enterCar(car);
      else SB.Hud.flash('No car close enough. Walk up to a parked car and press E.');
    },

    updateDriving: function (dt) {
      var p = SB.player;
      var car = p.car;
      if (!car) return;
      var ax = SB.Input.axis();
      // Arcade driving: W accelerates where the car points, S brakes and
      // reverses, A/D steer. The camera chases behind the car.
      var steering = -ax.x;
      if (car.speed < -0.5) steering = -steering;
      car.steer = SB.lerp(car.steer, steering, Math.min(1, dt * 8));
      car.heading += car.steer * SB.clamp(Math.abs(car.speed) / SB.CFG.carMaxSpeed, 0.15, 1) * 2.3 * dt * (car.speed >= 0 ? 1 : -1);
      if (ax.y > 0) car.speed += SB.CFG.carAccel * dt;
      else if (ax.y < 0) car.speed -= SB.CFG.carAccel * 0.7 * dt;
      else car.speed -= car.speed * 1.4 * dt; // coast down
      if (SB.Input.isDown(' ') && Math.abs(car.speed) > 2) {
        car.speed -= car.speed * 4 * dt; // handbrake
        if (Math.random() < dt * 8) SB.Effects.puff(car.pos.x, 0.2, car.pos.z, 0xbbbbbb);
      }
      car.speed = SB.clamp(car.speed, -SB.CFG.carMaxReverse, SB.CFG.carMaxSpeed);
      var nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
      var nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
      // Building collision: slide along walls, spark + slow down on impact.
      var before = SB.City.collide(nx, nz, 2.2);
      if (Math.abs(before.x - nx) > 0.01 || Math.abs(before.z - nz) > 0.01) {
        if (Math.abs(car.speed) > 8) {
          SB.Audio.crash();
          SB.Effects.sparks(car.pos.x, 1, car.pos.z);
          SB.Police.addWanted(0, 'crash');
          SB.Hud.flash('You smashed into a building!');
        }
        car.speed *= 0.4;
      }
      nx = SB.clamp(before.x, -205, 335);
      nz = SB.clamp(before.z, -205, 205);
      car.pos.x = nx; car.pos.z = nz;
      car.mesh.position.set(nx, 0, nz);
      car.mesh.rotation.y = car.heading;
      // Wheel spin + body lean.
      car.mesh.userData.wheels.forEach(function (w) { w.rotation.x += car.speed * dt * 2; });
      car.mesh.rotation.z = SB.lerp(car.mesh.rotation.z, -car.steer * 0.06, Math.min(1, dt * 6));
      // Running over a pedestrian is a crime (and grim).
      SB.peds.forEach(function (ped) {
        if (!ped.alive) return;
        if (SB.dist2D(nx, nz, ped.pos.x, ped.pos.z) < 2.4 && Math.abs(car.speed) > 3) {
          ped.alive = false;
          ped.mesh.visible = false;
          SB.Effects.puff(ped.pos.x, 1, ped.pos.z, 0xd23b3b);
          SB.Audio.crash();
          SB.Police.addWanted(1, 'hit a pedestrian');
          SB.Hud.flash('You hit a pedestrian! The police are coming.');
        }
      });
      // Speeding past a police car raises heat.
      SB.police.forEach(function (cop) {
        if (cop.car && Math.abs(car.speed) > 26 && SB.dist2D(nx, nz, cop.car.pos.x, cop.car.pos.z) < 14) {
          SB.Police.addWanted(1, 'reckless driving');
        }
      });
      p.pos.set(nx, 0, nz);
      p.heading = car.heading;
    },
  };
})();
