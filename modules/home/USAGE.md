# Testing home in SharePoint Modern Script Editor

This guide uses placeholders. Replace:

- `__WEB_URL__` with your SharePoint site server-relative URL.
- `__SITE_ASSETS__` with `__WEB_URL__/SiteAssets`.

## 1. Publish the files

Upload preserving version folders (core `0.13.6` must already be published):

```text
__SITE_ASSETS__/mse-platform/modules/home/0.1.0/home.js
__SITE_ASSETS__/mse-platform/modules/home/0.1.0/home-view.js
__SITE_ASSETS__/mse-platform/modules/home/0.1.0/home.css
__SITE_ASSETS__/mse-platform/modules/home/0.1.0/home-loader.js
```

Do not overwrite an existing version folder — publish a new one when the code
changes.

## 2. Insert the home webpart

No list to provision — this module has no SharePoint dependency. Add a
Modern Script Editor webpart (as the first section of the page, above Fórum)
and paste [`snippets/modern-script-editor.html`](snippets/modern-script-editor.html),
replacing `__SITE_ASSETS__`.

## 3. Validate the MVP

1. Confirm the hero renders: eyebrow, headline with gradient highlights,
   subtext, two buttons ("Entrar no fórum", "Ver workshops gravados"), and
   the four-stat band.
2. Confirm the constellation canvas animates in the background (nodes
   drifting, occasional colored pulses between them).
3. With OS-level "reduce motion" enabled, confirm the canvas renders a
   static graph (no animation) and the floating background terms are hidden.
4. Click "Entrar no fórum" / "Ver workshops gravados" — they scroll to
   `#forum` / `#videoteca` if those anchors exist elsewhere on the page.
