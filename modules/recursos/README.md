# MSE Recursos

Curated links/tips hub module for SharePoint Modern Script Editor, built on top of `mse-platform/core`.

Current version: `0.1.0`.

## Features in this MVP

- Declarative SharePoint list schema (single list, admin-curated).
- Links grouped by category, rendered as an exclusive accordion (opening one category closes any other open one).
- Read-only: content is managed directly in the `Recursos — Links` list by site owners, no in-page editor.

## Data structures

The module declares one SharePoint list: `RecursosLinks`.

## Local tests

```powershell
npm test
```

## SharePoint test

Use [`USAGE.md`](USAGE.md) to publish the assets, provision the list and paste the Modern Script Editor snippet.

Versioning policy: never overwrite a published version folder in place — see
[`../../docs/ARQUITETURA-MSE.md`](../../docs/ARQUITETURA-MSE.md#10-versionamento-e-publicação).
