# iSplit — Image & PDF to Printable Tiles

iSplit is a **client-side** web app that splits a large image or a PDF page into printable paper-sized tiles (A4, Letter, custom sizes, etc.). You can arrange the printed pages edge-to-edge to assemble a poster or large-format layout.

Everything runs **locally in your browser**: files are not uploaded to a server.

## Features

- **Upload** JPG, PNG, or PDF (select a page for multi-page PDFs) via drag & drop or file picker.
- **Paper & layout**
  - Standard paper sizes (A0–A6, Letter, Legal, Tabloid) or custom size with mm/cm/in units.
  - Portrait/landscape orientation.
  - Grid modes: **Segments** (pick a count, iSplit chooses the best-fitting rows × columns), **Manual rows × columns**, or **Auto** from a target poster size.
- **Image adjustments**: zoom, pan, rotate (0/90/180/270), and crop (top/left/width/height).
- **Layout & guides**: margin, gap, overlap (for easier assembly), borders, crop marks, tile numbers, cut guides, and an option to hide tile numbers on exported/printed output.
- **Output**: configurable DPI and JPEG quality; **Download PDF** (all tiles), **Selected tiles** PDF (click tiles in the preview to include/exclude), and **Print** with correct page sizing.
- **Convenience**: theme toggle (light/dark), settings persistence in `localStorage`, responsive UI, and keyboard-accessible controls/tooltips.

## Quick start

Because the app loads PDF.js/jsPDF from CDNs and browsers restrict some features on `file://`, run it from a local HTTP server (internet access is needed for the CDN libraries).

```bash
# from the project folder
npx --yes serve .
# or
python -m http.server 8080
```

Then open the printed local URL (for example, `http://localhost:3000` or `http://localhost:8080`) and upload an image/PDF.

You can also host the folder as static files on any static hosting (GitHub Pages, Netlify, Vercel static, etc.).

## Usage tips

- **Zoom/pan in the preview:** hold **Ctrl** (or **Cmd**) + **mouse wheel** to zoom; hold **Ctrl** (or **Cmd**) + **left-drag** to pan the image.
- **Tile selection:** click a tile (or focus it and press Enter/Space) to include/exclude it. Use *Select all* / *Clear* in the preview bar.
- **Gap vs. overlap:** *Gap* adds spacing between adjacent tile capture regions (leaving a gap in the image between pages). *Overlap* repeats a small area across neighboring tiles, which helps with alignment/trimming when assembling.
- **Printing:** in your browser’s print dialog, use **Actual size / 100%** scaling and the correct paper size for best results.
- **Reset:** *Reset settings* restores defaults and clears saved preferences.

## Privacy

iSplit processes files in the browser. Your images/PDFs are not sent to an iSplit server. Note that the app loads third-party libraries from CDNs (`cdnjs.cloudflare.com`); host those files locally if you need fully offline/air-gapped use.

## Project structure

- `index.html` — UI and page structure
- `style.css` — styling, responsive layout, and themes
- `script.js` — tiling/preview/export/print logic
- `assets/` — demo screenshots and media used by the About modal

## Tech stack

- Vanilla HTML/CSS/JavaScript (no build step)
- [PDF.js](https://mozilla.github.io/pdf.js/) 3.11.174 for rendering PDF pages
- [jsPDF](https://github.com/parallax/jsPDF) 2.5.1 for PDF export

## Known limitations / notes

- Requires a modern browser with Canvas support.
- PDF rendering and the PDF export library are loaded from CDNs, so an internet connection is needed unless you vendor those libraries locally.
- Very large images, high DPI, and many tiles can use significant memory/CPU during preview and export.

## Credits

Created by **Md Masrur Masuk** (Shopnil).

## License

No license file is included in this repository. Add a `LICENSE` file if you want to specify reuse terms before publishing.
