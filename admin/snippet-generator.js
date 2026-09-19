const MODULE_PATHS = Object.freeze({
  forum: "modules/forum/manifest.js",
  videoteca: "modules/videoteca/manifest.js",
  "explore-mais": "modules/recursos/manifest.js",
  home: "modules/home/manifest.js",
  "mse-admin": "admin/manifest.js"
});

function identifier(value, label) {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,127}$/.test(value)) throw new TypeError(`${label} inválido.`);
  return value;
}

function releasePath(value) {
  if (typeof value !== "string" || !/^\/(?!\/)[^?#"'<>]+$/.test(value)) throw new TypeError("releaseBase inválido.");
  return value.replace(/\/+$/, "");
}

export function generateMseSnippet({ moduleId, instanceId, view = "full", releaseBase, coreVersion = "0.8.0" } = {}) {
  const module = identifier(moduleId, "moduleId");
  const instance = identifier(instanceId, "instanceId");
  if (!MODULE_PATHS[module]) throw new TypeError(`Módulo não registrado: ${module}.`);
  if (!new Set(["full", "summary"]).has(view)) throw new TypeError("view deve ser full ou summary.");
  if (!/^\d+\.\d+\.\d+$/.test(coreVersion)) throw new TypeError("coreVersion inválida.");
  const base = releasePath(releaseBase);
  const enabledModules = module === "home"
    ? "[\"forum\", \"explore-mais\", \"videoteca\"]"
    : `["${module}"]`;
  return `<div data-mse-module="${module}" data-mse-instance="${instance}" data-mse-view="${view}" data-mse-manifest="${base}/${MODULE_PATHS[module]}"></div>\n`
    + `<script type="module">\n`
    + `  import { mountAllMseModules } from "${base}/host-adapters/modern-script-editor/bootstrap.js";\n`
    + `  import { createSiteIntegration } from "${base}/host-adapters/modern-script-editor/site-integration.js";\n`
    + `  const integration = await createSiteIntegration({ releaseBase: "${base}", enabledModules: ${enabledModules} });\n`
    + `  await mountAllMseModules({ coreVersion: "${coreVersion}", config: { admin: { releaseBase: "${base}", coreVersion: "${coreVersion}" } }, configurationStore: integration.configurationStore, services: integration.services, manifestResolver: integration.manifestResolver });\n`
    + `</script>`;
}
