// Solmar Bay — AI traffic: cars that cruise the road grid, turn at
// intersections, slow for the car ahead and honk when stuck.

SB.Traffic = (function () {
  var carSpacing = 13;

  function randomRoad() {
    return SB.Rng.pick(SB.CFG.roads);
  }

  function spawnOne() {
    // Start on a random road, heading along it.
    var vertical = SB.Rng.chance(0.5);
    var road = randomRoad();
    var along = SB.Rng.range(-180, 180);
    var dir = SB.Rng.chance(0.5) ? 1 : -1;
    var x = vertical ? road + (dir > 0 ? 3.5 : -3.5) : along;
    var z = vertical ? along : road + (dir > 0 ? 3.5 : -3.5);
    var heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    var car = SB.Vehicles.makeCar(x, z, heading, SB.Rng.pick(SB.PALETTE.carColors), { traffic: true });
    car.speed = SB.Rng.range(8, SB.CFG.trafficSpeed);
    car.cruise = car.speed;
    car.vertical = vertical;
    car.dir = dir;
    car.stuck = 0;
    SB.traffic.push(car);
    return car;
  }

  function carAhead(car) {
    // Is another traffic car (or the player's car) close ahead on my lane?
    var fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    var nearest = 999;
    var all = SB.traffic.concat(SB.cars).concat(SB.police.map(function (c) { return c.car; }).filter(Boolean));
    for (var i = 0; i < all.length; i++) {
      var o = all[i];
      if (o === car || !o) continue;
      var dx = o.pos.x - car.pos.x, dz = o.pos.z - car.pos.z;
      var along = dx * fx + dz * fz;
      var side = Math.abs(dx * fz - dz * fx);
      if (along > 0 && along < carSpacing && side < 3.2 && along < nearest) nearest = along;
    }
    // The player on foot crossing the road also makes traffic brake.
    var p = SB.player;
    if (!p.inCar) {
      var pdx = p.pos.x - car.pos.x, pdz = p.pos.z - car.pos.z;
      var palong = pdx * fx + pdz * fz;
      var pside = Math.abs(pdx * fz - pdz * fx);
      if (palong > 0 && palong < 10 && pside < 3) nearest = Math.min(nearest, palong);
    }
    return nearest;
  }

  function maybeTurn(car) {
    // At an intersection, sometimes turn onto the crossing road.
    var roads = SB.CFG.roads;
    var nearX = null, nearZ = null;
    for (var i = 0; i < roads.length; i++) {
      if (Math.abs(car.pos.x - roads[i]) < 1.2) nearX = roads[i];
      if (Math.abs(car.pos.z - roads[i]) < 1.2) nearZ = roads[i];
    }
    if (nearX === null || nearZ === null) return;
    if (!SB.Rng.chance(0.35)) return;
    // Turn: swap axis, keep the same travel sense where possible.
    car.vertical = !car.vertical;
    car.dir = SB.Rng.chance(0.5) ? 1 : -1;
    if (car.vertical) {
      car.heading = car.dir > 0 ? 0 : Math.PI;
      car.pos.x = nearX + (car.dir > 0 ? 3.5 : -3.5);
    } else {
      car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.pos.z = nearZ + (car.dir > 0 ? 3.5 : -3.5);
    }
  }

  return {
    spawn: function (n) {
      for (var i = 0; i < n; i++) spawnOne();
    },
    update: function (dt) {
      SB.traffic.forEach(function (car) {
        var ahead = carAhead(car);
        var target = ahead < carSpacing ? 0 : car.cruise;
        car.speed += SB.clamp(target - car.speed, -14 * dt, 8 * dt);
        if (ahead < 6) {
          car.stuck += dt;
          if (car.stuck > 2 && car.honkCooldown <= 0) {
            SB.Audio.horn();
            car.honkCooldown = 4;
          }
        } else car.stuck = 0;
        car.honkCooldown -= dt;
        car.pos.x += Math.sin(car.heading) * car.speed * dt;
        car.pos.z += Math.cos(car.heading) * car.speed * dt;
        car.mesh.position.set(car.pos.x, 0, car.pos.z);
        car.mesh.rotation.y = car.heading;
        car.mesh.userData.wheels.forEach(function (w) { w.rotation.x += car.speed * dt * 2; });
        // Loop around the grid: bounce at the edge roads.
        if (car.pos.x > 205 || car.pos.x < -205 || car.pos.z > 205 || car.pos.z < -205) {
          car.heading += Math.PI;
          car.dir = -car.dir;
          car.pos.x = SB.clamp(car.pos.x, -200, 200);
          car.pos.z = SB.clamp(car.pos.z, -200, 200);
        }
        maybeTurn(car);
        // Gentle collision with the player's car: both slow down.
        var p = SB.player;
        if (p.inCar && p.car) {
          var d = SB.dist2D(car.pos.x, car.pos.z, p.car.pos.x, p.car.pos.z);
          if (d < 4.5) {
            car.speed = Math.min(car.speed, 2);
            if (Math.abs(p.car.speed) > 6) {
              p.car.speed *= 0.6;
              SB.Audio.crash();
              SB.Effects.sparks(p.car.pos.x, 1, p.car.pos.z);
            }
          }
        }
      });
    },
  };
})();
