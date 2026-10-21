// mse-platform/tools/migrate-camap-home.js
//
// Plano de exemplo para migrar uma Home para as listas do Site Kernel
// (`MSEMenu`, `MSEExtensoes`, `MSEModulos`). Os identificadores legados
// ilustram o contrato de compatibilidade; não são um inventário de tenant.
// Revise o plano em armazenamento privado antes de aplicar em um consumidor.
//
// Decisões desta migração (ver plano C3, decisões D2/D4 e a decisão do
// usuário sobre BLOG nesta rodada):
//
// - **BLOG fica fora da Home no C3.** O manifesto v2 de BLOG (C2, já
//   concluído/verificado) declara `type: "component"`,
//   `capabilities: { full: true, summary: false }` e só
//   `entrypoints.full` — não existe `entrypoints.summary`, então uma linha
//   de BLOG em `MSEModulos` faria `kernel/application.js#renderModules`
//   (que sempre pede `entrypointKey: "summary"`) lançar e renderizar como
//   erro. Isso também é consistente com a arquitetura-alvo do plano
//   (`PLANO-ARQUITETURA-MINI-JOOMLA.md`, linha "3. Vocabulário": BLOG é
//   Componente de ROTA própria, não módulo de posição). BLOG continua
//   entrando em `MSEExtensoes` (é uma extensão conhecida/habilitada do
//   site), só não ganha instância em `MSEModulos` nem é referenciado pelo
//   `MSEMenu` da Home nesta rodada — sua rota dedicada (`#/destaques`) é
//   tarefa do C4. O exemplo possui cinco módulos
//   (sd/dt1/mc/db/footer); a 6ª peça (BLOG) só aparece quando a rota do C4
//   existir.
// - **Posições**: os 5 manifestos de módulo (C2) declaram
//   `positions: ["hero","home-a","home-b","home-c","home-d","rodape"]`.
//   Hero fica fora do C3 (decisão já confirmada — tarefa do C4). Isso deixa
//   exatamente `home-a`, `home-b`, `home-c`, `home-d`, `rodape` — 5
//   posições para os cinco módulos do exemplo, preservando sua ordem
//   (sd, dt1, mc, db — pulando blog —, footer), com footer naturalmente na
//   posição "rodape".
// - **Instância (`MSEModulos.Title`)**: grava o `ChaveInstancia` do exemplo
//   (ex. "sd-principal") como `Title`, para casar com a resolução de
//   `context.modulo.title` nos adaptadores do CAMAP-AGP (D2) e com
//   `ChaveInstancia` em `CAMAPModulosConfiguracoes` (fonte de verdade do
//   conteúdo do consumidor: `core.rootMount` ainda
//   faz seu próprio fetch nessa lista legada; `MSEModulos.ParamsJson` não
//   precisa duplicar esse conteúdo).
// - **MSEMenu**: 1 linha ("Início", `Alias: ""`, `Componente: ""` →
//   `kernel/dispatcher.js#resolveDispatch` resolve como `"modules-only"`,
//   igual à Home real hoje), `Padrao: true`.
// - **MSEMenuTipos**: nenhuma linha (decisão do plano — `TipoMenu` não é
//   validado por referência nesta fase, mesmo padrão de `kernel/seed.js`).
// - **MSEModulosMenu**: nenhuma linha (todos os 5 módulos usam
//   `AtribuicaoMenu: "Todas"`, que não consulta essa tabela de junção —
//   ver `kernel/positions.js#matchesMenuAssignment`).
//
// Idempotente por chave natural (mesmo padrão de `kernel/seed.js`):
// `MSEMenu` por `Alias`, `MSEExtensoes` por `Elemento`, `MSEModulos` por
// `Title` (aqui, o `ChaveInstancia` — único por instância).
//
// Como `kernel/seed.js`: só grava depois de `installer.verify()` confirmar
// que as 5 listas MSE* existem, e só com confirmação explícita via
// `confirm(plan)` — nunca grava sozinho.

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/**
 * Dados puros da migração, agrupados por lista. Mesma forma de
 * `buildKernelSeed()` (`kernel/seed.js`): `{ keyField, items }` por lista.
 *
 * @returns {{
 *   MSEMenu: { keyField: string, items: object[] },
 *   MSEExtensoes: { keyField: string, items: object[] },
 *   MSEModulos: { keyField: string, items: object[] }
 * }}
 */
