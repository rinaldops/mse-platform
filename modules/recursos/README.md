# MSE Recursos

Curated links/tips hub module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.4.0`.

## Features in this MVP

- Declarative SharePoint list schema (single list, admin-curated).
- Compact full-bleed page bar (breadcrumb, debounced search, "Meus favoritos" and "+ Sugerir link" actions — both inert placeholders, see below).
- Filter bar: category chips, sort, cards/compact-list view toggle.
- "Atalhos mais usados" shortcuts section.
- Links grouped by category, rendered as always-open groups (no accordion — every category is visible at once, filterable by the search/chip bar).
- Read-only: content is managed directly in the `Recursos — Links` list by site owners, no in-page editor.

## Layout particulars (page bar redesign)

- Always-open groups replace the previous exclusive accordion by product decision (users want to compare links across categories, especially while a search filter is active). `modules/ui/accordion/accordion.js` is unaffected and still used/tested elsewhere — this module simply stopped consuming it.
- "Atalhos mais usados" has no real usage/click data behind it (no click-count field exists). It shows the first link of each category by the existing `Ordem` field, i.e. curated order, not actual usage — a deliberate substitute rather than a fabricated metric.
- "Meus favoritos" and "+ Sugerir link" render per the design handoff but do nothing on click — those flows were explicitly out of scope in the handoff (`TD/webparts/claude_design/recursos/README.md`, "Pendências"). Implement them (favorites storage, a suggestion form/list) as a follow-up if requested.
- Filter/sort/view-mode state lives only in memory, unlike the Forum's URL-persisted state — no shareable filtered link yet; add query-string persistence later if needed.

## Home-page summary panel

Besides the full module above (meant for Recursos' own page), `mountRecursosSummary()`/`createRecursosSummaryView()` render a separate, lean, read-only panel — the top link of each category plus a "Ver todos os recursos" link — meant for embedding on the site's main page instead of the full app. It mounts on `data-mse-module="recursos-summary"` (a different selector, so it never collides with the full `mountRecursos()`), and `recursos-loader.js` mounts whichever of the two roots it finds on the page (or both). Unlike the full page's shortcuts, every item here links to Recursos' own page, never straight to the external resource — this panel is a teaser, not a shortcut bar. See `TD/webparts/recursos/home-summary.*.html` vs `modern-script-editor.*.html` for the two snippets.

## Data structures

The module declares one SharePoint list: `RecursosLinks`.

## Local tests

```powershell
npm test
```

## SharePoint test

Use [`USAGE.md`](USAGE.md) to publish the assets, provision the list and paste the Modern Script Editor snippet.

Versioning policy: never overwrite a published version folder in place — see
[`../../../_docs/ARQUITETURA-MSE.md`](../../../_docs/ARQUITETURA-MSE.md#10-versionamento-e-publicação).
