/**
 * Rotas administrativas `option=com_xxx&view=yyy&task=www&id=N`, mesmo
 * vocabulário do Joomla! real. `task` é extraído aqui para todas as telas;
 * `com_templates` (`templates.setdefault`), `com_extensions`
 * (`extensions.enable`/`extensions.disable`), `com_menus`
 * (`menus.publish`/`menus.unpublish`), `com_modules`
 * (`modules.publish`/`modules.unpublish`) e `com_config`
 * (`config.activate`/`config.deactivate`) consomem `task` para disparar,
 * automaticamente na primeira carga, a mesma alternância rápida de 1 clique
 * já disponível por botão em cada tela — ver cada `*-editor.js` e
 * `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3. O CRUD completo
 * (criar/editar/excluir) continua disparando ação só por clique direto em
 * todas as telas.
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
