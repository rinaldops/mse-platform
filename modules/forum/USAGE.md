# Testing the forum in SharePoint Modern Script Editor

This guide uses placeholders. Replace:

- `__WEB_URL__` with your SharePoint site server-relative URL, for example `/sites/my-site` or `/teams/my-team`.
- `__SITE_ASSETS__` with `__WEB_URL__/SiteAssets`.
- each `00000000-0000-4000-8000-000000000000` with the GUID returned after provisioning.

## 1. Publish the files

Upload these files preserving the version folders:

```text
__SITE_ASSETS__/mse-platform/core/0.10.0/core.js
__SITE_ASSETS__/mse-platform/core/0.10.0/core.css
__SITE_ASSETS__/mse-platform/core/0.10.0/rest.js
__SITE_ASSETS__/mse-platform/core/0.10.0/data-sources.js
__SITE_ASSETS__/mse-platform/core/0.10.0/rich-text.js
__SITE_ASSETS__/mse-platform/core/0.10.0/list-provisioning.js

__SITE_ASSETS__/mse-platform/modules/forum/0.15.0/forum.js
__SITE_ASSETS__/mse-platform/modules/forum/0.15.0/forum.css
__SITE_ASSETS__/mse-platform/modules/forum/0.15.0/forum-data.js
__SITE_ASSETS__/mse-platform/modules/forum/0.15.0/forum-editor.js
__SITE_ASSETS__/mse-platform/modules/forum/0.15.0/forum-view.js
__SITE_ASSETS__/mse-platform/modules/forum/0.15.0/forum-schema.js
```

Do not overwrite an existing version folder. Publish a new version folder when the code changes.

## 2. Provision the SharePoint lists

Create a temporary Modern Script Editor webpart, or run this as an administrator from a controlled test page.

Paste the visible provisioning snippet from [`snippets/provision-forum.html`](snippets/provision-forum.html).

Before saving, replace:

- `__WEB_URL__`
- `__SITE_ASSETS__`

Copy the returned `listId` values. They are required by the runtime snippet.

If nothing appears on the page, the script did not run or a module import was blocked. In that case, verify the asset URLs and open the browser console for the import error.

## 3. Add one category

Open the list `Fórum — Taxonomia` and create at least one category:

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

- `__WEB_URL__`
- `__SITE_ASSETS__`
- all list GUID placeholders

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

If the page shows an access or missing-list error, verify the current user has permission on the site and that the GUIDs in the snippet match the provisioned lists.
