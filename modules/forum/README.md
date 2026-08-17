# MSE Forum

Forum module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.18.10`.

## Features in this MVP

- Declarative SharePoint list schema.
- Categories and tags.
- Topic listing, detail view, filters and search by title.
- Topic creation, editing, archiving and drafts.
- Configurable safe rich-text editor: Quill, Summernote Lite or native fallback.
- Answers with pagination, editing and archiving.
- Reactions.
- Accepted answer / solved topic flow.
- Related topics.
- Sample community ranking.

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
