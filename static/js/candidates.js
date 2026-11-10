/* Draft-only page: every Phase 1 candidate with audio, spectrogram and the Phase 1 fields. */
(function () {
  "use strict";
  const U = window.KOFLEURS_UI;
  const h = U.h;
  const KEY = "kofleurs-picks";
  let picks = new Set();
  try { picks = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...picks])); } catch (e) { /* ignore */ } };

  function showPicks() {
    const el = document.getElementById("picked");
    el.textContent = picks.size ? [...picks].join(", ") : "없음";
  }

  function kv(pairs) {
    const dl = h("dl", { class: "kv" });
    for (const [k, v] of pairs) {
      if (v == null || v === "") continue;
      dl.append(h("dt", null, k), h("dd", null, v));
    }
    return dl;
  }

  let nCard = 0;
  function recCard(rec, label) {
    // a recording can appear in two groups (e.g. B and C): ids stay unique, and all its boxes stay in sync
    const id = "pick-" + rec.id + "-" + nCard++;
    const box = h("input", { type: "checkbox", id, value: rec.id, class: "pick-box" });
    box.checked = picks.has(rec.id);
    box.addEventListener("change", () => {
      box.checked ? picks.add(rec.id) : picks.delete(rec.id); save(); showPicks();
      document.querySelectorAll('input.pick-box[value="' + rec.id + '"]').forEach((b) => (b.checked = box.checked));
    });
    const parens = rec.slots.filter((s) => s.type === "paren").map((s) =>
      s.span + " → " + (s.chosen === 0 ? "생략" : "읽음 (" + s.options[s.chosen].name + ")") +
      ", margin " + s.margin + ", ctc_margin " + s.ctc_margin).join(" / ");
    const reads = rec.slots.filter((s) => s.type !== "paren").map((s) =>
      s.span + " → " + s.options[s.chosen].insert.trim() + " (" + s.options[s.chosen].name + ", " + s.source + ")").join(" / ");
    const hu = rec.human;
    const card = h("div", { class: "rec" },
      h("label", { class: "pick", for: id }, box, label ? label + " 선택" : "선택"),
      U.recMeta(rec, label),
      U.field("transcription", rec.text.transcription, rec.highlights, rec.meaning_en),
      kv([
        ["raw_transcription", rec.text.raw_transcription.ko],
        ["refined_text", rec.text.refined_text.ko],
        ["spoken_text", rec.text.spoken_text.ko],
        ["Whisper large-v3", rec.hypotheses["whisper-large-v3"].ko],
        ["Whisper large-v3-turbo", rec.hypotheses["whisper-large-v3-turbo"].ko],
        ["Korean wav2vec 2.0", rec.hypotheses["w2v2-ko"].ko],
        ["Remove-all", rec.text.remove_all.ko],
        ["사람 레퍼런스", hu ? hu.text_heard + (hu.corrected ? "  (정정본)" : "") + (hu.unsure ? "  (unsure, 평가 제외)" : "") : "없음 (사람이 검수하지 않은 녹음)"],
        ["사람 발음형", hu ? hu.text_spoken : null],
        ["R / min_gop", "R " + rec.reliability_score + " · min_gop " + rec.min_gop],
        ["괄호", parens || "없음"],
        ["숫자·약어 읽기", reads || "없음"],
        ["잔여 오류 (자동)", rec.residual_type ? "유형 " + rec.residual_type[0] + " — " +
          (hu && hu.corrected ? "평가자가 다시 듣고 정답을 고친 녹음 (reference_corrections.json: '매우' 삽입 확인)" : rec.residual_type[1]) : null],
        ["189개 세트", rec.in_eval_189 ? "포함" : "미포함"],
        ["wav", "data/fleurs_r_ko_kr_full/data/ko_kr/audio/" + rec.split + "/" + rec.split + "/" + rec.file],
      ]),
      U.listenBlock(rec, U.problemBoxes(rec), rec.words.refined));
    const proc = h("details", { class: "proc" }, h("summary", null, "과정: 슬롯과 J 점수 보기"), U.chips(rec));
    rec.slots.forEach((s) => {
      if (s.options.length > 1 && s.options.some((o) => o.J != null)) { proc.append(U.scoreTable(rec, s)); proc.append(U.slotNotes(s, rec)); }
      else if (s.source === "ctc") proc.append(U.slotNotes(s, rec));
    });
    card.append(proc);
    return card;
  }

  function item(title, recs, labels) {
    const it = h("div", { class: "item" }, h("h3", null, title));
    recs.forEach((r, k) => { if (r) it.append(recCard(r, labels ? labels[k] : null)); });
    return it;
  }

  function render(D) {
    const R = D.recordings, G = D.groups, root = document.getElementById("groups");
    const get = (f) => R[f.replace(".wav", "")];
    const tag = (r) => { const m = r.highlights[0]; return m ? ({ omission: "생략", spoken: "읽음", repeat: "한 번 더 읽음",
      reading: "읽기: " + m.label, "reading-default": "기본 읽기: " + m.label }[m.type] || "") : ""; };
    root.textContent = "";
    root.append(h("h2", { class: "title is-4 group-head", id: "group-A" }, "1. 생략: 괄호를 읽은 녹음과 생략한 녹음"));
    G.A.forEach((g, n) => {
      const recs = g.files.map(get);
      root.append(item("A" + (n + 1) + ". 문장 " + g.sentence_id + ", 괄호 " + g.span + " (" + g.kind + ")" +
        (g.mixed ? "" : " — 녹음 " + recs.length + "개라 읽음/생략 쌍이 될 수 없음"), recs, recs.map(tag)));
    });
    root.append(h("h2", { class: "title is-4 group-head", id: "group-I" }, "2. 추가: 괄호 속 외국어를 한글로 한 번 더 읽음"));
    G.I.forEach((g, n) => {
      const recs = g.files.map(get);
      root.append(item("I" + (n + 1) + ". 문장 " + g.sentence_id + ", 괄호 " + g.span, recs, recs.map(tag)));
    });
    root.append(h("h2", { class: "title is-4 group-head", id: "group-S" }, "3. 대체: 같은 숫자·약어를 녹음마다 다르게 읽음"));
    G.S.forEach((g, n) => {
      const recs = g.files.map(get);
      root.append(item("S" + (n + 1) + ". 문장 " + g.sentence_id + ", “" + g.span + "”", recs, recs.map(tag)));
    });
    root.append(h("h2", { class: "title is-4 group-head", id: "group-F" }, "Fig. 1 녹음"));
    root.append(item("(a) 아순시온, (b) 매우, (c) 국가는, (c) 교회는(대본대로 읽음)", ["a", "b", "c", "c_written"].map((k) => get(G.F[k])),
      ["(a)", "(b)", "(c) 국가는", "(c) 교회는"]));
  }

  document.addEventListener("DOMContentLoaded", () => {
    U.initZoom();
    U.setPPS(64);
    U.setLazy(true);
    showPicks();
    document.getElementById("copy-picks").addEventListener("click", (ev) => {
      const text = [...picks].join(", "), btn = ev.currentTarget;
      const reset = () => setTimeout(() => (btn.textContent = "선택한 ID 복사"), 1800);
      try {
        navigator.clipboard.writeText(text).then(() => { btn.textContent = "복사됨"; reset(); },
          () => { btn.textContent = "복사 실패: 위 목록을 직접 복사하세요"; reset(); });
      } catch (e) { btn.textContent = "복사 실패: 위 목록을 직접 복사하세요"; reset(); }
    });
    document.getElementById("clear-picks").addEventListener("click", () => {
      picks.clear(); save(); showPicks();
      document.querySelectorAll('input[type="checkbox"]').forEach((b) => (b.checked = false));
    });
    fetch("static/data/demo_data.json").then((r) => r.json()).then(render).catch((err) => {
      document.getElementById("groups").textContent = "데이터를 불러오지 못했습니다: " + err.message;
    });
  });
})();
