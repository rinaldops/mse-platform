/**
 * Telas de coleção do Administrator (`com_extensions`/`com_menus`/
 * `com_modules`/`com_config`/`com_installer`) — Site Kernel, Fase 5 (ver
 * mse-platform/docs/PLANO-SITE-KERNEL-MSE.md seção 5).
 *
 * Contrato de `services` para `com_extensions`/`com_menus`/`com_modules`
 * (NOVO nesta rodada — nenhum host-adapter ainda o preenche; fica para outra
 * rodada conectar isto ao host real, ex. `host-adapters/modern-script-editor/
 * site-boot.js`):
 *
 * - `services.adminClient` — o client REST já configurado (mesma assinatura
 *   de `core/rest.js#createSharePointRestClient`, isto é, expõe pelo menos
 *   `getListItems(list, options)` — a única operação usada por esta tela,
 *   somente-leitura). Esta tela NUNCA cria seu próprio client: ele chega
 *   sempre injetado via `services`, o que a torna testável com um client
 *   fake em memória, sem rede real.
 * - `services.listIds` — mapa `{ MSEExtensoes: {listId}, MSEMenu: {listId},
 *   MSEModulos: {listId} }`, já resolvido por quem monta o Administrator
 *   (mesmo padrão de `kernel/admin-data.js`: este arquivo nunca resolve
 *   `listId` a partir de um nome bruto — isso é responsabilidade de quem
 *   injeta `services`, via `kernel/installer.js#createKernelInstaller().verify()`
 *   ou equivalente).
 *
 * Cada view usa `listAdminItems` (`kernel/admin-data.js`) para buscar os
 * itens crus da lista correspondente, e `buildFormFields` (`kernel/
 * admin-form.js`) sobre o schema correspondente (`kernel/schemas/*.js`) só
 * para saber quais colunas mostrar (`FieldDescriptor.label` como cabeçalho,
 * `FieldDescriptor.name` para ler o valor bruto do item) — nenhum formulário
 * de edição é desenhado aqui, é renderização somente-leitura.
 *
 * `com_config`/`com_installer` permanecem com o comportamento placeholder
 * original nesta rodada (explicitamente adiados — ver passo 6 da tarefa
 * desta rodada); não consomem `services.adminClient`/`listIds`.
 */

import { listAdminItems } from "../../kernel/admin-data.js";
import { buildFormFields } from "../../kernel/admin-form.js";
import { MSE_EXTENSOES_SCHEMA } from "../../kernel/schemas/mse-extensoes.js";
import { MSE_MENU_SCHEMA } from "../../kernel/schemas/mse-menu.js";
import { MSE_MODULOS_SCHEMA } from "../../kernel/schemas/mse-modulos.js";
import { renderMenusEditor } from "./menus-editor.js";
import { renderModulesEditor } from "./modules-editor.js";
import { renderExtensionsEditor } from "./extensions-editor.js";

const labels = {
  com_config: "Configuração global",
  com_extensions: "Extensões",
  com_menus: "Menus",
  com_modules: "Módulos",
  com_installer: "Instalador"
};

/** Mapeia cada `option` de lista real para o `listIds`/schema correspondente. */
const LIST_BINDINGS = {
  com_extensions: { listIdKey: "MSEExtensoes", schema: MSE_EXTENSOES_SCHEMA },
  com_menus: { listIdKey: "MSEMenu", schema: MSE_MENU_SCHEMA },
  com_modules: { listIdKey: "MSEModulos", schema: MSE_MODULOS_SCHEMA }
};

/**
 * Monta as colunas da tabela somente-leitura: "Título" (campo Title, comum a
 * toda lista MSE*) seguida de uma coluna por `FieldDescriptor` do schema, na
 * mesma ordem de `schema.fields[]`.
 *
 * @param {object} schema Schema devolvido por `defineListSchema`.
 * @returns {Array<{ name: string, label: string }>}
 */
function buildColumns(schema) {
  const fieldColumns = buildFormFields(schema).map((descriptor) => ({
    name: descriptor.name,
    label: descriptor.label
  }));
  return [{ name: "Title", label: "Título" }, ...fieldColumns];
}

