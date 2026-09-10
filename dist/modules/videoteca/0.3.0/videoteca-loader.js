(async function loadVideoteca() {
  const CORE_VERSION = "0.3.0";
  const VIDEOTECA_VERSION = "0.3.0";

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/videoteca/"));
  const roots = [...document.querySelectorAll('[data-mse-module="videoteca"]')];
  const summaryRoots = [...document.querySelectorAll('[data-mse-module="videoteca-summary"]')];
  if (!roots.length && !summaryRoots.length && script?.parentNode) {
    const root = document.createElement("div");
    root.id = "mse-videoteca-home";
    root.dataset.mseModule = "videoteca";
    root.dataset.configKey = "videoteca-home";
    root.textContent = "Carregando videoteca...";
    script.parentNode.insertBefore(root, script);
    roots.push(root);
  }

  const allRoots = [...roots, ...summaryRoots];

  function write(message) {
    for (const root of allRoots) root.textContent = message;
  }

  try {
    if (!allRoots.length) throw new Error("Missing videoteca root element.");

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (allRoots[0].dataset.webUrl || assetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    if (!webUrl || !assetBase) throw new Error("Unable to infer webUrl or SiteAssets path.");

    write("Carregando videoteca...");

    const [
      { createSharePointDataSourceRegistry },
      { provisionLists },
      { createVideotecaReadService },
      { mountVideoteca, mountVideotecaSummary },
      { VIDEOTECA_LIST_SCHEMAS }
    ] =
      await Promise.all([
        import(`${assetBase}/mse-platform/core/${CORE_VERSION}/data-sources.js`),
        import(`${assetBase}/mse-platform/core/${CORE_VERSION}/list-provisioning.js`),
        import(`${assetBase}/mse-platform/modules/videoteca/${VIDEOTECA_VERSION}/videoteca-data.js`),
        import(`${assetBase}/mse-platform/modules/videoteca/${VIDEOTECA_VERSION}/videoteca.js`),
        import(`${assetBase}/mse-platform/modules/videoteca/${VIDEOTECA_VERSION}/videoteca-schema.js`)
      ]);

    write("Preparando videoteca...");
    const { lists: sources } = await provisionLists({
      webUrl,
      schemas: VIDEOTECA_LIST_SCHEMAS,
      confirm: () => true
    });

    const dataSources = createSharePointDataSourceRegistry({
      allowedWebUrls: [webUrl],
      sources
    });

    const service = createVideotecaReadService({ dataSources });

    if (roots.length) {
      mountVideoteca({
        service,
        instances: Object.fromEntries(roots.map((root) => [
          root.dataset.configKey || root.id || "videoteca-home",
          { layout: { mode: root.dataset.layoutMode || "contained" } }
        ]))
      });
    }

    if (summaryRoots.length) {
      mountVideotecaSummary({
        service,
        instances: Object.fromEntries(summaryRoots.map((root) => [
          root.dataset.configKey || root.id || "videoteca-summary",
          {
            layout: { mode: root.dataset.layoutMode || "contained" },
            videotecaSummary: { pageHref: root.dataset.pageHref }
          }
        ]))
      });
    }
  } catch (error) {
    write(`Falha ao carregar videoteca: ${error?.message || error}`);
    console.error(error);
  }
})();
