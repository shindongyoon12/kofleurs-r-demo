# KoFLEURS-R demo page

Demo page for "KoFLEURS-R: Improving Text and Audio Consistency in the Korean FLEURS-R Corpus" (ICEIC 2027):
https://shindongyoon12.github.io/kofleurs-r-demo/

Static HTML based on the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template) (CC BY-SA 4.0).

## Files

| Path | Content |
|---|---|
| `index.html` | the whole page as static HTML: abstract, Fig. 1, method overview, three examples, BibTeX |
| `static/js/site.js` | behaviour only: spectrogram playhead, enlarged view, word-label layout, BibTeX copy |
| `static/css/site.css` | styles (Bulma from the template + page styles, light and dark) |
| `static/audio/`, `static/spectrograms/` | 128 kb/s MP3 at the original 24 kHz, log-mel PNGs (magma) |
| `static/data/demo_data.json` | the data the example cards were written from (not loaded by the page) |
| `static/pdfs/` | the paper PDF linked by the Paper button (left out of a blind deployment) |

`index.html` is generated in the research repository (`demo/scripts/build_page.py` from `demo/page/template.html`,
`demo/page/config.json` and `demo_data.json`). It can be edited by hand here, but a later rebuild overwrites it, so the
same change should go into the template as well.

## Examples

One example per contribution of the paper, each with two speakers of the same script:

| Example | Recordings | Why |
|---|---|---|
| 1. Parenthetical slot | `14945311428794587488` (skipped), `14152602067612134390` (read) | the first is one of the 189 human-verified recordings, with the largest reduction after refinement |
| 2. Number slot | `11800040547070956694` (이십오), `1807970046287819091` (스물다섯) | the first is human-verified; the annotator's spoken form confirms the reading |
| 3. Unpredictable mismatch | `987799419854082105` (adds 매우, R = 0.0411), `13564194454706287497` (as written, R = 0) | both human-verified; the first is the recording of Fig. 1(b) |

## Local preview

```bash
python3 -m http.server 8000   # http://localhost:8000 (seeking in audio needs a Range-capable server such as GitHub Pages)
```

## Licenses

Audio and transcriptions: FLEURS-R and FLEURS (CC BY 4.0). Word boundaries: MMS forced aligner `MahmoudAshraf/mms-300m-1130-forced-aligner` (CC BY-NC 4.0). Page template: CC BY-SA 4.0.
