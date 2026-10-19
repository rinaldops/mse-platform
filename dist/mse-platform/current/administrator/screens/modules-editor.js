import { createAdminItem, deleteAdminItem, listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";

const ESTADOS = ["Publicado", "Despublicado", "Lixeira"];
const ATRIBUICOES = ["Todas", "Nenhuma", "Somente", "Todas exceto"];

export function validateModuleValues(values = {}) {
  const item = values && typeof values === "object" ? values : {};
  const title = String(item.Title ?? "").trim();
  const moduloTipo = String(item.ModuloTipo ?? "").trim();
  const posicao = String(item.Posicao ?? "").trim();
  const estado = String(item.Estado ?? "Publicado");
  const atribuicao = String(item.AtribuicaoMenu ?? "Todas");
  if (!title) throw new TypeError("Título é obrigatório.");
  if (!moduloTipo || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduloTipo)) throw new TypeError("Tipo de módulo deve usar letras minúsculas, números e hífens.");
  if (!posicao || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(posicao)) throw new TypeError("Posição deve usar letras minúsculas, números e hífens.");
  if (!ESTADOS.includes(estado)) throw new TypeError(`Estado inválido: ${estado}.`);
  if (!ATRIBUICOES.includes(atribuicao)) throw new TypeError(`Atribuição de menu inválida: ${atribuicao}.`);
  const ordem = item.Ordem === "" || item.Ordem == null ? 0 : Number(item.Ordem);
  const schemaVersao = item.SchemaVersao === "" || item.SchemaVersao == null ? null : Number(item.SchemaVersao);
  if (!Number.isInteger(ordem) || ordem < 0) throw new TypeError("Ordem deve ser um inteiro não negativo.");
  if (schemaVersao !== null && (!Number.isInteger(schemaVersao) || schemaVersao < 0)) throw new TypeError("Versão do schema deve ser um inteiro não negativo.");
  const publicarEm = item.PublicarEm ? new Date(item.PublicarEm) : null;
  const publicarAte = item.PublicarAte ? new Date(item.PublicarAte) : null;
  if (publicarEm && Number.isNaN(publicarEm.getTime())) throw new TypeError("Publicar em deve ser uma data válida.");
  if (publicarAte && Number.isNaN(publicarAte.getTime())) throw new TypeError("Publicar até deve ser uma data válida.");
  if (publicarEm && publicarAte && publicarAte.getTime() < publicarEm.getTime()) throw new TypeError("Publicar até deve ser maior ou igual a Publicar em.");
  const publicarEmIso = publicarEm ? publicarEm.toISOString() : null;
  const publicarAteIso = publicarAte ? publicarAte.toISOString() : null;  const paramsJson = item.ParamsJson == null || item.ParamsJson === "" ? "{}" : String(item.ParamsJson);
  try { const parsed = JSON.parse(paramsJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); } catch { throw new TypeError("ParamsJson deve conter um objeto JSON válido."); }
  return { Title: title, ModuloTipo: moduloTipo, Posicao: posicao, Ordem: ordem, Estado: estado, PublicarEm: publicarEmIso, PublicarAte: publicarAteIso, MostrarTitulo: Boolean(item.MostrarTitulo), Estilo: String(item.Estilo ?? "").trim(), AtribuicaoMenu: atribuicao, ParamsJson: paramsJson, SchemaVersao: schemaVersao };
}

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function input(document, name, value = "") { const valueNode = document.createElement("input"); valueNode.name = name; valueNode.value = value; return valueNode; }
function select(document, name, options, value) { const valueNode = document.createElement("select"); valueNode.name = name; for (const option of options) { const optionNode = document.createElement("option"); optionNode.value = option; optionNode.textContent = option; valueNode.append(optionNode); } valueNode.value = value; return valueNode; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

export function renderModulesEditor({ root, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSEModulos;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__modules";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const tableHost = document.createElement("div"); const formHost = document.createElement("div");
  const toolbar = document.createElement("div"); const newButton = node(document, "button", "Novo módulo"); const reloadButton = node(document, "button", "Recarregar"); toolbar.append(newButton, reloadButton);
  panel.append(node(document, "h2", "Instâncias de módulo"), error, toolbar, tableHost, formHost); root.append(panel);
  let currentId = null; let controls = {};
  const read = () => ({ Title: controls.Title.value, ModuloTipo: controls.ModuloTipo.value, Posicao: controls.Posicao.value, Ordem: controls.Ordem.value, Estado: controls.Estado.value, PublicarEm: controls.PublicarEm.value, PublicarAte: controls.PublicarAte.value, MostrarTitulo: controls.MostrarTitulo.checked, Estilo: controls.Estilo.value, AtribuicaoMenu: controls.AtribuicaoMenu.value, ParamsJson: controls.ParamsJson.value, SchemaVersao: controls.SchemaVersao.value });
  function renderForm(item = {}) {
    clear(formHost); controls = {};
    const box = document.createElement("div"); box.className = "mse-administrator__form";
    const fields = [["Título", "Title"], ["Tipo de módulo", "ModuloTipo"], ["Posição", "Posicao"], ["Ordem", "Ordem"], ["Publicar em", "PublicarEm"], ["Publicar até", "PublicarAte"], ["Estilo", "Estilo"], ["Parâmetros (JSON)", "ParamsJson"], ["Versão do schema", "SchemaVersao"]];
    for (const [label, name] of fields) { const row = document.createElement("label"); row.textContent = label; controls[name] = input(document, name, item[name] ?? (name === "ParamsJson" ? "{}" : "")); if (name === "PublicarEm" || name === "PublicarAte") controls[name].type = "datetime-local"; row.append(controls[name]); box.append(row); }
    controls.Estado = select(document, "Estado", ESTADOS, item.Estado || "Publicado"); controls.AtribuicaoMenu = select(document, "AtribuicaoMenu", ATRIBUICOES, item.AtribuicaoMenu || "Todas");
    for (const [label, control] of [["Estado", controls.Estado], ["Atribuição de menu", controls.AtribuicaoMenu]]) { const row = document.createElement("label"); row.textContent = label; row.append(control); box.append(row); }
    const titleRow = document.createElement("label"); titleRow.textContent = "Mostrar título"; controls.MostrarTitulo = document.createElement("input"); controls.MostrarTitulo.type = "checkbox"; controls.MostrarTitulo.checked = Boolean(item.MostrarTitulo); titleRow.append(controls.MostrarTitulo); box.append(titleRow);
    const save = node(document, "button", "Salvar"); const cancel = node(document, "button", "Cancelar"); bind(cancel, () => { currentId = null; renderForm(); });
    bind(save, async () => { error.textContent = ""; try { const values = validateModuleValues(read()); if (currentId == null) await createAdminItem({ client, list, values }); else await updateAdminItem({ client, list, id: currentId, values }); currentId = null; renderForm(); await reload(); } catch (e) { error.textContent = errorText("Falha ao salvar", e); } }); box.append(save, cancel); formHost.append(box);
  }
  function renderTable(items) { clear(tableHost); const table = document.createElement("table"); const header = document.createElement("tr"); for (const label of ["Título", "Tipo", "Posição", "Ordem", "Estado", "Atribuição", "Ações"]) header.append(node(document, "th", label)); table.append(header); for (const item of items) { const row = document.createElement("tr"); for (const value of [item.Title, item.ModuloTipo, item.Posicao, item.Ordem, item.Estado, item.AtribuicaoMenu]) row.append(node(document, "td", String(value ?? ""))); const actions = document.createElement("td"); const edit = node(document, "button", "Editar"); bind(edit, () => { currentId = item.Id; renderForm(item); }); const remove = node(document, "button", "Excluir"); bind(remove, async () => { error.textContent = ""; try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); } catch (e) { error.textContent = errorText("Falha ao excluir", e); } }); actions.append(edit, remove); row.append(actions); table.append(row); } tableHost.append(table); }
  async function reload() { if (!client || !list) { error.textContent = "Client administrativo ou lista MSEModulos não configurado."; return; } try { renderTable(await listAdminItems({ client, list, select: ["Id", "Title", "ModuloTipo", "Posicao", "Ordem", "Estado", "PublicarEm", "PublicarAte", "MostrarTitulo", "Estilo", "AtribuicaoMenu", "ParamsJson", "SchemaVersao"], orderby: "Posicao" })); } catch (e) { error.textContent = errorText("Falha ao carregar módulos", e); } }
  bind(newButton, () => { currentId = null; renderForm(); }); bind(reloadButton, reload); renderForm(); reload(); return { dispose() { panel.remove(); } };
}
