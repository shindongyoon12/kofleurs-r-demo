/* KoFLEURS-R demo page: renders the examples from static/data/demo_data.json, keeps every
   spectrogram's playhead in sync with its audio, and opens an enlarged view on click. */
(function () {
  "use strict";
  const CFG = window.KOFLEURS_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") e.className = v;
        else if (k === "style") Object.assign(e.style, v);
        else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? "" : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) { k.forEach((x) => add(e, x)); return; }
    e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  const fmt = (x, d) => (x == null ? "—" : Number(x).toFixed(d).replace("-", "−"));
  const fmtJ = (x) => (x == null ? "—" : (Math.round(x * 100) / 100).toString().replace("-", "−"));
  const signed = (x) => (x == null ? "—" : (x > 0 ? "+" : "") + String(x).replace("-", "−"));
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  /* ------------------------------------------------------------ config: authors, links, BibTeX */
  // Author names live only in CFG.authorsFile, which is loaded only when showAuthors is true.
  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.append(s);
    });
  }
  function renderAuthors(A) {
    const au = $("#authors"), links = $("#pub-links");
    au.textContent = ""; links.textContent = "";
    if (A && A.authors && A.authors.length) {
      au.append(h("div", null, A.authors.join(", ")));
      if (A.affiliation) au.append(h("div", { class: "affil" }, A.affiliation));
      if (A.paperUrl) {
        const a = h("a", { class: "btn", href: A.paperUrl, target: "_blank", rel: "noopener" });
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5L13 3.5zM7 13h10v1.6H7V13zm0 3.4h10V18H7v-1.6z"/></svg>';
        a.append("Paper");
        links.append(a);
      }
    } else {
      au.append(h("div", { class: "affil" }, "Anonymous authors"));
    }
    const names = A && A.authors && A.authors.length
      ? A.authors.map((n) => { const p = n.split(" "); return p.slice(-1) + ", " + p.slice(0, -1).join(" "); }).join(" and ")
      : "Anonymous";
    const b = CFG.bibtex || {};
    $("#bibtex-code code").textContent =
      "@inproceedings{" + ((A && A.bibtexKey) || "kofleursr2027") + ",\n" +
      "  title     = {{KoFLEURS-R}: Improving Text and Audio Consistency in the {Korean} {FLEURS-R} Corpus},\n" +
      "  author    = {" + names + "},\n" +
      (b.booktitle && b.booktitle !== "TODO" ? "  booktitle = {" + b.booktitle + "},\n" : "") +
      "  year      = {" + (b.year || "") + "}\n}";
  }
  function applyConfig() {
    document.body.classList.toggle("reviewing", !!CFG.reviewMode);
    renderAuthors(null);
    if (CFG.showAuthors && CFG.authorsFile) {
      loadScript(CFG.authorsFile).then(() => renderAuthors(window.KOFLEURS_AUTHORS || null), () => renderAuthors(null));
    }
    $("#copy-bibtex").addEventListener("click", (ev) => {
      const text = $("#bibtex-code").textContent, btn = ev.currentTarget;
      const done = (ok) => { btn.textContent = ok ? "Copied" : "Select and copy"; setTimeout(() => (btn.textContent = "Copy"), 1800); };
      try {
        navigator.clipboard.writeText(text).then(() => done(true), () => { selectNode($("#bibtex-code")); done(false); });
      } catch (e) { selectNode($("#bibtex-code")); done(false); }
    });
  }
  function selectNode(n) {
    const r = document.createRange(); r.selectNodeContents(n);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ------------------------------------------------------------ audio <-> spectrogram sync */
  const views = new Map(); // audio element -> Set of {ph, dur, scroller, width}
  function bind(audio, ph, dur, scroller, width) {
    if (!views.has(audio)) {
      views.set(audio, new Set());
      audio.addEventListener("play", () => { pauseOthers(audio); loop(audio); });
      ["pause", "seeked", "timeupdate", "ended", "loadedmetadata"].forEach((ev) => audio.addEventListener(ev, () => tick(audio)));
    }
    const v = { ph, dur, scroller, width };
    views.get(audio).add(v);
    tick(audio);
    return () => views.get(audio).delete(v);
  }
  function tick(audio) {
    const t = audio.currentTime || 0;
    for (const v of views.get(audio) || []) {
      const f = Math.min(1, t / v.dur);
      v.ph.style.left = f * 100 + "%";
      v.ph.classList.toggle("shown", t > 0 && !audio.ended);
      // keep the playhead visible in a strip wider than its container
      const sc = v.scroller;
      if (sc && !audio.paused && sc.scrollWidth > sc.clientWidth + 1) {
        const x = f * v.width;
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

  /* ------------------------------------------------------------ spectrogram figure */
  let PPS = 80;
  let LAZY = false; // the candidates page (38 recordings) loads images lazily
  const KIND_TAG = { omission: "not spoken", insertion: "inserted", substitution: "misread", spoken: "spoken",
                     repeat: "read again in Hangul", reading: "read differently from the default", "reading-default": "default reading",
                     "chosen-repeat": "the gloss, read again in Hangul", "chosen-reading": "the selected reading",
                     "chosen-read": "the parenthetical, spoken and kept" };

  function boxEl(m, dur) {
    const w = m.t1 - m.t0, narrow = w < 0.06;
    const left = narrow ? ((m.t0 + m.t1) / 2 / dur) * 100 : (m.t0 / dur) * 100;
    const style = narrow ? { left: left + "%", width: "8px", transform: "translateX(-50%)" }
                         : { left: left + "%", width: (w / dur) * 100 + "%" };
    let tag = m.tag || KIND_TAG[m.type];
    return h("div", { class: "spec-box " + m.type + (left > 72 ? " tag-right" : ""), style, title: tag }, h("span", { class: "tag" }, tag));
  }

  // Word labels in two rows. Label width estimate at 11 px: Hangul ~11 px, other characters ~6.5 px,
  // plus padding. Each label goes to the row with more room; a label that would still touch its
  // neighbour in that row is set in a smaller font (down to 80 %) and, if that is not enough,
  // moved right just past the neighbour instead of overlapping it.
  const FONT = 11;
  const labelWidth = (s, px) => Array.from(s).reduce((a, c) => a + (/[가-힣]/.test(c) ? px : px * 0.6), 0) + 4;
  function wordStrip(words, dur, widthPx) {
    const strip = h("div", { class: "spec-words", "aria-hidden": "true" });
    const rowEnd = [-Infinity, -Infinity];
    words.filter((w) => w.t0 != null).forEach((w) => {
      const center = ((w.t0 + w.t1) / 2 / dur) * widthPx;
      const row = rowEnd[0] <= rowEnd[1] ? 0 : 1;
      let px = FONT, half = labelWidth(w.w, px) / 2;
      const room = center - rowEnd[row] - 3;  // space to the left of the center in this row
      if (room < half) {
        px = Math.max(FONT * 0.8, (FONT * room) / half);
        half = labelWidth(w.w, px) / 2;
      }
      rowEnd[row] = center + half;
      const st = {};
      if (px < FONT) st.fontSize = px.toFixed(1) + "px";
      strip.append(h("div", {
        class: "wd" + (w.hl ? " hl-" + w.hl : ""),
        style: { left: (w.t0 / dur) * 100 + "%", width: ((w.t1 - w.t0) / dur) * 100 + "%", top: row * 19 + "px" },
        title: w.w + (w.rr ? " (" + w.rr + ")" : "") + "  " + w.t0.toFixed(2) + "–" + w.t1.toFixed(2) + " s",
      }, h("span", { class: "ko", style: st }, w.w)));
    });
    requestAnimationFrame(() => separateLabels(strip));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(() => separateLabels(strip)));
    return strip;
  }
  // After layout: in each row, move a label right until it clears the previous one (measured widths).
  function separateLabels(strip) {
    const rows = {};
    strip.querySelectorAll(".wd span").forEach((s) => {
      s.style.transform = "";  // measure from the centered position
      const top = s.parentElement.style.top;
      (rows[top] = rows[top] || []).push(s);
    });
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

  function specFigure(rec, audio, opt) {
    const pps = opt.pps || PPS, dur = rec.duration;
    const img = h("img", { src: rec.spectrogram, alt: "Log-mel spectrogram of recording " + rec.id + " (" + dur.toFixed(2) + " s)",
                           loading: LAZY && !opt.zoom ? "lazy" : "eager", decoding: "async" });
    const area = h("div", { class: "spec-img" }, img);
    (opt.boxes || []).forEach((m) => { if (m.t0 != null && m.t1 != null) area.append(boxEl(m, dur)); });
    const ph = h("div", { class: "playhead" });
    area.append(ph);
    const widthPx = Math.round(dur * pps);
    const canvas = h("div", { class: "spec-canvas" + (opt.zoom ? " zoomed" : ""), style: { width: widthPx + "px" } }, area);
    if (opt.words) canvas.append(wordStrip(opt.words, dur, widthPx));
    const scroller = h("div", { class: "spec-scroll" });
    const unbind = bind(audio, ph, dur, scroller, widthPx);
    if (opt.zoom) {
      canvas.addEventListener("click", (ev) => {
        const r = area.getBoundingClientRect();
        const t = Math.max(0, Math.min(dur, ((ev.clientX - r.left) / r.width) * dur));
        audio.currentTime = t; tick(audio);
      });
    } else {
      canvas.setAttribute("tabindex", "0");
      canvas.setAttribute("role", "button");
      canvas.setAttribute("aria-label", "Enlarge the spectrogram of recording " + rec.id);
      const open = () => openZoom(rec, audio, opt);
      canvas.addEventListener("click", open);
      canvas.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); } });
    }
    const axis = h("div", { class: "spec-axis", style: { width: widthPx + "px" } },
                   h("span", null, "0 s"), h("span", null, dur.toFixed(2) + " s"));
    scroller.append(canvas, axis);
    const fig = h("figure", { class: "spec" }, scroller);
    fig._unbind = unbind;
    // a strip wider than its container starts scrolled to its first mismatch box
    const first = (opt.boxes || []).filter((m) => m.t0 != null).sort((a, b) => a.t0 - b.t0)[0];
    if (first) {
      requestAnimationFrame(() => {
        if (scroller.scrollWidth > scroller.clientWidth + 1) {
          scroller.scrollLeft = Math.max(0, (first.t0 / dur) * widthPx - scroller.clientWidth * 0.3);
        }
      });
    }
    return fig;
  }

  function audioEl(rec) {
    return h("audio", { controls: true, preload: "none", src: rec.audio, "aria-label": "Audio of recording " + rec.id });
  }

  /* ------------------------------------------------------------ zoom dialog */
  let zoomFig = null;
  function openZoom(rec, audio, opt) {
    const dlg = $("#zoom");
    if (!dlg || typeof dlg.showModal !== "function") return;
    closeZoomContent();
    $("#zoom-title").textContent = "Recording " + rec.id + " · " + rec.duration.toFixed(2) + " s";
    const zpps = Math.max(160, PPS * 2);
    zoomFig = specFigure(rec, audio, Object.assign({}, opt, { pps: zpps, zoom: true }));
    $(".zoom-body", dlg).append(zoomFig);
    const play = $("#zoom-play");
    play.onclick = () => (audio.paused ? audio.play() : audio.pause());
    const label = () => (play.textContent = audio.paused ? "Play" : "Pause");
    label();
    audio.addEventListener("play", label); audio.addEventListener("pause", label);
    zoomFig._label = () => { audio.removeEventListener("play", label); audio.removeEventListener("pause", label); };
    dlg.showModal();
  }
  function closeZoomContent() {
    if (zoomFig) { zoomFig._unbind(); zoomFig._label && zoomFig._label(); zoomFig.remove(); zoomFig = null; }
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

  /* ------------------------------------------------------------ text pieces */
  function marked(text, marks) {
    const out = [];
    let pos = 0;
    for (const m of marks) {
      if (m.start < pos) continue;
      out.push(text.slice(pos, m.start));
      if (m.type === "insertion") {
        out.push(h("span", { class: "mk insertion", title: "spoken, not in the script" }, "+" + m.label));
        pos = m.start;
      } else {
        const title = m.type === "reading" ? "read as " + m.label + " (default reading: " + m.default + ")"
                    : m.type === "reading-default" ? "read as " + m.label + " (the default reading)" : KIND_TAG[m.type];
        const seg = h("span", { class: "mk " + m.type, title }, text.slice(m.start, m.end));
        if (m.type === "substitution" || m.type === "reading") seg.append(h("span", { class: "mk-heard" }, "→ " + m.label));
        if (m.type === "reading-default") seg.append(h("span", { class: "mk-note" }, "→ " + m.label));
        if (m.type === "repeat") seg.append(h("span", { class: "mk-add" }, "+" + m.label));
        out.push(seg);
        pos = m.end;
      }
    }
    out.push(text.slice(pos));
    return out;
  }

  function field(name, t, marks, meaning) {
    const f = h("div", { class: "field" }, h("span", { class: "fname" }, name),
                h("div", { class: "ko", lang: "ko" }, marks ? marked(t.ko, marks) : t.ko));
    if (t.rr) f.append(h("span", { class: "rr", lang: "ko-Latn" }, t.rr));
    if (meaning && meaning.text) {
      f.append(h("span", { class: "en" }, "‘" + meaning.text + "’ ",
                 CFG.reviewMode ? h("span", { class: "todo review", title: meaning.source || "" }, "TODO review") : null));
    }
    return f;
  }

  const dataTag = () => h("span", { class: "data-tag", title: "value from the KoFLEURS-R data files, not from the paper" }, "data");

  function recMeta(rec, who) {
    return h("div", { class: "rec-meta" },
      who ? h("span", { class: "who" }, who) : null,
      h("span", { class: "pill" }, rec.split),
      h("span", { class: "pill" }, rec.speaker),
      h("span", { class: "pill num" }, rec.duration.toFixed(2) + " s"),
      rec.in_eval_189 ? h("span", { class: "pill ok", title: "one of the 189 human-verified test recordings" }, "human-verified")
                      : null,
      h("span", { class: "mono", style: { fontSize: "0.72rem" } }, rec.id), dataTag());
  }

  function listenBlock(rec, boxes, words) {
    const audio = audioEl(rec);
    return h("div", null,
      h("div", { class: "audio-row" }, audio, h("span", { class: "spec-hint" }, "Click the spectrogram to enlarge")),
      specFigure(rec, audio, { boxes, words }));
  }

  function problemBoxes(rec, keep) {
    return rec.highlights.filter((m) => !keep || keep(m)).map((m) => {
      let tag = KIND_TAG[m.type];
      if (m.type === "insertion" || m.type === "repeat") tag = "+" + m.label;
      else if (m.type === "substitution") tag = "→ " + m.label;
      else if (m.type === "reading" || m.type === "reading-default") tag = m.label;
      else if (m.from === "paren slot") tag = m.type === "omission" ? "not spoken" : "spoken";
      return Object.assign({}, m, { tag });
    });
  }

  /* ------------------------------------------------------------ process step */
  const SLOT_KIND = { paren: "parenthetical", number: "number", acronym: "acronym" };
  function optLabel(s, o) {
    if (s.type === "paren" && o.name === "drop") return "∅";
    return o.insert.trim();
  }
  function chips(rec) {
    const wrap = h("div", { class: "chips" });
    rec.slots.forEach((s) => {
      const chip = h("span", { class: "chip", title: SLOT_KIND[s.type] + " slot " + s.span },
                     h("span", { class: "ck" }, SLOT_KIND[s.type] + " " + short(s.span, 18)));
      s.options.forEach((o, c) => chip.append(h("span", { class: "opt" + (c === s.chosen ? " on" : ""), lang: "ko",
        title: o.name + (o.insert_rr ? " · " + o.insert_rr : "") }, short(optLabel(s, o), 28))));
      wrap.append(chip);
    });
    return wrap;
  }

  function excerpt(cands, c) {
    const n = Math.min.apply(null, cands.map((x) => x.length));
    let p = 0;
    while (p < n && cands.every((x) => x[p] === cands[0][p])) p++;
    let q = 0;
    while (q < n - p && cands.every((x) => x[x.length - 1 - q] === cands[0][cands[0].length - 1 - q])) q++;
    const x = cands[c], W = 12;
    const pre = (p > W ? "…" : "") + x.slice(Math.max(0, p - W), p);
    const mid = x.slice(p, x.length - q);
    const post = x.slice(x.length - q, x.length - q + W) + (q > W ? "…" : "");
    return [pre, h("b", null, mid || "∅"), post];
  }

  function scoreTable(rec, s) {
    const models = s.evidence, NAMES = rec.evidence_models;
    const hasCtc = s.options.some((o) => o.ctc_ll != null);
    const cands = s.options.map((o) => o.candidate_spoken);
    const head = h("tr", null, h("th", null, "Option"), h("th", { style: { textAlign: "left" } }, "Candidate (spoken form)"),
      models.map((m) => h("th", { title: NAMES[m] }, "d · " + NAMES[m].replace("Whisper ", "").replace("Korean ", ""))),
      h("th", null, h("i", null, "J")), hasCtc ? h("th", { title: "CTC log-likelihood" }, "CTC log-lik.") : null);
    const body = s.options.map((o, c) => h("tr", { class: c === s.chosen ? "chosen" : null },
      h("td", { lang: "ko" }, short(optLabel(s, o), 22)),
      h("td", { class: "cand", lang: "ko" }, excerpt(cands, c)),
      models.map((m) => h("td", { class: "num" }, o.distance[m] == null ? "—" : String(o.distance[m]))),
      h("td", { class: "num" }, fmtJ(o.J)),
      hasCtc ? h("td", { class: "num" }, o.ctc_ll == null ? "—" : fmt(o.ctc_ll, 2)) : null));
    const cap = h("caption", null, h("span", { class: "cap-num" }, SLOT_KIND[s.type] + " " + short(s.span, 40)),
      " score ", h("i", null, "J"), " of each option (Eq. (1) of the paper): average phonetic edit distance ", h("i", null, "d"),
      " to the hypotheses; the lowest wins ", dataTag());
    return h("div", { class: "table-wrap" }, h("table", { class: "paper scores" }, cap, h("thead", null, head), h("tbody", null, body)));
  }

  function slotNotes(s, rec) {
    const out = [];
    if (s.type === "paren" && s.margin != null) {
      const Js = s.options.map((o) => o.J);
      const tie = Js[0] === Math.min.apply(null, Js.slice(1));
      out.push(h("div", { class: "formula" },
        "Signed margin (positive supports reading): ",
        h("b", { class: "num" }, signed(s.margin)), " from the recognition hypotheses (J of omitted − lowest J of read); ",
        h("b", { class: "num" }, signed(s.ctc_margin)), " from the CTC likelihood (log-likelihood of the best read option − of omitted) ",
        dataTag(), tie ? h("span", null, " · tie, resolved in favor of omission") : null));
    }
    if (s.type !== "paren" && rec) {
      const left = Object.keys(rec.evidence_models).filter((m) => !s.evidence.includes(m));
      if (left.length) {
        out.push(h("div", { class: "formula" }, "Not used for this slot: " +
          left.map((m) => rec.evidence_models[m]).join(", ") + ". " +
          (left.length > 1 ? "Their hypotheses write" : "Its hypothesis writes") + " “" +
          ((s.span.match(/[\d,.]+|[A-Z]+/) || [s.span])[0]) + "” as written, which gives no reading. ",
          dataTag()));
      }
    }
    if (s.source === "ctc") {
      const Js = s.options.map((o) => o.J);
      const tied = Js.every((x) => x != null && x === Js[0]);
      out.push(h("div", { class: "formula" },
        (tied ? "The J scores tied; " : "No hypothesis gave a reading; ") + "the CTC likelihood chose “" +
        optLabel(s, s.options[s.chosen]) + "”. ", dataTag()));
    }
    return h("div", { class: "slot-notes" }, out);
  }

  function hypTable(rec) {
    const NAMES = rec.evidence_models, rows = [];
    for (const m of Object.keys(NAMES)) {
      const used = rec.slots.filter((s) => s.evidence.includes(m)).map((s) => SLOT_KIND[s.type] + " " + short(s.span, 14));
      if (m.startsWith("whisper")) used.push("R");
      const hyp = rec.hypotheses[m];
      rows.push(h("tr", null, h("td", { class: "m" }, NAMES[m]),
        h("td", { class: "h", lang: "ko" }, hyp.ko, hyp.rr ? h("span", { class: "rr", lang: "ko-Latn", style: { display: "block" } }, hyp.rr) : null),
        h("td", { class: "use" }, used.length ? used.join("; ") : "—")));
    }
    return h("div", { class: "table-wrap" }, h("table", { class: "paper hyps" },
      h("caption", null, h("span", { class: "cap-num" }, "Recognition hypotheses"), " ", dataTag()),
      h("thead", null, h("tr", null, h("th", null, "Model"), h("th", { style: { textAlign: "left" } }, "Hypothesis"),
        h("th", { style: { textAlign: "left" } }, "Used for"))),
      h("tbody", null, rows)));
  }

  function baselines(rec) {
    const line = (name, t) => h("div", { class: "bl" }, h("span", { class: "n" }, name),
      h("span", { class: "t", lang: "ko" }, t.ko, t.rr ? h("span", { class: "rr", lang: "ko-Latn", style: { display: "block" } }, t.rr) : null));
    return h("div", { class: "baselines" },
      h("div", { class: "bl-head" }, "Baselines for this recording ", dataTag()),
      line("Remove-all", rec.text.remove_all), line("Whisper large-v3", rec.text.whisper_large_v3));
  }

  // Where the selected option of each slot with alternatives appears in spoken_text.
  function resultMarks(rec) {
    const text = rec.text.spoken_text.ko, out = [];
    rec.slots.forEach((s) => {
      const cands = s.options.map((o) => o.candidate_spoken);
      if (cands.length < 2 || cands[s.chosen] !== text) return;
      const n = Math.min.apply(null, cands.map((x) => x.length));
      let p = 0, q = 0;
      while (p < n && cands.every((x) => x[p] === cands[0][p])) p++;
      while (q < n - p && cands.every((x) => x[x.length - 1 - q] === cands[0][cands[0].length - 1 - q])) q++;
      if (text.length - q <= p) return; // omitted: nothing to mark
      const name = s.options[s.chosen].name;
      out.push({ start: p, end: text.length - q, type: s.type !== "paren" ? "chosen-reading" : name.startsWith("repeat") ? "chosen-repeat" : "chosen-read" });
    });
    return out.sort((a, b) => a.start - b.start);
  }

  // Word labels under the result spectrogram: the words of spoken_text (what was said, e.g. 이십오 for 25),
  // with the words that the selected slot option produced highlighted.
  function spokenWords(rec) {
    const text = rec.text.spoken_text.ko, marks = resultMarks(rec), starts = [];
    for (const m of text.matchAll(/\S+/g)) starts.push([m.index, m.index + m[0].length]);
    return rec.words.spoken.map((w, k) => {
      const [a, b] = starts[k] || [-1, -1];
      const m = marks.find((x) => x.type !== "spoken" && a < x.end && b > x.start);
      return m ? Object.assign({}, w, { hl: m.type }) : w;
    });
  }

  /* ------------------------------------------------------------ demo cards */
  function who(rec, kind) {
    const m = rec.highlights[0];
    if (!m) return "Recording";
    if (m.type === "omission") return "Speaker who skipped it";
    if (m.type === "repeat") return "Speaker who read it again";
    if (m.type === "spoken") return "Speaker who read it";
    if (m.type === "reading" || m.type === "reading-default") return "Speaker who said “" + m.label + "”";
    return "Recording";
  }

  function renderDemo(card, def, R) {
    const recs = def.files.map((f) => R[f.replace(".wav", "")]).filter(Boolean);
    const body = $(".demo-body", card);
    body.textContent = "";
    if (!recs.length) { body.append(h("p", null, "Example data not found.")); return; }
    const kind = def.key;
    const steps = h("ol", { class: "steps" });

    const problem = h("li", { class: "step" }, h("h4", null, "Problem: script vs. audio"));
    recs.forEach((rec) => {
      problem.append(h("div", { class: "rec" }, recMeta(rec, who(rec, kind)),
        field("transcription", rec.text.transcription, rec.highlights, rec.meaning_en),
        listenBlock(rec, problemBoxes(rec), spokenWords(rec))));
    });

    const process = h("li", { class: "step" }, h("h4", null, "Process: slots, hypotheses, scores"));
    recs.forEach((rec) => {
      const blk = h("div", { class: "rec" }, recMeta(rec, who(rec, kind)), chips(rec), hypTable(rec));
      rec.slots.forEach((s) => {
        if (s.options.length > 1 && s.options.some((o) => o.J != null)) { blk.append(scoreTable(rec, s)); blk.append(slotNotes(s, rec)); }
        else if (s.source === "ctc") blk.append(slotNotes(s, rec));
      });
      if (!rec.slots.length) blk.append(h("p", { class: "demo-lead" }, "No slot: the script offers no alternative here."));
      blk.append(baselines(rec));
      process.append(blk);
    });

    const result = h("li", { class: "step" }, h("h4", null, "Result: refined text"));
    recs.forEach((rec) => {
      result.append(h("div", { class: "rec" }, recMeta(rec, who(rec, kind)),
        field("refined_text", rec.text.refined_text),
        field("spoken_text", rec.text.spoken_text, resultMarks(rec)),
        h("div", { class: "scorebar" },
          h("span", null, h("code", null, "reliability_score"), " R = ", h("span", { class: "sv" }, fmt(rec.reliability_score, 4))),
          h("span", null, h("code", null, "min_gop"), " = ", h("span", { class: "sv" }, fmt(rec.min_gop, 2))), dataTag()),
        listenBlock(rec, null, spokenWords(rec))));
    });
    steps.append(problem, process, result);
    body.append(steps);
  }

  /* ------------------------------------------------------------ Fig. 1 audio */
  function renderFig1(R, prov) {
    const box = $("#fig1-listen");
    if (!box) return;
    const items = [
      ["(a)", prov.fig1.a[0], (m) => m.from === "paren slot"],
      ["(b)", prov.fig1.b[0], (m) => m.type === "insertion" && m.label === "매우"],
      ["(c)", prov.fig1.c[0], (m) => m.type === "substitution" && m.label === "국가는"],
    ];
    box.append(h("h3", { class: "title is-5" }, "Recordings in Fig. 1"));
    for (const [lab, f, keep] of items) {
      const rec = R[f.replace(".wav", "")];
      if (!rec) continue;
      box.append(h("div", { class: "rec" }, recMeta(rec, lab),
        field("transcription", rec.text.transcription, rec.highlights.filter(keep), rec.meaning_en),
        listenBlock(rec, problemBoxes(rec, keep), spokenWords(rec))));
    }
  }

  /* ------------------------------------------------------------ JSON example */
  function csvLine(vals) {
    return vals.map((v) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",");
  }
  function renderJson(ex) {
    const pre = $("#json-example code");
    if (!pre || !ex) return;
    const show = (tab) => {
      pre.textContent = tab === "csv" ? csvLine(Object.keys(ex.csv)) + "\n" + csvLine(Object.values(ex.csv))
                                      : JSON.stringify(ex.manifest, null, 2);
      $$("#json-tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    };
    $$("#json-tabs button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
    show("jsonl");
  }

  /* ------------------------------------------------------------ init */
  function choosePPS(R, prov) {
    const files = prov.demos.flatMap((d) => d.files).concat(Object.values(prov.fig1).flat())
      .map((f) => R[f.replace(".wav", "")]).filter(Boolean);
    const maxDur = Math.max.apply(null, files.map((r) => r.duration));
    const card = $(".demo .demo-body") || document.body;
    const avail = Math.max(240, card.clientWidth - 40);
    // wide screens: the longest recording fits its card; narrow screens: keep 64 px/s and scroll
    PPS = Math.max(avail >= 700 ? 40 : 64, Math.min(110, Math.floor(avail / maxDur)));
  }

  function init(D) {
    const R = D.recordings, prov = D.examples;
    choosePPS(R, prov);
    renderFig1(R, prov);
    prov.demos.forEach((def) => { const card = $('.demo[data-demo="' + def.key + '"]'); if (card) renderDemo(card, def, R); });
    renderJson(D.json_example);
  }

  // shared with the draft candidates page (candidates.js)
  window.KOFLEURS_UI = { h, specFigure, audioEl, field, recMeta, problemBoxes, chips, hypTable, scoreTable, slotNotes,
                         baselines, listenBlock, initZoom, dataTag, setPPS: (p) => (PPS = p), setLazy: (v) => (LAZY = v) };

  document.addEventListener("DOMContentLoaded", () => {
    if (document.body.dataset.page === "candidates") return;
    applyConfig();
    initZoom();
    fetch("static/data/demo_data.json")
      .then((r) => { if (!r.ok) throw new Error(r.status + " " + r.statusText); return r.json(); })
      .then(init)
      .catch((err) => {
        $$(".demo-body").forEach((b) => b.append(h("p", { class: "review-note", style: { display: "block" } },
          "Could not load static/data/demo_data.json (" + err.message + "). Open the page through a web server " +
          "(python -m http.server works; seeking in the audio needs a server with HTTP range requests, such as GitHub Pages).")));
      });
  });
})();
