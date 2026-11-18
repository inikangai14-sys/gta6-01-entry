// Solmar Bay — the HUD: health, wanted stars, cash, clock, speed, objective,
// banners, briefing, menus and the damage flash. All DOM, updated from SB.

SB.Hud = (function () {
  var els = {};
  var flashTimer = null;
  var bannerTimer = null;

  function el(id) { return document.getElementById(id); }

  function build() {
    els.healthFill = el('health-fill');
    els.healthText = el('health-text');
    els.cash = el('cash');
    els.stars = el('stars');
    els.clock = el('clock');
    els.speed = el('speed');
    els.objective = el('objective');
    els.objectiveText = el('objective-text');
    els.missionTimer = el('mission-timer');
    els.flash = el('flash');
    els.banner = el('banner');
    els.bannerTitle = el('banner-title');
    els.bannerSub = el('banner-sub');
    els.briefing = el('briefing');
    els.briefingTitle = el('briefing-title');
    els.briefingText = el('briefing-text');
    els.titleScreen = el('title-screen');
    els.pauseScreen = el('pause-screen');
    els.endScreen = el('end-screen');
    els.endTitle = el('end-title');
    els.endText = el('end-text');
    els.damage = el('damage');
    els.crosshair = el('crosshair');
    els.saveLine = el('save-line');
    els.controlsLine = el('controls-line');
  }

  function starsHtml(n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += '<span class="star' + (i < n ? ' on' : '') + '">★</span>';
    return s;
  }

  return {
    build: build,

    update: function () {
      var p = SB.player;
      if (!els.healthFill) return;
      els.healthFill.style.width = Math.max(0, p.health) + '%';
      els.healthFill.style.background = p.health > 50 ? '#2ecc71' : (p.health > 25 ? '#f39c12' : '#e74c3c');
      els.healthText.textContent = Math.ceil(Math.max(0, p.health)) + ' HP';
      els.cash.textContent = SB.formatCash(p.cash);
      els.stars.innerHTML = starsHtml(p.wanted);
      els.clock.textContent = SB.formatClock(SB.gameMinutes) + (SB.muted ? '  ·  MUTED' : '');
      var speed = p.inCar && p.car ? Math.abs(p.car.speed) * 3.2 : Math.abs(p.speed) * 3.2;
      els.speed.textContent = Math.round(speed) + ' km/h';
      els.speed.style.display = (p.inCar || p.speed > 0.5) ? 'block' : 'none';
      els.crosshair.style.display = (!p.inCar && SB.mode === 'play') ? 'block' : 'none';
      var m = SB.mission;
      if (m.stage === 'active') {
        els.objective.style.display = 'block';
        els.objectiveText.textContent = '◆ ' + SB.MISSIONS[m.index].name + ' — ' + m.targetLabel;
        var t = Math.max(0, Math.ceil(m.timer));
        els.missionTimer.textContent = Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60);
        els.missionTimer.style.color = t < 30 ? '#ff6b5e' : '#ffe9a8';
      } else {
        els.objective.style.display = 'none';
      }
      if (els.saveLine) {
        els.saveLine.textContent = 'Best cash ' + SB.formatCash(SB.save.bestCash) + '  ·  Missions done ' + SB.save.missionsDone + '  ·  Ammo ' + p.ammo + '/' + p.reserveAmmo;
      }
    },

    flash: function (text) {
      if (!els.flash) return;
      els.flash.textContent = text;
      els.flash.style.opacity = '1';
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(function () { els.flash.style.opacity = '0'; }, 3600);
    },

    showBanner: function (title, sub, good) {
      if (!els.banner) return;
      els.bannerTitle.textContent = title;
      els.bannerTitle.style.color = good ? '#2ecc71' : '#ff6b5e';
      els.bannerSub.textContent = sub || '';
      els.banner.style.display = 'block';
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(function () { els.banner.style.display = 'none'; }, 4200);
    },

    showBriefing: function (def) {
      if (!els.briefing) return;
      els.briefingTitle.textContent = 'NEW JOB — ' + def.name;
      els.briefingText.textContent = def.briefing + '  Reward: ' + SB.formatCash(def.reward) + '.';
      els.briefing.style.display = 'block';
      setTimeout(function () { els.briefing.style.display = 'none'; }, 9000);
    },

    setObjective: function (label) {
      SB.mission.targetLabel = label;
    },

    damageFlash: function () {
      if (!els.damage) return;
      els.damage.style.opacity = '0.45';
      setTimeout(function () { els.damage.style.opacity = '0'; }, 180);
    },

    showTitle: function () {
      els.titleScreen.style.display = 'flex';
      els.pauseScreen.style.display = 'none';
      els.endScreen.style.display = 'none';
    },
    hideTitle: function () { els.titleScreen.style.display = 'none'; },
    showPause: function (show) { els.pauseScreen.style.display = show ? 'flex' : 'none'; },
    showEnd: function (title, text) {
      els.endTitle.textContent = title;
      els.endText.textContent = text;
      els.endScreen.style.display = 'flex';
    },
    hideEnd: function () { els.endScreen.style.display = 'none'; },
  };
})();
