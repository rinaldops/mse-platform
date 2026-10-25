import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";
import { createAdministratorToolbar } from "../com_cpanel/administrator-toolbar.js";

const ESTADOS = ["Published", "Unpublished"];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateFilterValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const alias = String(item.Alias ?? "").trim();
  const estado = String(item.State ?? "Published");
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!alias || !SLUG_RE.test(alias)) throw new TypeError("Alias deve usar letras minúsculas, números e hífens.");
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  return { Title: title, Alias: alias, CreatedByAlias: String(item.CreatedByAlias ?? "").trim(), State: estado };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

const PUBLISH_TASK = "finder.publish";
const UNPUBLISH_TASK = "finder.unpublish";

export function renderFinderEditor({ root, route, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSESearchFilters;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__finder";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  let searchTerm = ""; let loadedItems = [];
  const toolbar = createAdministratorToolbar({
    root: panel,
    primaryActions: [{ label: "Novo filtro", onClick: () => { currentId = null; renderForm(); } }],
    secondaryActions: [{ label: "Recarregar", onClick: () => reload() }],
    search: { placeholder: "Buscar filtro...", onInput: (value) => { searchTerm = value; renderTable(loadedItems); } }
  });
  panel.append(node(document, "h2", "Filtros de busca"), error, tableHost, formHost); root.append(panel);
  let currentId = null; let controls = {};
  // `route.task`/`route.id` só são aplicados uma vez, no primeiro
  // carregamento — mesmo padrão de components/com_modules/modules-editor.js.
  let pendingTask = (route?.task === PUBLISH_TASK || route?.task === UNPUBLISH_TASK) && route.id != null
    ? { task: route.task, id: route.id }
    : null;
  async function togglePublished(item, desiredPublished) {
    error.textContent = "";
    try { await updateAdminItem({ client, list, id: item.Id, values: { State: desiredPublished ? "Published" : "Unpublished" } }); await reload(); }
    catch (e) { error.textContent = errorText("Falha ao alternar filtro", e); }
  }
  const read = () => ({ Title: controls.Title.value, Alias: controls.Alias.value, CreatedByAlias: controls.CreatedByAlias.value, State: controls.State.value });
  function renderForm(item = {}) {
    clear(formHost); controls = {};
    const box = document.createElement("div"); box.className = "mse-administrator__form";
    const fields = [["Título", "Title"], ["Alias", "Alias"], ["Criado por (alias)", "CreatedByAlias"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? ""); row.append(controls[name]); box.append(row); }
    controls.State = select(document, "State", ESTADOS, item.State || "Published");
    const stateRow = document.createElement("label"); stateRow.textContent = "Estado"; stateRow.append(controls.State); box.append(stateRow);
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; renderForm(); });
    bind(save, async () => { error.textContent = ""; try { const values = validateFilterValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; renderForm(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box);
  }
  function renderTable(items) { clear(tableHost); const term = searchTerm.trim().toLowerCase(); const visible = term ? items.filter((item) => [item.Title, item.Alias].some((value) => String(value ?? "").toLowerCase().includes(term))) : items; const table = document.createElement("table"); table.className = "mse-administrator__table"; const header = document.createElement("tr"); for (const label of ["Título", "Alias", "Estado", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of visible) { const row = document.createElement("tr"); for (const value of [item.Title, item.Alias]) row.append(node(document, "td", String(value ?? ""))); const stateCell = node(document, "td", String(item.State ?? "")); stateCell.className = `mse-administrator__status-cell ${item.State === "Published" ? "mse-administrator__status-cell--ok" : "mse-administrator__status-cell--muted"}`; row.append(stateCell); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; renderForm(item); }); const remove = node(document, "button", "Excluir"); bind(remove, async () => { error.textContent = ""; try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); } catch (e) { error.textContent = errorText("Falha ao excluir", e); } }); const toggle = node(document, "button", item.State === "Published" ? "Despublicar" : "Publicar"); bind(toggle, () => togglePublished(item, item.State !== "Published")); actions.append(edit, remove, toggle); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() {
    if (!client || !list) { error.textContent = "Client administrativo ou lista MSESearchFilters não configurado."; return; }
    try {
      const items = await listAdminItems({ client, list, select: ["Id", "Title", "Alias", "CreatedByAlias", "State"], orderby: "Title" });
      loadedItems = items;
      renderTable(items);
      if (pendingTask != null) {
        const { task, id } = pendingTask;
        pendingTask = null;
        const target = items.find((item) => item.Id === id);
        const desiredPublished = task === PUBLISH_TASK;
        const isPublished = target?.State === "Published";
        if (target && isPublished !== desiredPublished) await togglePublished(target, desiredPublished);
      }
    } catch (e) { error.textContent = errorText("Falha ao carregar filtros", e); }
  }
  renderForm(); reload(); return { dispose() { toolbar.dispose(); panel.remove(); } };
}
