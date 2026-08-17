(async function loadRecursos() {
  const LISTS = [["recursos-links", "RecursosLinks"]];

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/recursos/"));
  const roots = [...document.querySelectorAll('[data-mse-module="recursos"]')];
  if (!roots.length && script?.parentNode) {
    const root = document.createElement("div");
    root.id = "mse-recursos-home";
    root.dataset.mseModule = "recursos";
    root.dataset.configKey = "recursos-home";
    root.textContent = "Carregando recursos...";
    script.parentNode.insertBefore(root, script);
    roots.push(root);
  }

  function write(message) {
    for (const root of roots) root.textContent = message;
  }

  try {
    if (!roots.length) throw new Error("Missing recursos root element.");

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (roots[0].dataset.webUrl || assetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    if (!webUrl || !assetBase) throw new Error("Unable to infer webUrl or SiteAssets path.");

    write("Carregando recursos...");

    const [{ createSharePointDataSourceRegistry }, { createRecursosReadService }, { mountRecursos }] =
      await Promise.all([
        import(`${assetBase}/mse-platform/core/0.13.6/data-sources.js`),
        import(`${assetBase}/mse-platform/modules/recursos/0.1.0/recursos-data.js`),
        import(`${assetBase}/mse-platform/modules/recursos/0.1.0/recursos.js`)
      ]);

    const response = await fetch(
      `${webUrl}/_api/web/lists?$select=Id,RootFolder/Name&$expand=RootFolder&$top=5000`,
      { headers: { Accept: "application/json;odata=nometadata" }, cache: "no-store" }
    );
    if (!response.ok) throw new Error(`Unable to read recursos lists: HTTP ${response.status}`);

    const lists = new Map((await response.json()).value.map((list) => [list.RootFolder?.Name, list.Id]));
    const sources = LISTS.map(([key, internalName]) => {
      const listId = lists.get(internalName);
      if (!listId) throw new Error(`Missing SharePoint list: ${internalName}`);
      return { key, webUrl, listId };
    });

    const dataSources = createSharePointDataSourceRegistry({
      allowedWebUrls: [webUrl],
      sources
    });

    mountRecursos({
      service: createRecursosReadService({ dataSources }),
      instances: Object.fromEntries(roots.map((root) => [
        root.dataset.configKey || root.id || "recursos-home",
        { layout: { mode: root.dataset.layoutMode || "contained" } }
      ]))
    });
  } catch (error) {
    write(`Falha ao carregar recursos: ${error?.message || error}`);
    console.error(error);
  }
})();
