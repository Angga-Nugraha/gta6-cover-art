# Sunset Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Angga-Nugraha/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Angga-Nugraha/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your photo into a Vice-style poster: a web app that makes multi-panel
cover art with bold caption lettering and a Vice City sunset or neon colour
grade, exported as a PNG to share. Built for the
[make.fun GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Any photo** — upload your own photos (or use the four included samples),
  crop and position each one by dragging, scrolling to zoom, or with sliders
  for zoom, rotation, pan and flip.
- **Multi-panel posters** — 7 layouts: Solo, Duo Split / Stack, Trio Hero /
  Strip, Quad Grid / Strip. Fill several panels with one photo or several.
- **Bold caption lettering** — title + subtitle, three shipped display fonts
  (Anton, Bebas Neue, Archivo Black), gradient fills, outline, drop shadow,
  size, tracking, top/bottom placement.
- **Colour grades** — Vice Sunset, Neon Nights, Golden Hour, Palm Noir,
  Mono Vice, with a strength slider.
- **Poster extras** — a retro striped sun, palm silhouettes, film grain,
  vignette and a poster frame, all drawn in code.
- **Fast export** — one click exports PNGs at 1080×1080, 1080×1350 and
  1920×1080, or all three at once. Hold-to-compare shows before / after.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

`app/` is plain static files with no build step and no network request: open
`app/index.html` from any static server in desktop Chrome and it works
offline. Photos are read on your own machine and never uploaded.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library.

## Credits

- Fonts: Anton, Bebas Neue and Archivo Black, all under the SIL Open Font
  License 1.1 (see `app/fonts/OFL.txt`).
- Sample photos: two from the make.fun kit (made with an image model for
  make.fun, free to use) and two made with an image model for this entry.
- All poster art — the sun, palms, lettering and grades — is original work
  drawn in code. No Rockstar Games logo, artwork, character or font is used.

## License

MIT — see [LICENSE](LICENSE).
