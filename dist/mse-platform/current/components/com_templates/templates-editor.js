/**
 * Editor da lista MSETemplateStyles (`option=com_templates`) — tela do
 * Administrator análoga à "Templates" do Joomla! real (`com_templates`):
 * lista os templates instalados (uma linha por estilo, `ClientId="Site"`
 * nesta rodada — ver `kernel/schemas/mse-template-styles.js`) e permite
 * marcar um deles como o estilo ativo-padrão ("Tornar padrão"), substituindo
 * a edição manual do campo texto solto `MSEConfiguracoes.Tema`.
 *
 * Mesmo padrão CRUD-lite do resto do Administrator (`com_extensions`,
 * `com_modules`): lê via `kernel/admin-data.js#listAdminItems`, escreve via
 * `updateAdminItem` (com ETag, buscada automaticamente). Diferente dos
 * outros editores: não há criação/edição/exclusão de linha aqui — instalar
 * um Template novo continua sendo uma tarefa de implantação (publicar o
 * pacote + rodar `tools/migrate-create-template-styles.js`), não uma ação de
 * UI. A única escrita possível nesta tela é "Tornar padrão".
 *
 * Invariante aplicada aqui (e só aqui — `kernel/template-registry.js` é só
 * leitura, não a garante): no máximo 1 linha com `Home=true` por `ClientId`.
 * "Tornar padrão" grava `Home=true` na linha escolhida e, em seguida,
 * `Home=false` em qualquer outra linha do mesmo `ClientId` que ainda estiver
 * `Home=true` — sequencialmente, para que uma falha a meio da operação nunca
 * deixe a lista com ZERO linhas `Home=true` (a escrita que ativa o novo
 * padrão sempre acontece primeiro).
 *
 * `task`/`route` (22/10/2026, prova de conceito da convenção
 * `controller.task` — ver `docs/AUDITORIA-JOOMLA-PENTE-FINO.md` §2.7/§3):
 * quando `route.task === "templates.setdefault"` e `route.id` corresponde a
 * um `style.Id` válido, a mesma ação do botão "Tornar padrão" é disparada
 * automaticamente logo após o primeiro carregamento bem-sucedido —
 * equivalente ao Joomla! permitir disparar a ação via URL
 * (`index.php?option=com_templates&task=style.setDefault&id=N`). O botão
 * continua sendo o caminho principal de uso real; isto é um acréscimo, não
 * uma substituição.
 */
import { listAdminItems, updateAdminItem } from "../../kernel/admin-data.js";
import { listTemplateStylesByClient } from "../../kernel/template-registry.js";

const CLIENT_ID = "Site";
const TEMPLATE_STYLES_FIELDS = ["Id", "Title", "Template", "ClientId", "Home"];
const SET_DEFAULT_TASK = "templates.setdefault";

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = text; return value; }
function bind(nodeValue, handler) { if (typeof nodeValue.addEventListener === "function") nodeValue.addEventListener("click", handler); else nodeValue.onclick = handler; }
function clear(nodeValue) { if (typeof nodeValue.replaceChildren === "function") nodeValue.replaceChildren(); else if (Array.isArray(nodeValue.children)) nodeValue.children.length = 0; }
function statusCode(error) { const code = error?.status ?? error?.statusCode; if (Number.isInteger(code)) return code; const match = String(error?.message ?? "").match(/\b(403|412)\b/); return match ? Number(match[1]) : null; }
function errorText(prefix, error) { const code = statusCode(error); if (code === 403) return `${prefix}: sem permissão (403).`; if (code === 412) return `${prefix}: conflito de edição (412); recarregue e tente novamente.`; return `${prefix}: ${error?.message || "erro desconhecido"}.`; }

export function renderTemplatesEditor({ root, route, services = {} } = {}) {
  const document = root?.ownerDocument;
  const client = services.adminClient;
  const list = services.listIds?.MSETemplateStyles;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel mse-administrator__templates";
  const error = node(document, "p");
  error.className = "mse-administrator__error";
  const tableHost = document.createElement("div");
  const toolbar = document.createElement("div");
  const reloadButton = node(document, "button", "Recarregar");
  toolbar.append(reloadButton);
  panel.append(node(document, "h2", "Templates instalados"), error, toolbar, tableHost);
  root.append(panel);

  // `route.task`/`route.id` só são aplicados uma vez, no primeiro
  // carregamento — navegações subsequentes (ex.: clique em "Recarregar")
  // nunca repetem a ação automaticamente, mesmo que a URL ainda contenha o
  // mesmo `task`/`id` (evita reaplicar a cada reload acidental).
  let pendingTask = route?.task === SET_DEFAULT_TASK && route.id != null ? route.id : null;

  async function makeDefault(style, styles) {
    error.textContent = "";
    try {
      await updateAdminItem({ client, list, id: style.Id, values: { Home: true } });
      const others = styles.filter((other) => other.Id !== style.Id && other.Home === true);
      for (const other of others) {
        await updateAdminItem({ client, list, id: other.Id, values: { Home: false } });
      }
      await reload();
    } catch (e) {
      error.textContent = errorText("Falha ao tornar padrão", e);
    }
  }

  function renderTable(styles) {
    clear(tableHost);
    const table = document.createElement("table");
    const header = document.createElement("tr");
    for (const label of ["Título", "Template", "Padrão", "Ações"]) header.append(node(document, "th", label));
    table.append(header);
    for (const style of styles) {
      const row = document.createElement("tr");
      row.append(node(document, "td", String(style.Title ?? "")));
      row.append(node(document, "td", String(style.Template ?? "")));
      row.append(node(document, "td", style.Home ? "Sim" : "Não"));
      const actions = document.createElement("td");
      const makeDefaultButton = node(document, "button", "Tornar padrão");
      makeDefaultButton.disabled = Boolean(style.Home);
      bind(makeDefaultButton, () => makeDefault(style, styles));
      actions.append(makeDefaultButton);
      row.append(actions);
      table.append(row);
    }
    tableHost.append(table);
  }

  async function reload() {
    if (!client || !list) {
      error.textContent = "Client administrativo ou lista MSETemplateStyles não configurado.";
      return;
    }
    try {
      const all = await listAdminItems({ client, list, select: TEMPLATE_STYLES_FIELDS, orderby: "Template" });
      const styles = listTemplateStylesByClient(all, { clientId: CLIENT_ID });
      renderTable(styles);
      if (pendingTask != null) {
        const targetId = pendingTask;
        pendingTask = null;
        const target = styles.find((style) => style.Id === targetId);
        if (target && !target.Home) await makeDefault(target, styles);
      }
    } catch (e) {
      error.textContent = errorText("Falha ao carregar templates", e);
    }
  }

  bind(reloadButton, reload);
  reload();
  return { dispose() { panel.remove(); } };
}
