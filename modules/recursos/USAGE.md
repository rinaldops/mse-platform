# Testing recursos in SharePoint Modern Script Editor

This guide uses placeholders. Replace:

- `__WEB_URL__` with your SharePoint site server-relative URL.
- `__SITE_ASSETS__` with `__WEB_URL__/SiteAssets`.

## 1. Publish the files

Upload preserving version folders (core `0.13.6` must already be published — see the forum module's `USAGE.md` if not):

```text
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/recursos.js
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/recursos.css
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/recursos-data.js
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/recursos-view.js
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/recursos-schema.js
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/recursos-loader.js
__SITE_ASSETS__/mse-platform/modules/recursos/0.1.0/provision-recursos.js
```

Do not overwrite an existing version folder — publish a new one when the code changes.

## 2. Provision the SharePoint list

Create a temporary Modern Script Editor webpart and paste [`snippets/provision-recursos.html`](snippets/provision-recursos.html), replacing `__WEB_URL__` and `__SITE_ASSETS__`.

## 3. Add a few links

Open the list `Recursos — Links` and create some items:

| Field | Value |
|---|---|
| Título | Power Automate — início rápido |
| URL | https://... |
| Categoria | Power Platform |
| Ordem | 10 |
| Ativo | Yes |

Without at least one active item the module renders "Nenhum recurso publicado ainda."

## 4. Insert the recursos webpart

Add a Modern Script Editor webpart and paste [`snippets/modern-script-editor.html`](snippets/modern-script-editor.html), replacing `__SITE_ASSETS__`.

## 5. Validate the MVP

1. Confirm the module loads without an error message.
2. Confirm links are grouped by category.
3. Click a category — it opens and any previously open category closes.
4. Click a link — it opens the URL (in a new tab if "Abrir em nova janela" is Yes).
