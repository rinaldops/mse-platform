import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";
import { createAdministratorToolbar } from "../com_cpanel/administrator-toolbar.js";

const TIPOS = ["Component", "Module", "Plugin", "Template"];
const CLIENT_IDS = ["Site", "Administrator"];

export function validateExtensionValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const tipo = String(item.Type ?? "").trim();
  const elemento = String(item.Element ?? "").trim();
  const clientId = String(item.ClientId ?? "Site").trim();
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!TIPOS.includes(tipo)) throw new TypeError(`Tipo inválido: ${tipo}.`);
  if (!elemento || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(elemento)) throw new TypeError("Elemento deve usar letras minúsculas, números e hífens.");
  if (!CLIENT_IDS.includes(clientId)) throw new TypeError(`Client inválido: ${clientId}.`);
  const ordem = item.Ordering === "" || item.Ordering == null ? null : Number(item.Ordering);
  if (ordem !== null && (!Number.isInteger(ordem) || ordem < 0)) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  const paramsJson = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(paramsJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return { Title: title, Type: tipo, Element: elemento, ClientId: clientId, Version: String(item.Version ?? "").trim(), Enabled: Boolean(item.Enabled), Protected: Boolean(item.Protected), Ordering: ordem, ParamsJson: paramsJson };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

const ENABLE_TASK = "extensions.enable";
const DISABLE_TASK = "extensions.disable";

export function renderExtensionsEditor({ root, route, services = {} } = {}) {
  const document = root?.ownerDocument; const client = services.adminClient; const list = services.listIds?.MSEExtensions;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__extensions";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  let searchTerm = "";
  const toolbar = createAdministratorToolbar({
    root: panel,
    primaryActions: [{ label: "Nova extensão", onClick: () => { currentId = null; currentProtected = false; form(); } }],
    secondaryActions: [{ label: "Recarregar", onClick: () => reload() }],
    search: { placeholder: "Buscar extensão...", onInput: (value) => { searchTerm = value; renderTable(loadedItems); } }
  });
  let loadedItems = [];
  panel.append(node(document, "h2", "Extensões instaladas"), error, tableHost, formHost); root.append(panel);
  let currentId = null; let currentProtected = false; let controls = {};
  // `route.task`/`route.id` só são aplicados uma vez, no primeiro
  // carregamento — mesmo padrão de components/com_templates/templates-editor.js.
  let pendingTask = (route?.task === ENABLE_TASK || route?.task === DISABLE_TASK) && route.id != null
    ? { task: route.task, id: route.id }
    : null;
  async function toggleEnabled(item, desiredEnabled) {
    if (item.Protected && !desiredEnabled) { error.textContent = "Extensão protegida não pode ser desabilitada."; return; }
    error.textContent = "";
    try { await updateAdminItem({ client, list, id: item.Id, values: { Enabled: desiredEnabled } }); await reload(); }
    catch (e) { error.textContent = errorText("Falha ao alternar extensão", e); }
  }
  const read = () => ({ Title: controls.Title.value, Type: controls.Type.value, Element: controls.Element.value, ClientId: controls.ClientId.value, Version: controls.Version.value, Enabled: controls.Enabled.checked, Protected: controls.Protected.checked, Ordering: controls.Ordering.value, ParamsJson: controls.ParamsJson.value });
  function form(item = {}) { clear(formHost); controls = {}; const box = document.createElement("div"); box.className = "mse-administrator__form";
    for (const [label, name] of [["Título", "Title"], ["Elemento", "Element"], ["Versão", "Version"], ["Ordem", "Ordering"], ["Parâmetros (JSON)", "ParamsJson"]]) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ParamsJson" ? "{}" : "")); row.append(controls[name]); box.append(row); }
    controls.Type = select(document, "Type", TIPOS, item.Type || "Module"); const typeRow = document.createElement("label"); typeRow.textContent = "Tipo"; typeRow.append(controls.Type); box.append(typeRow);
    controls.ClientId = select(document, "ClientId", CLIENT_IDS, item.ClientId || "Site"); const clientRow = document.createElement("label"); clientRow.textContent = "Client"; clientRow.append(controls.ClientId); box.append(clientRow);
    for (const [label, name] of [["Habilitado", "Enabled"], ["Protegido", "Protected"]]) { const row = document.createElement("label"); row.textContent = label; controls[name] = document.createElement("input"); controls[name].type = "checkbox"; controls[name].checked = Boolean(item[name]); controls[name].disabled = name === "Protected" || (currentProtected && name === "Enabled"); row.append(controls[name]); box.append(row); }
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; currentProtected = false; form(); }); bind(save, async () => { error.textContent = ""; try { const values = validateExtensionValues(read()); if (currentProtected && !values.Enabled) throw new Error("Extensão protegida não pode ser desabilitada."); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; currentProtected = false; form(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box); }
  function renderTable(items) { clear(tableHost); const term = searchTerm.trim().toLowerCase(); const visible = term ? items.filter((item) => [item.Title, item.Type, item.Element].some((value) => String(value ?? "").toLowerCase().includes(term))) : items; const table = document.createElement("table"); table.className = "mse-administrator__table"; const header = document.createElement("tr"); for (const label of ["Título", "Tipo", "Elemento", "Client", "Versão", "Habilitada", "Protegida", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of visible) { const row = document.createElement("tr"); for (const value of [item.Title, item.Type, item.Element, item.ClientId, item.Version]) row.append(node(document, "td", String(value ?? ""))); const enabledCell = node(document, "td", item.Enabled ? "Sim" : "Não"); enabledCell.className = `mse-administrator__status-cell ${item.Enabled ? "mse-administrator__status-cell--ok" : "mse-administrator__status-cell--muted"}`; const protectedCell = node(document, "td", item.Protected ? "Sim" : "Não"); protectedCell.className = `mse-administrator__status-cell ${item.Protected ? "mse-administrator__status-cell--attn" : "mse-administrator__status-cell--muted"}`; row.append(enabledCell, protectedCell); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; currentProtected = Boolean(item.Protected); form(item); }); const remove = node(document, "button", "Excluir"); remove.disabled = Boolean(item.Protected); bind(remove, async () => { if (item.Protected) return; error.textContent = ""; try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); } catch (e) { error.textContent = errorText("Falha ao excluir", e); } }); const toggle = node(document, "button", item.Enabled ? "Desabilitar" : "Habilitar"); toggle.disabled = Boolean(item.Protected) && item.Enabled; bind(toggle, () => toggleEnabled(item, !item.Enabled)); actions.append(edit, remove, toggle); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() {
    if (!client || !list) { error.textContent = "Client administrativo ou lista MSEExtensions não configurado."; return; }
    try {
      const items = await listAdminItems({ client, list, select: ["Id", "Title", "Type", "Element", "ClientId", "Version", "Enabled", "Protected", "Ordering", "ParamsJson"], orderby: "Type,Element" });
      loadedItems = items;
      renderTable(items);
      if (pendingTask != null) {
        const { task, id } = pendingTask;
        pendingTask = null;
        const target = items.find((item) => item.Id === id);
        const desiredEnabled = task === ENABLE_TASK;
        if (target && target.Enabled !== desiredEnabled) await toggleEnabled(target, desiredEnabled);
      }
    } catch (e) { error.textContent = errorText("Falha ao carregar extensões", e); }
  }
  form(); reload(); return { dispose() { toolbar.dispose(); panel.remove(); } };
}
