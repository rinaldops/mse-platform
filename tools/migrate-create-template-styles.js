// mse-platform/tools/migrate-create-template-styles.js
//
// Semeia o registro de Templates instalados (MSETemplateStyles ≈ Joomla!
// #__template_styles — ver kernel/schemas/mse-template-styles.js) e os
// registros correspondentes em MSEExtensions (Type: "Template" — ver
// kernel/schemas/mse-extensions.js), substituindo a edição manual do campo
// texto solto `MSEConfiguracoes.Tema` pelo mecanismo análogo ao Joomla! de
// "templates instalados + 1 estilo ativo-padrão por client".
//
// Linhas propostas (ClientId="Site"), Home=true só em "camap-tema-01" (ele
// CONTINUA o template ativo em produção — esta migração é só classificação
// no registro novo, nenhuma mudança visual/funcional):
//   - camap-tema-01  (Home=true)  — tema real do CAMAP-AGP, shipped pelo
//     consumidor (CAMAP-AGP/templates/camap-tema-01).
//   - mse-default    (Home=false) — 2º nível do fallback de 3 níveis,
//     shipped pela PLATAFORMA (mse-platform/templates/mse-default).
//   - system         (Home=false) — 3º nível do fallback, shipped pela
//     PLATAFORMA (mse-platform/templates/system).
//
// MSEExtensions (Type: "Template"), Enabled/Protected conforme cada caso:
//   - camap-tema-01  Enabled=true,  Protected=false (template comum, trocável)
//   - camap-tema-02  Enabled=false, Protected=false (referência/não publicado
//     — ver CAMAP-AGP/templates/camap-tema-02/template.json#status, nunca
//     shipped em dist/camap-agp-modules; registrado aqui só para existir no
//     catálogo de "templates instalados", igual ao Joomla! listar temas
//     instalados mas não publicados)
//   - mse-default    Enabled=true,  Protected=true  (fallback da PLATAFORMA,
//     não pode ser desabilitado pelo gestor — precisa estar sempre disponível)
//   - system         Enabled=true,  Protected=true  (idem, 3º nível técnico)
//
// Client "Administrator" (template formal do backend, análogo ao `atum`):
// DELIBERADAMENTE FORA desta rodada — a seção 5 do plano aprovado
// (`components/com_cpanel/administrator-shell.js`) ainda não foi
// implementada; semear uma linha MSETemplateStyles apontando para um
// template que não existe criaria uma referência pendurada. Esta migração
// seguirá ampliada (nova versão ou nova função `buildAdministratorStyle`)
// quando aquele shell for publicado.
//
// Mesmo padrão do resto de `tools/` (ver `migrate-camap-activate-tema-01.js`,
// `migrate-mse-administrator-route.js`): `buildX()` função pura e congelada
// que descreve o plano sem rede, e `migrateX({ client, listIds, confirm })`
// que aplica de fato — só grava atrás de `confirm(plan)` explícito.
// Idempotente por chave natural: MSEExtensions por `Element`; MSETemplateStyles
// pela chave composta `(Template, ClientId)` (um mesmo pacote de Template
// pode, em tese, ter um estilo por client — "Site" e "Administrator" nunca
// colidem). Não migra `MSEConfiguracoes.Tema` nem o apaga: ele continua
// existindo como fallback de compatibilidade enquanto nenhuma linha
// `Home=true` para "Site" existir (ver
// `host-adapters/modern-script-editor/site-boot.js#createTemplateLayoutResolver`).
//
// NUNCA aplicar este script contra o tenant real sem revisão humana — ver
// `confirm` abaixo.

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Dados puros do plano de semeadura: as linhas de `MSETemplateStyles` e os
 * registros de `MSEExtensions` (Type: "Template") descritos no cabeçalho
 * deste arquivo. Sem rede, sem `Id` (resolvido em runtime pela própria
 * migração).
 *
 * @returns {{
 *   templateStyles: { keyFields: ["Template","ClientId"], rows: Array<object> },
 *   extensions: { keyField: "Element", rows: Array<object> }
 * }}
 */
