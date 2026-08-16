# mse-platform

Reusable JavaScript modules for SharePoint Modern Script Editor.

This repository contains a small shared core and modules that can be published as versioned assets under SharePoint `SiteAssets`.

## Structure

```text
core/             shared runtime, REST helpers, provisioning and rich text
modules/forum/    forum MVP module
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
