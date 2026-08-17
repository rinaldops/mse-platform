(async function provisionForum() {
  const CORE_VERSION = "0.13.6";
  const FORUM_VERSION = "0.18.10";
  const TAXONOMY_LIST_TITLE = "Fórum — Taxonomia";

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/forum/"));
  const target = script?.dataset.target || "#mse-forum-provision";
  const root = document.querySelector(target);
  const status = root?.querySelector("[data-mse-forum-provision-status]");
  const output = root?.querySelector("[data-mse-forum-provision-output]");

  function write(message, data) {
    if (status) status.textContent = message;
    if (output && data !== undefined) output.textContent = JSON.stringify(data, null, 2);
  }

  function odataText(value) {
    return String(value).replace(/'/g, "''");
  }

  async function getRequestDigest(webUrl) {
    const response = await fetch(`${webUrl}/_api/contextinfo`, {
      method: "POST",
      headers: { Accept: "application/json;odata=nometadata" }
    });
    if (!response.ok) throw new Error(`Read request digest: HTTP ${response.status}`);
    return (await response.json()).FormDigestValue;
  }

  async function ensureDefaultCategory(webUrl) {
    const headers = { Accept: "application/json;odata=nometadata" };
    const listPath = `${webUrl}/_api/web/lists/getbytitle('${odataText(TAXONOMY_LIST_TITLE)}')`;

    const existing = await fetch(
      `${listPath}/items?$filter=Tipo eq 'Categoria' and Ativo eq 1&$top=1&$select=Id`,
      { headers, cache: "no-store" }
    );
    if (!existing.ok) throw new Error(`Read taxonomy categories: HTTP ${existing.status}`);
    if ((await existing.json()).value.length) return { status: "unchanged" };

    const entityType = await fetch(`${listPath}/ListItemEntityTypeFullName`, { headers, cache: "no-store" });
    if (!entityType.ok) throw new Error(`Read list entity type: HTTP ${entityType.status}`);
    const type = (await entityType.json()).value;

    const digest = await getRequestDigest(webUrl);
    const created = await fetch(`${listPath}/items`, {
      method: "POST",
      headers: {
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        "X-RequestDigest": digest
      },
      body: JSON.stringify({
        __metadata: { type },
        Title: "Geral",
        Chave: "geral",
        Tipo: "Categoria",
        Ordem: 10,
        Ativo: true
      })
    });
    if (!created.ok) throw new Error(`Create default category: HTTP ${created.status}`);
    return { status: "created" };
  }

  function buildForumSnippet({ assetBase }) {
    return [
      "<div",
      "  id=\"mse-forum-home\"",
      "  data-mse-module=\"forum\"",
      "  data-config-key=\"forum-home\"",
      "  data-editor=\"Quill\"",
      "  data-layout-mode=\"fullBleed\">",
      "  Loading forum...",
      "</div>",
      "",
      "<link",
      "  rel=\"stylesheet\"",
      `  href="${assetBase}/mse-platform/core/${CORE_VERSION}/core.css">`,
      "",
      "<link",
      "  rel=\"stylesheet\"",
      `  href="${assetBase}/mse-platform/modules/forum/${FORUM_VERSION}/forum.css">`,
      "",
      `<script src="${assetBase}/mse-platform/modules/forum/${FORUM_VERSION}/forum-loader.js"></script>`
    ].join("\n");
  }

  async function configureTaxonomyView(webUrl) {
    const headers = { Accept: "application/json;odata=nometadata" };
    const listPath = `${webUrl}/_api/web/lists/getbytitle('${odataText(TAXONOMY_LIST_TITLE)}')`;
    const current = await fetch(`${listPath}/DefaultView/ViewFields`, { headers, cache: "no-store" });
    if (!current.ok) throw new Error(`Read taxonomy default view: HTTP ${current.status}`);

    const fields = (await current.json()).Items || [];
    const missing = ["LinkTitle", "Chave", "Tipo", "Descricao", "Cor", "Ordem", "Ativo"]
      .filter((field) => !fields.includes(field));
    if (!missing.length) return { status: "unchanged", fields };

    const digest = await getRequestDigest(webUrl);

    for (const field of missing) {
      const response = await fetch(`${listPath}/DefaultView/ViewFields/addViewField('${odataText(field)}')`, {
        method: "POST",
        headers: { ...headers, "X-RequestDigest": digest }
      });
      if (!response.ok) throw new Error(`Add ${field} to taxonomy default view: HTTP ${response.status}`);
    }
    return { status: "configured", fields: [...fields, ...missing] };
  }

  try {
    if (!root || !status || !output) throw new Error(`Provisioning panel not found: ${target}`);

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const inferredAssetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (script?.dataset.webUrl || inferredAssetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    const assetBase = (script?.dataset.assetBase || inferredAssetBase).replace(/\/+$/, "");
    if (!webUrl || !assetBase) throw new Error("Missing data-web-url or data-asset-base.");

    write("Loading modules...");

    const [{ provisionLists }, { FORUM_LIST_SCHEMAS }] = await Promise.all([
      import(`${assetBase}/mse-platform/core/${CORE_VERSION}/list-provisioning.js`),
      import(`${assetBase}/mse-platform/modules/forum/${FORUM_VERSION}/forum-schema.js`)
    ]);

    write("Inspecting SharePoint lists...");

    const result = await provisionLists({
      webUrl,
      schemas: FORUM_LIST_SCHEMAS,
      confirm(plan) {
        output.textContent = JSON.stringify(plan, null, 2);
        return window.confirm("Provision forum lists for this site?");
      }
    });

    write("Configuring default views...", result);
    await configureTaxonomyView(webUrl);

    write("Ensuring default category...");
    await ensureDefaultCategory(webUrl);

    status.textContent = `Finished: ${result.status}. Paste this into a Modern Script Editor web part:`;
    output.textContent = buildForumSnippet({ assetBase });
  } catch (error) {
    if (status) status.textContent = "Provisioning failed.";
    if (output) output.textContent = error?.stack || error?.message || String(error);
    console.error(error);
  }
})();
