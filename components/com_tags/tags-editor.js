import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";
import { createAdministratorToolbar } from "../com_cpanel/administrator-toolbar.js";

const ESTADOS = ["Published", "Unpublished", "Trashed"];

export function validateTagValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const alias = String(item.Alias ?? "").trim();
  const estado = String(item.Published ?? "Published");
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!alias || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias)) throw new TypeError("Alias deve usar letras minúsculas, números e hífens.");
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  const ordem = item.Ordering === "" || item.Ordering == null ? 0 : Number(item.Ordering);
  if (!Number.isInteger(ordem) || ordem < 0) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  const paramsJson = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(paramsJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return { Title: title, Alias: alias, Description: String(item.Description ?? "").trim(), Published: estado, Ordering: ordem, ParamsJson: paramsJson };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

const PUBLISH_TASK = "tags.publish";
const UNPUBLISH_TASK = "tags.unpublish";

export function renderTagsEditor({ root, route, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSETags;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__tags";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  let searchTerm = ""; let loadedItems = [];
  const toolbar = createAdministratorToolbar({
    root: panel,
    primaryActions: [{ label: "Nova tag", onClick: () => { currentId = null; renderForm(); } }],
    secondaryActions: [{ label: "Recarregar", onClick: () => reload() }],
    search: { placeholder: "Buscar tag...", onInput: (value) => { searchTerm = value; renderTable(loadedItems); } }
  });
  panel.append(node(document, "h2", "Tags"), error, tableHost, formHost); root.append(panel);
  let currentId = null; let controls = {};
  // `route.task`/`route.id` só são aplicados uma vez, no primeiro
  // carregamento — mesmo padrão de components/com_modules/modules-editor.js.
  let pendingTask = (route?.task === PUBLISH_TASK || route?.task === UNPUBLISH_TASK) && route.id != null
    ? { task: route.task, id: route.id }
    : null;
  async function togglePublished(item, desiredPublished) {
    error.textContent = "";
    try { await updateAdminItem({ client, list, id: item.Id, values: { Published: desiredPublished ? "Published" : "Unpublished" } }); await reload(); }
    catch (e) { error.textContent = errorText("Falha ao alternar tag", e); }
  }
  const read = () => ({ Title: controls.Title.value, Alias: controls.Alias.value, Description: controls.Description.value, Ordering: controls.Ordering.value, Published: controls.Published.value, ParamsJson: controls.ParamsJson.value });
  function renderForm(item = {}) {
    clear(formHost); controls = {};
    const box = document.createElement("div"); box.className = "mse-administrator__form";
    const fields = [["Título", "Title"], ["Alias", "Alias"], ["Descrição", "Description"], ["Ordem", "Ordering"], ["Parâmetros (JSON)", "ParamsJson"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ParamsJson" ? "{}" : "")); row.append(controls[name]); box.append(row); }
    controls.Published = select(document, "Published", ESTADOS, item.Published || "Published");
    const stateRow = document.createElement("label"); stateRow.textContent = "Estado"; stateRow.append(controls.Published); box.append(stateRow);
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; renderForm(); });
    bind(save, async () => { error.textContent = ""; try { const values = validateTagValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; renderForm(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box);
  }
  function renderTable(items) { clear(tableHost); const term = searchTerm.trim().toLowerCase(); const visible = term ? items.filter((item) => [item.Title, item.Alias].some((value) => String(value ?? "").toLowerCase().includes(term))) : items; const table = document.createElement("table"); table.className = "mse-administrator__table"; const header = document.createElement("tr"); for (const label of ["Título", "Alias", "Ordem", "Estado", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of visible) { const row = document.createElement("tr"); for (const value of [item.Title, item.Alias, item.Ordering]) row.append(node(document, "td", String(value ?? ""))); const stateCell = node(document, "td", String(item.Published ?? "")); stateCell.className = `mse-administrator__status-cell ${item.Published === "Published" ? "mse-administrator__status-cell--ok" : item.Published === "Trashed" ? "mse-administrator__status-cell--attn" : "mse-administrator__status-cell--muted"}`; row.append(stateCell); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; renderForm(item); }); const remove = node(document, "button", "Excluir"); bind(remove, async () => { error.textContent = ""; try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); } catch (e) { error.textContent = errorText("Falha ao excluir", e); } }); const toggle = node(document, "button", item.Published === "Published" ? "Despublicar" : "Publicar"); bind(toggle, () => togglePublished(item, item.Published !== "Published")); actions.append(edit, remove, toggle); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() {
    if (!client || !list) { error.textContent = "Client administrativo ou lista MSETags não configurado."; return; }
    try {
      const items = await listAdminItems({ client, list, select: ["Id", "Title", "Alias", "Description", "Ordering", "Published", "ParamsJson"], orderby: "Ordering" });
      loadedItems = items;
      renderTable(items);
      if (pendingTask != null) {
        const { task, id } = pendingTask;
        pendingTask = null;
        const target = items.find((item) => item.Id === id);
        const desiredPublished = task === PUBLISH_TASK;
        const isPublished = target?.Published === "Published";
        if (target && isPublished !== desiredPublished) await togglePublished(target, desiredPublished);
      }
    } catch (e) { error.textContent = errorText("Falha ao carregar tags", e); }
  }
  renderForm(); reload(); return { dispose() { toolbar.dispose(); panel.remove(); } };
}
