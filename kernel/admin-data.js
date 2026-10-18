/**
 * CRUD genérico com ETag para as listas EDITÁVEIS do Administrator (Site
 * Kernel, Fase 5 — mse-platform/docs/PLANO-SITE-KERNEL-MSE.md): MSEExtensoes,
 * MSEModulos e MSEMenu. As outras 2 listas fixas do kernel (MSEMenuTipos,
 * MSEModulosMenu) também podem ser operadas por este módulo — ele não
 * hard-code nenhum nome de lista, é genérico sobre QUALQUER lista do site.
 *
 * Este módulo NÃO resolve `listId`: toda função recebe `list` já como
 * `{ listId }` resolvido (mesmo padrão usado em `tools/migrate-camap-home.js`
 * e `kernel/seed.js` — nunca resolvendo pelo nome interno bruto via
 * `getbytitle`, que quebra depois que `core/list-provisioning.js#applyList()`
 * renomeia `Title` para o `displayName` amigável). Quem chama este módulo
 * deve ter resolvido `listId` previamente via
 * `kernel/installer.js#createKernelInstaller().verify()` (ou inspeção
 * equivalente), do mesmo jeito que `migrateCamapHome`/`seedKernelLists` já
 * fazem.
 *
 * Todas as funções são finas sobre `core/rest.js#createSharePointRestClient`
 * — nenhuma lógica de HTTP/ETag/digest é duplicada aqui:
 * - `createListItem`/`updateListItem`/`deleteListItem` do client já fazem a
 *   gestão completa de ETag/digest e já lançam `SharePointRestError` (ex.:
 *   `code: "concurrency-conflict"` em HTTP 412 real, ou `code: "etag-required"`
 *   se a ETag estiver ausente/for wildcard) quando algo dá errado. Este
 *   módulo nunca intercepta nem "esconde" esses erros — eles sempre
 *   propagam para quem chamou `updateAdminItem`/`deleteAdminItem`, que deve
 *   decidir o que fazer (ex.: recarregar o item e pedir confirmação de novo).
 * - `updateAdminItem`/`deleteAdminItem` SEMPRE buscam a ETag atual
 *   (`client.getListItem(list, id, { select: ["Id"] })`) imediatamente antes
 *   de escrever, para que nenhum chamador deste módulo precise lembrar desse
 *   passo nem arrisque reaproveitar uma ETag desatualizada guardada em tela.
 *   `select: ["Id"]` é o campo mínimo universal (todo item de toda lista tem
 *   `Id`) — este módulo não precisa conhecer nenhum campo específico de
 *   MSEExtensoes/MSEModulos/MSEMenu para buscar a ETag.
 *
 * `listAdminItems` é um wrapper deliberadamente fino sobre
 * `client.getListItems` — existe só para dar um nome/ponto de entrada único
 * e estável a essa chamada dentro do Administrator. Hoje é puro pass-through
 * (sem lógica extra); a razão de existir mesmo assim é ter um lugar único
 * para evoluir no futuro (paginação de UI, cache por lista, etc.) sem
 * precisar localizar e ajustar todas as telas que hoje chamariam
 * `client.getListItems` diretamente.
 */

/** Campo mínimo universal usado só para obter a ETag atual de um item. */
const ETAG_SELECT = ["Id"];

/**
 * Valida que `client` foi informado e expõe os métodos necessários para a
 * operação (mesmo padrão de validação de `tools/migrate-camap-home.js`:
 * cada função só exige os métodos que ela de fato usa).
 *
 * @param {object} client
 * @param {string[]} methods
 * @returns {object} O próprio `client`, para encadeamento.
 */
function requireClient(client, methods) {
  if (!client || typeof client !== "object") {
    throw new TypeError("client é obrigatório.");
  }
  for (const method of methods) {
    if (typeof client[method] !== "function") {
      throw new TypeError(`client deve expor ${method}(...).`);
    }
  }
  return client;
}

/**
 * Valida que `list` foi informado já como `{ listId }` resolvido — este
 * módulo não tenta adivinhar ou resolver `listId` a partir de um nome.
 *
 * @param {{listId: string}} list
 * @returns {{listId: string}}
 */
