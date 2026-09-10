# MSE Videoteca

Video catalog module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.4.0`.

## Features in this MVP

- Declarative SharePoint list schema (single list, admin-curated).
- Runtime auto-provisioning of the required SharePoint list/schema before rendering.
- Compact full-bleed page bar (breadcrumb, debounced search, "Minha lista" and "+ Sugerir tema" actions — both inert placeholders, see below).
- Filter bar: category chips, sort (recentes/mais assistidos), trilhas/grade view toggle.
- "Continuar assistindo" section based on recently opened videos (`localStorage`, see below).
- Auto-advancing carousel of featured videos (`Destaque` = yes), pausing on hover/focus, no
  autoplay under `prefers-reduced-motion`; controls repositioned below the frame via CSS Grid
  without changes to the shared `modules/ui/carousel/carousel.js`.
- Videos grouped by category into horizontal rows ("Por tema") or a flat grid ("Todos os vídeos").
- Read-only: each item stores a `URL` pointing to wherever the recording actually lives
  (a document library, Stream replacement, etc.) — clicking a card opens that URL in a new tab.
  A document-library integration (auto-listing uploaded files) was intentionally left out of this
  MVP to keep the first version small; add it if curators need something more than pasting a link.

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

## Data structures

The module declares one SharePoint list: `VideotecaVideos`.

## Local tests

```powershell
npm test
```

## SharePoint test

Use [`USAGE.md`](USAGE.md) to publish the assets and paste the Modern Script Editor snippet.

Versioning policy: never overwrite a published version folder in place — see
[`../../docs/ARQUITETURA-MSE.md`](../../docs/ARQUITETURA-MSE.md#10-versionamento-e-publicação).
