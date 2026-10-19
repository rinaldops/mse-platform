import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";

const TIPOS = ["Componente", "Modulo", "Plugin"];

export function validateExtensionValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const tipo = String(item.Tipo ?? "").trim();
  const elemento = String(item.Elemento ?? "").trim();
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!TIPOS.includes(tipo)) throw new TypeError(`Tipo inválido: ${tipo}.`);
  if (!elemento || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(elemento)) throw new TypeError("Elemento deve usar letras minúsculas, números e hífens.");
  const ordem = item.Ordem === "" || item.Ordem == null ? null : Number(item.Ordem);
  if (ordem !== null && (!Number.isInteger(ordem) || ordem < 0)) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  const paramsJson = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(paramsJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return { Title: title, Tipo: tipo, Elemento: elemento, Versao: String(item.Versao ?? "").trim(), Habilitado: Boolean(item.Habilitado), Protegido: Boolean(item.Protegido), Ordem: ordem, ParamsJson: paramsJson };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

export function renderExtensionsEditor({ root, services = {} } = {}) {
  const document = root?.ownerDocument; const client = services.adminClient; const list = services.listIds?.MSEExtensoes;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__extensions";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div"); const toolbar = document.createElement("div"); const newButton = node(document, "button", "Nova extensão"); const reloadButton = node(document, "button", "Recarregar"); toolbar.append(newButton, reloadButton);
  panel.append(node(document, "h2", "Extensões instaladas"), error, toolbar, tableHost, formHost); root.append(panel);
  let currentId = null; let currentProtected = false; let controls = {};
  const read = () => ({ Title: controls.Title.value, Tipo: controls.Tipo.value, Elemento: controls.Elemento.value, Versao: controls.Versao.value, Habilitado: controls.Habilitado.checked, Protegido: controls.Protegido.checked, Ordem: controls.Ordem.value, ParamsJson: controls.ParamsJson.value });
  function form(item = {}) { clear(formHost); controls = {}; const box = document.createElement("div"); box.className = "mse-administrator__form";
    for (const [label, name] of [["Título", "Title"], ["Elemento", "Elemento"], ["Versão", "Versao"], ["Ordem", "Ordem"], ["Parâmetros (JSON)", "ParamsJson"]]) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ParamsJson" ? "{}" : "")); row.append(controls[name]); box.append(row); }
    controls.Tipo = select(document, "Tipo", TIPOS, item.Tipo || "Modulo"); const typeRow = document.createElement("label"); typeRow.textContent = "Tipo"; typeRow.append(controls.Tipo); box.append(typeRow);
    for (const [label, name] of [["Habilitado", "Habilitado"], ["Protegido", "Protegido"]]) { const row = document.createElement("label"); row.textContent = label; controls[name] = document.createElement("input"); controls[name].type = "checkbox"; controls[name].checked = Boolean(item[name]); controls[name].disabled = name === "Protegido" || (currentProtected && name === "Habilitado"); row.append(controls[name]); box.append(row); }
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; currentProtected = false; form(); }); bind(save, async () => { error.textContent = ""; try { const values = validateExtensionValues(read()); if (currentProtected && !values.Habilitado) throw new Error("Extensão protegida não pode ser desabilitada."); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; currentProtected = false; form(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box); }
  function renderTable(items) { clear(tableHost); const table = document.createElement("table"); const header = document.createElement("tr"); for (const label of ["Título", "Tipo", "Elemento", "Versão", "Habilitada", "Protegida", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of items) { const row = document.createElement("tr"); for (const value of [item.Title, item.Tipo, item.Elemento, item.Versao, item.Habilitado ? "Sim" : "Não", item.Protegido ? "Sim" : "Não"]) row.append(node(document, "td", String(value ?? ""))); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; currentProtected = Boolean(item.Protegido); form(item); }); const remove = node(document, "button", "Excluir"); remove.disabled = Boolean(item.Protegido); bind(remove, async () => { if (item.Protegido) return; error.textContent = ""; try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); } catch (e) { error.textContent = errorText("Falha ao excluir", e); } }); actions.append(edit, remove); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() { if (!client || !list) { error.textContent = "Client administrativo ou lista MSEExtensoes não configurado."; return; } try { renderTable(await listAdminItems({ client, list, select: ["Id", "Title", "Tipo", "Elemento", "Versao", "Habilitado", "Protegido", "Ordem", "ParamsJson"], orderby: "Tipo,Elemento" })); } catch (e) { error.textContent = errorText("Falha ao carregar extensões", e); } }
  bind(newButton, () => { currentId = null; currentProtected = false; form(); }); bind(reloadButton, reload); form(); reload(); return { dispose() { panel.remove(); } };
}
