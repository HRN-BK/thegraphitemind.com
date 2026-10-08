/* The Graphite Mind. Two small jobs: close the phone menu, and the hero loop.
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

  /* ---- hero loop: an 8-second loop drawn by the engine, laid over the flat picture (which is its first frame).
     Only when motion is allowed and data saving is off. Plays while the hero is on screen; the button pauses it. ---- */
  var scene = document.querySelector("[data-hero-loop]");
  if (!scene) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var conn = navigator.connection;
  if (reduce.matches || (conn && conn.saveData)) return;

  var px = scene.offsetWidth * (window.devicePixelRatio || 1);
  var v = document.createElement("video");
  v.className = "hero__video";
  v.muted = true; v.setAttribute("muted", "");
  v.playsInline = true; v.setAttribute("playsinline", "");
  v.loop = true;
  v.preload = "auto";
  v.setAttribute("aria-hidden", "true");
  v.setAttribute("disablepictureinpicture", "");
  v.src = scene.getAttribute(px > 900 ? "data-loop-wide" : "data-loop-narrow");

  var ICON_PAUSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="3" width="4" height="14" rx="1"/><rect x="12" y="3" width="4" height="14" rx="1"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3l12 7-12 7z"/></svg>';
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "hero__pause";
  var userPaused = false, onScreen = true;

  function label() {
    var paused = v.paused;
    btn.innerHTML = paused ? ICON_PLAY : ICON_PAUSE;
    btn.setAttribute("aria-label", paused ? "Play the animation" : "Pause the animation");
  }
  function play() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function sync() {
    if (!userPaused && onScreen && !document.hidden && !reduce.matches) play(); else v.pause();
  }
  btn.addEventListener("click", function () {
    userPaused = !v.paused;
    if (userPaused) v.pause(); else play();
  });
  v.addEventListener("playing", function () { scene.classList.add("is-live"); });
  v.addEventListener("play", label);
  v.addEventListener("pause", label);
  v.addEventListener("error", function () {   /* the flat picture stays */
    scene.classList.remove("is-live");
    if (v.parentNode) v.parentNode.removeChild(v);
    if (btn.parentNode) btn.parentNode.removeChild(btn);
  });
  label();
  scene.appendChild(v);
  scene.appendChild(btn);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { onScreen = e.isIntersecting; sync(); });
    }, { threshold: 0.15 }).observe(scene);
  } else {
    sync();
  }
  document.addEventListener("visibilitychange", sync);
  var onReduce = function () { if (reduce.matches) { v.pause(); scene.classList.remove("is-live"); } else sync(); };
  if (reduce.addEventListener) reduce.addEventListener("change", onReduce); else reduce.addListener(onReduce);
})();
