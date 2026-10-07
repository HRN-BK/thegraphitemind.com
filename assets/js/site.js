/* The Graphite Mind. Two small jobs: close the phone menu, and the one hero parallax moment.
   No libraries. Everything here is optional: without JS the menu is a <details> and the hero shows the flat image. */
(function () {
  "use strict";

  /* ---- phone menu: close on link click, Escape, or tap outside ---- */
  var menu = document.querySelector("details.menu");
  if (menu) {
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) menu.removeAttribute("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.hasAttribute("open")) {
        menu.removeAttribute("open");
        var s = menu.querySelector("summary");
        if (s) s.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (menu.hasAttribute("open") && !menu.contains(e.target)) menu.removeAttribute("open");
    });
  }

  /* ---- hero parallax: three transparent layers, transform only, rAF ---- */
  var scene = document.querySelector("[data-hero-layers]");
  if (!scene) return;

  var wide = window.matchMedia("(min-width: 900px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)");

  // Each layer is drawn 5% larger than the scene (see site.css), so it has 2.5% of the scene
  // to slide in before its edge shows. Shifts are fractions of that spare room, so they can
  // never reveal a seam at any scene size. Front moves the most, back the least.
  var SHARE = [0.25, 0.6, 1];  // back, mid, front: share of the spare room
  var ROOM = 0.025 * 0.92;     // 2.5% of the scene, with a small safety margin
  var boxW = 600, boxH = 375;
  var layers = [];
  var live = false;
  var tx = 0, ty = 0, cx = 0, cy = 0; // target / current pointer position, -1..1
  var scrollP = 0, curScroll = 0;
  var raf = 0;

  function build() {
    if (live) return;
    var srcs;
    try { srcs = JSON.parse(scene.getAttribute("data-hero-layers")); } catch (e) { return; }
    var made = srcs.map(function (src) {
      var im = new Image();
      im.className = "layer";
      im.alt = "";
      im.setAttribute("aria-hidden", "true");
      im.decoding = "async";
      im.src = src;
      return im;
    });
    Promise.all(made.map(function (im) {
      return im.decode ? im.decode() : new Promise(function (ok, bad) { im.onload = ok; im.onerror = bad; });
    })).then(function () {
      if (!wide.matches || reduce.matches) return; // conditions changed while loading
      made.forEach(function (im) { scene.appendChild(im); });
      layers = made;
      scene.classList.add("is-live");
      live = true;
      measure();
      onScroll();
      frame();
    }).catch(function () { /* flat image stays */ });
  }

  function destroy() {
    if (!live) return;
    layers.forEach(function (im) { if (im.parentNode) im.parentNode.removeChild(im); });
    layers = [];
    scene.classList.remove("is-live");
    live = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function measure() {
    boxW = scene.offsetWidth || boxW;
    boxH = scene.offsetHeight || boxH;
  }

  function apply() {
    var sc = Math.min(1, curScroll);
    for (var i = 0; i < layers.length; i++) {
      var x = -cx * SHARE[i] * ROOM * boxW;
      var y = (-0.5 * cy - 0.5 * sc) * SHARE[i] * ROOM * boxH; // pointer 50%, scroll 50% of the room
      layers[i].style.transform = "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0)";
    }
  }

  function frame() {
    raf = 0;
    if (!live) return;
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    curScroll += (scrollP - curScroll) * 0.12;
    apply();
    var moving = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 || Math.abs(scrollP - curScroll) > 0.002;
    if (moving) raf = requestAnimationFrame(frame);
  }
  function kick() { if (live && !raf) raf = requestAnimationFrame(frame); }

  function onScroll() {
    var h = scene.offsetHeight || 1;
    var r = scene.getBoundingClientRect();
    // 0 when the scene sits at its natural place, rising to 1 once it has scrolled off the top
    scrollP = Math.max(0, Math.min(1.2, -r.top / h));
    kick();
  }

  window.addEventListener("resize", function () { measure(); kick(); }, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointermove", function (e) {
    if (!live || !fine.matches) return;
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
    kick();
  }, { passive: true });
  document.addEventListener("pointerleave", function () { tx = 0; ty = 0; kick(); });

  function evaluate() {
    if (wide.matches && !reduce.matches) build(); else destroy();
  }
  [wide, reduce].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener("change", evaluate); else mq.addListener(evaluate);
  });
  evaluate();
})();
