# Testing the forum in SharePoint Modern Script Editor

This guide uses placeholders. Replace:

- `__WEB_URL__` with your SharePoint site server-relative URL, for example `/sites/my-site` or `/teams/my-team`.
- `__SITE_ASSETS__` with `__WEB_URL__/SiteAssets`.

## 1. Publish the files

Upload these files preserving the version folders:

```text
__SITE_ASSETS__/mse-platform/core/0.13.3/core.js
__SITE_ASSETS__/mse-platform/core/0.13.3/core.css
__SITE_ASSETS__/mse-platform/core/0.13.3/rest.js
__SITE_ASSETS__/mse-platform/core/0.13.3/data-sources.js
__SITE_ASSETS__/mse-platform/core/0.13.3/rich-text.js
__SITE_ASSETS__/mse-platform/core/0.13.3/list-provisioning.js
__SITE_ASSETS__/mse-platform/core/0.13.3/theme-adapter.js
__SITE_ASSETS__/mse-platform/core/0.13.3/editor.js
__SITE_ASSETS__/mse-platform/core/0.13.3/editor-quill.js
__SITE_ASSETS__/mse-platform/core/0.13.3/editor-quill.css
__SITE_ASSETS__/mse-platform/core/0.13.3/editor-summernote.js
__SITE_ASSETS__/mse-platform/core/0.13.3/editor-summernote.css
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/jquery/3.7.1/jquery.min.js
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/jquery/3.7.1/LICENSE.txt
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/quill/2.0.3/quill.js
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/quill/2.0.3/quill.js.LICENSE.txt
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/quill/2.0.3/quill.core.css
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/quill/2.0.3/quill.snow.css
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/quill/2.0.3/LICENSE
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/summernote-lite.min.js
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/summernote-lite.min.css
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/LICENSE
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/font/summernote.eot
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/font/summernote.woff2
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/font/summernote.woff
__SITE_ASSETS__/mse-platform/core/0.13.3/vendor/summernote/0.9.0/font/summernote.ttf

__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum.js
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum.css
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum-data.js
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum-editor.js
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum-view.js
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum-schema.js
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/provision-forum.js
__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum-loader.js
```

Do not overwrite an existing version folder. Publish a new version folder when the code changes.

## 2. Provision the SharePoint lists

Create a temporary Modern Script Editor webpart, or run this as an administrator from a controlled test page.

Paste the visible provisioning snippet from [`snippets/provision-forum.html`](snippets/provision-forum.html).

Before saving, replace:

- `__WEB_URL__`
- `__SITE_ASSETS__`

The runtime loader resolves the list IDs automatically from the provisioned internal list names.

If the panel stays on `Starting...`, the Modern Script Editor did not execute the external script tag. Confirm that script execution is enabled in the webpart settings and that `provision-forum.js` was published. If it changes to `Loading modules...` and then fails, verify the asset URLs and open the browser console for the import error.

## 3. Add one category

Open the list `Fórum — Taxonomia` and create at least one category:

The provisioning snippet configures the default view to show the operational columns. If the list still shows only `Nome`, the fields exist but are not in the current view yet. Open `+ Add column > Show or hide columns`, enable `Chave`, `Tipo`, `Ordem` and `Ativo`, or create the item from the `New` form.

| Field | Value |
|---|---|
| Nome | Geral |
| Chave | geral |
| Tipo | Categoria |
| Ordem | 10 |
| Ativo | Yes |

Optional: create a tag in the same list:

| Field | Value |
|---|---|
| Nome | SharePoint |
| Chave | sharepoint |
| Tipo | Tag |
| Ordem | 20 |
| Ativo | Yes |

Without an active category, the forum can render but users cannot publish a valid topic.

## 4. Insert the forum webpart

Add a Modern Script Editor webpart and paste the snippet from [`snippets/modern-script-editor.html`](snippets/modern-script-editor.html).

Before saving, replace:

- `__SITE_ASSETS__`

The runtime snippet does not require list GUIDs. It resolves the provisioned lists by their stable internal names.

To choose the editor, set `data-editor` in the snippet:

- `data-editor="Quill"` loads Quill.
- `data-editor="Summernote"` loads Summernote Lite.
- `data-editor="default"` uses the native forum editor.

Example:

```html
<div
  id="mse-forum-home"
  data-mse-module="forum"
  data-config-key="forum-home"
  data-editor="Summernote">
  Loading forum...
</div>

<link
  rel="stylesheet"
  href="__SITE_ASSETS__/mse-platform/core/0.13.3/core.css">

<link
  rel="stylesheet"
  href="__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum.css">

<script src="__SITE_ASSETS__/mse-platform/modules/forum/0.18.4/forum-loader.js"></script>
```

The public repository intentionally keeps `__SITE_ASSETS__` as a placeholder. Replace it with the target SharePoint server-relative `SiteAssets` path only when pasting into the target environment.

Summernote image insertion is available for MVP validation. This version preserves small sanitized images, including `data:image` values, but production scenarios should store images in a SharePoint library and persist URLs in the rich text.

To render the forum from one side of the page to the other, set:

```html
data-layout-mode="fullBleed"
```

If omitted, the loader uses `contained`.

## 5. Validate the MVP

On the published page:

1. Confirm the forum loads without an error message.
2. Create a topic using the category created above.
3. Save a draft, leave the form and reopen the creation form.
4. Preview rich text before publishing.
5. Publish the topic.
6. Add an answer.
7. React to the topic or answer.
8. Mark an answer as accepted.

If the page shows an access or missing-list error, verify the current user has permission on the site and that the provisioning created all `Forum*` lists.