export function buildCamapHomeMigration() {
  return deepFreeze({
    MSEMenu: {
      keyField: "Alias",
      items: [
        {
          Title: "Início",
          Alias: "",
          TipoMenu: "principal",
          Nivel: 1,
          Ordem: 0,
          Componente: "",
          Padrao: true,
          AbrirEm: "MesmaAba",
          Estado: "Publicado"
        }
      ]
    },
    MSEExtensoes: {
      keyField: "Elemento",
      items: [
        { Title: "Sessões de Destaque", Tipo: "Modulo", Elemento: "sd", Habilitado: true, Protegido: false },
        { Title: "Destaque Textual tipo 1", Tipo: "Modulo", Elemento: "dt1", Habilitado: true, Protegido: false },
        { Title: "Mensagem corporativa", Tipo: "Modulo", Elemento: "mc", Habilitado: true, Protegido: false },
        { Title: "Destaque para BLOG", Tipo: "Modulo", Elemento: "db", Habilitado: true, Protegido: false },
        { Title: "Blog", Tipo: "Componente", Elemento: "blog", Habilitado: true, Protegido: false },
        { Title: "Rodapé de exemplo", Tipo: "Modulo", Elemento: "footer", Habilitado: true, Protegido: false }
      ]
    },
    MSEModulos: {
      // `Title` é o `ChaveInstancia` do exemplo — chave de
      // idempotência desta migração.
      keyField: "Title",
      items: [
        { Title: "sd-principal", ModuloTipo: "sd", Posicao: "home-a", Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}" },
        { Title: "dt1-principal", ModuloTipo: "dt1", Posicao: "home-b", Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}" },
        { Title: "mc-principal", ModuloTipo: "mc", Posicao: "home-c", Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}" },
        { Title: "db-principal", ModuloTipo: "db", Posicao: "home-d", Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}" },
        { Title: "footer-principal", ModuloTipo: "footer", Posicao: "rodape", Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}" }
      ]
    }
  });
}

