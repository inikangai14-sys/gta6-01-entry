// Solmar Bay — the city itself: procedural low-poly buildings, road grid,
// sidewalks, palms, beach, ocean and the pier. Also owns the building
// collision boxes and the named story locations (hideout, pier, marina...).

SB.City = (function () {
  var colliders = []; // {minX,maxX,minZ,maxZ}
  var windowTextures = [];
  var oceanMat = null;
  var sunLight = null;

  // Named story locations, fixed so missions always work.
  var locations = {
    plaza: { x: 0, z: 0, label: 'Solmar Plaza' },
    hideout: { x: -120, z: 108, label: 'Hideout, Coral Row' },
    pier: { x: 300, z: 0, label: 'Solmar Pier' },
    pierBase: { x: 216, z: 0, label: 'Pier entrance' },
    marina: { x: 196, z: -120, label: 'Marina' },
    warehouse: { x: 160, z: -160, label: 'Harbor Warehouse' },
    warehouseDoor: { x: 160, z: -146, label: 'Warehouse door' },
    hospital: { x: -160, z: -160, label: 'Solmar General' },
    packageSpot: { x: -40, z: -40, label: 'Package pickup' },
    northBeach: { x: 220, z: 120, label: 'North Beach' },
  };

  function makeWindowTexture(baseColor, litRatio) {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = baseColor;
    g.fillRect(0, 0, 64, 128);
    for (var y = 6; y < 122; y += 14) {
      for (var x = 6; x < 58; x += 12) {
        var lit = SB.Rng.next() < litRatio;
        g.fillStyle = lit ? '#ffe9a8' : '#2c3e50';
        g.fillRect(x, y, 8, 9);
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function box(w, h, d, color, x, y, z, opts) {
    var mat = new THREE.MeshLambertMaterial({ color: color });
    if (opts && opts.map) mat.map = opts.map;
    if (opts && opts.emissive) mat.emissive = new THREE.Color(opts.emissive);
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (opts && opts.ry) m.rotation.y = opts.ry;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  function addCollider(x, z, w, d) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  function buildGround(group) {
    // Grass base for the whole island.
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900),
      new THREE.MeshLambertMaterial({ color: SB.PALETTE.grass })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(40, -0.05, 0);
    group.add(ground);

    // Roads: dark strips along every grid line, both directions.
    var roadMat = new THREE.MeshLambertMaterial({ color: SB.PALETTE.road });
    var sideMat = new THREE.MeshLambertMaterial({ color: SB.PALETTE.sidewalk });
    SB.CFG.roads.forEach(function (c) {
      var v = new THREE.Mesh(new THREE.PlaneGeometry(SB.CFG.roadHalf * 2, 420), roadMat);
      v.rotation.x = -Math.PI / 2; v.position.set(c, 0, 0); group.add(v);
      var h = new THREE.Mesh(new THREE.PlaneGeometry(420, SB.CFG.roadHalf * 2), roadMat);
      h.rotation.x = -Math.PI / 2; h.position.set(0, 0, c); group.add(h);
      // Sidewalks flanking each road.
      var sv = new THREE.Mesh(new THREE.PlaneGeometry(3, 420), sideMat);
      sv.rotation.x = -Math.PI / 2; sv.position.set(c + SB.CFG.roadHalf + 1.5, 0.02, 0); group.add(sv);
      var sv2 = sv.clone(); sv2.position.x = c - SB.CFG.roadHalf - 1.5; group.add(sv2);
      var sh = new THREE.Mesh(new THREE.PlaneGeometry(420, 3), sideMat);
      sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.02, c + SB.CFG.roadHalf + 1.5); group.add(sh);
      var sh2 = sh.clone(); sh2.position.z = c - SB.CFG.roadHalf - 1.5; group.add(sh2);
      // Dashed centre lines.
      for (var t = -190; t < 190; t += 16) {
        var dash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), new THREE.MeshBasicMaterial({ color: SB.PALETTE.roadLine }));
        dash.rotation.x = -Math.PI / 2; dash.position.set(c, 0.03, t); group.add(dash);
        var dash2 = dash.clone(); dash2.rotation.z = Math.PI / 2; dash2.position.set(t, 0.03, c); group.add(dash2);
      }
    });

    // Beach sand and ocean to the east.
    var sand = new THREE.Mesh(new THREE.PlaneGeometry(70, 460), new THREE.MeshLambertMaterial({ color: SB.PALETTE.sand }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(240, 0.01, 0); group.add(sand);
    oceanMat = new THREE.MeshLambertMaterial({ color: SB.PALETTE.ocean });
    var ocean = new THREE.Mesh(new THREE.PlaneGeometry(320, 900), oceanMat);
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(430, 0, 0); group.add(ocean);
    // Boardwalk strip where sand meets the city.
    var board = new THREE.Mesh(new THREE.PlaneGeometry(8, 420), new THREE.MeshLambertMaterial({ color: 0xb08954 }));
    board.rotation.x = -Math.PI / 2; board.position.set(206, 0.04, 0); group.add(board);
  }

  function buildBuildings(group) {
    // Three window-texture variants shared by all towers.
    windowTextures = [
      makeWindowTexture('#e8b48a', 0.25),
      makeWindowTexture('#8fb8c9', 0.3),
      makeWindowTexture('#c9b458', 0.2),
    ];
    var blockCenters = [-120, -40, 40, 120];
    blockCenters.forEach(function (bx) {
      blockCenters.forEach(function (bz) {
        // Keep the central plaza open.
        if (bx === -40 && bz === -40) return;
        if (bx === 40 && bz === 40) return;
        var count = SB.Rng.int(1, 3);
        for (var i = 0; i < count; i++) {
          var w = SB.Rng.range(16, 26);
          var d = SB.Rng.range(16, 26);
          var h = SB.Rng.range(10, 46);
          var ox = bx + SB.Rng.range(-14, 14);
          var oz = bz + SB.Rng.range(-14, 14);
          var color = SB.Rng.pick(SB.PALETTE.building);
          var tex = SB.Rng.pick(windowTextures);
          var m = box(w, h, d, color, ox, h / 2, oz, { map: tex });
          group.add(m);
          // Rooftop box (AC unit / penthouse) for silhouette variety.
          if (SB.Rng.chance(0.6)) {
            var roof = box(w * 0.35, 2.5, d * 0.35, 0x5a5f66, ox + SB.Rng.range(-4, 4), h + 1.25, oz + SB.Rng.range(-4, 4));
            group.add(roof);
          }
          addCollider(ox, oz, w + 1, d + 1);
        }
      });
    });

    // Landmark towers on the skyline so the city reads from afar.
    var tower1 = box(30, 78, 30, 0x7fb0c9, -40, 39, 120, { map: windowTextures[1] });
    group.add(tower1); addCollider(-40, 120, 31, 31);
    var tower2 = box(26, 64, 26, 0xe8b48a, 120, 32, -40, { map: windowTextures[0] });
    group.add(tower2); addCollider(120, -40, 27, 27);
    var tower3 = box(22, 52, 22, 0xc9b458, 40, 26, -120, { map: windowTextures[2] });
    group.add(tower3); addCollider(40, -120, 23, 23);

    // Plaza fountain at the centre.
    var basin = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 10, 1.2, 20),
      new THREE.MeshLambertMaterial({ color: 0xcfd8dc })
    );
    basin.position.set(0, 0.6, 0); group.add(basin);
    var water = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 0.4, 20),
      new THREE.MeshLambertMaterial({ color: 0x4db6d8 })
    );
    water.position.set(0, 1.1, 0); group.add(water);
    var spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.4, 4, 10),
      new THREE.MeshLambertMaterial({ color: 0x9aa0a3 })
    );
    spout.position.set(0, 3, 0); group.add(spout);
    addCollider(0, 0, 20, 20);
  }

  function buildNature(group) {
    // Palm trees: beach row, plaza ring and scattered street palms.
    function palm(x, z) {
      var g = new THREE.Group();
      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 7, 7),
        new THREE.MeshLambertMaterial({ color: SB.PALETTE.palmTrunk })
      );
      trunk.position.y = 3.5;
      trunk.rotation.z = SB.Rng.range(-0.08, 0.08);
      g.add(trunk);
      for (var i = 0; i < 6; i++) {
        var leaf = new THREE.Mesh(
          new THREE.ConeGeometry(1.1, 4.4, 4),
          new THREE.MeshLambertMaterial({ color: SB.PALETTE.palmLeaf })
        );
        var a = (i / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 1.7, 7.2, Math.sin(a) * 1.7);
        leaf.rotation.z = Math.cos(a) * 1.1;
        leaf.rotation.x = -Math.sin(a) * 1.1;
        g.add(leaf);
      }
      var top = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x2f8f3e })
      );
      top.position.y = 7.3; g.add(top);
      g.position.set(x, 0, z);
      group.add(g);
    }
    for (var z = -200; z <= 200; z += 28) palm(216, z);
    for (var a = 0; a < 8; a++) {
      var ang = (a / 8) * Math.PI * 2;
      palm(Math.cos(ang) * 16, Math.sin(ang) * 16);
    }
    for (var i = 0; i < 22; i++) {
      var rx = SB.Rng.pick(SB.CFG.roads) + (SB.Rng.chance(0.5) ? 10 : -10);
      var rz = SB.Rng.range(-180, 180);
      palm(rx, rz);
    }
    // Street lamps along the avenues.
    var lampMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    var bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    SB.CFG.roads.forEach(function (c) {
      for (var t = -160; t <= 160; t += 80) {
        var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6, 6), lampMat);
        pole.position.set(c + 9, 3, t); group.add(pole);
        var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bulbMat);
        bulb.position.set(c + 9, 6.2, t); group.add(bulb);
      }
    });
  }

  function buildPierAndHarbor(group) {
    // Wooden pier jutting into the ocean.
    var pierMat = new THREE.MeshLambertMaterial({ color: 0x9a6b3f });
    var pier = new THREE.Mesh(new THREE.BoxGeometry(120, 1.2, 14), pierMat);
    pier.position.set(272, 0.6, 0); group.add(pier);
    for (var x = 220; x <= 330; x += 12) {
      [-5, 5].forEach(function (dz) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 2.4, 6), pierMat);
        post.position.set(x, 0, dz); group.add(post);
      });
    }
    // Pier end kiosk + ferris wheel silhouette on the pier.
    var kiosk = box(8, 5, 6, 0xd97b2e, 322, 2.5, 0);
    group.add(kiosk);
    var wheelMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
    var wheel = new THREE.Mesh(new THREE.TorusGeometry(11, 0.7, 8, 24), wheelMat);
    wheel.position.set(300, 16, -9); group.add(wheel);
    var wheelPost = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 6, 6), lampMat0());
    wheelPost.position.set(300, 3, -9); group.add(wheelPost);
    function lampMat0() { return new THREE.MeshLambertMaterial({ color: 0x2c3e50 }); }
    // Harbor warehouse (mission 4) + hospital (respawn point).
    var wh = box(34, 12, 22, 0x7a6a8a, 160, 6, -160);
    group.add(wh); addCollider(160, -160, 35, 23);
    var whDoor = box(10, 8, 1, 0x3a3f46, 160, 4, -148.5);
    group.add(whDoor);
    var hosp = box(30, 16, 20, 0xe8e8e8, -160, 8, -160, { map: windowTextures[1] });
    group.add(hosp); addCollider(-160, -160, 31, 21);
    var cross = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 1), new THREE.MeshBasicMaterial({ color: 0xd23b3b }));
    cross.position.set(-160, 18, -149); group.add(cross);
    var cross2 = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 1), new THREE.MeshBasicMaterial({ color: 0xd23b3b }));
    cross2.position.set(-160, 18, -149); group.add(cross2);
    // Hideout: small house with a neon sign block on Coral Row.
    var hide = box(14, 7, 12, 0x2e8b6a, -120, 3.5, 120);
    group.add(hide); addCollider(-120, 120, 15, 13);
    var sign = new THREE.Mesh(new THREE.BoxGeometry(9, 2, 0.6), new THREE.MeshBasicMaterial({ color: 0x27e0a0 }));
    sign.position.set(-120, 8.4, 113.5); group.add(sign);
    // Marina boats: simple hulls bobbing near the shore.
    for (var i = 0; i < 4; i++) {
      var boat = new THREE.Group();
      var hull = new THREE.Mesh(new THREE.BoxGeometry(7, 1.6, 3), new THREE.MeshLambertMaterial({ color: SB.Rng.pick([0xe8e8e8, 0xd23b3b, 0x2e6fd8]) }));
      hull.position.y = 0.4; boat.add(hull);
      var cab = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 2.4), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      cab.position.set(-0.5, 1.8, 0); boat.add(cab);
      boat.position.set(272 + i * 4, 0, -118 + i * 14);
      boat.rotation.y = 0.2;
      group.add(boat);
    }
  }

  function buildLights(scene) {
    scene.background = new THREE.Color(SB.PALETTE.skyBottom);
    scene.fog = new THREE.Fog(0xcfe0ea, 220, 620);
    var hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.95);
    scene.add(hemi);
    sunLight = new THREE.DirectionalLight(SB.PALETTE.sun, 1.6);
    sunLight.position.set(120, 180, 60);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  }

  return {
    locations: locations,
    build: function (scene) {
      colliders = [];
      var group = new THREE.Group();
      scene.add(group);
      buildLights(scene);
      buildGround(group);
      buildBuildings(group);
      buildNature(group);
      buildPierAndHarbor(group);
      SB.cityGroup = group;
      SB.city = { colliders: colliders, locations: locations };
      return group;
    },
    // Push a circle (x,z,r) out of every building box it overlaps.
    collide: function (x, z, r) {      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        var cx = SB.clamp(x, c.minX, c.maxX);
        var cz = SB.clamp(z, c.minZ, c.maxZ);
        var dx = x - cx, dz = z - cz;
        var d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 < 0.0001) { x = c.maxX + r; continue; }
          var d = Math.sqrt(d2);
          x = cx + (dx / d) * r;
          z = cz + (dz / d) * r;
        }
      }
      return { x: x, z: z };
    },
    // Does the 2D segment (ax,az)->(bx,bz) cross a building? Returns the
    // smallest t in [0,1] where it enters one, or -1 when the sightline
    // is clear. Bullets and guard fire both respect walls.
    segmentHitsBuilding: function (ax, az, bx, bz) {
      var best = -1;
      var dx = bx - ax, dz = bz - az;
      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        var tmin = 0, tmax = 1;
        var ok = true;
        // Slab test, one axis at a time.
        var axes = [
          { d: dx, a: ax, lo: c.minX, hi: c.maxX },
          { d: dz, a: az, lo: c.minZ, hi: c.maxZ },
        ];
        for (var j = 0; j < 2 && ok; j++) {
          var s = axes[j];
          if (Math.abs(s.d) < 1e-9) {
            if (s.a < s.lo || s.a > s.hi) ok = false;
          } else {
            var t1 = (s.lo - s.a) / s.d;
            var t2 = (s.hi - s.a) / s.d;
            if (t1 > t2) { var tmp = t1; t1 = t2; t2 = tmp; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) ok = false;
          }
        }
        if (ok && tmin <= 1 && (best < 0 || tmin < best)) best = tmin;
      }
      return best;
    },
    isOnRoad: function (x, z) {
      for (var i = 0; i < SB.CFG.roads.length; i++) {
        var c = SB.CFG.roads[i];
        if (Math.abs(x - c) < SB.CFG.roadHalf + 1) return true;
        if (Math.abs(z - c) < SB.CFG.roadHalf + 1) return true;
      }
      return false;
    },
    oceanMat: function () { return oceanMat; },
  };
})();
