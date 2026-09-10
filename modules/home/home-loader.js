(async function loadHome() {
  const CORE_VERSION = "0.3.0";
  const HOME_VERSION = "0.3.0";
  // Internal (RootFolder) names of the lists whose item counts feed the stats
  // row — matched the same way core/list-provisioning.js discovers lists (by
  // RootFolder/Name, not by display Title), since Title strings carry an
  // em dash/accents that are fragile to encode in a getbytitle() OData path.
  const DYNAMIC_LIST_INTERNAL_NAMES = Object.freeze({
    videotecaVideos: "VideotecaVideos",
    forumTopicos: "ForumTopicos"
  });

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/home/"));
  const roots = [...document.querySelectorAll('[data-mse-module="home"]')];
  if (!roots.length && script?.parentNode) {
    const root = document.createElement("div");
    root.id = "mse-home-hero";
    root.dataset.mseModule = "home";
    root.dataset.configKey = "home-hero";
    root.textContent = "Carregando...";
    script.parentNode.insertBefore(root, script);
    roots.push(root);
  }

  function write(message) {
    for (const root of roots) root.textContent = message;
  }

  async function fetchDynamicStats(assetBase, webUrl) {
    const { createSharePointRestClient } = await import(`${assetBase}/mse-platform/core/${CORE_VERSION}/rest.js`);
    const client = createSharePointRestClient({ webUrl });
    const result = await client.request(
      "/_api/web/lists?$select=ItemCount,RootFolder/Name&$expand=RootFolder&$top=5000"
    );
    const lists = result.data?.value ?? result.data?.d?.results ?? [];
    const itemCountByInternalName = new Map(lists.map((list) => [list.RootFolder?.Name, list.ItemCount]));

    return [
      { value: "17", label: "ENCONTROS REALIZADOS" },
      { value: "1×/mês", label: "ENCONTRO AO VIVO" },
      {
        value: String(itemCountByInternalName.get(DYNAMIC_LIST_INTERNAL_NAMES.videotecaVideos) ?? "—"),
        label: "APRESENTAÇÕES REALIZADAS"
      },
      {
        value: String(itemCountByInternalName.get(DYNAMIC_LIST_INTERNAL_NAMES.forumTopicos) ?? "—"),
        label: "MENSAGENS NO FÓRUM"
      }
    ];
  }

  try {
    if (!roots.length) throw new Error("Missing home root element.");

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    const webUrl = (roots[0].dataset.webUrl || assetBase.replace(/\/SiteAssets$/, "")).replace(/\/+$/, "");
    if (!assetBase || !webUrl) throw new Error("Unable to infer webUrl or SiteAssets path.");

    const { mountHome } = await import(`${assetBase}/mse-platform/modules/home/${HOME_VERSION}/home.js`);

    let stats;
    try {
      stats = await fetchDynamicStats(assetBase, webUrl);
    } catch (error) {
      console.error("Falha ao carregar contagens dinâmicas do hero:", error);
    }

    mountHome({
      stats,
      instances: Object.fromEntries(roots.map((root) => [
        root.dataset.configKey || root.id || "home-hero",
        { layout: { mode: root.dataset.layoutMode || "contained" } }
      ]))
    });
  } catch (error) {
    write(`Falha ao carregar a página inicial: ${error?.message || error}`);
    console.error(error);
  }
})();
