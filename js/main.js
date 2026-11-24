'use strict';
// Einstiegspunkt und Spielschleife.
(function () {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!G.S) G.UI.menuTick(dt);
    if (G.S && G.R.ready()) {
      G.update(dt);
      G.R.light = G.settings.daynight !== false ? G.R.lightFor((8 + (G.S.time / 720) * 24) % 24, 0.45) : null;
      G.UI.updateCamera(dt);
      G.R.draw();
      G.UI.tick(dt);
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('DOMContentLoaded', () => {
    G.Profile.load();
    G.UI.cfg.autopilot = !!G.Profile.data.autopilot; // zuletzt gewählte Steuerung
    G.UI.bindInput();
    G.UI.showMenu();
    requestAnimationFrame(frame);
  });
})();
