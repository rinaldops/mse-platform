# Testing videoteca in SharePoint Modern Script Editor

This guide uses placeholders. Replace:

- `__WEB_URL__` with your SharePoint site server-relative URL.
- `__SITE_ASSETS__` with `__WEB_URL__/SiteAssets`.

## 1. Publish the files

Upload preserving version folders (core `0.13.6` must already be published):

```text
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/videoteca.js
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/videoteca.css
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/videoteca-data.js
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/videoteca-view.js
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/videoteca-schema.js
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/videoteca-loader.js
__SITE_ASSETS__/mse-platform/modules/videoteca/0.1.0/provision-videoteca.js
```

Do not overwrite an existing version folder — publish a new one when the code changes.

## 2. Provision the SharePoint list

Create a temporary Modern Script Editor webpart and paste [`snippets/provision-videoteca.html`](snippets/provision-videoteca.html), replacing `__WEB_URL__` and `__SITE_ASSETS__`.

## 3. Add a few videos

Open the list `Videoteca — Vídeos` and create some items:

| Field | Value |
|---|---|
| Título | WS0038 — Usando o SAP Scripting para treinamento |
| URL | link para a gravação |
| Categoria | SAP |
| Apresentador | Fulano |
| Duração | 48:15 |
| Destaque | Yes (para aparecer no carrossel) |
| Ordem no carrossel | 10 |
| Ativo | Yes |

Without at least one active item the module renders "Nenhum vídeo publicado ainda."

## 4. Insert the videoteca webpart

Add a Modern Script Editor webpart and paste [`snippets/modern-script-editor.html`](snippets/modern-script-editor.html), replacing `__SITE_ASSETS__`.

## 5. Validate the MVP

1. Confirm the module loads without an error message.
2. Confirm featured videos (`Destaque` = Yes) appear in the carousel and auto-advance.
3. Hover/focus the carousel — auto-advance pauses; prev/next buttons and dots work.
4. Confirm videos are grouped correctly by category below the carousel.
5. Click a video card — it opens the stored URL in a new tab.
