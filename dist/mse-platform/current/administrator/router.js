export function parseAdministratorRoute(params = {}) {
  if (!params || typeof params !== "object" || Array.isArray(params)) throw new TypeError("params deve ser um objeto.");
  const option = String(params.option || "com_cpanel").toLowerCase();
  const view = String(params.view || "controlpanel").toLowerCase();
  const task = String(params.task || "display").toLowerCase();
  const id = params.id == null || params.id === "" ? null : Number(params.id);
  if (id !== null && (!Number.isInteger(id) || id < 1)) throw new TypeError("id deve ser um inteiro positivo.");
  return Object.freeze({ option, view, task, id });
}
export function resolveAdministratorScreen(route) {
  const key = route?.option || "com_cpanel";
  return ({ com_cpanel: "controlpanel", com_installer: "installer", com_content: "publisher", com_publisher: "publisher", com_config: "config", com_menus: "menus", com_modules: "modules", com_extensions: "extensions" })[key] || "controlpanel";
}