function odataLiteral(value) {
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

async function itemExists(client, list, keyField, keyValue) {
  const existing = await client.getListItems(list, {
    select: [keyField],
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(existing) && existing.length > 0;
}

/**
 * Busca o item de `list` cujo `keyField` casa com `keyValue`, trazendo também
 * `Id` e os campos de `extraSelect` (necessários para decidir se um UPDATE é
 * realmente preciso, ver `upsertByKey`). Devolve `null` quando não encontrado
 * — nunca lança por ausência, só por parâmetro malformado (mesmo padrão de
 * `itemExists`/`seedKernelLists`).
 *
 * @param {object} client
 * @param {{listId:string}} list
 * @param {string} keyField
 * @param {unknown} keyValue
 * @param {string[]} [extraSelect]
 * @returns {Promise<object|null>}
 */
async function findItemByKey(client, list, keyField, keyValue, extraSelect = []) {
  const select = [...new Set(["Id", keyField, ...extraSelect])];
  const found = await client.getListItems(list, {
    select,
    filter: `${keyField} eq ${odataLiteral(keyValue)}`,
    top: 1
  });
  return Array.isArray(found) && found.length > 0 ? found[0] : null;
}

/**
 * Decide se os campos de `values` já batem com os valores atuais de `item`
 * (mesmos tipos primitivos — string/number/boolean), para que um `update`
 * aplicado duas vezes não dispare uma segunda chamada MERGE desnecessária
 * (idempotência de verdade, não só "não duplicar create").
 *
 * @param {object} item
 * @param {Record<string, unknown>} values
 * @returns {boolean}
 */
function valuesAlreadyMatch(item, values) {
  return Object.entries(values).every(([field, value]) => item?.[field] === value);
}

/**
 * Atualiza (MERGE, com ETag exata) OU cria um item em `list`, identificado
 * pela chave natural `keyField`/`keyValue` — mesmo princípio de idempotência
 * de `itemExists`, estendido para cobrir também o caminho de UPDATE (D3 do
 * plano C4: `migrateCamapHome` original só sabia criar; os ajustes de C4
 * precisam reposicionar um módulo já existente — ex. mover `db-principal`
 * de `home-d` para `home-e` — sem duplicá-lo).
 *
 * Fluxo:
 * 1. Busca o item existente por `keyField` (trazendo `Id` + os campos de
 *    `values`, para já poder comparar sem uma segunda viagem de rede).
 * 2. Ausente -> `createListItem(list, { [keyField]: keyValue, ...values })`.
 * 3. Presente e valores já batendo -> não escreve nada (`action: "skip"`).
 * 4. Presente e valores diferentes -> busca a ETag atual via
 *    `getListItem(list, item.Id, { select: [keyField] })` (a única forma de
 *    obter uma ETag válida sobre `core/rest.js`, que nunca a devolve dentro
 *    de `getListItems`/`getAll` — só `getListItem`/`createListItem`/
 *    `updateListItem` carregam o header `ETag` da resposta) e então
 *    `updateListItem(list, item.Id, values, { etag })`.
 *
 * @param {object} client Precisa expor `getListItems`, `getListItem`,
 *   `createListItem`, `updateListItem` (mesmas assinaturas de `core/rest.js`).
 * @param {{listId:string}} list
 * @param {string} keyField
 * @param {unknown} keyValue
 * @param {Record<string, unknown>} values Campos a garantir (sem `keyField`,
 *   que é informado separadamente e só é usado para localizar/criar o item).
 * @returns {Promise<{ action: "created"|"updated"|"skipped" }>}
 */
async function upsertByKey(client, list, keyField, keyValue, values) {
  const existing = await findItemByKey(client, list, keyField, keyValue, Object.keys(values));
  if (!existing) {
    await client.createListItem(list, { [keyField]: keyValue, ...values });
    return { action: "created" };
  }
  if (valuesAlreadyMatch(existing, values)) {
    return { action: "skipped" };
  }
  const { etag } = await client.getListItem(list, existing.Id, { select: [keyField] });
  await client.updateListItem(list, existing.Id, values, { etag });
  return { action: "updated" };
}

/**
 * Dados puros dos ajustes de Home da Fase C4 (plano C4, decisões D3/D4):
 * reorganiza o mapeamento de posições já publicado pelo C3 para o layout do
 * protótipo de referência — `db-principal` sai de `home-d` (ocupado agora
 * pela 2ª instância de SD, variante "Nossa estrutura") e passa para a nova
 * posição `home-e`; o hero (`sd-hero`, variante `hero`) e o módulo de
 * `conteudo-abaixo` (`db` com `AtribuicaoMenu: "Todas exceto"`) são novos,
 * ambos exigindo uma associação em `MSEModulosMenu` com o item de menu
 * "Início" (`Alias: ""`, já criado por `migrateCamapHome`) — "Somente:
 * Início" para o hero, "Todas exceto Início" para `conteudo-abaixo`.
 *
 * `lateral` fica "vazia" de fato (só precisa existir em `data-positions` do
 * snippet, sem linha em `MSEModulos` — nenhum módulo de conteúdo existe para
 * ela ainda, ver plano C4, D4, "lateral"). `breadcrumbs` é diferente: o
 * módulo `modules/breadcrumbs` (manifest + adaptador reaproveitando
 * `kernel/menu.js#buildPathway`) já foi entregue nesta mesma rodada C4 (D4) —
 * por isso precisa de uma linha real em `MSEModulos` (`AtribuicaoMenu:
 * "Todas"`, mesmo padrão de `sd-estrutura`, sem associação em
 * `MSEModulosMenu`) para não ficar como módulo morto, nunca instanciado pelo
 * kernel.
 *
 * @returns {{
 *   updates: Array<{ list: string, keyField: string, key: unknown, values: object }>,
 *   creates: Array<{ list: string, keyField: string, values: object }>,
 *   menuAssociations: Array<{ list: string, moduloKey: string, menuAlias: string, title: string }>
 * }}
 */
export function buildCamapHomeC4Adjustments() {
  return deepFreeze({
    updates: [
      // C3 publicou db-principal em home-d; D3 do C4 move Destaques para a
      // nova posição home-e, liberando home-d para sd-estrutura.
      { list: "MSEModulos", keyField: "Title", key: "db-principal", values: { Posicao: "home-e" } }
    ],
    creates: [
      {
        list: "MSEModulos",
        keyField: "Title",
        values: {
          Title: "sd-estrutura", ModuloTipo: "sd", Posicao: "home-d", Estilo: "nossaEstrutura",
          Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}"
        }
      },
      {
        list: "MSEModulos",
        keyField: "Title",
        values: {
          Title: "sd-hero", ModuloTipo: "sd", Posicao: "hero", Estilo: "hero",
          Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Somente", ParamsJson: "{}"
        }
      },
      {
        list: "MSEModulos",
        keyField: "Title",
        values: {
          Title: "db-conteudo-abaixo", ModuloTipo: "db", Posicao: "conteudo-abaixo",
          Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas exceto", ParamsJson: "{}"
        }
      },
      {
        list: "MSEModulos",
        keyField: "Title",
        values: {
          Title: "breadcrumbs-trilha", ModuloTipo: "breadcrumbs", Posicao: "breadcrumbs",
          Ordem: 1, Estado: "Publicado", MostrarTitulo: false, AtribuicaoMenu: "Todas", ParamsJson: "{}"
        }
      }
    ],
    menuAssociations: [
      { list: "MSEModulosMenu", moduloKey: "sd-hero", menuAlias: "", title: "sd-hero × Início" },
      { list: "MSEModulosMenu", moduloKey: "db-conteudo-abaixo", menuAlias: "", title: "db-conteudo-abaixo × Início" }
    ]
  });
}

/**
 * Aplica `buildCamapHomeC4Adjustments()` contra o tenant real, no mesmo
 * padrão de `migrateCamapHome` (verify -> confirm -> grava), mas cobrindo
 * também UPDATE (via `upsertByKey`) e a resolução de `Id` nativo necessária
 * para `MSEModulosMenu` (que referencia `MSEModulos.Id`/`MSEMenu.Id`, nunca
 * a chave natural `Title`/`Alias`).
 *
 * Pressupõe que `migrateCamapHome` já rodou antes (o item de menu "Início",
 * `Alias: ""`, e a linha `db-principal` original já devem existir) — lança
 * um erro claro, sem gravar nada, se qualquer um dos dois não for encontrado.
 *
 * @param {{
 *   installer: { verify: () => Promise<object> },
 *   client: {
 *     getListItems: Function, getListItem: Function,
 *     createListItem: Function, updateListItem: Function
 *   },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{
 *   status: "adjusted" | "cancelled",
 *   updated: Array<{ list: string, key: unknown }>,
 *   created: Array<{ list: string, key: unknown }>,
 *   associated: Array<{ list: string, moduloKey: string, menuAlias: string }>
 * }>}
 */
export async function migrateCamapHomeC4Adjustments({ installer, client, confirm } = {}) {
  if (!installer || typeof installer.verify !== "function") {
    throw new TypeError("installer deve expor verify().");
  }
  if (!client
    || typeof client.getListItems !== "function"
    || typeof client.getListItem !== "function"
    || typeof client.createListItem !== "function"
    || typeof client.updateListItem !== "function") {
    throw new TypeError(
      "client deve expor getListItems, getListItem, createListItem e updateListItem(list, id, values, options)."
    );
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "Os ajustes de C4 exigem um callback confirm(plan) explícito, no mesmo padrão de migrateCamapHome."
    );
  }

  let verification;
  try {
    verification = await installer.verify();
  } catch (error) {
    throw new Error(
      "listas MSE* não estão prontas; rode installer.apply() antes dos ajustes de C4.",
      { cause: error }
    );
  }

  const listIdByInternalName = new Map(
    (verification?.plan?.lists ?? []).map((entry) => [entry.internalName, entry.listId])
  );
  function resolveList(internalName) {
    const listId = listIdByInternalName.get(internalName);
    if (!listId) {
      throw new Error(`listId não resolvido para ${internalName} (installer.verify() incompleto ou desatualizado).`);
    }
    return { listId };
  }

  const plan = buildCamapHomeC4Adjustments();
  if (await confirm(plan) !== true) {
    return Object.freeze({ status: "cancelled", updated: [], created: [], associated: [] });
  }

  const modulosList = resolveList("MSEModulos");
  const menuList = resolveList("MSEMenu");
  const modulosMenuList = resolveList("MSEModulosMenu");

  const updated = [];
  for (const { list: internalName, keyField, key, values } of plan.updates) {
    const list = resolveList(internalName);
    // eslint-disable-next-line no-await-in-loop
    const { action } = await upsertByKey(client, list, keyField, key, values);
    if (action !== "skipped") updated.push({ list: internalName, key });
  }

  const created = [];
  const moduloIdByTitle = new Map();
  for (const { list: internalName, keyField, values } of plan.creates) {
    const list = resolveList(internalName);
    const keyValue = values[keyField];
    // eslint-disable-next-line no-await-in-loop
    const existing = await findItemByKey(client, list, keyField, keyValue, ["Id"]);
    if (existing) {
      moduloIdByTitle.set(keyValue, existing.Id);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { item } = await client.createListItem(list, values);
    if (item?.Id == null) {
      throw new Error(`createListItem(${internalName}) não devolveu Id para "${keyValue}".`);
    }
    moduloIdByTitle.set(keyValue, item.Id);
    created.push({ list: internalName, key: keyValue });
  }

  const associated = [];
  for (const { moduloKey, menuAlias, title } of plan.menuAssociations) {
    const moduloId = moduloIdByTitle.get(moduloKey);
    if (moduloId == null) {
      throw new Error(`Id de MSEModulos não resolvido para "${moduloKey}" (criação acima falhou silenciosamente?).`);
    }
    // eslint-disable-next-line no-await-in-loop
    const menuItem = await findItemByKey(client, menuList, "Alias", menuAlias, ["Id"]);
    if (!menuItem) {
      throw new Error(
        `Item de MSEMenu com Alias="${menuAlias}" não encontrado — rode migrateCamapHome antes dos ajustes de C4.`
      );
    }
    const menuId = menuItem.Id;
    // eslint-disable-next-line no-await-in-loop
    const already = await client.getListItems(modulosMenuList, {
      select: ["ModuloId", "MenuId"],
      filter: `ModuloId eq ${Number(moduloId)} and MenuId eq ${Number(menuId)}`,
      top: 1
    });
    if (Array.isArray(already) && already.length > 0) continue;
    // eslint-disable-next-line no-await-in-loop
    await client.createListItem(modulosMenuList, { Title: title, ModuloId: moduloId, MenuId: menuId });
    associated.push({ list: "MSEModulosMenu", moduloKey, menuAlias });
  }

  return Object.freeze({ status: "adjusted", updated, created, associated });
}

/**
 * Grava a migração real da Home via `client` (reaproveitado — nenhum fetch
 * direto), só depois de `installer.verify()` confirmar que as 5 listas
 * MSE* estão prontas, e só com confirmação explícita via `confirm` (mesmo
 * padrão de `kernel/seed.js#seedKernelLists`).
 *
 * Cada lista é referenciada pelo `listId` resolvido por `installer.verify()`,
 * nunca pelo nome interno bruto ("MSEMenu" etc.): `core/list-provisioning.js
 * #applyList()` cria a lista com `Title = internalName` e, no mesmo
 * `apply()`, renomeia `Title` para o `displayName` amigável sempre que
 * `configureDisplayName` está pendente (o caso logo após a criação) —
 * depois disso, `core/rest.js#listApiPath()` resolvendo uma string via
 * `getbytitle(internalName)` passa a devolver 404, porque esse endpoint
 * casa pelo `Title` ATUAL, não pelo nome interno fixo (confirmado contra o
 * tenant real: esta função já falhou assim em produção antes desta
 * correção). `installer.verify()` já expõe `plan.lists[].{internalName,
 * listId}` (`publicPlan()`, `core/list-provisioning.js`), então o `listId`
 * é reaproveitado daqui sem nenhuma chamada de rede extra, mesmo padrão
 * agora usado por `kernel/seed.js#seedKernelLists`.
 *
 * Idempotente: cada item só é criado se nenhum item existente da lista
 * tiver o mesmo valor na chave natural (`keyField` de
 * `buildCamapHomeMigration()`).
 *
 * @param {{
 *   installer: { verify: () => Promise<object> },
 *   client: { getListItems: Function, createListItem: Function },
 *   confirm: (plan: object) => (boolean | Promise<boolean>)
 * }} options
 * @returns {Promise<{ status: "migrated" | "cancelled", created: Array<{ list: string, key: unknown }> }>}
 */
export async function migrateCamapHome({ installer, client, confirm } = {}) {
  if (!installer || typeof installer.verify !== "function") {
    throw new TypeError("installer deve expor verify().");
  }
  if (!client || typeof client.getListItems !== "function" || typeof client.createListItem !== "function") {
    throw new TypeError("client deve expor getListItems(list, options) e createListItem(list, values).");
  }
  if (typeof confirm !== "function") {
    throw new TypeError(
      "A migração exige um callback confirm(plan) explícito, no mesmo padrão de seedKernelLists/provisionLists."
    );
  }

  let verification;
  try {
    verification = await installer.verify();
  } catch (error) {
    throw new Error(
      "listas MSE* não estão prontas; rode installer.apply() antes da migração.",
      { cause: error }
    );
  }

  const listIdByInternalName = new Map(
    (verification?.plan?.lists ?? []).map((entry) => [entry.internalName, entry.listId])
  );

  const migrationPlan = buildCamapHomeMigration();
  if (await confirm(migrationPlan) !== true) {
    return Object.freeze({ status: "cancelled", created: [] });
  }

  const created = [];
  for (const [internalName, { keyField, items }] of Object.entries(migrationPlan)) {
    const listId = listIdByInternalName.get(internalName);
    if (!listId) {
      throw new Error(`listId não resolvido para ${internalName} (installer.verify() incompleto ou desatualizado).`);
    }
    const list = { listId };
    for (const item of items) {
      const keyValue = item[keyField];
      // eslint-disable-next-line no-await-in-loop
      if (await itemExists(client, list, keyField, keyValue)) continue;
      // eslint-disable-next-line no-await-in-loop
      await client.createListItem(list, item);
      created.push({ list: internalName, key: keyValue });
    }
  }

  return Object.freeze({ status: "migrated", created });
}
