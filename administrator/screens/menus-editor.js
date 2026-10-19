import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";
import { buildFormFields } from "../../kernel/admin-form.js";
import { MSE_MENU_SCHEMA } from "../../kernel/schemas/mse-menu.js";

const ESTADOS = ["Publicado", "Despublicado", "Lixeira"];
const ABRIR_EM = ["MesmaAba", "NovaAba"];

export function validateMenuValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const alias = String(item.Alias ?? "").trim();
  const estado = String(item.Estado ?? "Publicado");
  const abrirEm = String(item.AbrirEm ?? "MesmaAba");
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!alias || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias)) {
    throw new TypeError("Alias deve usar letras minúsculas, números e hífens.");
  }
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  if (!ABRIR_EM.includes(abrirEm)) throw new TypeError(`AbrirEm inválido: ${abrirEm}.`);
  const ordem = item.Ordem === "" || item.Ordem == null ? 0 : Number(item.Ordem);
  const nivel = item.Nivel === "" || item.Nivel == null ? 1 : Number(item.Nivel);
  if (!Number.isInteger(ordem) || ordem < 0) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  if (!Number.isInteger(nivel) || nivel < 1) throw new TypeError("Nível deve ser um inteiro positivo.");
  let params = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(params); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); }
  catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return {
    Title: title, Alias: alias, TipoMenu: String(item.TipoMenu ?? "principal"),
    ParentId: item.ParentId === "" || item.ParentId == null ? 0 : Number(item.ParentId),
    Caminho: String(item.Caminho ?? alias), Nivel: nivel, Ordem: ordem,
    Componente: String(item.Componente ?? ""), Visao: String(item.Visao ?? ""),
    ParamsJson: params, Padrao: Boolean(item.Padrao), AbrirEm: abrirEm, Estado: estado
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
  const read = () => ({ Title: controls.Title.value, Alias: controls.Alias.value, TipoMenu: controls.TipoMenu.value, ParentId: controls.ParentId.value, Caminho: controls.Caminho.value, Nivel: controls.Nivel.value, Ordem: controls.Ordem.value, Componente: controls.Componente.value, Visao: controls.Visao.value, ParamsJson: controls.ParamsJson.value, Padrao: controls.Padrao.checked, AbrirEm: controls.AbrirEm.value, Estado: controls.Estado.value });
  function form(item = {}) { clear(formHost); controls = {}; const box = document.createElement("div");
    const fields = [["Título","Title"],["Alias","Alias"],["Tipo de menu","TipoMenu"],["ParentId","ParentId"],["Caminho","Caminho"],["Nível","Nivel"],["Ordem","Ordem"],["Componente","Componente"],["Visão","Visao"],["ParamsJson","ParamsJson"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "Nivel" ? 1 : name === "ParamsJson" ? "{}" : "")); row.append(controls[name]); box.append(row); }
    controls.Estado = select(document, "Estado", ESTADOS, item.Estado || "Publicado"); controls.AbrirEm = select(document, "AbrirEm", ABRIR_EM, item.AbrirEm || "MesmaAba");
    for (const [label, node] of [["Estado", controls.Estado],["Abrir em", controls.AbrirEm]]) { const row = document.createElement("label"); row.textContent = label; row.append(node); box.append(row); }
    const check = document.createElement("label"); check.textContent = "Item padrão"; controls.Padrao = document.createElement("input"); controls.Padrao.type = "checkbox"; controls.Padrao.checked = Boolean(item.Padrao); check.append(controls.Padrao); box.append(check);
    const save = text(document, "button", "Salvar"); const cancel = text(document, "button", "Cancelar"); bindClick(cancel, () => { currentId = null; form(); }); bindClick(save, async () => { error.textContent = ""; try { const values = validateMenuValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; form(); await reload(); } catch (e) { error.textContent = message("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box); }
  function render(items) {
    clear(tableHost);
    const table = document.createElement("table");
    const head = document.createElement("tr");
    for (const heading of ["Título", ...buildFormFields(MSE_MENU_SCHEMA).map((field) => field.label), "Ações"]) {
      head.append(text(document, "th", heading));
    }
    table.append(head);
    for (const item of items) {
      const row = document.createElement("tr");
      for (const value of [item.Title, item.Alias, item.TipoMenu, item.ParentId, item.Caminho, item.Nivel, item.Ordem, item.Componente, item.Visao, item.ParamsJson, item.Padrao ? "Sim" : "Não", item.AbrirEm, item.Estado]) {
        row.append(text(document, "td", String(value ?? "")));
      }
      const actions = document.createElement("td");
      const edit = text(document, "button", "Editar");
      bindClick(edit, () => { currentId = item.Id; form(item); });
      const remove = text(document, "button", "Excluir");
      remove.disabled = Boolean(item.Padrao);
      bindClick(remove, async () => {
        if (item.Padrao) { error.textContent = "O item de menu padrão não pode ser excluído."; return; }
        error.textContent = "";
        try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); }
        catch (e) { error.textContent = message("Falha ao excluir", e); }
      });
      actions.append(edit, remove);
      row.append(actions);
      table.append(row);
    }
    tableHost.append(table);
  }  async function reload() { if (!client || !list) { error.textContent = "Client administrativo ou lista MSEMenu não configurado."; return; } try { render(await listAdminItems({ client, list, orderby: "Ordem" })); } catch (e) { error.textContent = message("Falha ao carregar menus", e); } }
  bindClick(newButton, () => { currentId = null; form(); }); bindClick(reloadButton, reload); form(); reload(); return { dispose() { panel.remove(); } };
}
