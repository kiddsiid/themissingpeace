/* The Missing Peace — mobile drawer interactions.
   Finger-tracking swipe to open/close the nav drawer, on top of the
   CSS checkbox drawer. Pure progressive enhancement: if this never runs,
   the burger + scrim label still work. Uses event delegation so it is
   robust to the DC runtime mounting the shell after this script loads. */
(function () {
  var MQ = window.matchMedia('(max-width: 860px)');
  var EDGE = 30;      // px from left edge that starts an "open" drag
  var THRESH = 0.4;   // fraction of width past which we settle open
  var VEL = 0.35;     // px/ms fling velocity that forces a settle

  var dragging = false, decided = false, horiz = false, openAtStart = false;
  var startX = 0, startY = 0, lastX = 0, lastT = 0, vx = 0, width = 240;
  var shell, rail, cb, scrim;

  function els() {
    shell = document.querySelector('.app-shell');
    rail = document.querySelector('.nav-rail');
    cb = document.querySelector('.nav-toggle');
    scrim = document.querySelector('.nav-scrim');
    return shell && rail && cb;
  }

  function paint(pos) {
    rail.style.transform = 'translateX(' + pos + 'px)';
    if (scrim) {
      var op = 1 + pos / width;               // 0 closed, 1 open
      op = Math.max(0, Math.min(1, op));
      scrim.style.display = 'block';
      scrim.style.opacity = op;
      scrim.style.pointerEvents = op > 0.05 ? 'auto' : 'none';
    }
  }

  function freeze() {
    rail.style.transition = 'none';
    if (scrim) scrim.style.transition = 'none';
  }
  function thaw() {
    rail.style.transition = '';
    rail.style.transform = '';
    if (scrim) {
      scrim.style.transition = '';
      scrim.style.opacity = '';
      scrim.style.pointerEvents = '';
      scrim.style.display = '';
    }
  }

  function onStart(e) {
    if (!MQ.matches || dragging || !els()) return;
    var t = e.touches[0];
    openAtStart = cb.checked;
    if (!openAtStart) {
      if (t.clientX > EDGE) return;           // only the left edge opens
    } else {
      if (t.clientX > rail.offsetWidth + 48) return; // grab near the panel
    }
    dragging = true; decided = false; horiz = false;
    startX = lastX = t.clientX; startY = t.clientY;
    lastT = e.timeStamp; vx = 0;
    width = rail.offsetWidth || 240;
  }

  function onMove(e) {
    if (!dragging) return;
    var t = e.touches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;
    if (!decided) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      decided = true;
      horiz = Math.abs(dx) > Math.abs(dy);
      if (!horiz) { dragging = false; return; }  // vertical → let page scroll
      freeze();
    }
    e.preventDefault();
    var dt = e.timeStamp - lastT;
    if (dt > 0) vx = (t.clientX - lastX) / dt;
    lastX = t.clientX; lastT = e.timeStamp;
    var pos = openAtStart ? dx : -width + dx;
    pos = Math.max(-width, Math.min(0, pos));
    paint(pos);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    if (!horiz) { thaw(); return; }
    var m = /translateX\((-?[\d.]+)px\)/.exec(rail.style.transform || '');
    var pos = m ? parseFloat(m[1]) : (openAtStart ? 0 : -width);
    var open;
    if (vx > VEL) open = true;
    else if (vx < -VEL) open = false;
    else open = pos > -width * THRESH;
    thaw();
    cb.checked = open;
  }

  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
  document.addEventListener('touchcancel', function () {
    if (dragging) { dragging = false; thaw(); }
  });
})();
