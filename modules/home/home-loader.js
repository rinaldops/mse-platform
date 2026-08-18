(async function loadHome() {
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

  try {
    if (!roots.length) throw new Error("Missing home root element.");

    const scriptPath = script?.src ? new URL(script.src, window.location.href).pathname : "";
    const assetBase = scriptPath.includes("/SiteAssets/")
      ? scriptPath.slice(0, scriptPath.indexOf("/SiteAssets/") + "/SiteAssets".length)
      : "";
    if (!assetBase) throw new Error("Unable to infer SiteAssets path.");

    const { mountHome } = await import(`${assetBase}/mse-platform/modules/home/0.1.0/home.js`);

    mountHome({
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
