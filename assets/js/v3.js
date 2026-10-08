/* v3 blocks: draw-on players (real engine code, line by line), the production feed, the language line and the reel.
   Everything works without this file: the pages show the finished drawing, the full feed and every language. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var IO = "IntersectionObserver" in window;

  function onView(el, ratio, fn, margin) {
    if (!IO) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold: ratio, rootMargin: margin || "0px" });
    io.observe(el);
  }

  /* ---------- tiny Python highlighter (keywords, strings, numbers, comments) ---------- */
  var KW = /^(def|for|in|if|elif|else|return|and|or|not|is|None|True|False|while|import|from|lambda|with|as)$/;
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function hl(line) {
    var out = "", re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g, m, pos = 0;
    while ((m = re.exec(line))) {
      out += esc(line.slice(pos, m.index));
      if (m[1]) out += '<span class="tk-c">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="tk-s">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="tk-n">' + m[3] + "</span>";
      else if (KW.test(m[4])) out += '<span class="tk-k">' + m[4] + "</span>";
      else out += esc(m[4]);
      pos = re.lastIndex;
    }
    return out + esc(line.slice(pos));
  }

  /* ---------- draw-on player ---------- */
  function Drawon(root) {
    var src = root.getAttribute("data-src");
    var ms = +root.getAttribute("data-ms") || 450;
    var art = root.querySelector(".drawon__art");
    var list = root.querySelector(".drawon__lines");
    var pane = list;  /* the list is the scroller; its header stays put */
    var btn = root.querySelector(".drawon__play");
    var scrub = root.querySelector(".drawon__scrub");
    var status = root.querySelector(".drawon__status");
    var parallax = root.hasAttribute("data-parallax");
    var steps = [], byStep = [], rows = {}, cur = -1, timer = 0, playing = false, svg = null, fileName = "";

    function lineRow(n) { return rows[n]; }

    function mark(k, animate) {
      var els = byStep[k] || [];
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        e.style.transition = animate ? (e.classList.contains("l") ? "stroke-dashoffset " + Math.round(ms * 0.9) + "ms ease-out" : "opacity " + Math.round(ms * 0.7) + "ms ease-out") : "none";
        e.classList.add("on");
      }
    }
    function unmark(k) {
      var els = byStep[k] || [];
      for (var i = 0; i < els.length; i++) { els[i].style.transition = "none"; els[i].classList.remove("on"); }
    }
    function focusLine(k) {
      var old = pane.querySelector(".is-on");
      if (old) old.classList.remove("is-on");
      if (k < 0) { status.textContent = "Press play to watch the code draw it"; return; }
      var r = lineRow(steps[k]);
      if (r) {
        r.classList.add("is-on");
        var top = r.offsetTop - pane.clientHeight / 2 + r.offsetHeight / 2;
        pane.scrollTo ? pane.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" }) : (pane.scrollTop = top);
      }
      status.textContent = "Step " + (k + 1) + " of " + steps.length + ", line " + steps[k] + " of " + fileName;
    }
    function setTo(k) {
      for (var i = 0; i < steps.length; i++) { if (i <= k) mark(i, false); else unmark(i); }
      cur = k; scrub.value = String(Math.max(0, k)); focusLine(k); done();
    }
    function done() {
      var fin = cur >= steps.length - 1;
      root.classList.toggle("is-done", fin);
      if (!playing) btn.textContent = fin ? "Replay" : (cur < 0 ? "Play" : "Resume");
    }
    function tick() {
      if (cur >= steps.length - 1) { stop(); return; }
      cur++; mark(cur, true); scrub.value = String(cur); focusLine(cur);
      timer = setTimeout(tick, ms);
    }
    function play() {
      if (cur >= steps.length - 1) setTo(-1);
      playing = true; btn.textContent = "Pause"; btn.setAttribute("aria-pressed", "true");
      timer = setTimeout(tick, 120);
    }
    function stop() {
      clearTimeout(timer); playing = false; btn.setAttribute("aria-pressed", "false"); done();
    }

    function wireParallax() {
      if (!parallax || reduce) return;
      var groups = [].slice.call(svg.querySelectorAll("g[data-p]"));
      var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      function frame() {
        x += (tx - x) * 0.12; y += (ty - y) * 0.12;
        groups.forEach(function (g) {
          var p = +g.getAttribute("data-p");
          g.setAttribute("transform", "translate(" + ((p - 0.8) * -x * 70).toFixed(1) + " " + ((p - 0.8) * -y * 30).toFixed(1) + ")");
        });
        raf = (Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002) ? requestAnimationFrame(frame) : 0;
      }
      art.addEventListener("pointermove", function (e) {
        if (!root.classList.contains("is-done")) return;
        var b = art.getBoundingClientRect();
        tx = (e.clientX - b.left) / b.width - 0.5; ty = (e.clientY - b.top) / b.height - 0.5;
        if (!raf) raf = requestAnimationFrame(frame);
      });
      art.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(frame); });
    }

    function init(d) {
      steps = d.steps; fileName = d.file.split("/").pop();
      var fh = root.querySelector(".drawon__file"), cut = d.file.lastIndexOf("/") + 1;
      fh.innerHTML = '<span class="drawon__path">' + esc(d.file.slice(0, cut)) + "</span><span>" + esc(d.file.slice(cut)) + ", " + esc(d.func) + "()</span>";
      fh.title = d.file;
      list.innerHTML = d.code.map(function (c) {
        return '<li data-n="' + c[0] + '"' + (c[2] ? "" : ' class="is-skip"') + '><span class="drawon__no">' + c[0] + "</span>" + hl(c[1]) + "</li>";
      }).join("");
      [].forEach.call(list.children, function (li) { rows[li.getAttribute("data-n")] = li; });
      art.innerHTML = d.svg;
      svg = art.querySelector("svg");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", root.getAttribute("data-label") || "Drawing");
      [].forEach.call(svg.querySelectorAll("[data-k]"), function (e) {
        var k = +e.getAttribute("data-k");
        (byStep[k] || (byStep[k] = [])).push(e);
      });
      scrub.max = String(steps.length - 1);
      root.classList.add("is-ready");
      btn.disabled = false; scrub.disabled = false;
      btn.addEventListener("click", function () { playing ? stop() : play(); });
      scrub.addEventListener("input", function () { stop(); setTo(+scrub.value); });
      wireParallax();
      if (reduce) { setTo(steps.length - 1); return; }
      setTo(-1);
      onView(root, 0.45, function () { if (cur < 0 && !playing) play(); });
    }

    btn.disabled = true; scrub.disabled = true;
    root.classList.add("is-live");   /* without this class the page shows only the finished drawing */
    onView(root, 0, function () {
      fetch(src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init)
        .catch(function () { root.classList.remove("is-live"); root.classList.add("is-failed"); });
    }, "400px");
  }

  /* ---------- production feed: entries appear one by one, the stage rail follows.
     An entry the reader has already scrolled to never waits: everything up to it shows at once. ---------- */
  function Feed(root) {
    var items = [].slice.call(root.querySelectorAll(".feed__item"));
    var rail = [].slice.call(root.querySelectorAll(".rail__step"));
    var again = root.querySelector(".feed__again");
    var timer = 0, i = 0;
    function stage(s) { rail.forEach(function (r) { r.classList.toggle("is-on", r.getAttribute("data-stage") === s); }); }
    function show(k) {
      var it = items[k];
      it.classList.remove("is-wait"); it.classList.add("is-in");
      stage(it.getAttribute("data-stage"));
    }
    function next() {
      clearTimeout(timer);
      if (i >= items.length) { if (again) again.hidden = false; return; }
      var it = items[i];
      show(i++);
      timer = setTimeout(next, it.classList.contains("feed__item--stage") ? 650 : 1100);
    }
    function run() {
      clearTimeout(timer);
      items.forEach(function (it) { it.classList.add("is-wait"); it.classList.remove("is-in"); });
      i = 0; next();
    }
    if (reduce || !IO) { stage(items.length ? items[items.length - 1].getAttribute("data-stage") : ""); return; }
    items.forEach(function (it) { it.classList.add("is-wait"); });
    if (again) { again.hidden = true; again.addEventListener("click", function () { again.hidden = true; run(); }); }
    var catchUp = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = items.indexOf(e.target);
        if (!e.isIntersecting || k < i) return;
        while (i < k) show(i++);
        next();
      });
    }, { rootMargin: "0px 0px -20% 0px" });
    items.forEach(function (it) { catchUp.observe(it); });
  }

  /* ---------- one line, many languages ---------- */
  function Langs(root) {
    var tabs = [].slice.call(root.querySelectorAll(".langs__tab"));
    var big = root.querySelector(".langs__big");
    var i = 0, timer = 0, auto = !reduce;
    function show(k, user) {
      i = k;
      tabs.forEach(function (t, j) { t.setAttribute("aria-pressed", j === k ? "true" : "false"); });
      var t = tabs[k];
      big.classList.remove("is-in");
      void big.offsetWidth;
      big.textContent = t.getAttribute("data-line");
      big.setAttribute("lang", t.getAttribute("data-lang"));
      big.setAttribute("dir", t.getAttribute("data-dir") || "ltr");
      big.classList.add("is-in");
      if (user) { auto = false; clearTimeout(timer); }
    }
    function loop() { if (!auto) return; show((i + 1) % tabs.length); timer = setTimeout(loop, 2200); }
    tabs.forEach(function (t, k) { t.addEventListener("click", function () { show(k, true); }); });
    root.classList.add("is-live");
    show(0);
    if (auto) onView(root, 0.5, function () { timer = setTimeout(loop, 2200); });
  }

  /* ---------- reel: plays muted only when on screen and motion is allowed; always pausable ---------- */
  function Reel(root) {
    var v = root.querySelector("video"), b = root.querySelector(".reel__toggle");
    if (!v || !b) return;
    b.hidden = false;
    function label() { b.textContent = v.paused ? "Play the reel" : "Pause the reel"; }
    b.addEventListener("click", function () { if (v.paused) { v.play(); root.removeAttribute("data-user-paused"); } else { v.pause(); root.setAttribute("data-user-paused", ""); } });
    v.addEventListener("play", label); v.addEventListener("pause", label);
    label();
    if (reduce || !IO) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (root.hasAttribute("data-user-paused")) return;
        if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause();
      });
    }, { threshold: 0.35 });
    io.observe(v);
  }

  /* ---------- Zee playground: mood buttons + age slider swap pre-rendered engine pictures; the code line shows the call ---------- */
  function Play(root) {
    var base = root.getAttribute("data-base");
    var ages = root.getAttribute("data-ages").split("|").map(function (a) { a = a.split(","); return { who: a[0], file: a[1], text: a[2] }; });
    var pic = root.querySelector(".zeeplay__img");
    var code = root.querySelector(".zeeplay__code code");
    var moods = [].slice.call(root.querySelectorAll(".zeeplay__mood"));
    var range = root.querySelector(".zeeplay__range");
    var age = +range.value, mood = moods[0], want = "", warmed = false;
    function url(a, m) { return base + ages[a].file + "-" + m.getAttribute("data-mood") + ".webp"; }
    function warm() {
      if (warmed) return; warmed = true;
      ages.forEach(function (_, a) { moods.forEach(function (m) { new Image().src = url(a, m); }); });
    }
    function draw() {
      var a = ages[age], m = mood.getAttribute("data-mood"), src = url(age, mood);
      want = src;
      code.innerHTML = 'figure(<span class="tk-s">"' + a.who + '"</span>, pose=<span class="tk-s">"' + mood.getAttribute("data-pose") +
        '"</span>, mood=<span class="tk-s">"' + m + '"</span>)';
      range.setAttribute("aria-valuetext", a.text);
      var alt = "Zee, " + a.text.toLowerCase() + ", " + m + ", " + mood.getAttribute("data-desc") + ".";
      var im = new Image();
      im.src = src;
      var swap = function () { if (want !== src) return; pic.src = src; pic.alt = alt; };
      im.decode ? im.decode().then(swap, swap) : (im.onload = swap);
    }
    moods.forEach(function (b) {
      b.addEventListener("click", function () {
        moods.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        mood = b; warm(); draw();
      });
    });
    range.addEventListener("input", function () { age = +range.value; warm(); draw(); });
    root.addEventListener("pointerenter", warm);
    root.addEventListener("focusin", warm);
    root.classList.add("is-live");   /* without this class only the default picture and its call show */
  }

  [].forEach.call(document.querySelectorAll(".drawon[data-src]"), Drawon);
  [].forEach.call(document.querySelectorAll(".feed"), Feed);
  [].forEach.call(document.querySelectorAll(".langs"), Langs);
  [].forEach.call(document.querySelectorAll(".reel"), Reel);
  [].forEach.call(document.querySelectorAll(".zeeplay[data-ages]"), Play);
})();
