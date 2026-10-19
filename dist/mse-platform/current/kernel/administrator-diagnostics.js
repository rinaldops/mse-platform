/** Diagnóstico read-only da estrutura Mini Joomla!, sem ACL própria. */
export function diagnoseAdministratorStructure({ menus = [], modules = [], extensions = [], routes = [], positions = [] } = {}) {
  const issues = [];
  const menuItems = Array.isArray(menus) ? menus : [];
  const moduleItems = Array.isArray(modules) ? modules : [];
  const extensionItems = Array.isArray(extensions) ? extensions : [];
  const routeItems = Array.isArray(routes) ? routes : [];
  const knownPositions = new Set(Array.isArray(positions) ? positions : []);
  const extensionKeys = new Set(extensionItems.filter((item) => item?.Habilitado !== false).map((item) => `${item?.Tipo}:${item?.Elemento}`));
  const defaultCount = menuItems.filter((item) => item?.Padrao === true && item?.Estado === "Publicado").length;
  if (!menuItems.length) issues.push({ code: "menus-empty", severity: "error", message: "MSEMenu não possui itens." });
  if (defaultCount === 0) issues.push({ code: "default-route-missing", severity: "error", message: "Não existe rota padrão publicada." });
  if (defaultCount > 1) issues.push({ code: "multiple-default-routes", severity: "error", message: "Há mais de uma rota padrão publicada." });
  for (const route of routeItems) if (route?.Componente && !extensionKeys.has(`Componente:${route.Componente}`)) issues.push({ code: "route-component-missing", severity: "error", itemId: route.Id, message: `A rota ${route.Alias || route.Id} referencia componente não habilitado: ${route.Componente}.` });
  for (const module of moduleItems) {
    if (knownPositions.size && !knownPositions.has(module?.Posicao)) issues.push({ code: "module-position-invalid", severity: "warning", itemId: module.Id, message: `Módulo ${module.Title || module.Id} usa posição inexistente: ${module.Posicao}.` });
    if (!extensionKeys.has(`Modulo:${module?.ModuloTipo}`)) issues.push({ code: "module-extension-missing", severity: "error", itemId: module.Id, message: `Módulo ${module.Title || module.Id} não possui extensão habilitada: ${module.ModuloTipo}.` });
  }
  return Object.freeze({ ok: issues.length === 0, issues: Object.freeze(issues) });
}
