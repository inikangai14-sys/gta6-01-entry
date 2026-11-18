// Solmar Bay — synthesized sound with WebAudio. No audio files: every
// effect is built from oscillators and filtered noise at run time.

SB.Audio = (function () {
  var ctx = null;
  var master = null;
  var engineOsc = null;
  var engineGain = null;
  var sirenOsc = null;
  var sirenGain = null;
  var sirenTimer = 0;
  var sirenHigh = false;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = SB.muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine hum: a low sawtooth whose pitch follows the car speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      var engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Police siren: two alternating tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch (e) { ctx = null; }
    return !!ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || SB.muted) return;
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.25, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + dur + 0.02);
    } catch (e) { /* audio is cosmetic; never break the game */ }
  }

  function noiseBurst(dur, vol, filterFreq) {
    if (!ensure() || SB.muted) return;
    try {
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filterFreq || 1800;
      var g = ctx.createGain(); g.gain.value = vol || 0.4;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    } catch (e) { /* cosmetic */ }
  }

  return {
    unlock: ensure,
    setMuted: function (m) {
      SB.muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    blip: function () { tone(880, 0.12, 'sine', 0.25, 1320); },
    pickup: function () { tone(660, 0.1, 'square', 0.18); tone(990, 0.16, 'square', 0.18); },
    gunshot: function () { noiseBurst(0.14, 0.5, 2600); tone(160, 0.1, 'square', 0.2, 60); },
    melee: function () { noiseBurst(0.08, 0.25, 900); },
    crash: function () { noiseBurst(0.25, 0.45, 700); },
    horn: function () { tone(370, 0.22, 'square', 0.16); tone(466, 0.22, 'square', 0.12); },
    jingle: function () {
      var notes = [523, 659, 784, 1046];
      for (var i = 0; i < notes.length; i++) {
        (function (n, d) { setTimeout(function () { tone(n, 0.22, 'triangle', 0.28); }, d); })(notes[i], i * 130);
      }
    },
    fail: function () { tone(330, 0.3, 'sawtooth', 0.2, 165); tone(220, 0.45, 'sawtooth', 0.2, 110); },
    busted: function () { tone(440, 0.25, 'square', 0.2); tone(349, 0.25, 'square', 0.2); tone(262, 0.5, 'square', 0.2); },
    update: function (dt) {
      if (!ctx) return;
      var p = SB.player;
      // Engine hum follows driving speed.
      if (engineGain) {
        var target = (p.inCar && p.car) ? 0.05 + Math.abs(p.car.speed) / SB.CFG.carMaxSpeed * 0.09 : 0;
        engineGain.gain.value += (target - engineGain.gain.value) * Math.min(1, dt * 6);
        if (p.car) engineOsc.frequency.value = 50 + Math.abs(p.car.speed) * 4.5;
      }
      // Siren wails while the player is wanted.
      if (sirenGain && sirenOsc) {
        var want = p.wanted > 0 ? 0.045 : 0;
        sirenGain.gain.value += (want - sirenGain.gain.value) * Math.min(1, dt * 4);
        sirenTimer += dt;
        if (sirenTimer > 0.55) {
          sirenTimer = 0;
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.value = sirenHigh ? 920 : 640;
        }
      }
    },
  };
})();
