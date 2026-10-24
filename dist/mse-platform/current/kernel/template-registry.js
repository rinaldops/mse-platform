/**
 * Funções puras do registro de Templates do Site Kernel (MSETemplateStyles ≈
 * Joomla! #__template_styles). Nenhuma função aqui faz REST, toca rede ou
 * DOM — mesmo princípio de `kernel/positions.js`/`kernel/menu.js`: recebem
 * arrays de itens já carregados em memória (shape de
 * `kernel/schemas/mse-template-styles.js#MSE_TEMPLATE_STYLES_SCHEMA`) e
 * devolvem dados derivados.
 *
 * Shape esperado de cada item de `styles` (um registro da lista
 * MSETemplateStyles já lido do SharePoint):
 *   { Id: number, Title: string, Template: string,
 *     ClientId: "Site" | "Administrator", Home: boolean,
 *     ParamsJson: string | null | undefined }
 *
 * Este módulo não impõe nem corrige a invariante "no máximo 1 Home=true por
 * ClientId" — isso é responsabilidade de quem escreve (ver
 * `components/com_templates/templates-editor.js`); aqui só se resolve
 * determinística e sem lançar: entre múltiplos candidatos `Home=true` para o
 * mesmo `ClientId` (dado malformado), o primeiro na ordem de `styles` vence,
 * nunca lança por causa de dado de conteúdo.
 */

const DEFAULT_CLIENT_ID = "Site";

function toArray(items) {
  return Array.isArray(items) ? items : [];
}

/**
 * Resolve o nome do template (`Template`, ex.: "camap-tema-01") marcado como
 * `Home=true` para o `clientId` pedido ("Site" ou "Administrator"). Devolve
 * `null` se nenhum estilo combina (lista vazia, nenhum `Home=true` para este
 * `clientId`, ou `styles` ausente/inválido) — nunca lança por causa de dado
 * de conteúdo.
 *
 * @param {Array<object> | null | undefined} styles
 * @param {{ clientId?: "Site" | "Administrator" }} [options]
 * @returns {string | null}
 */
export function resolveActiveTemplateName(styles, options = {}) {
  const clientId = typeof options?.clientId === "string" && options.clientId.trim()
    ? options.clientId.trim()
    : DEFAULT_CLIENT_ID;
  const found = toArray(styles).find(
    (style) => style && style.ClientId === clientId && style.Home === true
      && typeof style.Template === "string" && style.Template.trim() !== ""
  );
  return found ? found.Template.trim() : null;
}

/**
 * Lista, dentre `styles`, todos os estilos (`Template`+`Title`+`Home`)
 * associados a `clientId` — conveniência para a tela com_templates listar os
 * templates instalados por client, sem duplicar o filtro em cada chamador.
 * `styles` ausente/inválido devolve `[]`, nunca lança.
 *
 * @param {Array<object> | null | undefined} styles
 * @param {{ clientId?: "Site" | "Administrator" }} [options]
 * @returns {Array<object>}
 */
export function listTemplateStylesByClient(styles, options = {}) {
  const clientId = typeof options?.clientId === "string" && options.clientId.trim()
    ? options.clientId.trim()
    : DEFAULT_CLIENT_ID;
  return toArray(styles).filter((style) => style && style.ClientId === clientId);
}

/**
 * Resolve o nome do template (`Template`) a aplicar para um item de menu
 * específico (23/10/2026 — atribuição de template por item de menu, ver
 * `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §3), a partir de
 * `menuItem.TemplateStyleId` (≈ Joomla! `#__menu.template_style_id`).
 *
 * Devolve `null` quando:
 *   - `menuItem` está ausente/inválido, ou `TemplateStyleId` não é um
 *     inteiro válido (`>= 1`) — item sem override, caso comum;
 *   - nenhum estilo em `styles` tem `Id === menuItem.TemplateStyleId` E
 *     `ClientId === clientId` (referência inválida/estilo de outro client);
 *   - o estilo encontrado tem `Template` vazio/ausente.
 *
 * `null` significa "sem override; quem chama deve cair no fallback já
 * existente" (`resolveActiveTemplateName`/`theme?.name`) — esta função
 * nunca lança por dado de conteúdo, mesmo princípio de
 * `resolveActiveTemplateName` acima.
 *
 * @param {Array<object> | null | undefined} styles
 * @param {{ TemplateStyleId?: number|string|null } | null | undefined} menuItem
 * @param {{ clientId?: "Site" | "Administrator" }} [options]
 * @returns {string | null}
 */
export function resolveTemplateNameForMenuItem(styles, menuItem, options = {}) {
  const clientId = typeof options?.clientId === "string" && options.clientId.trim()
    ? options.clientId.trim()
    : DEFAULT_CLIENT_ID;
  const rawId = menuItem?.TemplateStyleId;
  const templateStyleId = Number(rawId);
  if (rawId == null || rawId === "" || !Number.isInteger(templateStyleId) || templateStyleId < 1) {
    return null;
  }
  const found = toArray(styles).find(
    (style) => style && style.Id === templateStyleId && style.ClientId === clientId
      && typeof style.Template === "string" && style.Template.trim() !== ""
  );
  return found ? found.Template.trim() : null;
}
