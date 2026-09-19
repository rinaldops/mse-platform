# MSE Videoteca

Video catalog module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.7.7`.

## Features in this MVP

- Declarative SharePoint document-library schema (single library, admin-curated).
- Runtime auto-provisioning of the required library/schema before rendering.
- Compact full-bleed page bar (breadcrumb, debounced search, "Minha lista" and "+ Sugerir tema" actions — both inert placeholders, see below).
- Filter bar: category chips, sort (recentes/mais assistidos), trilhas/grade view toggle.
- "Continuar assistindo" section based on recently opened videos (`localStorage`, see below).
- Auto-advancing carousel with six videos selected randomly on each load, pausing on hover/focus, no
  autoplay under `prefers-reduced-motion`; controls repositioned below the frame via CSS Grid
  without changes to the shared `modules/ui/carousel/carousel.js`.
- Six most recent videos beside the carousel.
- Compact catalog grouped by category, with 12 videos per page and no horizontal overflow.
- Native SharePoint video thumbnails resolved through the document library drive.
- Multiple presenters in the multi-value Person or Group field `Apresentadores`.
- Read-only: each card opens the library file from `FileRef`; `URL` is retained only as a
  compatibility fallback for older records.
- Same-title lists are resolved by `BaseTemplate`, preventing a generic list from being selected
  when the module requires the document library.

## Layout particulars (page bar redesign)

- "Continuar assistindo" is "recently opened", not real playback progress: there is no embedded
  player, so percentage-watched cannot be measured. Opening a video calls `registerRecent()`,
  which stores a timestamp in `localStorage` (key `mse-videoteca-recentes`) per browser — it does
  not sync across devices and is not a server-side record.
- "Mais assistidos" sort is backed by a new `Visualizacoes` (Number) field on `VideotecaVideos`
  (schema version 2), incremented server-side by `registerView()` on every open. This is an open
  count, not a completion count.
- "Minha lista" and "+ Sugerir tema" render per the design handoff but do nothing on click — those
  flows were explicitly out of scope in the handoff (`TD/webparts/claude_design/videoteca/README.md`,
  "Pendências"). Implement them (a saved-list feature, a suggestion form/list) as a follow-up if
  requested.
- Filter/sort/view-mode state lives only in memory, unlike the Forum's URL-persisted state — no
  shareable filtered link yet; add query-string persistence later if needed.
- The prototype's decorative `rgba()` placeholder texture on thumbnails was intentionally dropped
  (solid `var(--accent)` used instead) to keep the brand-identity `rgba()` ban intact; the
  prototype itself marks that texture as reference-only.

## Home-page summary panel

Besides the full module above (meant for Videoteca's own page), `mountVideotecaSummary()`/`createVideotecaSummaryView()` render a separate read-only panel for the site's main page: featured videos ("Destaques") with category-chip filtering and a single button through to the full page. It mounts on `data-mse-module="videoteca-summary"` (a different selector, so it never collides with the full `mountVideoteca()`), and `videoteca-loader.js` mounts whichever of the two roots it finds on the page (or both). Unlike the full page's cards, every item here links to Videoteca's own page, never straight to the recording — this panel is a teaser, not a player shortcut. The panel paints no background of its own — it blends into the SharePoint section colour and flips to a light palette on a dark section (`.mse-app--ambient-dark`, set by core). See `TD/webparts/videoteca/home-summary.*.html` vs `modern-script-editor.*.html` for the two snippets.

## Data structures

The module declares one SharePoint document library: `VideotecaVideos`
(`BaseTemplate 101`, schema version 3). Video metadata lives on each file item;
folders are excluded by `FSObjType`.

## Local tests

```powershell
npm test
```

## SharePoint test

Use [`USAGE.md`](USAGE.md) to publish the assets and paste the Modern Script Editor snippet.

Versioning policy: never overwrite a published version folder in place — see
[`../../../_docs/ARQUITETURA-MSE.md`](../../../_docs/ARQUITETURA-MSE.md#10-versionamento-e-publicação).
