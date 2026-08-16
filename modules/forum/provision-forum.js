(async function provisionForum() {
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

  async function configureTaxonomyView(webUrl) {
    const headers = { Accept: "application/json;odata=nometadata" };
    const listPath = `${webUrl}/_api/web/lists/getbytitle('${odataText("Fórum — Taxonomia")}')`;
    const current = await fetch(`${listPath}/DefaultView/ViewFields`, { headers, cache: "no-store" });
    if (!current.ok) throw new Error(`Read taxonomy default view: HTTP ${current.status}`);

    const fields = (await current.json()).Items || [];
    const missing = ["LinkTitle", "Chave", "Tipo", "Descricao", "Cor", "Ordem", "Ativo"]
      .filter((field) => !fields.includes(field));
    if (!missing.length) return { status: "unchanged", fields };

    const context = await fetch(`${webUrl}/_api/contextinfo`, { method: "POST", headers });
    if (!context.ok) throw new Error(`Read request digest: HTTP ${context.status}`);
    const digest = (await context.json()).FormDigestValue;

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
      import(`${assetBase}/mse-platform/core/0.10.0/list-provisioning.js`),
      import(`${assetBase}/mse-platform/modules/forum/0.15.2/forum-schema.js`)
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
    const taxonomyView = await configureTaxonomyView(webUrl);

    write(`Finished: ${result.status}`, { ...result, taxonomyView });
  } catch (error) {
    if (status) status.textContent = "Provisioning failed.";
    if (output) output.textContent = error?.stack || error?.message || String(error);
    console.error(error);
  }
})();
