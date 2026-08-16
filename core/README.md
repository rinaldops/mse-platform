# MSE Core

Shared JavaScript core for modules hosted in SharePoint Modern Script Editor.

Current version: `0.13.0`.

## What it provides

- Idempotent module mounting and cleanup.
- Local/global configuration merge.
- Contained and full-bleed layout helpers.
- SharePoint REST client with digest, ETag and typed HTTP errors.
- Paged reads using `@odata.nextLink`.
- Declarative list/library provisioning.
- Cross-site data source registry using explicit allowlists.
- Safe rich-text sanitization and rendering.
- Shared rich-text editor selector with Quill, Summernote Lite and native fallback support.

## Local tests

```powershell
npm test
npm run test:edge
```

The Edge smoke test serves the repository locally and validates the demo pages without using an authenticated SharePoint session.

## Published layout

When uploaded to SharePoint, keep assets versioned:

```text
SiteAssets/mse-platform/core/0.13.0/
```

Modules should import a fixed core version instead of a mutable `latest` path.