/**
 * Renderiza a tabela somente-leitura (`<table>/<thead>/<tbody>`) de `items`,
 * uma linha por item, uma coluna por `columns[]` (lendo `column.name` do
 * item cru, cabeçalho `column.label`).
 *
 * @param {Document} document
 * @param {Array<{ name: string, label: string }>} columns
 * @param {object[]} items
 * @returns {HTMLTableElement}
 */
function renderTable(document, columns, items) {
  const table = document.createElement("table");
  table.className = "mse-administrator__table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of columns) {
    const th = document.createElement("th");
    th.textContent = column.label;
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const item of items) {
    const row = document.createElement("tr");
    for (const column of columns) {
      const cell = document.createElement("td");
      const value = item?.[column.name];
      cell.textContent = value == null ? "" : String(value);
      row.append(cell);
    }
    tbody.append(row);
  }

  table.append(thead, tbody);
  return table;
}

/**
 * Renderiza a tela de uma lista real (`com_extensions`/`com_menus`/
 * `com_modules`): título + tabela somente-leitura, ou mensagem de erro
 * amigável se `listAdminItems` rejeitar — nunca lança sem tratamento (mesmo
 * espírito de resiliência do resto do kernel).
 *
 * @param {Document} document
 * @param {HTMLElement} panel
 * @param {string} option
 * @param {object} services
 * @returns {Promise<void>}
 */
async function renderListPanel(document, panel, option, services) {
  const binding = LIST_BINDINGS[option];
  const { adminClient, listIds } = services;

  if (!adminClient || typeof adminClient.getListItems !== "function") {
    const message = document.createElement("p");
    message.className = "mse-administrator__error";
    message.textContent = "Não foi possível carregar os dados: nenhum client administrativo foi configurado.";
    panel.append(message);
    return;
  }
  const list = listIds?.[binding.listIdKey];
  if (!list) {
    const message = document.createElement("p");
    message.className = "mse-administrator__error";
    message.textContent = `Não foi possível carregar os dados: lista "${binding.listIdKey}" não está configurada.`;
    panel.append(message);
    return;
  }

  const columns = buildColumns(binding.schema);
  try {
    const items = await listAdminItems({ client: adminClient, list });
    panel.append(renderTable(document, columns, Array.isArray(items) ? items : []));
  } catch (error) {
    const message = document.createElement("p");
    message.className = "mse-administrator__error";
    message.textContent = `Não foi possível carregar os dados de ${labels[option]}: ${error?.message || "erro desconhecido"}.`;
    panel.append(message);
  }
}

/**
 * @param {{ root: Element, route: { option: string }, services?: {
 *   adminClient?: { getListItems: Function },
 *   listIds?: { MSEExtensoes?: {listId:string}, MSEMenu?: {listId:string}, MSEModulos?: {listId:string} }
 * } }} options
 * @returns {{ dispose(): void }}
 */
export function renderCollectionScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h = document.createElement("h1");
  h.textContent = labels[route.option] || "Administrator";
  panel.append(h);

  if (route.option === "com_extensions") {
    renderExtensionsEditor({ root: panel, services });
  } else if (route.option === "com_menus") {
    renderMenusEditor({ root: panel, services });
  } else if (route.option === "com_modules") {
    renderModulesEditor({ root: panel, services });
  } else if (LIST_BINDINGS[route.option]) {
    // com_extensions/com_menus/com_modules: dados reais, injetados via
    // services.adminClient/services.listIds (ver contrato no topo do arquivo).
    renderListPanel(document, panel, route.option, services);
  } else {
    // com_config/com_installer: PLACEHOLDER mantido deliberadamente nesta
    // rodada — conectar a dados reais fica para outra rodada.
    const p = document.createElement("p");
    p.textContent = services.status || "A tela está preparada para receber a fonte SharePoint correspondente.";
    panel.append(p);
  }

  root.append(panel);
  return {
    dispose() {
      panel.remove();
    }
  };
}
