import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";
import { buildFormFields } from "../../kernel/admin-form.js";
import { MSE_MENU_SCHEMA } from "../../kernel/schemas/mse-menu.js";

const ESTADOS = ["Published", "Unpublished", "Trashed"];
const ABRIR_EM = ["SameTab", "NewTab"];

// MSE_MENU_SCHEMA ainda contém os 12 campos PT (DEPRECATED, Fase 3) lado a
// lado com os 9 campos em inglês — ver kernel/schemas/mse-menu.js. Esta tela
// só exibe/edita os campos em inglês; o filtro abaixo corta o schema para
// esses 9 nomes (em vez de slice por posição, resiliente a reordenação
// futura do schema).
const MENU_FIELD_NAMES = ["MenuType", "Path", "Level", "Ordering", "Component", "View", "Default", "Target", "Published"];
export const MENU_FORM_FIELDS = buildFormFields(MSE_MENU_SCHEMA).filter((field) => MENU_FIELD_NAMES.includes(field.name));

export function validateMenuValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const alias = String(item.Alias ?? "").trim();
  const estado = String(item.Published ?? "Published");
  const abrirEm = String(item.Target ?? "SameTab");
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!alias || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias)) {
    throw new TypeError("Alias deve usar letras minúsculas, números e hífens.");
  }
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  if (!ABRIR_EM.includes(abrirEm)) throw new TypeError(`Target inválido: ${abrirEm}.`);
  const ordem = item.Ordering === "" || item.Ordering == null ? 0 : Number(item.Ordering);
  const nivel = item.Level === "" || item.Level == null ? 1 : Number(item.Level);
  if (!Number.isInteger(ordem) || ordem < 0) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  if (!Number.isInteger(nivel) || nivel < 1) throw new TypeError("Nível deve ser um inteiro positivo.");
  let params = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(params); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); }
  catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return {
    Title: title, Alias: alias, MenuType: String(item.MenuType ?? "principal"),
    ParentId: item.ParentId === "" || item.ParentId == null ? 0 : Number(item.ParentId),
    Path: String(item.Path ?? alias), Level: nivel, Ordering: ordem,
    Component: String(item.Component ?? ""), View: String(item.View ?? ""),
    ParamsJson: params, Default: Boolean(item.Default), Target: abrirEm, Published: estado
  };
}

function text(document, tag, value = "") { const node = document.createElement(tag); node.textContent = value; return node; }
function input(document, name, value = "") { const node = document.createElement("input"); node.name = name; node.value = value; return node; }
function select(document, name, options, value) { const node = document.createElement("select"); node.name = name; for (const option of options) { const item = document.createElement("option"); item.value = option; item.textContent = option; node.append(item); } node.value = value; return node; }
function bindClick(node, fn) { if (node.addEventListener) node.addEventListener("click", fn); else node.onclick = fn; }
function clear(node) { if (node.replaceChildren) node.replaceChildren(); else if (Array.isArray(node.children)) node.children.length = 0; }
function statusCode(error) { const n = error?.status ?? error?.statusCode; if (Number.isInteger(n)) return n; const m = String(error?.message || "").match(/\b(403|412)\b/); return m ? Number(m[1]) : null; }
function message(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

export function renderMenusEditor({ root, services = {} } = {}) {
  const document = root?.ownerDocument; const client = services.adminClient; const list = services.listIds?.MSEMenu;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__menus";
  const error = text(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  const toolbar = document.createElement("div"); const newButton = text(document, "button", "Novo item"); const reloadButton = text(document, "button", "Recarregar"); toolbar.append(newButton, reloadButton);
  panel.append(text(document, "h2", "Itens de menu"), error, toolbar, tableHost, formHost); root.append(panel);
  let currentId = null; let controls = {};
  const read = () => ({ Title: controls.Title.value, Alias: controls.Alias.value, MenuType: controls.MenuType.value, ParentId: controls.ParentId.value, Path: controls.Path.value, Level: controls.Level.value, Ordering: controls.Ordering.value, Component: controls.Component.value, View: controls.View.value, ParamsJson: controls.ParamsJson.value, Default: controls.Default.checked, Target: controls.Target.value, Published: controls.Published.value });
  function form(item = {}) { clear(formHost); controls = {}; const box = document.createElement("div");
    const fields = [["Título","Title"],["Alias","Alias"],["Tipo de menu","MenuType"],["ParentId","ParentId"],["Caminho","Path"],["Nível","Level"],["Ordem","Ordering"],["Componente","Component"],["Visão","View"],["ParamsJson","ParamsJson"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "Level" ? 1 : name === "ParamsJson" ? "{}" : "")); row.append(controls[name]); box.append(row); }
    controls.Published = select(document, "Published", ESTADOS, item.Published || "Published"); controls.Target = select(document, "Target", ABRIR_EM, item.Target || "SameTab");
    for (const [label, node] of [["Estado", controls.Published],["Abrir em", controls.Target]]) { const row = document.createElement("label"); row.textContent = label; row.append(node); box.append(row); }
    const check = document.createElement("label"); check.textContent = "Item padrão"; controls.Default = document.createElement("input"); controls.Default.type = "checkbox"; controls.Default.checked = Boolean(item.Default); check.append(controls.Default); box.append(check);
    const save = text(document, "button", "Salvar"); const cancel = text(document, "button", "Cancelar"); bindClick(cancel, () => { currentId = null; form(); }); bindClick(save, async () => { error.textContent = ""; try { const values = validateMenuValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; form(); await reload(); } catch (e) { error.textContent = message("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box); }
  function render(items) {
    clear(tableHost);
    const table = document.createElement("table");
    const head = document.createElement("tr");
    for (const heading of ["Título", ...MENU_FORM_FIELDS.map((field) => field.label), "Ações"]) {
      head.append(text(document, "th", heading));
    }
    table.append(head);
    for (const item of items) {
      const row = document.createElement("tr");
      for (const value of [item.Title, item.Alias, item.MenuType, item.ParentId, item.Path, item.Level, item.Ordering, item.Component, item.View, item.ParamsJson, item.Default ? "Sim" : "Não", item.Target, item.Published]) {
        row.append(text(document, "td", String(value ?? "")));
      }
      const actions = document.createElement("td");
      const edit = text(document, "button", "Editar");
      bindClick(edit, () => { currentId = item.Id; form(item); });
      const remove = text(document, "button", "Excluir");
      remove.disabled = Boolean(item.Default);
      bindClick(remove, async () => {
        if (item.Default) { error.textContent = "O item de menu padrão não pode ser excluído."; return; }
        error.textContent = "";
        try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); }
        catch (e) { error.textContent = message("Falha ao excluir", e); }
      });
      actions.append(edit, remove);
      row.append(actions);
      table.append(row);
    }
    tableHost.append(table);
  }  async function reload() { if (!client || !list) { error.textContent = "Client administrativo ou lista MSEMenu não configurado."; return; } try { render(await listAdminItems({ client, list, orderby: "Ordering" })); } catch (e) { error.textContent = message("Falha ao carregar menus", e); } }
  bindClick(newButton, () => { currentId = null; form(); }); bindClick(reloadButton, reload); form(); reload(); return { dispose() { panel.remove(); } };
}