function requireList(list) {
  if (!list || typeof list !== "object" || Array.isArray(list)) {
    throw new TypeError("list deve ser um objeto { listId } já resolvido (ver kernel/installer.js#verify()).");
  }
  return list;
}

/**
 * Valida que `id` foi informado (presença; o formato exato — inteiro
 * positivo — já é validado por `core/rest.js` no momento da chamada real,
 * não há motivo para duplicar essa regra aqui).
 *
 * @param {unknown} id
 * @returns {unknown}
 */
function requireId(id) {
  if (id === undefined || id === null) {
    throw new TypeError("id é obrigatório.");
  }
  return id;
}

/**
 * Valida que `values` é um objeto puro (não array, não `null`, não
 * primitivo) de campos a gravar — a mesma exigência de
 * `core/rest.js#createSharePointRestClient` (`itemValues`), mas verificada
 * aqui também para que o erro apareça com uma mensagem clara no limite deste
 * módulo, antes de qualquer chamada de rede.
 *
 * @param {unknown} values
 * @returns {Record<string, unknown>}
 */
function requirePlainValues(values) {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("values deve ser um objeto puro de campos a gravar.");
  }
  return values;
}

/**
 * Lista itens de `list` — wrapper fino sobre `client.getListItems(list,
 * { select, filter, orderBy })`. Ver cabeçalho do arquivo sobre por que este
 * wrapper existe mesmo sendo pass-through.
 *
 * @param {{
 *   client: { getListItems: Function },
 *   list: {listId: string},
 *   select?: string[],
 *   filter?: string,
 *   orderby?: string
 * }} options
 * @returns {Promise<object[]>}
 */
export async function listAdminItems({ client, list, select, filter, orderby } = {}) {
  requireClient(client, ["getListItems"]);
  requireList(list);
  return client.getListItems(list, { select, filter, orderBy: orderby });
}

/**
 * Cria um item em `list` com `values` — wrapper sobre
 * `client.createListItem(list, values)`.
 *
 * @param {{ client: { createListItem: Function }, list: {listId: string}, values: Record<string, unknown> }} options
 * @returns {Promise<{ item: object, etag: string|null, status: number }>}
 */
export async function createAdminItem({ client, list, values } = {}) {
  requireClient(client, ["createListItem"]);
  requireList(list);
  requirePlainValues(values);
  return client.createListItem(list, values);
}

/**
 * Atualiza o item `id` de `list` com `values`, buscando a ETag atual
 * imediatamente antes de escrever (ver cabeçalho do arquivo). Se o item foi
 * alterado por outra pessoa entre a leitura da ETag e esta escrita, o
 * próprio `client.updateListItem` lança o erro de conflito de concorrência
 * (`SharePointRestError`, `code: "concurrency-conflict"`, em produção; em
 * testes, qualquer erro equivalente que o client fake sinalizar) — esta
 * função NUNCA captura esse erro, apenas deixa propagar para quem chamou
 * decidir (ex.: recarregar o item e repetir, pedindo confirmação de novo).
 *
 * @param {{
 *   client: { getListItem: Function, updateListItem: Function },
 *   list: {listId: string},
 *   id: number|string,
 *   values: Record<string, unknown>
 * }} options
 * @returns {Promise<{ item: object, etag: string|null, status: number }>}
 */
export async function updateAdminItem({ client, list, id, values } = {}) {
  requireClient(client, ["getListItem", "updateListItem"]);
  requireList(list);
  requireId(id);
  requirePlainValues(values);
  const { etag } = await client.getListItem(list, id, { select: ETAG_SELECT });
  return client.updateListItem(list, id, values, { etag });
}

/**
 * Exclui o item `id` de `list`, buscando a ETag atual imediatamente antes de
 * excluir (mesmo motivo/mesma propagação de erro de conflito de
 * `updateAdminItem`, ver docstring acima).
 *
 * @param {{
 *   client: { getListItem: Function, deleteListItem: Function },
 *   list: {listId: string},
 *   id: number|string
 * }} options
 * @returns {Promise<{ etag: string|null, status: number }>}
 */
export async function deleteAdminItem({ client, list, id } = {}) {
  requireClient(client, ["getListItem", "deleteListItem"]);
  requireList(list);
  requireId(id);
  const { etag } = await client.getListItem(list, id, { select: ETAG_SELECT });
  return client.deleteListItem(list, id, { etag });
}
