(async function loadRecursos() {
  const CORE_VERSION = "0.3.0";
  const RECURSOS_VERSION = "0.3.0";
  const LISTS = [["recursos-links", "RecursosLinks"]];

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/recursos/"));
  const roots = [...document.querySelectorAll('[data-mse-module="recursos"]')];
  const summaryRoots = [...document.querySelectorAll('[data-mse-module="recursos-summary"]')];
  if (!roots.length && !summaryRoots.length && script?.parentNode) {
    const root = document.createElement("div");
    root.id = "mse-recursos-home";
    root.dataset.mseModule = "recursos";
    root.dataset.configKey = "recursos-home";
    root.textContent = "Carregando recursos...";
    script.parentNode.insertBefore(root, script);
    roots.push(root);
  }

  const allRoots = [...roots, ...summaryRoots];

  function write(message) {
    for (const root of allRoots) root.textContent = message;
  }

  try {
    if (!allRoots.length) throw new Error("Missing recursos root element.");

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (allRoots[0].dataset.webUrl || assetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    if (!webUrl || !assetBase) throw new Error("Unable to infer webUrl or SiteAssets path.");

    write("Carregando recursos...");

    const [{ createSharePointDataSourceRegistry }, { createRecursosReadService }, { mountRecursos, mountRecursosSummary }] =
      await Promise.all([
        import(`${assetBase}/mse-platform/core/${CORE_VERSION}/data-sources.js`),
        import(`${assetBase}/mse-platform/modules/recursos/${RECURSOS_VERSION}/recursos-data.js`),
        import(`${assetBase}/mse-platform/modules/recursos/${RECURSOS_VERSION}/recursos.js`)
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

    const service = createRecursosReadService({ dataSources });

    if (roots.length) {
      mountRecursos({
        service,
        instances: Object.fromEntries(roots.map((root) => [
          root.dataset.configKey || root.id || "recursos-home",
          { layout: { mode: root.dataset.layoutMode || "contained" } }
        ]))
      });
    }

    if (summaryRoots.length) {
      mountRecursosSummary({
        service,
        instances: Object.fromEntries(summaryRoots.map((root) => [
          root.dataset.configKey || root.id || "recursos-summary",
          {
            layout: { mode: root.dataset.layoutMode || "contained" },
            recursosSummary: { pageHref: root.dataset.pageHref }
          }
        ]))
      });
    }
  } catch (error) {
    write(`Falha ao carregar recursos: ${error?.message || error}`);
    console.error(error);
  }
})();
