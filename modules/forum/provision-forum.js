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
      import(`${assetBase}/mse-platform/modules/forum/0.15.1/forum-schema.js`)
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

    write(`Finished: ${result.status}`, result);
  } catch (error) {
    if (status) status.textContent = "Provisioning failed.";
    if (output) output.textContent = error?.stack || error?.message || String(error);
    console.error(error);
  }
})();
