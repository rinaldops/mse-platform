# MSE Forum

Forum module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.17.2`.

## Features in this MVP

- Declarative SharePoint list schema.
- Categories and tags.
- Topic listing, detail view, filters and search by title.
- Topic creation, editing, archiving and drafts.
- Safe rich-text editor and preview before publishing.
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
