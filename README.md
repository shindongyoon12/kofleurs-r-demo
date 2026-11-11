# KoFLEURS-R demo page

Demo page for "KoFLEURS-R: Improving Text and Audio Consistency in the Korean FLEURS-R Corpus":
https://shindongyoon12.github.io/kofleurs-r-demo/

Static HTML based on the [Academic Project Page Template](https://github.com/eliahuhorwitz/Academic-project-page-template) (CC BY-SA 4.0).

## Files

| Path | Content |
|---|---|
| `index.html` | the whole page as static HTML: abstract, Fig. 1, method overview, the Fig. 1 recordings |
| `static/js/site.js` | behaviour only: spectrogram playhead, enlarged view, word-label layout |
| `static/css/site.css` | styles (Bulma from the template + page styles, light and dark) |
| `static/audio/`, `static/spectrograms/` | 128 kb/s MP3 at the original 24 kHz, log-mel PNGs (magma) |

`index.html` is generated from a template; it can be edited by hand here, but a later rebuild overwrites it, so the
same change should go into the template as well.

## Local preview

```bash
python3 -m http.server 8000   # http://localhost:8000 (seeking in audio needs a Range-capable server such as GitHub Pages)
```

## Licenses

Audio and transcriptions: FLEURS-R and FLEURS (CC BY 4.0). Word boundaries: MMS forced aligner `MahmoudAshraf/mms-300m-1130-forced-aligner` (CC BY-NC 4.0). Page template: CC BY-SA 4.0.
