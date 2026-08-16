# MSE Core

Shared JavaScript core for modules hosted in SharePoint Modern Script Editor.

Current version: `0.13.5`.

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

## Rich-text editor selector

`editor.js` centralizes editor selection for consumers:

```js
selectRichTextEditor("Quill")
selectRichTextEditor("Summernote")
selectRichTextEditor("default")
```

The `default` option returns no external adapter so the consuming module can use its native editor. Quill and Summernote assets are published locally with their licenses and are loaded on demand.

See [`../docs/EDITORES-RICOS.md`](../docs/EDITORES-RICOS.md).

## Local tests

```powershell
npm test
npm run test:edge
```

The Edge smoke test serves the repository locally and validates the demo pages without using an authenticated SharePoint session.

## Published layout

When uploaded to SharePoint, keep assets versioned:

```text
SiteAssets/mse-platform/core/0.13.5/
```

Modules should import a fixed core version instead of a mutable `latest` path.

## Full-bleed layout note

`layout.mode = "fullBleed"` expands the module root to the available SharePoint page width without changing SharePoint ancestors. When the SharePoint chrome reserves a lateral navigation area, the root aligns with the chrome content bounds instead of rendering underneath it; outside SharePoint, the viewport is used as fallback. Since multiple core CSS versions may coexist on the same page, version-specific selectors are used for the full-bleed rule to avoid older `core.css` files overriding newer layout fixes.
