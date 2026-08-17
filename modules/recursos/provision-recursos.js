(async function provisionRecursos() {
  const CORE_VERSION = "0.13.6";
  const RECURSOS_VERSION = "0.1.0";

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/recursos/"));
  const target = script?.dataset.target || "#mse-recursos-provision";
  const root = document.querySelector(target);
  const status = root?.querySelector("[data-mse-recursos-provision-status]");
  const output = root?.querySelector("[data-mse-recursos-provision-output]");

  function write(message, data) {
    if (status) status.textContent = message;
    if (output && data !== undefined) output.textContent = JSON.stringify(data, null, 2);
  }

  function buildRecursosSnippet({ assetBase }) {
    return [
      "<div",
      "  id=\"mse-recursos-home\"",
      "  data-mse-module=\"recursos\"",
      "  data-config-key=\"recursos-home\">",
      "  Loading recursos...",
      "</div>",
      "",
      "<link",
      "  rel=\"stylesheet\"",
      `  href="${assetBase}/mse-platform/core/${CORE_VERSION}/core.css">`,
      "",
      "<link",
      "  rel=\"stylesheet\"",
      `  href="${assetBase}/mse-platform/modules/recursos/${RECURSOS_VERSION}/recursos.css">`,
      "",
      `<script src="${assetBase}/mse-platform/modules/recursos/${RECURSOS_VERSION}/recursos-loader.js"></script>`
    ].join("\n");
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

    const [{ provisionLists }, { RECURSOS_LIST_SCHEMAS }] = await Promise.all([
      import(`${assetBase}/mse-platform/core/${CORE_VERSION}/list-provisioning.js`),
      import(`${assetBase}/mse-platform/modules/recursos/${RECURSOS_VERSION}/recursos-schema.js`)
    ]);

    write("Inspecting SharePoint lists...");

    const result = await provisionLists({
      webUrl,
      schemas: RECURSOS_LIST_SCHEMAS,
      confirm(plan) {
        output.textContent = JSON.stringify(plan, null, 2);
        return window.confirm("Provision recursos lists for this site?");
      }
    });

    status.textContent = `Finished: ${result.status}. Paste this into a Modern Script Editor web part:`;
    output.textContent = buildRecursosSnippet({ assetBase });
  } catch (error) {
    if (status) status.textContent = "Provisioning failed.";
    if (output) output.textContent = error?.stack || error?.message || String(error);
    console.error(error);
  }
})();
