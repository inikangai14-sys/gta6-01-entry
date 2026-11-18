// Solmar Bay — the minimap: a 2D top-down canvas in the corner showing the
// roads, the beach, the player arrow, police, traffic and the mission beacon.

SB.Minimap = (function () {
  var canvas = null;
  var ctx = null;
  var SIZE = 190;
  var WORLD = 560; // world units across the map (-260..300 in x, -200..200 in z)
  var OX = -260, OZ = -210; // world origin of the map's top-left corner

  function toMap(x, z) {
    return {
      x: (x - OX) / WORLD * SIZE,
      y: (z - OZ) / 420 * SIZE,
    };
  }

  function drawRoads() {
    ctx.fillStyle = '#1d2b36';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // Ocean (east) and sand.
    ctx.fillStyle = '#2e7fa8';
    var oc = toMap(258, 0); ctx.fillRect(oc.x, 0, SIZE - oc.x, SIZE);
    ctx.fillStyle = '#e8d29a';
    var sd = toMap(208, 0); ctx.fillRect(sd.x, 0, oc.x - sd.x, SIZE);
    // Grass.
    ctx.fillStyle = '#4a7a44';
    ctx.fillRect(0, 0, sd.x, SIZE);
    // Roads.
    ctx.strokeStyle = '#5a636b';
    ctx.lineWidth = 5;
    SB.CFG.roads.forEach(function (c) {
      var a = toMap(c, -200), b = toMap(c, 200);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      var c2 = toMap(-200, c), d2 = toMap(200, c);
      ctx.beginPath(); ctx.moveTo(c2.x, c2.y); ctx.lineTo(d2.x, d2.y); ctx.stroke();
    });
    // Pier.
    ctx.strokeStyle = '#9a6b3f';
    ctx.lineWidth = 4;
    var p1 = toMap(208, 0), p2 = toMap(330, 0);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  }

  function blip(x, z, color, r, ring) {
    var m = toMap(x, z);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
    if (ring) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(m.x, m.y, r + 2, 0, Math.PI * 2); ctx.stroke(); }
  }

  return {
    build: function () {
      canvas = document.getElementById('minimap');
      if (canvas) ctx = canvas.getContext('2d');
    },
    update: function () {
      if (!ctx) return;
      drawRoads();
      var m = SB.mission;
      // Mission beacon blip (pulsing yellow diamond).
      if (m.stage === 'active' && m.target) {
        var p = toMap(m.target.x, m.target.z);
        var pulse = 6 + Math.sin(SB.elapsed * 5) * 2;
        ctx.fillStyle = '#f2c230';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - pulse); ctx.lineTo(p.x + pulse, p.y);
        ctx.lineTo(p.x, p.y + pulse); ctx.lineTo(p.x - pulse, p.y);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      // Traffic dots.
      ctx.fillStyle = '#cfd8dc';
      SB.traffic.forEach(function (car) {
        var q = toMap(car.pos.x, car.pos.z);
        ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
      });
      // Police blips (flashing blue/red).
      var flash = Math.floor(SB.elapsed * 4) % 2 === 0;
      SB.police.forEach(function (cop) {
        var pos = cop.car ? cop.car.pos : cop.pos;
        blip(pos.x, pos.z, flash ? '#2e6fd8' : '#ff3b30', 4.5, true);
      });
      // Player arrow (white, rotated by heading).
      var pp = toMap(SB.player.pos.x, SB.player.pos.z);
      ctx.save();
      ctx.translate(pp.x, pp.y);
      ctx.rotate(SB.player.heading);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      // North marker.
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('N', 6, 14);
    },
  };
})();
