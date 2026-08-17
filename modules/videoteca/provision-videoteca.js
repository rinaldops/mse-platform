(async function provisionVideoteca() {
  const CORE_VERSION = "0.13.6";
  const VIDEOTECA_VERSION = "0.1.0";

  const script = document.currentScript
    || [...document.scripts].find((item) => item.src.includes("/mse-platform/modules/videoteca/"));
  const target = script?.dataset.target || "#mse-videoteca-provision";
  const root = document.querySelector(target);
  const status = root?.querySelector("[data-mse-videoteca-provision-status]");
  const output = root?.querySelector("[data-mse-videoteca-provision-output]");

  function write(message, data) {
    if (status) status.textContent = message;
    if (output && data !== undefined) output.textContent = JSON.stringify(data, null, 2);
  }

  function buildVideotecaSnippet({ assetBase }) {
    return [
      "<div",
      "  id=\"mse-videoteca-home\"",
      "  data-mse-module=\"videoteca\"",
      "  data-config-key=\"videoteca-home\">",
      "  Loading videoteca...",
      "</div>",
      "",
      "<link",
      "  rel=\"stylesheet\"",
      `  href="${assetBase}/mse-platform/core/${CORE_VERSION}/core.css">`,
      "",
      "<link",
      "  rel=\"stylesheet\"",
      `  href="${assetBase}/mse-platform/modules/videoteca/${VIDEOTECA_VERSION}/videoteca.css">`,
      "",
      `<script src="${assetBase}/mse-platform/modules/videoteca/${VIDEOTECA_VERSION}/videoteca-loader.js"></script>`
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

    const [{ provisionLists }, { VIDEOTECA_LIST_SCHEMAS }] = await Promise.all([
      import(`${assetBase}/mse-platform/core/${CORE_VERSION}/list-provisioning.js`),
      import(`${assetBase}/mse-platform/modules/videoteca/${VIDEOTECA_VERSION}/videoteca-schema.js`)
    ]);

    write("Inspecting SharePoint lists...");

    const result = await provisionLists({
      webUrl,
      schemas: VIDEOTECA_LIST_SCHEMAS,
      confirm(plan) {
        output.textContent = JSON.stringify(plan, null, 2);
        return window.confirm("Provision videoteca lists for this site?");
      }
    });

    status.textContent = `Finished: ${result.status}. Paste this into a Modern Script Editor web part:`;
    output.textContent = buildVideotecaSnippet({ assetBase });
  } catch (error) {
    if (status) status.textContent = "Provisioning failed.";
    if (output) output.textContent = error?.stack || error?.message || String(error);
    console.error(error);
  }
})();
