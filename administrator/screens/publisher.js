/**
 * Tela mínima do Publicador (estilo Joomla! `com_content`) para o Mini Joomla!
 *
 * Escopo deliberadamente mínimo para MVP:
 * - Lista artigos (SharePoint list) e permite criar/editar 1 item.
 * - Usa `kernel/admin-data.js` para CRUD com ETag.
 * - Sanitiza HTML do corpo antes de persistir.
 * - Trata erros 403 (permissão) e 412 (conflito/ETag).
 *
 * Contrato de `services`:
 * - `services.adminClient`: client REST com `getListItems/createListItem/getListItem/updateListItem`.
 * - `services.listIds`: mapa de listas resolvidas `{ CAMAPPublicacoes?: {listId}, ... }`.
 * - `services.sanitizeHtml?(html, {documentImpl, baseUrl}): string`: (opcional) injeta sanitização para testes.
 */

import {
  listAdminItems,
  createAdminItem,
  updateAdminItem
} from "../../kernel/admin-data.js";

import { sanitizeRichText } from "../../core/rich-text.js";

const ESTADOS = ["Publicado", "Despublicado", "Arquivado", "Lixeira"];
const DEFAULT_ESTADO = "Despublicado";

function clearChildren(node) {
  if (typeof node?.replaceChildren === "function") {
    node.replaceChildren();
    return;
  }
  if (Array.isArray(node?.children)) {
    node.children.length = 0;
  }
}

function el(document, tag, { className, text, type, name, value } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  if (type) node.type = type;
  if (name) node.name = name;
  if (value !== undefined) node.value = value;
  return node;
}

function setClick(node, handler) {
  // Compatível com DOM fake dos testes (usa `onclick` se não houver addEventListener).
  if (typeof node?.addEventListener === "function") node.addEventListener("click", handler);
  else node.onclick = handler;
}

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function formatDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resolvePublisherList(listIds) {
  return (
    listIds?.CAMAPPublicacoes
    || listIds?.MSEPublicacoes
    || listIds?.Publicacoes
    || listIds?.publicacoes
    || listIds?.publisher
    || null
  );
}

function safeString(value) {
  return value == null ? "" : String(value);
}

function normalizeBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  const s = String(value || "").toLowerCase();
  return s === "true" || s === "1" || s === "sim" || s === "yes";
}

function getStatusCode(error) {
  const candidate = error?.status
    ?? error?.statusCode
    ?? error?.response?.status
    ?? error?.response?.statusCode
    ?? error?.cause?.status
    ?? error?.cause?.statusCode;

  if (typeof candidate === "number") return candidate;
  const match = String(error?.message || "").match(/\b(403|412)\b/);
  return match ? Number(match[1]) : null;
}

function formatUserError(prefix, error) {
  const code = getStatusCode(error);
  if (code === 403) return `${prefix}: sem permissão para alterar esta lista (403).`;
  if (code === 412) return `${prefix}: conflito de edição (412). Recarregue e tente novamente.`;
  return `${prefix}: ${error?.message || "erro desconhecido"}.`;
}

function defaultSanitizeHtml(html, { documentImpl, baseUrl } = {}) {
  // Falha de sanitização deve bloquear a gravação: nunca persistir HTML bruto
  // como fallback, pois isso invalidaria o contrato CorpoHtmlSeguroV1.
  return sanitizeRichText(String(html ?? ""), {
    documentImpl,
    baseUrl: baseUrl ?? (globalThis.location?.href ?? "https://localhost/")
  });
}

/**
 * @param {{ root: Element, services?: { adminClient?: object, listIds?: Record<string, {listId:string}>, sanitizeHtml?: Function } }} options
 * @returns {{ dispose(): void }}
 */
