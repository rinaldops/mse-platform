// mse-platform Modern Script Editor runner
// Motivation: some MSE setups inject HTML in a way that inline <script> may not execute reliably.
// This file is meant to be referenced via <script src=".../runner.js" ...data-*> so the browser executes it.

(function () {
  function parseCsv(value) {
    return String(value || "")
      .split(",")
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function getAttr(el, name, fallback) {
    return (el && el.getAttribute && el.getAttribute(name)) || fallback;
  }

  function currentScript() {
    var s = document.currentScript;
    if (getAttr(s, "data-release-base", "")) return s;
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i -= 1) {
      if (String(all[i].src || "").indexOf("/runner.js") >= 0
          && getAttr(all[i], "data-release-base", "")) return all[i];
    }
    return null;
  }

  async function main() {
    var s = currentScript();
    var releaseBase = getAttr(s, "data-release-base", "");
    var coreVersion = getAttr(s, "data-core-version", "0.8.0");
    var enabledModules = parseCsv(getAttr(s, "data-enabled-modules", ""));

    if (!releaseBase) {
      throw new Error("runner.js: data-release-base é obrigatório.");
    }

    var base = releaseBase.replace(/\/+$/, "");
    var bootstrapUrl = base + "/host-adapters/modern-script-editor/bootstrap.js";
    var siteIntegrationUrl = base + "/host-adapters/modern-script-editor/site-integration.js";

    var boot = await import(bootstrapUrl);
    var integMod = await import(siteIntegrationUrl);

    var integration = await integMod.createSiteIntegration({
      releaseBase: releaseBase,
      enabledModules: enabledModules
    });

    var results = await boot.mountAllMseModules({
      coreVersion: coreVersion,
      config: { admin: { releaseBase: releaseBase, coreVersion: coreVersion } },
      configurationStore: integration.configurationStore,
      services: integration.services,
      manifestResolver: integration.manifestResolver
    });

    results
      .filter(function (result) { return result.status === "rejected"; })
      .forEach(function (result) { console.error(result.reason); });
  }

  main().catch(function (error) {
    console.error("mse-platform runner failed", error);
  });
})();
