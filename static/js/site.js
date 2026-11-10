/* KoFLEURS-R demo page: behaviour only. The page content is static HTML (written by
   demo/scripts/build_page.py). This script keeps each spectrogram's playhead in sync with its
   audio, opens an enlarged spectrogram on click, lays out the word labels, and copies the BibTeX. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const durOf = (fig) => parseFloat(fig.dataset.dur);

  /* ------------------------------------------------------------ spectrogram width (px per second) */
  let PPS = 64;
  function choosePPS() {
    const figs = $$("main .spec");
    if (!figs.length) return;
    const maxDur = Math.max.apply(null, figs.map(durOf));
    const avail = Math.min.apply(null, figs.map((f) => f.clientWidth).filter((w) => w > 0));
    // wide screens: the longest recording fits its card; narrow screens: keep 64 px/s and scroll
    PPS = Math.max(avail >= 700 ? 40 : 64, Math.min(110, Math.floor(avail / maxDur)));
    document.documentElement.style.setProperty("--pps", PPS);
  }

  /* ------------------------------------------------------------ word labels: two rows, no overlap */
  // Label width estimate at 11 px: Hangul ~11 px, other characters ~6.5 px, plus padding. Each
  // label goes to the row with more room; a label that would still touch its neighbour is set in
  // a smaller font (down to 80 %), then moved right past the neighbour (measured widths).
  const FONT = 11;
  const labelWidth = (s, px) => Array.from(s).reduce((a, c) => a + (/[가-힣]/.test(c) ? px : px * 0.6), 0) + 4;
  function layoutLabels(fig) {
    const strip = $(".spec-words", fig), canvas = $(".spec-canvas", fig);
    if (!strip || !canvas) return;
    const widthPx = canvas.clientWidth, rowEnd = [-Infinity, -Infinity];
    $$(".wd", strip).forEach((wd) => {
      const span = wd.firstElementChild, text = span.textContent;
      const center = ((parseFloat(wd.style.left) + parseFloat(wd.style.width) / 2) / 100) * widthPx;
      const row = rowEnd[0] <= rowEnd[1] ? 0 : 1;
      let px = FONT, half = labelWidth(text, px) / 2;
      const room = center - rowEnd[row] - 3;
      if (room < half) {
        px = Math.max(FONT * 0.8, (FONT * room) / half);
        half = labelWidth(text, px) / 2;
      }
      rowEnd[row] = center + half;
      wd.style.top = row * 19 + "px";
      span.style.fontSize = px < FONT ? px.toFixed(1) + "px" : "";
      span.style.transform = "";
    });
    const rows = {};
    $$(".wd span", strip).forEach((s) => (rows[s.parentElement.style.top] = rows[s.parentElement.style.top] || []).push(s));
    for (const spans of Object.values(rows)) {
      let prevRight = -Infinity;
      spans.map((s) => [s, s.getBoundingClientRect()]).sort((a, b) => a[1].left - b[1].left).forEach(([s, r]) => {
        if (!r.width) return;
        const dx = Math.max(0, prevRight + 3 - r.left);
        if (dx > 0) s.style.transform = "translateX(calc(-50% + " + dx.toFixed(1) + "px))";
        prevRight = r.right + dx;
      });
    }
  }

  /* ------------------------------------------------------------ audio <-> playhead */
  const views = new Map(); // audio element -> Set of spectrogram figures
  function bind(audio, fig) {
    if (!views.has(audio)) {
      views.set(audio, new Set());
      audio.addEventListener("play", () => { pauseOthers(audio); loop(audio); });
      ["pause", "seeked", "timeupdate", "ended", "loadedmetadata"].forEach((ev) => audio.addEventListener(ev, () => tick(audio)));
    }
    views.get(audio).add(fig);
    tick(audio);
    return () => views.get(audio).delete(fig);
  }
  function tick(audio) {
    const t = audio.currentTime || 0;
    for (const fig of views.get(audio) || []) {
      const ph = $(".playhead", fig), sc = $(".spec-scroll", fig), f = Math.min(1, t / durOf(fig));
      ph.style.left = f * 100 + "%";
      ph.classList.toggle("shown", t > 0 && !audio.ended);
      // keep the playhead visible in a strip wider than its container
      if (!audio.paused && sc.scrollWidth > sc.clientWidth + 1) {
        const x = f * $(".spec-canvas", fig).clientWidth;
        if (x < sc.scrollLeft + 8 || x > sc.scrollLeft + sc.clientWidth * 0.85) sc.scrollLeft = Math.max(0, x - sc.clientWidth * 0.25);
      }
    }
  }
  function loop(audio) {
    tick(audio);
    if (!audio.paused && !audio.ended) requestAnimationFrame(() => loop(audio));
  }
  function pauseOthers(audio) {
    for (const a of views.keys()) if (a !== audio && !a.paused) a.pause();
  }
  // A strip wider than its container starts scrolled to its first marked box.
  function reveal(fig) {
    const sc = $(".spec-scroll", fig), box = $(".spec-box", fig);
    if (box && sc.scrollWidth > sc.clientWidth + 1) sc.scrollLeft = Math.max(0, box.offsetLeft - sc.clientWidth * 0.3);
    else sc.scrollLeft = 0;
  }

  /* ------------------------------------------------------------ enlarged view */
  let zoomed = null;
  function openZoom(fig, audio) {
    const dlg = $("#zoom");
    if (!dlg || typeof dlg.showModal !== "function") return;
    closeZoomContent();
    $("#zoom-title").textContent = "Recording " + fig.dataset.rec + " · " + durOf(fig).toFixed(2) + " s";
    const copy = fig.cloneNode(true);
    copy.style.setProperty("--pps", Math.max(160, PPS * 2));
    const canvas = $(".spec-canvas", copy);
    canvas.classList.add("zoomed");
    canvas.removeAttribute("role"); canvas.removeAttribute("tabindex"); canvas.removeAttribute("aria-label");
    canvas.addEventListener("click", (ev) => {
      const r = $(".spec-img", copy).getBoundingClientRect();
      audio.currentTime = Math.max(0, Math.min(durOf(fig), ((ev.clientX - r.left) / r.width) * durOf(fig)));
      tick(audio);
    });
    $(".zoom-body", dlg).append(copy);
    const play = $("#zoom-play");
    const label = () => (play.textContent = audio.paused ? "Play" : "Pause");
    play.onclick = () => (audio.paused ? audio.play() : audio.pause());
    audio.addEventListener("play", label); audio.addEventListener("pause", label);
    const unbind = bind(audio, copy);
    zoomed = { node: copy, off: () => { unbind(); audio.removeEventListener("play", label); audio.removeEventListener("pause", label); } };
    dlg.showModal();
    label();
    layoutLabels(copy);
    tick(audio);
  }
  function closeZoomContent() {
    if (zoomed) { zoomed.off(); zoomed.node.remove(); zoomed = null; }
  }
  function initZoom() {
    const dlg = $("#zoom");
    if (!dlg) return;
    $("#zoom-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", closeZoomContent);
    // close on a click on the backdrop only (outside the dialog box, not on its padding)
    dlg.addEventListener("click", (ev) => {
      const r = dlg.getBoundingClientRect();
      if (ev.target === dlg && (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom)) dlg.close();
    });
  }

  /* ------------------------------------------------------------ BibTeX */
  function initCopy() {
    const btn = $("#copy-bibtex"), code = $("#bibtex-code");
    if (!btn || !code) return;
    const select = () => {
      const r = document.createRange(); r.selectNodeContents(code);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    };
    btn.addEventListener("click", () => {
      const done = (ok) => { btn.textContent = ok ? "Copied" : "Select and copy"; setTimeout(() => (btn.textContent = "Copy"), 1800); };
      try {
        navigator.clipboard.writeText(code.textContent).then(() => done(true), () => { select(); done(false); });
      } catch (e) { select(); done(false); }
    });
  }

  /* ------------------------------------------------------------ init */
  function layoutAll() {
    choosePPS();
    $$("main .spec").forEach((fig) => { layoutLabels(fig); reveal(fig); });
  }
  document.addEventListener("DOMContentLoaded", () => {
    initZoom();
    initCopy();
    $$("main .listen").forEach((box) => {
      const audio = $("audio", box), fig = $(".spec", box), canvas = $(".spec-canvas", fig);
      bind(audio, fig);
      const open = () => openZoom(fig, audio);
      canvas.addEventListener("click", open);
      canvas.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); } });
    });
    layoutAll();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutAll);
    let timer = null;
    window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(layoutAll, 150); });
  });
})();
