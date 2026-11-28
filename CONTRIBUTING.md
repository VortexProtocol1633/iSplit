# Contributing to iSplit

Thanks for taking the time to improve iSplit. This is a small, deliberately dependency-free project, and contributions of every size are welcome — bug reports, paper-size edge cases, accessibility fixes, documentation, and focused feature PRs.

## Ground rules

Please keep the project's defining constraints intact:

1. **Client-side only.** No backend, no uploads, no telemetry. Files must stay in the browser.
2. **No build step.** Direct `<script>`/`<link>` tags, no bundler, framework, or package manager runtime. Dev-only tooling is fine if it isn't required to run the site.
3. **Print accuracy first.** A change that looks good but breaks paper sizing, DPI, margins, overlap, or `@page` printing will not be merged.
4. **Accessibility is part of the UI.** New controls need labels, keyboard access, visible focus, and sensible `aria-*` attributes. Keep tooltips usable without a mouse.
5. **Small, focused changes.** Avoid drive-by reformatting, dependency additions, or redesigns in a bug-fix PR. Open an issue first for large features.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local development

There is nothing to install:

```bash
git clone https://github.com/VortexProtocol1633/iSplit.git
cd iSplit
python -m http.server 8080
# open http://localhost:8080
```

Use a local server rather than opening `index.html` directly — PDF.js and jsPDF load from a CDN and some browser APIs behave differently on `file://`. An internet connection is needed for those libraries and the Google Font.

The whole app is three files:

| File | Responsibility |
| --- | --- |
| `index.html` | Markup, sidebar controls, preview stage, About/Creator dialogs |
| `style.css` | Theme tokens, responsive layout, print rules, modal/sidebar transitions |
| `script.js` | File loading, PDF rendering, grid math, canvas preview, tile selection, export and print |

## Reporting a bug

Use the [bug report form](https://github.com/VortexProtocol1633/iSplit/issues/new?template=bug_report.yml). A useful report includes:

- Browser and OS versions
- Input type (JPG, PNG, or PDF; if PDF, page count/orientation)
- Paper size, orientation, units, and grid mode used
- Exact steps to reproduce
- Expected vs. actual result
- Console errors and a screenshot or short recording if possible

**Do not attach private documents.** Crop or replace the content with a test image that still reproduces the problem.

## Making a pull request

1. Open an issue for anything beyond a small fix, so the approach can be agreed first.
2. Fork the repo and create a branch from `main` (for example `fix/pdf-page-switch`).
3. Keep the diff focused. Match the existing style: 2-space indentation, single quotes in JS, semicolons, and CSS custom properties for theme values.
4. Verify manually with the checklist below.
5. Open a PR using the template, explain **why** the change is needed, and include before/after screenshots for UI changes.

### Manual test checklist

Run the checks relevant to your change, and say in the PR what you covered:

- [ ] Load a JPG and a PNG; preview renders and tile count matches the chosen grid.
- [ ] Load a multi-page PDF, switch pages, and confirm the preview refreshes.
- [ ] Change paper size, units, and orientation; displayed dimensions update correctly.
- [ ] Try each grid mode: Segments, Manual rows × columns, and Auto from poster size.
- [ ] Adjust zoom, pan, rotation, and crop; preview and tile captures stay in sync.
- [ ] Toggle margin, gap, overlap, borders, crop marks, cut guides, and tile numbers.
- [ ] Exclude a tile, then export **Selected tiles** and confirm only those pages are included.
- [ ] Export all tiles as a PDF and open it; page size should match the selected paper.
- [ ] Print preview: correct paper size, no unwanted scaling, no clipped content.
- [ ] Toggle light/dark theme and reload; the theme and settings persist.
- [ ] Resize to a phone width; the sidebar, preview toolbar, and dialogs remain usable.
- [ ] Keyboard-only pass: Tab reaches controls, Enter/Space activates tiles and buttons, Esc closes overlays.

Large files (high-megapixel scans, 300 DPI, many tiles) are worth testing separately and noting in the PR.

## Commit messages

Imperative, short, and specific: `Fix overlap offset on landscape A4`, not `update stuff`. One logical change per commit.

## License

By submitting a contribution, you agree that it is licensed under the project's [MIT License](LICENSE).
