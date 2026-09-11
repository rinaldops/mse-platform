# MSE Forum

Forum module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.4.0`.

## Features in this MVP

- Declarative SharePoint list schema.
- Categories and tags.
- Compact full-bleed page bar (breadcrumb, debounced search by title, "Novo tópico" and "Minha atividade" actions) replacing the Home hero on this module's own page.
- Topic listing with tabs (recentes/populares/sem resposta/minha atividade), sidebar (indicators, categories, tags, unanswered panel), sort (recentes/respostas/visualizações) and card-based list.
- Topic detail view, filters and search by title.
- Topic creation, editing, archiving and drafts.
- Configurable safe rich-text editor: Quill, Summernote Lite or native fallback.
- Answers with pagination, editing and archiving.
- Reactions.
- Accepted answer / solved topic flow.
- Related topics.
- Sample community ranking.

## Layout particulars (page bar redesign)

- Route state (`aba/categoria/tag/busca/ordem/mine`) is persisted in the query string — the only one of the three redesigned modules that does this, since the pattern already existed here before the redesign.
- Search is Title-only, matching the pre-existing `topicFilter()` search scope; the design handoff did not request full-text search.
- The page bar reuses `home.css`'s exact blue gradient recipe (same `radial-gradient` stack) so navigating between Home and Forum feels continuous.
- Compose/edit views are untouched by this redesign — only list (`renderList`) and, later, detail (`renderDetail`, see below) changed. `topicCard()` (used by the detail view's related topics) is kept separate from the new `topicListCard()`.

## Layout particulars (topic detail view)

A later pass reworked `renderDetail()` after live review flagged that colored
buttons and blue author names were winning the reader's attention over the
actual question/answer text — see `ARQUITETURA-MSE.md` §18.9 for the full
sequence of corrections (and the two dead ends kept as documented lessons).
What shipped:

- **Reading order**: heading → body text → one compact row of icon-only
  actions (reactions, permalink, mark-solution, edit, archive) → author ·
  date, right-aligned in that same row as the least important fact. No
  standalone meta line above the body anymore.
- **Icons, not text buttons**: small inline SVGs (`icon()`/`ICON_PATHS` in
  `forum-view.js`) — heart/check/star for reactions (Gostei/Útil/Excelente),
  link/check-square/pencil/archive-box for actions. Deliberately not emoji
  characters (inconsistent, full-color rendering across platforms would
  undo the "quiet" goal) and not `.mse-forum__button` (too large/saturated
  for a repeated per-item row — that class stays for real page-level CTAs
  like "Publicar tópico").
- **Color rule for reactions**: the icon itself always carries a fixed hue
  (gostei→`--forum-accent`, útil→`--forum-verde`, excelente→`--forum-danger`,
  heart/star rendered as solid fills for an "emoji-like" look) regardless of
  count. The surrounding button never goes past a light gray fill
  (`--forum-surface-soft`) once it has a reaction or is the reader's own —
  a full saturated background was tried first and reverted, see §18.9.
  Functional icons (edit/archive/link/mark-solution) stay neutral gray
  always; only reactions get permanent color.
- **The topic page shares `.mse-forum__pagebar`/`.mse-forum__page` with the
  list page** instead of a bespoke lighter header, so a reader landing
  straight on a topic link still sees the same blue "Hub TD / Fórum / …"
  banner. The third breadcrumb segment (topic title, truncated) is the one
  piece the list page's two-segment crumb doesn't need.
- Section order below the answers: the reply form ("Responder") comes
  before "Tópicos relacionados" — everything about the current topic first,
  a pointer elsewhere last.

## Home-page summary panel

Besides the full module above (meant for the forum's own page), `mountForumSummary()`/`createForumSummaryView()` render a separate read-only panel for the site's main page: a two-column preview of recent topics with a ~2-line excerpt, category-chip filtering (client-side over one fetch), and a single button through to the full forum. It mounts on `data-mse-module="forum-summary"` (a different selector, so it never collides with the full `mountForum()`), and `forum-loader.js` mounts whichever of the two roots it finds on the page (or both). Every topic link points at the forum's own page, using `?forumTopic=<id>` to deep-link straight to that topic. The panel paints no background of its own — it blends into the SharePoint section colour and flips to a light palette on a dark section (`.mse-app--ambient-dark`, set by core). See `TD/webparts/forum/home-summary.*.html` vs `modern-script-editor.*.html` for the two snippets.

## Data structures

The module declares seven SharePoint structures:

- `ForumTaxonomia`
- `ForumTopicos`
- `ForumTopicoTags`
- `ForumRespostas`
- `ForumReacoes`
- `ForumPreferencias`
- document library `ForumMidia`

Lists use stable ASCII internal names and friendly display names. The core resolves list GUIDs during provisioning and uses them for REST operations.

## Local tests

```powershell
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File test/edge-smoke.ps1
```

The smoke test validates the local demo in narrow and desktop widths.

## SharePoint test

Use [`USAGE.md`](USAGE.md) to publish the assets, provision the lists and paste the Modern Script Editor snippet.

## Editor configuration

The forum delegates rich-text editing to the core editor selector.

In Modern Script Editor markup:

```html
<div
  data-mse-module="forum"
  data-config-key="forum-home"
  data-editor="Summernote">
</div>
```

Accepted values:

- `Quill`
- `Summernote`
- `default`

The same setting can be supplied through instance configuration as `forum.editor` or `forum.Editor`.

Images embedded by the editor are uploaded to `ForumMidia` before the publication is saved. The persisted rich text references the server-relative file URL instead of storing Base64 in list fields. Each message accepts up to 10 embedded images of 1 MB each.