export function renderPublisherScreen({ root, services = {} } = {}) {
  const document = root?.ownerDocument;
  if (!document) throw new TypeError("root é obrigatório.");

  const panel = el(document, "section", { className: "mse-administrator__panel mse-administrator__publisher" });
  const title = el(document, "h1", { text: "Publicador" });
  const hint = el(document, "p", { className: "mse-administrator__hint", text: "Gerencie artigos (lista SharePoint) com ETag." });
  const error = el(document, "p", { className: "mse-administrator__error", text: "" });
  const toolbar = el(document, "div", { className: "mse-administrator__toolbar" });
  const btnNew = el(document, "button", { text: "Novo artigo" });
  const btnReload = el(document, "button", { text: "Recarregar" });
  toolbar.append(btnNew, btnReload);

  const listContainer = el(document, "div", { className: "mse-administrator__publisher-list" });
  const formContainer = el(document, "div", { className: "mse-administrator__publisher-form" });

  panel.append(title, hint, error, toolbar, listContainer, formContainer);
  root.append(panel);

  const adminClient = services.adminClient;
  const list = resolvePublisherList(services.listIds);
  const sanitizeHtml = typeof services.sanitizeHtml === "function" ? services.sanitizeHtml : defaultSanitizeHtml;

  if (!adminClient || typeof adminClient.getListItems !== "function") {
    error.textContent = "Não foi possível carregar o Publicador: nenhum client administrativo foi configurado.";
    return { dispose() { panel.remove(); } };
  }
  if (!list) {
    error.textContent = "Não foi possível carregar o Publicador: nenhuma lista de Publicações foi configurada (CAMAPPublicacoes/MSEPublicacoes).";
    return { dispose() { panel.remove(); } };
  }

  let currentId = null;
  const fields = {
    Title: el(document, "input", { type: "text", name: "Title" }),
    Slug: el(document, "input", { type: "text", name: "Slug" }),
    Resumo: el(document, "textarea", { name: "Resumo" }),
    CorpoHtmlSeguroV1: el(document, "textarea", { name: "CorpoHtmlSeguroV1" }),
    EstadoEditorial: (() => {
      const select = el(document, "select", { name: "EstadoEditorial" });
      for (const estado of ESTADOS) {
        const opt = el(document, "option", { text: estado });
        opt.value = estado;
        select.append(opt);
      }
      select.value = DEFAULT_ESTADO;
      return select;
    })(),
    DataPublicacao: el(document, "input", { type: "datetime-local", name: "DataPublicacao" }),
    DataExpiracao: el(document, "input", { type: "datetime-local", name: "DataExpiracao" }),
    Destaque: el(document, "input", { type: "checkbox", name: "Destaque" }),
    OrdemDestaque: el(document, "input", { type: "number", name: "OrdemDestaque" }),
    CategoriaTexto: el(document, "input", { type: "text", name: "CategoriaTexto" })
  };

  function clearForm() {
    fields.Title.value = "";
    fields.Slug.value = "";
    fields.Resumo.value = "";
    fields.CorpoHtmlSeguroV1.value = "";
    fields.EstadoEditorial.value = DEFAULT_ESTADO;
    fields.DataPublicacao.value = "";
    fields.DataExpiracao.value = "";
    fields.Destaque.checked = false;
    fields.OrdemDestaque.value = "";
    fields.CategoriaTexto.value = "";
  }

  function fillFormFromItem(item) {
    fields.Title.value = safeString(item?.Title);
    fields.Slug.value = safeString(item?.Slug);
    fields.Resumo.value = safeString(item?.Resumo);
    fields.CorpoHtmlSeguroV1.value = safeString(item?.CorpoHtmlSeguroV1);

    const estado = safeString(item?.EstadoEditorial || DEFAULT_ESTADO);
    fields.EstadoEditorial.value = ESTADOS.includes(estado) ? estado : DEFAULT_ESTADO;

    fields.DataPublicacao.value = formatDateTimeLocal(item?.DataPublicacao);
    fields.DataExpiracao.value = formatDateTimeLocal(item?.DataExpiracao);

    fields.Destaque.checked = normalizeBoolean(item?.Destaque);
    fields.OrdemDestaque.value = item?.OrdemDestaque == null ? "" : String(item.OrdemDestaque);
    fields.CategoriaTexto.value = safeString(item?.CategoriaTexto);
  }

  function buildForm() {
    clearChildren(formContainer);
    const h2 = el(document, "h2", { text: currentId ? `Editar artigo #${currentId}` : "Novo artigo" });
    const form = el(document, "div", { className: "mse-administrator__form" });

    const addRow = (labelText, fieldNode) => {
      const row = el(document, "div", { className: "mse-administrator__field" });
      const label = el(document, "label", { text: labelText });
      row.append(label, fieldNode);
      form.append(row);
    };

    addRow("Título", fields.Title);
    addRow("Slug", fields.Slug);
    addRow("Resumo", fields.Resumo);
    addRow("Corpo (HTML seguro)", fields.CorpoHtmlSeguroV1);
    addRow("Estado editorial", fields.EstadoEditorial);
    addRow("Publicar em", fields.DataPublicacao);
    addRow("Publicar até", fields.DataExpiracao);
    addRow("Destaque", fields.Destaque);
    addRow("Ordem destaque", fields.OrdemDestaque);
    addRow("Categoria", fields.CategoriaTexto);

    const actions = el(document, "div", { className: "mse-administrator__actions" });
    const btnSave = el(document, "button", { text: "Salvar" });
    const btnCancel = el(document, "button", { text: "Cancelar" });
    actions.append(btnSave, btnCancel);
    form.append(actions);

    setClick(btnCancel, () => {
      currentId = null;
      clearForm();
      buildForm();
    });

    setClick(btnSave, async () => {
      error.textContent = "";
      try {
        const values = {
          Title: safeString(fields.Title.value).trim(),
          Slug: safeString(fields.Slug.value).trim(),
          Resumo: safeString(fields.Resumo.value),
          CorpoHtmlSeguroV1: safeString(fields.CorpoHtmlSeguroV1.value),
          EstadoEditorial: safeString(fields.EstadoEditorial.value) || DEFAULT_ESTADO,
          DataPublicacao: parseDateInput(fields.DataPublicacao.value),
          DataExpiracao: parseDateInput(fields.DataExpiracao.value),
          Destaque: !!fields.Destaque.checked,
          OrdemDestaque: fields.OrdemDestaque.value === "" ? null : Number(fields.OrdemDestaque.value),
          CategoriaTexto: safeString(fields.CategoriaTexto.value).trim()
        };

        if (!values.Title) throw new Error("Título (Title) é obrigatório.");
        if (!ESTADOS.includes(values.EstadoEditorial)) throw new Error(`Estado editorial inválido: ${values.EstadoEditorial}.`);

        if (values.DataPublicacao && values.DataExpiracao) {
          const pub = new Date(values.DataPublicacao).getTime();
          const exp = new Date(values.DataExpiracao).getTime();
          if (!Number.isNaN(pub) && !Number.isNaN(exp) && exp < pub) {
            throw new Error("Data de expiração deve ser maior ou igual à data de publicação.");
          }
        }

        // Sanitiza apenas o campo HTML, mantendo o resto como valores literais.
        values.CorpoHtmlSeguroV1 = sanitizeHtml(values.CorpoHtmlSeguroV1, {
          documentImpl: document,
          baseUrl: globalThis.location?.href ?? "https://localhost/"
        });

        if (currentId) {
          await updateAdminItem({ client: adminClient, list, id: currentId, values });
        } else {
          await createAdminItem({ client: adminClient, list, values });
        }
        await reload();
        currentId = null;
        clearForm();
        buildForm();
      } catch (e) {
        error.textContent = formatUserError("Falha ao salvar", e);
      }
    });

    formContainer.append(h2, form);
  }

  function renderTable(items) {
    clearChildren(listContainer);
    const table = el(document, "table", { className: "mse-administrator__table" });
    const thead = el(document, "thead");
    const trh = el(document, "tr");
    for (const labelText of ["Id", "Título", "Slug", "Estado", "Destaque", "Categoria", "Ações"]) {
      trh.append(el(document, "th", { text: labelText }));
    }
    thead.append(trh);
    const tbody = el(document, "tbody");

    for (const item of items) {
      const tr = el(document, "tr");
      tr.append(
        el(document, "td", { text: safeString(item?.Id) }),
        el(document, "td", { text: safeString(item?.Title) }),
        el(document, "td", { text: safeString(item?.Slug) }),
        el(document, "td", { text: safeString(item?.EstadoEditorial) }),
        el(document, "td", { text: item?.Destaque ? "Sim" : "" }),
        el(document, "td", { text: safeString(item?.CategoriaTexto) })
      );
      const actions = el(document, "td");
      const btnEdit = el(document, "button", { text: "Editar" });
      setClick(btnEdit, () => {
        currentId = item?.Id;
        fillFormFromItem(item);
        buildForm();
      });
      actions.append(btnEdit);
      tr.append(actions);
      tbody.append(tr);
    }
    table.append(thead, tbody);
    listContainer.append(table);
  }

  async function reload() {
    error.textContent = "";
    try {
      const items = await listAdminItems({
        client: adminClient,
        list,
        select: [
          "Id",
          "Title",
          "Slug",
          "Resumo",
          "CorpoHtmlSeguroV1",
          "EstadoEditorial",
          "DataPublicacao",
          "DataExpiracao",
          "Destaque",
          "OrdemDestaque",
          "CategoriaTexto"
        ],
        orderby: "Id desc"
      });
      renderTable(Array.isArray(items) ? items : []);
    } catch (e) {
      error.textContent = formatUserError("Falha ao carregar publicações", e);
      clearChildren(listContainer);
    }
  }

  setClick(btnReload, () => reload());
  setClick(btnNew, () => {
    currentId = null;
    clearForm();
    buildForm();
  });

  // Render inicial.
  clearForm();
  buildForm();
  reload();

  return {
    dispose() {
      panel.remove();
    }
  };
}
