// Solmar Bay — keyboard and mouse input. Tracks held keys, camera drag,
// clicks (shoot) and the pause / mute / interact keys the game polls.

SB.Input = (function () {
  var keys = {};
  var mouse = { down: false, dx: 0, dy: 0, moved: false, lastX: 0, lastY: 0 };
  var clicked = false;
  var pressed = {}; // edge-triggered keys, consumed by the game loop
  var wheelDelta = 0;

  function keyName(e) {
    return (e.key || '').toLowerCase();
  }

  window.addEventListener('keydown', function (e) {
    var k = keyName(e);
    if (k === ' ' || k === 'arrowup' || k === 'arrowdown') e.preventDefault();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
    if (k === 'm') SB.Audio.setMuted(!SB.muted);
    if (k === 'p' || k === 'escape') { if (SB.GameFlow) SB.GameFlow.togglePause(); }
  });
  window.addEventListener('keyup', function (e) { keys[keyName(e)] = false; });

  var canvasHolder = null;
  function bindCanvas(el) {
    canvasHolder = el;
    el.addEventListener('mousedown', function (e) {
      mouse.down = true; mouse.lastX = e.clientX; mouse.lastY = e.clientY;
      clicked = true;
      SB.Audio.unlock();
    });
    window.addEventListener('mouseup', function () { mouse.down = false; });
    window.addEventListener('mousemove', function (e) {
      if (!mouse.down) return;
      mouse.dx += e.clientX - mouse.lastX;
      mouse.dy += e.clientY - mouse.lastY;
      mouse.lastX = e.clientX; mouse.lastY = e.clientY;
      mouse.moved = true;
    });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      wheelDelta += e.deltaY;
    }, { passive: false });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  return {
    bindCanvas: bindCanvas,
    isDown: function (k) { return !!keys[k.toLowerCase()]; },
    wasPressed: function (k) { return !!pressed[k.toLowerCase()]; },
    consumeClick: function () { var c = clicked; clicked = false; return c; },
    endFrame: function () {
      pressed = {};
      mouse.dx = 0; mouse.dy = 0; mouse.moved = false;
      wheelDelta = 0;
    },
    mouseDelta: function () { return { dx: mouse.dx, dy: mouse.dy }; },
    wheel: function () { var w = wheelDelta; wheelDelta = 0; return w; },
    axis: function () {
      // WASD / arrows as a -1..1 movement vector (x = strafe, y = forward).
      var x = 0, y = 0;
      if (keys['w'] || keys['arrowup']) y += 1;
      if (keys['s'] || keys['arrowdown']) y -= 1;
      if (keys['a'] || keys['arrowleft']) x -= 1;
      if (keys['d'] || keys['arrowright']) x += 1;
      return { x: x, y: y };
    },
  };
})();
