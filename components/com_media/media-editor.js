/**
 * Editor CRUD do Administrator para `option=com_media` — gerenciador de
 * mídia sobre a biblioteca de documentos `MSEMedia` (`template: 101`, ver
 * `kernel/schemas/mse-media.js`). Mesmo esqueleto dos demais
 * `*-editor.js` do Administrator (`components/com_modules/modules-editor.js`,
 * `components/com_extensions/extensions-editor.js`): toolbar unificado
 * (`createAdministratorToolbar`) + tabela `mse-administrator__table` +
 * tratamento de erro 403/412 idêntico.
 *
 * Diferente das listas genéricas (MSEModules/MSEExtensions/MSEMenu), não há
 * formulário de criação: um novo item nasce exclusivamente do envio de um
 * arquivo (`<input type="file">` no toolbar, lendo `file.arrayBuffer()` e
 * delegando a `kernel/admin-data.js#uploadAdminFile`, que por sua vez
 * delega a `core/rest.js#uploadFile`). Nome/tamanho/URL do arquivo vêm de
 * campos nativos do SharePoint (`FileLeafRef`/`FileRef`), não de um
 * formulário preenchido à mão.
 */
import { listAdminItems, deleteAdminItem, uploadAdminFile } from "../../kernel/admin-data.js";
import { createAdministratorToolbar } from "../com_cpanel/administrator-toolbar.js";

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function bindChange(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("change", handler); else nodeValue.onchange = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

export function renderMediaEditor({ root, route, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSEMedia;
  if (!document) throw new TypeError("root é obrigatório.");

  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel mse-administrator__media";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const success = node(document, "p"); success.className = "mse-administrator__success";
  const tableHost = document.createElement("div");
  let searchTerm = "";
  let loadedItems = [];

  const toolbar = createAdministratorToolbar({
    root: panel,
    secondaryActions: [{ label: "Recarregar", onClick: () => reload() }],
    search: { placeholder: "Buscar arquivo...", onInput: (value) => { searchTerm = value; renderTable(loadedItems); } }
  });

  // `<input type="file">` de envio — não é uma "ação" de botão do toolbar
  // (createAdministratorToolbar só cobre botão+busca), por isso é anexado
  // diretamente ao elemento do toolbar já montado, mesmo <div class=
  // "mse-administrator__toolbar"> reaproveitado pelas demais telas.
  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  bindChange(uploadInput, () => handleUpload());
  toolbar.toolbarElement.append(uploadInput);

  panel.append(node(document, "h2", "Arquivos"), error, success, tableHost);
  root.append(panel);

  async function handleUpload() {
    const file = uploadInput.files && uploadInput.files[0];
    if (!file) return;
    error.textContent = ""; success.textContent = "";
    try {
      const content = await file.arrayBuffer();
      await uploadAdminFile({ client, list, fileName: file.name, content, contentType: file.type || undefined });
      uploadInput.value = "";
      success.textContent = `Arquivo "${file.name}" enviado.`;
      await reload();
    } catch (e) {
      error.textContent = errorText("Falha ao enviar arquivo", e);
    }
  }

  // Copia a URL do arquivo para a área de transferência — quando
  // `navigator.clipboard` está indisponível (ou falha), cai no fallback de
  // só EXIBIR a URL em `success` para cópia manual (não há `window.prompt`
  // em nenhuma outra tela do Administrator; mesmo princípio de "nunca
  // travar a tela por causa de uma API opcional do navegador" de
  // `administrator-shell.js#readCollapsedState`).
  async function copyUrl(url) {
    error.textContent = "";
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (clipboard && typeof clipboard.writeText === "function") {
      try {
        await clipboard.writeText(url);
        success.textContent = "URL copiada para a área de transferência.";
        return;
      } catch {
        // cai no fallback de exibição abaixo.
      }
    }
    success.textContent = `Copie manualmente: ${url}`;
  }

  function renderTable(items) {
    clear(tableHost);
    const term = searchTerm.trim().toLowerCase();
    const visible = term
      ? items.filter((item) => [item.FileLeafRef, item.AltText, item.Description].some((value) => String(value ?? "").toLowerCase().includes(term)))
      : items;
    const table = document.createElement("table");
    table.className = "mse-administrator__table";
    const header = document.createElement("tr");
    for (const label of ["Nome", "URL", "Alt", "Descrição", "Ações"]) header.append(node(document, "th", label));
    table.append(header);
    for (const item of visible) {
      const row = document.createElement("tr");
      const url = String(item.FileRef ?? "");
      for (const value of [item.FileLeafRef, url, item.AltText, item.Description]) row.append(node(document, "td", String(value ?? "")));
      const actions = document.createElement("td");
      const copy = node(document, "button", "Copiar URL");
      bind(copy, () => copyUrl(url));
      const remove = node(document, "button", "Excluir");
      bind(remove, async () => {
        error.textContent = ""; success.textContent = "";
        try { await deleteAdminItem({ client, list, id: item.Id }); await reload(); }
        catch (e) { error.textContent = errorText("Falha ao excluir", e); }
      });
      actions.append(copy, remove);
      row.append(actions);
      table.append(row);
    }
    tableHost.append(table);
  }

  async function reload() {
    if (!client || !list) { error.textContent = "Client administrativo ou lista MSEMedia não configurado."; return; }
    try {
      const items = await listAdminItems({ client, list, select: ["Id", "FileLeafRef", "FileRef", "AltText", "Description"], orderby: "FileLeafRef" });
      loadedItems = items;
      renderTable(items);
    } catch (e) {
      error.textContent = errorText("Falha ao carregar mídia", e);
    }
  }

  reload();
  return { dispose() { toolbar.dispose(); panel.remove(); } };
}
