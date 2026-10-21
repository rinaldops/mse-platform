import { createAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";

/**
 * Editor CRUD de `MSEConfiguracoes` (configuração global/por instância/por
 * extensão do site) para `option=com_config`.
 *
 * Nomes de campo em PORTUGUÊS deliberadamente, ao contrário dos outros
 * editores do Administrator (`com_extensions`/`com_menus`/`com_modules`, já
 * normalizados para inglês): a normalização Joomla!
 * (`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`) marcou explicitamente
 * `MSEConfiguracoes` como Fase 3b — fora de escopo. Este editor segue o
 * schema real já em produção em `core/provisioning.js#CONFIGURATION_LIST_SCHEMA`
 * (13 campos: Title/Escopo/Modulo/TipoInstancia/Layout/Tema/ConfiguracaoJson/
 * VersaoConfiguracao/VersaoSettings/VersaoModulo/Estado/Ativo/ExtensaoElemento),
 * não um subconjunto reduzido — qualquer item criado/editado aqui deve
 * permanecer compatível com o que `core/configuration-store.js`/
 * `kernel/site-config.js` esperam ler.
 *
 * `VersaoConfiguracao` não é editável pela UI: é incrementada pelo próprio
 * `core/provisioning.js#updateConfigurationItem` a cada escrita real — aqui
 * usamos o CRUD genérico de `kernel/admin-data.js` (mesmo client REST
 * simples dos outros editores), então a versão é só exibida/mantida como
 * está, exceto no primeiro registro (padrão 1).
 */

const ESCOPOS = ["Global", "Instancia", "Extensao"];
const TIPOS_INSTANCIA = ["Full", "Summary"];
const LAYOUTS = ["Herdar", "Contained", "FullBleed"];
const ESTADOS = ["Rascunho", "Publicado"];

export function validateConfigurationValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const chave = String(item.Title ?? "").trim();
  const escopo = String(item.Escopo ?? "Instancia");
  const modulo = String(item.Modulo ?? "").trim();
  const tipoInstancia = String(item.TipoInstancia ?? "Full");
  const layout = String(item.Layout ?? "Herdar");
  const estado = String(item.Estado ?? "Rascunho");
  const extensaoElemento = String(item.ExtensaoElemento ?? "").trim();
  if (!chave || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(chave)) throw new TypeError("Chave deve usar letras, números e hífens.");
  if (!ESCOPOS.includes(escopo)) throw new TypeError(`Escopo inválido: ${escopo}.`);
  if (!TIPOS_INSTANCIA.includes(tipoInstancia)) throw new TypeError(`Tipo de instância inválido: ${tipoInstancia}.`);
  if (!LAYOUTS.includes(layout)) throw new TypeError(`Layout inválido: ${layout}.`);
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  if (escopo === "Instancia" && !modulo) throw new TypeError("Módulo é obrigatório para escopo Instancia.");
  if (escopo === "Extensao" && !extensaoElemento) throw new TypeError("Elemento da extensão é obrigatório para escopo Extensao.");
  if (escopo === "Global" && chave.toLowerCase() !== "global") throw new TypeError("O registro Global deve usar a chave global.");
  const configuracaoJson = item.ConfiguracaoJson == null || item.ConfiguracaoJson === "" ? "{}" : String(item.ConfiguracaoJson);
  try { const parsed = JSON.parse(configuracaoJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("Configuração JSON deve conter um objeto válido."); }
  const versaoConfiguracao = Number(item.VersaoConfiguracao) > 0 ? Number(item.VersaoConfiguracao) : 1;
  const versaoSettings = Number(item.VersaoSettings) > 0 ? Number(item.VersaoSettings) : 1;
  if (!Number.isInteger(versaoConfiguracao) || versaoConfiguracao < 1) throw new TypeError("Versão da configuração deve ser um inteiro positivo.");
  if (!Number.isInteger(versaoSettings) || versaoSettings < 1) throw new TypeError("Versão dos settings deve ser um inteiro positivo.");
  return {
    Title: chave,
    Escopo: escopo,
    Modulo: escopo === "Instancia" ? modulo : null,
    TipoInstancia: tipoInstancia,
    Layout: layout,
    Tema: String(item.Tema ?? "").trim() || null,
    ConfiguracaoJson: configuracaoJson,
    VersaoConfiguracao: versaoConfiguracao,
    VersaoSettings: versaoSettings,
    VersaoModulo: String(item.VersaoModulo ?? "").trim() || null,
    Estado: estado,
    Ativo: item.Ativo !== false,
    ExtensaoElemento: escopo === "Extensao" ? extensaoElemento : null
  };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

export function renderConfigurationEditor({ root, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSEConfiguracoes;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__config";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  const toolbar = document.createElement("div"); const newButton = node(document, "button", "Nova configuração"); const reloadButton = node(document, "button", "Recarregar"); toolbar.append(newButton, reloadButton);
  panel.append(node(document, "h2", "Configurações do site"), error, toolbar, tableHost, formHost); root.append(panel);
  let currentId = null; let controls = {};
  const read = () => ({ Title: controls.Title.value, Escopo: controls.Escopo.value, Modulo: controls.Modulo.value, TipoInstancia: controls.TipoInstancia.value, Layout: controls.Layout.value, Tema: controls.Tema.value, ConfiguracaoJson: controls.ConfiguracaoJson.value, VersaoConfiguracao: controls.VersaoConfiguracao.value, VersaoSettings: controls.VersaoSettings.value, VersaoModulo: controls.VersaoModulo.value, Estado: controls.Estado.value, Ativo: controls.Ativo.checked, ExtensaoElemento: controls.ExtensaoElemento.value });
  function renderForm(item = {}) {
    clear(formHost); controls = {};
    const box = document.createElement("div"); box.className = "mse-administrator__form";
    const fields = [["Chave", "Title"], ["Módulo", "Modulo"], ["Elemento da extensão", "ExtensaoElemento"], ["Tema", "Tema"], ["Configuração (JSON)", "ConfiguracaoJson"], ["Versão da configuração", "VersaoConfiguracao"], ["Versão dos settings", "VersaoSettings"], ["Versão do módulo", "VersaoModulo"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ConfiguracaoJson" ? "{}" : name === "VersaoConfiguracao" || name === "VersaoSettings" ? "1" : "")); row.append(controls[name]); box.append(row); }
    controls.Escopo = select(document, "Escopo", ESCOPOS, item.Escopo || "Instancia");
    controls.TipoInstancia = select(document, "TipoInstancia", TIPOS_INSTANCIA, item.TipoInstancia || "Full");
    controls.Layout = select(document, "Layout", LAYOUTS, item.Layout || "Herdar");
    controls.Estado = select(document, "Estado", ESTADOS, item.Estado || "Rascunho");
    for (const [label, control] of [["Escopo", controls.Escopo], ["Tipo de instância", controls.TipoInstancia], ["Layout", controls.Layout], ["Estado", controls.Estado]]) { const row = document.createElement("label"); row.textContent = label; row.append(control); box.append(row); }
    const activeRow = document.createElement("label"); activeRow.textContent = "Ativo"; controls.Ativo = document.createElement("input"); controls.Ativo.type = "checkbox"; controls.Ativo.checked = item.Ativo !== false; activeRow.append(controls.Ativo); box.append(activeRow);
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; renderForm(); });
    bind(save, async () => { error.textContent = ""; try { const values = validateConfigurationValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; renderForm(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box);
  }
  function renderTable(items) { clear(tableHost); const table = document.createElement("table"); const header = document.createElement("tr"); for (const label of ["Chave", "Escopo", "Módulo", "Tema", "Estado", "Ativo", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of items) { const row = document.createElement("tr"); for (const value of [item.Title, item.Escopo, item.Modulo, item.Tema, item.Estado, item.Ativo ? "Sim" : "Não"]) row.append(node(document, "td", String(value ?? ""))); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; renderForm(item); }); actions.append(edit); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() { if (!client || !list) { error.textContent = "Client administrativo ou lista MSEConfiguracoes não configurado."; return; } try { renderTable(await listAdminItems({ client, list, select: ["Id", "Title", "Escopo", "Modulo", "TipoInstancia", "Layout", "Tema", "ConfiguracaoJson", "VersaoConfiguracao", "VersaoSettings", "VersaoModulo", "Estado", "Ativo", "ExtensaoElemento"], orderby: "Title" })); } catch (e) { error.textContent = errorText("Falha ao carregar configurações", e); } }
  bind(newButton, () => { currentId = null; renderForm(); }); bind(reloadButton, reload); renderForm(); reload(); return { dispose() { panel.remove(); } };
}
