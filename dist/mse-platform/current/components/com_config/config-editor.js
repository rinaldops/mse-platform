import { createAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";

/**
 * Editor CRUD de `MSEConfiguracoes` (configuração global/por instância/por
 * extensão do site) para `option=com_config`.
 *
 * Fase 3b da normalização Joomla! (23/10/2026,
 * `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.8): os 8 campos com consumidor
 * real confirmado em `core/configuration-store.js#loadPublished`
 * (`Escopo`/`Modulo`/`Tema`/`ConfiguracaoJson`/`Estado`/`Ativo`/
 * `ExtensaoElemento`/`Layout`) foram traduzidos para inglês
 * (`Scope`/`Module`/`Theme`/`ConfigurationJson`/`State`/`Active`/
 * `ExtensionElement`/`Layout`, este último já era neutro — só a choice
 * `Herdar` ganhou a equivalente `Inherit`) e é o que este editor lê/grava
 * agora. Os 4 campos restantes (`TipoInstancia`/`VersaoConfiguracao`/
 * `VersaoSettings`/`VersaoModulo`) continuam em português — sem consumidor
 * confirmado nesta rodada, ver `docs/CONVENCAO-JOOMLA.md` §5. Os equivalentes
 * PT dos 8 campos migrados (`Escopo`/`Modulo`/`Tema`/`ConfiguracaoJson`/
 * `Estado`/`Ativo`/`ExtensaoElemento`) continuam vivos no schema real
 * (`core/provisioning.js#CONFIGURATION_LIST_SCHEMA`, gravados lado a lado
 * pelo próprio `provisioning.js`), mas este editor não os lê nem exibe mais.
 *
 * `VersaoConfiguracao` não é editável pela UI: é incrementada pelo próprio
 * `core/provisioning.js#updateConfigurationItem` a cada escrita real — aqui
 * usamos o CRUD genérico de `kernel/admin-data.js` (mesmo client REST
 * simples dos outros editores), então a versão é só exibida/mantida como
 * está, exceto no primeiro registro (padrão 1).
 */

const ESCOPOS = ["Global", "Instance", "Extension"];
const TIPOS_INSTANCIA = ["Full", "Summary"];
const LAYOUTS = ["Herdar", "Contained", "FullBleed", "Inherit"];
const ESTADOS = ["Draft", "Published"];

export function validateConfigurationValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const chave = String(item.Title ?? "").trim();
  const escopo = String(item.Scope ?? "Instance");
  const modulo = String(item.Module ?? "").trim();
  const tipoInstancia = String(item.TipoInstancia ?? "Full");
  const layout = String(item.Layout ?? "Herdar");
  const estado = String(item.State ?? "Draft");
  const extensionElement = String(item.ExtensionElement ?? "").trim();
  if (!chave || !/^[a-z0-9][a-z0-9-]{0,127}$/i.test(chave)) throw new TypeError("Chave deve usar letras, números e hífens.");
  if (!ESCOPOS.includes(escopo)) throw new TypeError(`Escopo inválido: ${escopo}.`);
  if (!TIPOS_INSTANCIA.includes(tipoInstancia)) throw new TypeError(`Tipo de instância inválido: ${tipoInstancia}.`);
  if (!LAYOUTS.includes(layout)) throw new TypeError(`Layout inválido: ${layout}.`);
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  if (escopo === "Instance" && !modulo) throw new TypeError("Módulo é obrigatório para escopo Instance.");
  if (escopo === "Extension" && !extensionElement) throw new TypeError("Elemento da extensão é obrigatório para escopo Extension.");
  if (escopo === "Global" && chave.toLowerCase() !== "global") throw new TypeError("O registro Global deve usar a chave global.");
  const configurationJson = item.ConfigurationJson == null || item.ConfigurationJson === "" ? "{}" : String(item.ConfigurationJson);
  try { const parsed = JSON.parse(configurationJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("Configuração JSON deve conter um objeto válido."); }
  const versaoConfiguracao = Number(item.VersaoConfiguracao) > 0 ? Number(item.VersaoConfiguracao) : 1;
  const versaoSettings = Number(item.VersaoSettings) > 0 ? Number(item.VersaoSettings) : 1;
  if (!Number.isInteger(versaoConfiguracao) || versaoConfiguracao < 1) throw new TypeError("Versão da configuração deve ser um inteiro positivo.");
  if (!Number.isInteger(versaoSettings) || versaoSettings < 1) throw new TypeError("Versão dos settings deve ser um inteiro positivo.");
  return {
    Title: chave,
    Scope: escopo,
    Module: escopo === "Instance" ? modulo : null,
    TipoInstancia: tipoInstancia,
    Layout: layout,
    Theme: String(item.Theme ?? "").trim() || null,
    ConfigurationJson: configurationJson,
    VersaoConfiguracao: versaoConfiguracao,
    VersaoSettings: versaoSettings,
    VersaoModulo: String(item.VersaoModulo ?? "").trim() || null,
    State: estado,
    Active: item.Active !== false,
    ExtensionElement: escopo === "Extension" ? extensionElement : null
  };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

const ACTIVATE_TASK = "config.activate";
const DEACTIVATE_TASK = "config.deactivate";

export function renderConfigurationEditor({ root, route, services = {} } = {}) {
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
  // `route.task`/`route.id` só são aplicados uma vez, no primeiro
  // carregamento — mesmo padrão de components/com_templates/templates-editor.js.
  let pendingTask = (route?.task === ACTIVATE_TASK || route?.task === DEACTIVATE_TASK) && route.id != null
    ? { task: route.task, id: route.id }
    : null;
  async function toggleActive(item, desiredActive) {
    error.textContent = "";
    try { await updateAdminItem({ client, list, id: item.Id, values: { Active: desiredActive } }); await reload(); }
    catch (e) { error.textContent = errorText("Falha ao alternar configuração", e); }
  }
  const read = () => ({ Title: controls.Title.value, Scope: controls.Scope.value, Module: controls.Module.value, TipoInstancia: controls.TipoInstancia.value, Layout: controls.Layout.value, Theme: controls.Theme.value, ConfigurationJson: controls.ConfigurationJson.value, VersaoConfiguracao: controls.VersaoConfiguracao.value, VersaoSettings: controls.VersaoSettings.value, VersaoModulo: controls.VersaoModulo.value, State: controls.State.value, Active: controls.Active.checked, ExtensionElement: controls.ExtensionElement.value });
  function renderForm(item = {}) {
    clear(formHost); controls = {};
    const box = document.createElement("div"); box.className = "mse-administrator__form";
    const fields = [["Chave", "Title"], ["Módulo", "Module"], ["Elemento da extensão", "ExtensionElement"], ["Tema", "Theme"], ["Configuração (JSON)", "ConfigurationJson"], ["Versão da configuração", "VersaoConfiguracao"], ["Versão dos settings", "VersaoSettings"], ["Versão do módulo", "VersaoModulo"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ConfigurationJson" ? "{}" : name === "VersaoConfiguracao" || name === "VersaoSettings" ? "1" : "")); row.append(controls[name]); box.append(row); }
    controls.Scope = select(document, "Scope", ESCOPOS, item.Scope || "Instance");
    controls.TipoInstancia = select(document, "TipoInstancia", TIPOS_INSTANCIA, item.TipoInstancia || "Full");
    controls.Layout = select(document, "Layout", LAYOUTS, item.Layout || "Herdar");
    controls.State = select(document, "State", ESTADOS, item.State || "Draft");
    for (const [label, control] of [["Escopo", controls.Scope], ["Tipo de instância", controls.TipoInstancia], ["Layout", controls.Layout], ["Estado", controls.State]]) { const row = document.createElement("label"); row.textContent = label; row.append(control); box.append(row); }
    const activeRow = document.createElement("label"); activeRow.textContent = "Ativo"; controls.Active = document.createElement("input"); controls.Active.type = "checkbox"; controls.Active.checked = item.Active !== false; activeRow.append(controls.Active); box.append(activeRow);
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; renderForm(); });
    bind(save, async () => { error.textContent = ""; try { const values = validateConfigurationValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; renderForm(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box);
  }
  function renderTable(items) { clear(tableHost); const table = document.createElement("table"); const header = document.createElement("tr"); for (const label of ["Chave", "Escopo", "Módulo", "Tema", "Estado", "Ativo", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of items) { const row = document.createElement("tr"); for (const value of [item.Title, item.Scope, item.Module, item.Theme]) row.append(node(document, "td", String(value ?? ""))); const stateCell = node(document, "td", String(item.State ?? "")); stateCell.className = `mse-administrator__status-cell ${item.State === "Published" ? "mse-administrator__status-cell--ok" : "mse-administrator__status-cell--muted"}`; const activeCell = node(document, "td", item.Active ? "Sim" : "Não"); activeCell.className = `mse-administrator__status-cell ${item.Active ? "mse-administrator__status-cell--ok" : "mse-administrator__status-cell--muted"}`; row.append(stateCell, activeCell); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; renderForm(item); }); const toggle = node(document, "button", item.Active ? "Desativar" : "Ativar"); bind(toggle, () => toggleActive(item, !item.Active)); actions.append(edit, toggle); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() {
    if (!client || !list) { error.textContent = "Client administrativo ou lista MSEConfiguracoes não configurado."; return; }
    try {
      const items = await listAdminItems({ client, list, select: ["Id", "Title", "Scope", "Module", "TipoInstancia", "Layout", "Theme", "ConfigurationJson", "VersaoConfiguracao", "VersaoSettings", "VersaoModulo", "State", "Active", "ExtensionElement"], orderby: "Title" });
      renderTable(items);
      if (pendingTask != null) {
        const { task, id } = pendingTask;
        pendingTask = null;
        const target = items.find((item) => item.Id === id);
        const desiredActive = task === ACTIVATE_TASK;
        if (target && Boolean(target.Active) !== desiredActive) await toggleActive(target, desiredActive);
      }
    } catch (e) { error.textContent = errorText("Falha ao carregar configurações", e); }
  }
  bind(newButton, () => { currentId = null; renderForm(); }); bind(reloadButton, reload); renderForm(); reload(); return { dispose() { panel.remove(); } };
}
