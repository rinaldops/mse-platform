# mse-platform

Reusable JavaScript modules for SharePoint Modern Script Editor.

This repository contains a small shared core and modules that can be published as versioned assets under SharePoint `SiteAssets`.

HTML snippets, demos and previews are stored as `.html` files. The repositories
are kept outside OneDrive/SharePoint-synced folders.

## Structure

```text
core/             shared runtime, REST helpers, provisioning and rich text
admin/            schema-driven administration building blocks
host-adapters/    host-specific bootstrap code (MSE in the first release)
modules/          independently versioned business modules
examples/         neutral sample module and local development host
```

## Local validation

```powershell
cd core
npm test
npm run test:edge

cd ../modules/forum
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File test/edge-smoke.ps1
```

## SharePoint publishing convention

```text
SiteAssets/mse-platform/core/<version>/
SiteAssets/mse-platform/modules/<module>/<version>/
```

Use immutable version folders. Do not overwrite an already published version.

Structural sections and module roots are square by default through
`--mse-section-radius: 0`. Boxes, cards and controls are also square through
`--mse-radius: 0`. Brand-governed consumers must not override these shared
tokens; an approved brand graphic exception belongs only to local CSS.

## Forum quick start

See [`modules/forum/USAGE.md`](modules/forum/USAGE.md) for the first SharePoint Modern Script Editor test.

## Rich-text editors

The shared core supports configurable rich-text editors through `core/editor.js`.

Supported values:

- `Quill`
- `Summernote`
- `default`

See [`docs/EDITORES-RICOS.md`](docs/EDITORES-RICOS.md) for implementation notes, security decisions and known limits.

Public snippets use placeholders such as `__SITE_ASSETS__`. Environment-specific URLs should be substituted only in the target SharePoint site or in private operational documentation.

## Module development

The public module and settings contracts are documented in
[`docs/CONTRATOS-DE-MODULO.md`](docs/CONTRATOS-DE-MODULO.md). Open
[`examples/local-host/index.html`](examples/local-host/index.html) through a
local HTTP server to exercise the sample module and the shared settings
renderer without SharePoint.

Open [`examples/admin-host/index.html`](examples/admin-host/index.html) to run
the real Administration Center against an in-memory store and validate its UI
without SharePoint writes.

For the first production host, follow
[`docs/INSTALACAO-MSE.md`](docs/INSTALACAO-MSE.md). Package compatibility and
rollback rules are in
[`docs/COMPATIBILIDADE-E-VERSIONAMENTO.md`](docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).
