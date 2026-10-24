import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";

const ESTADOS = ["Published", "Unpublished", "Trashed"];
const ATRIBUICOES = ["All", "None", "Only", "AllExcept"];

export function validateModuleValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const moduloTipo = String(item.Module ?? "").trim();
  const posicao = String(item.Position ?? "").trim();
  const estado = String(item.Published ?? "Published");
  const atribuicao = String(item.MenuAssignment ?? "All");
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!moduloTipo || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduloTipo)) throw new TypeError("Tipo de módulo deve usar letras minúsculas, números e hífens.");
  if (!posicao || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(posicao)) throw new TypeError("Posição deve usar letras minúsculas, números e hífens.");
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  if (!ATRIBUICOES.includes(atribuicao)) throw new TypeError(`Atribuição de menu inválida: ${atribuicao}.`);
  const ordem = item.Ordering === "" || item.Ordering == null ? 0 : Number(item.Ordering);
  const schemaVersao = item.SchemaVersion === "" || item.SchemaVersion == null ? null : Number(item.SchemaVersion);
  if (!Number.isInteger(ordem) || ordem < 0) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  if (schemaVersao !== null && (!Number.isInteger(schemaVersao) || schemaVersao < 0)) throw new TypeError("Versão do schema deve ser um inteiro não negativo.");
  const publicarEm = item.PublishUp ? new Date(item.PublishUp) : null;
  const publicarAte = item.PublishDown ? new Date(item.PublishDown) : null;
  if (publicarEm && Number.isNaN(publicarEm.getTime())) throw new TypeError("Publicar em deve ser uma data válida.");
  if (publicarAte && Number.isNaN(publicarAte.getTime())) throw new TypeError("Publicar até deve ser uma data válida.");
  if (publicarEm && publicarAte && publicarAte.getTime() < publicarEm.getTime()) throw new TypeError("Publicar até deve ser maior ou igual a Publicar em.");
  const publicarEmIso = publicarEm ? publicarEm.toISOString() : null;
  const publicarAteIso = publicarAte ? publicarAte.toISOString() : null;
  const paramsJson = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(paramsJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return { Title: title, Module: moduloTipo, Position: posicao, Ordering: ordem, Published: estado, PublishUp: publicarEmIso, PublishDown: publicarAteIso, ShowTitle: Boolean(item.ShowTitle), Style: String(item.Style ?? "").trim(), MenuAssignment: atribuicao, ParamsJson: paramsJson, SchemaVersion: schemaVersao };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

const PUBLISH_TASK = "modules.publish";
const UNPUBLISH_TASK = "modules.unpublish";

export function renderModulesEditor({ root, route, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSEModules;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__modules";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  const toolbar = document.createElement("div"); const newButton = node(document, "button", "Novo módulo"); const reloadButton = node(document, "button", "Recarregar"); toolbar.append(newButton, reloadButton);
  panel.append(node(document, "h2", "Instâncias de módulo"), error, toolbar, tableHost, formHost); root.append(panel);
  let currentId = null; let controls = {};
  // `route.task`/`route.id` só são aplicados uma vez, no primeiro
  // carregamento — mesmo padrão de components/com_templates/templates-editor.js.
  let pendingTask = (route?.task === PUBLISH_TASK || route?.task === UNPUBLISH_TASK) && route.id != null
    ? { task: route.task, id: route.id }
    : null;
  async function togglePublished(item, desiredPublished) {
    error.textContent = "";
    try { await updateAdminItem({ client, list, id: item.Id, values: { Published: desiredPublished ? "Published" : "Unpublished" } }); await reload(); }
    catch (e) { error.textContent = errorText("Falha ao alternar módulo", e); }
  }
  const read = () => ({ Title: controls.Title.value, Module: controls.Module.value, Position: controls.Position.value, Ordering: controls.Ordering.value, Published: controls.Published.value, PublishUp: controls.PublishUp.value, PublishDown: controls.PublishDown.value, ShowTitle: controls.ShowTitle.checked, Style: controls.Style.value, MenuAssignment: controls.MenuAssignment.value, ParamsJson: controls.ParamsJson.value, SchemaVersion: controls.SchemaVersion.value });
  function renderForm(item = {}) {
    clear(formHost); controls = {};
    const box = document.createElement("div"); box.className = "mse-administrator__form";
    const fields = [["Título", "Title"], ["Tipo de módulo", "Module"], ["Posição", "Position"], ["Ordem", "Ordering"], ["Publicar em", "PublishUp"], ["Publicar até", "PublishDown"], ["Estilo", "Style"], ["Parâmetros (JSON)", "ParamsJson"], ["Versão do schema", "SchemaVersion"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ParamsJson" ? "{}" : "")); if (name === "PublishUp" || name === "PublishDown") controls[name].type = "datetime-local"; row.append(controls[name]); box.append(row); }
    controls.Published = select(document, "Published", ESTADOS, item.Published || "Published"); controls.MenuAssignment = select(document, "MenuAssignment", ATRIBUICOES, item.MenuAssignment || "All");
    for (const [label, control] of [["Estado", controls.Published], ["Atribuição de menu", controls.MenuAssignment]]) { const row = document.createElement("label"); row.textContent = label; row.append(control); box.append(row); }
    const titleRow = document.createElement("label"); titleRow.textContent = "Mostrar título"; controls.ShowTitle = document.createElement("input"); controls.ShowTitle.type = "checkbox"; controls.ShowTitle.checked = Boolean(item.ShowTitle); titleRow.append(controls.ShowTitle); box.append(titleRow);
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; renderForm(); });
    bind(save, async () => { error.textContent = ""; try { const values = validateModuleValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; renderForm(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box);
  }
  function renderTable(items) { clear(tableHost); const table = document.createElement("table"); const header = document.createElement("tr"); for (const label of ["Título", "Tipo", "Posição", "Ordem", "Estado", "Atribuição", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of items) { const row = document.createElement("tr"); for (const value of [item.Title, item.Module, item.Position, item.Ordering]) row.append(node(document, "td", String(value ?? ""))); const stateCell = node(document, "td", String(item.Published ?? "")); stateCell.className = `mse-administrator__status-cell ${item.Published === "Published" ? "mse-administrator__status-cell--ok" : item.Published === "Trashed" ? "mse-administrator__status-cell--attn" : "mse-administrator__status-cell--muted"}`; row.append(stateCell, node(document, "td", String(item.MenuAssignment ?? ""))); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; renderForm(item); }); const remove = node(document, "button", "Excluir"); bind(remove, async () => { error.textContent = ""; try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); } catch (e) { error.textContent = errorText("Falha ao excluir", e); } }); const toggle = node(document, "button", item.Published === "Published" ? "Despublicar" : "Publicar"); bind(toggle, () => togglePublished(item, item.Published !== "Published")); actions.append(edit, remove, toggle); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() {
    if (!client || !list) { error.textContent = "Client administrativo ou lista MSEModules não configurado."; return; }
    try {
      const items = await listAdminItems({ client, list, select: ["Id", "Title", "Module", "Position", "Ordering", "Published", "PublishUp", "PublishDown", "ShowTitle", "Style", "MenuAssignment", "ParamsJson", "SchemaVersion"], orderby: "Position,Ordering" });
      renderTable(items);
      if (pendingTask != null) {
        const { task, id } = pendingTask;
        pendingTask = null;
        const target = items.find((item) => item.Id === id);
        const desiredPublished = task === PUBLISH_TASK;
        const isPublished = target?.Published === "Published";
        if (target && isPublished !== desiredPublished) await togglePublished(target, desiredPublished);
      }
    } catch (e) { error.textContent = errorText("Falha ao carregar módulos", e); }
  }
  bind(newButton, () => { currentId = null; renderForm(); }); bind(reloadButton, reload); renderForm(); reload(); return { dispose() { panel.remove(); } };
}
