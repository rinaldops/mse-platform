/** Diagnóstico read-only da estrutura Mini Joomla!, sem ACL própria. */
export function diagnoseAdministratorStructure({ menus = [], modules = [], extensions = [], routes = [], positions = [] } = {}) {
  const issues = [];
  const menuItems = Array.isArray(menus) ? menus : [];
  const moduleItems = Array.isArray(modules) ? modules : [];
  const extensionItems = Array.isArray(extensions) ? extensions : [];
  const routeItems = Array.isArray(routes) ? routes : [];
  const knownPositions = new Set(Array.isArray(positions) ? positions : []);
  const extensionKeys = new Set(extensionItems.filter((item) => item?.Enabled !== false).map((item) => `${item?.Type}:${item?.Element}`));
  const defaultCount = menuItems.filter((item) => item?.Default === true && item?.Published === "Published").length;
  if (!menuItems.length) issues.push({ code: "menus-empty", severity: "error", message: "MSEMenu não possui itens." });
  if (defaultCount === 0) issues.push({ code: "default-route-missing", severity: "error", message: "Não existe rota padrão publicada." });
  if (defaultCount > 1) issues.push({ code: "multiple-default-routes", severity: "error", message: "Há mais de uma rota padrão publicada." });
  for (const route of routeItems) if (route?.Component && !extensionKeys.has(`Component:${route.Component}`)) issues.push({ code: "route-component-missing", severity: "error", itemId: route.Id, message: `A rota ${route.Alias || route.Id} referencia componente não habilitado: ${route.Component}.` });
  for (const module of moduleItems) {
    if (knownPositions.size && !knownPositions.has(module?.Position)) issues.push({ code: "module-position-invalid", severity: "warning", itemId: module.Id, message: `Módulo ${module.Title || module.Id} usa posição inexistente: ${module.Position}.` });
    if (!extensionKeys.has(`Module:${module?.Module}`)) issues.push({ code: "module-extension-missing", severity: "error", itemId: module.Id, message: `Módulo ${module.Title || module.Id} não possui extensão habilitada: ${module.Module}.` });
  }
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}
