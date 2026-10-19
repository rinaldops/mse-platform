import { createAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";

const SCOPES = ["Global", "Instancia", "Extensao"];
const STATES = ["Rascunho", "Publicado"];
const LAYOUTS = ["Herdar", "Contained", "FullBleed"];

export function validateConfigurationValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const key = String(item.Title ?? "").trim();
  const scope = String(item.Escopo ?? "Instancia");
  const module = String(item.Modulo ?? "").trim();
  const layout = String(item.Layout ?? "Herdar");
  const state = String(item.Estado ?? "Rascunho");
  const json = item.ConfiguracaoJson == null || item.ConfiguracaoJson === "" ? "{}" : String(item.ConfiguracaoJson);
  if (!key || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(key)) throw new TypeError("Chave deve usar letras, números e hífens.");
  if (!SCOPES.includes(scope)) throw new TypeError(`Escopo inválido: ${scope}.`);
  if (scope === "Instancia" && !module) throw new TypeError("Módulo é obrigatório para escopo Instancia.");
  if (!LAYOUTS.includes(layout)) throw new TypeError(`Layout inválido: ${layout}.`);
  if (!STATES.includes(state)) throw new TypeError(`Estado inválido: ${state}.`);
  try { const parsed = JSON.parse(json); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("Configuração JSON deve conter um objeto válido."); }
  return { Title: key, Escopo: scope, Modulo: module || null, TipoInstancia: String(item.TipoInstancia || "Full"), Layout: layout, Tema: String(item.Tema ?? "").trim() || null, ConfiguracaoJson: json, VersaoConfiguracao: Number(item.VersaoConfiguracao) > 0 ? Number(item.VersaoConfiguracao) : 1, VersaoSettings: Number(item.VersaoSettings) > 0 ? Number(item.VersaoSettings) : 1, VersaoModulo: String(item.VersaoModulo ?? "").trim() || null, Estado: state, Ativo: item.Ativo !== false };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(target, handler) { if (typeof target.addEventListener === "function") target.addEventListener("click", handler); else target.onclick = handler; }
function clear(target) { if (target.replaceChildren) target.replaceChildren(); else target.children.length = 0; }
function errorText(error) { if (error?.status === 403) return "Sem permissão para alterar configurações (403)."; if (error?.status === 412) return "Conflito de edição (412); recarregue e tente novamente."; return error?.message || "Erro desconhecido"; }

export function renderConfigurationEditor({ root, services = {} } = {}) {
  const document = root?.ownerDocument; const client = services.adminClient; const list = services.listIds?.MSEConfiguracoes;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__configuration";
  const error = node(document, "p"); error.className = "mse-administrator__error"; const tableHost = document.createElement("div"); const formHost = document.createElement("div"); const toolbar = document.createElement("div"); const fresh = node(document, "button", "Nova configuração"); const reload = node(document, "button", "Recarregar"); toolbar.append(fresh, reload); panel.append(node(document, "h2", "Configurações do site"), error, toolbar, tableHost, formHost); root.append(panel);
  let currentId = null; let current = {}; let controls = {};
  const read = () => Object.fromEntries(Object.entries(controls).map(([name, control]) => [name, name === "Ativo" ? control.checked : control.value]));
  function form(item = {}) { clear(formHost); controls = {}; const box = document.createElement("div"); box.className = "mse-administrator__form"; const fields = [["Chave", "Title"], ["Módulo", "Modulo"], ["Tema", "Tema"], ["Configuração JSON", "ConfiguracaoJson"], ["Versão da configuração", "VersaoConfiguracao"], ["Versão dos settings", "VersaoSettings"], ["Versão do módulo", "VersaoModulo"]]; for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ConfiguracaoJson" ? "{}" : "")); row.append(controls[name]); box.append(row); } controls.Escopo = select(document, "Escopo", SCOPES, item.Escopo || "Instancia"); controls.Layout = select(document, "Layout", LAYOUTS, item.Layout || "Herdar"); controls.Estado = select(document, "Estado", STATES, item.Estado || "Rascunho"); for (const [label, name] of [["Escopo", "Escopo"], ["Layout", "Layout"], ["Estado", "Estado"]]) { const row = document.createElement("label"); row.textContent = label; row.append(controls[name]); box.append(row); } const active = document.createElement("label"); active.textContent = "Ativo"; controls.Ativo = document.createElement("input"); controls.Ativo.type = "checkbox"; controls.Ativo.checked = item.Ativo !== false; active.append(controls.Ativo); box.append(active); const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; current = {}; form(); }); bind(save, async () => { error.textContent = ""; try { const values = validateConfigurationValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; current = {}; form(); await load(); } catch (cause) { error.textContent = `Falha ao salvar: ${errorText(cause)}`; } }); box.append(save, cancel); formHost.append(box); }
  function render(items) { clear(tableHost); const table = document.createElement("table"); const head = document.createElement("tr"); for (const label of ["Chave", "Escopo", "Módulo", "Tema", "Estado", "Ativo", "Ações"]) head.append(node(document, "th", label)); table.append(head); for (const item of items) { const row = document.createElement("tr"); for (const value of [item.Title, item.Escopo, item.Modulo, item.Tema, item.Estado, item.Ativo ? "Sim" : "Não"]) row.append(node(document, "td", String(value ?? ""))); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; current = item; form(item); }); actions.append(edit); row.append(actions); table.append(row); } tableHost.append(table); }
  async function load() { if (!client || !list) { error.textContent = "Client administrativo ou lista MSEConfiguracoes não configurado."; return; } try { render(await listAdminItems({ client, list, select: ["Id", "Title", "Escopo", "Modulo", "TipoInstancia", "Layout", "Tema", "ConfiguracaoJson", "VersaoConfiguracao", "VersaoSettings", "VersaoModulo", "Estado", "Ativo"], orderby: "Title" })); } catch (cause) { error.textContent = `Falha ao carregar: ${errorText(cause)}`; } }
  bind(fresh, () => { currentId = null; current = {}; form(); }); bind(reload, load); form(); load(); return { dispose() { panel.remove(); } };
}
