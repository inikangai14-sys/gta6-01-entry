// Solmar Bay — deterministic seeded random numbers.
// The city layout, traffic colours and pedestrian placement all come from
// here, so the same seed always builds the same Solmar Bay.

SB.Rng = (function () {
  // Mulberry32: small, fast, deterministic.
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var fn = mulberry32(7);

  return {
    reseed: function (seed) { fn = mulberry32(seed); SB.seed = seed; },
    next: function () { return fn(); },
    range: function (lo, hi) { return lo + fn() * (hi - lo); },
    int: function (lo, hi) { return Math.floor(lo + fn() * (hi - lo + 1)); },
    pick: function (arr) { return arr[Math.floor(fn() * arr.length)]; },
    chance: function (p) { return fn() < p; },
  };
})();
