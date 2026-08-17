# MSE Videoteca

Video catalog module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.1.0`.

## Features in this MVP

- Declarative SharePoint list schema (single list, admin-curated).
- Auto-advancing carousel of featured videos (`Destaque` = yes), pausing on hover/focus, no
  autoplay under `prefers-reduced-motion`.
- Videos grouped by category into horizontal rows.
- Read-only: each item stores a `URL` pointing to wherever the recording actually lives
  (a document library, Stream replacement, etc.) — clicking a card opens that URL in a new tab.
  A document-library integration (auto-listing uploaded files) was intentionally left out of this
  MVP to keep the first version small; add it if curators need something more than pasting a link.

## Data structures

The module declares one SharePoint list: `VideotecaVideos`.

## Local tests

```powershell
npm test
```

## SharePoint test

Use [`USAGE.md`](USAGE.md) to publish the assets, provision the list and paste the Modern Script Editor snippet.

Versioning policy: never overwrite a published version folder in place — see
[`../../docs/ARQUITETURA-MSE.md`](../../docs/ARQUITETURA-MSE.md#10-versionamento-e-publicação).