export function buildCreateTemplateStylesMigration() {
  return deepFreeze({
    templateStyles: {
      keyFields: ["Template", "ClientId"],
      rows: [
        { Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
        { Title: "mse-platform — Padrão (fallback)", Template: "mse-default", ClientId: "Site", Home: false },
        { Title: "mse-platform — Técnico (fallback)", Template: "system", ClientId: "Site", Home: false }
      ]
    },
    extensions: {
      keyField: "Element",
      rows: [
        { Title: "CAMAP-AGP — Tema 1", Type: "Template", Element: "camap-tema-01", Enabled: true, Protected: false },
        { Title: "CAMAP-AGP — Tema 2 (referência)", Type: "Template", Element: "camap-tema-02", Enabled: false, Protected: false },
        { Title: "mse-platform — Padrão (fallback)", Type: "Template", Element: "mse-default", Enabled: true, Protected: true },
        { Title: "mse-platform — Técnico (fallback)", Type: "Template", Element: "system", Enabled: true, Protected: true }
      ]
    }
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

/**
 * Busca o item de `list` cujos `keyFields` casam todos com os valores
 * correspondentes em `row` (chave composta, ex.: `Template`+`ClientId`),
 * trazendo também `Id`. Devolve `null` quando não encontrado — nunca lança
 * por ausência.
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {string[]} keyFields
 * @param {Record<string, unknown>} row
 * @returns {Promise<object|null>}
 */
async function findItemByKeys(client, list, keyFields, row) {
  const filter = keyFields.map((field) => `${field} eq ${odataLiteral(row[field])}`).join(" and ");
  const found = await client.getListItems(list, {
    select: ["Id", ...keyFields],
    filter,
    top: 1
  });
  return Array.isArray(found) && found.length > 0 ? found[0] : null;
}

/**
 * Cria `row` em `list` se ainda não existir um item cujos `keyFields`
 * coincidam; não propõe/duplica nada se já existir. Mesmo princípio de
 * `migrate-mse-administrator-route.js#createIfMissing`, generalizado para
 * chave composta (1 ou mais campos).
 *
 * @param {object} client
 * @param {{listId:string}|string} list
 * @param {string[]} keyFields
 * @param {Record<string, unknown>} row
 * @returns {Promise<{ action: "created" | "skipped", id: number|null }>}
 */
async function createIfMissingByKeys(client, list, keyFields, row) {
  const existing = await findItemByKeys(client, list, keyFields, row);
  if (existing) return { action: "skipped", id: existing.Id };
  const { item } = await client.createListItem(list, row);
  if (item?.Id == null) {
    throw new Error(`createListItem não devolveu Id para ${JSON.stringify(row)}.`);
  }
  return { action: "created", id: item.Id };
}

/**
 * Aplica `buildCreateTemplateStylesMigration()` contra o tenant real, só
 * atrás de `confirm(plan)` explícito (mesmo padrão de
 * `migrateMseAdministratorRoute`/`migrateActivateTema01`). Idempotente: cada
 * linha de `MSETemplateStyles` (por `Template`+`ClientId`) e de
 * `MSEExtensions` (por `Element`) só é criada se ainda não existir — rodar
 * mais de uma vez é seguro, nenhuma duplicata é proposta.
 *
 * Nunca toca `MSEConfiguracoes.Tema` nem qualquer linha pré-existente desta
 * migração (`Home` de uma linha já existente não é sobrescrito) — essa
 * migração só CRIA, nunca atualiza; alternar o template ativo (`Home`)
 * depois de aplicada é responsabilidade da tela `com_templates` (ainda não
 * implementada nesta rodada), não deste script.
 *
 * @param {{
 *   client: { getListItems: Function, createListItem: Function },
 *   listIds: { MSETemplateStyles: {listId:string}|string, MSEExtensions: {listId:string}|string },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "migrated" | "cancelled",
 *   templateStyles: Array<{ action: "created"|"skipped", id: number|null }>,
 *   extensions: Array<{ action: "created"|"skipped", id: number|null }>
 * }>}
 */
export async function migrateCreateTemplateStyles({ client, listIds, confirm } = {}) {
  if (!client || typeof client.getListItems !== "function" || typeof client.createListItem !== "function") {
    throw new TypeError("client deve expor getListItems(list, options) e createListItem(list, values).");
  }
  if (!listIds || !listIds.MSETemplateStyles || !listIds.MSEExtensions) {
    throw new TypeError(
      "listIds deve informar MSETemplateStyles e MSEExtensions (listId ou título — ver core/rest.js#listApiPath)."
    );
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de migrateCamapHome."
    );
  }

  const plan = buildCreateTemplateStylesMigration();
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", templateStyles: [], extensions: [] });
  }

  const templateStyles = [];
  for (const row of plan.templateStyles.rows) {
    templateStyles.push(
      await createIfMissingByKeys(client, listIds.MSETemplateStyles, plan.templateStyles.keyFields, row)
    );
  }

  const extensions = [];
  for (const row of plan.extensions.rows) {
    extensions.push(
      await createIfMissingByKeys(client, listIds.MSEExtensions, [plan.extensions.keyField], row)
    );
  }

  return Object.freeze({ status: "migrated", templateStyles, extensions });
}
