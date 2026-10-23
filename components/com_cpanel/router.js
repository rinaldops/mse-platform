/**
 * Rotas administrativas `option=com_xxx&view=yyy&task=www&id=N`, mesmo
 * vocabulário do Joomla! real. `task` é extraído aqui para todas as telas,
 * mas só `com_templates` (22/10/2026, prova de conceito da convenção
 * `controller.task` — ver `components/com_templates/templates-editor.js` e
 * `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3) de fato o consome; as
 * demais telas continuam disparando ação só por clique direto.
 */
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
  return ({ com_cpanel: "controlpanel", com_installer: "installer", com_content: "publisher", com_publisher: "publisher", com_config: "config", com_diagnostics: "diagnostics", com_menus: "menus", com_modules: "modules", com_extensions: "extensions", com_templates: "templates" })[key] || "controlpanel";
}
