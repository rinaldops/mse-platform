import { createForumRichTextEditor } from "./forum-editor.js";

const VIEWS = new Set(["recent", "popular", "unanswered", "resolved", "pinned"]);

const VIEW_LABELS = Object.freeze({
  recent: "Recentes",
  popular: "Populares",
  unanswered: "Sem resposta",
  resolved: "Resolvidos",
  pinned: "Fixados"
});

const SORTS = new Set(["recentes", "respostas", "visualizacoes"]);

const SORT_LABELS = Object.freeze({
  recentes: "Última atividade",
  respostas: "Mais respondidos",
  visualizacoes: "Mais vistos"
});

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function readForumRoute(input = globalThis.location?.href) {
  const url = new URL(input, globalThis.location?.origin ?? "http://localhost");
  const requestedView = url.searchParams.get("forumView");
  const requestedSort = url.searchParams.get("forumSort");
  const search = (url.searchParams.get("forumSearch") ?? "").trim().slice(0, 100);
  return Object.freeze({
    view: VIEWS.has(requestedView) ? requestedView : "recent",
    sort: SORTS.has(requestedSort) ? requestedSort : "recentes",
    categoryId: positiveInteger(url.searchParams.get("forumCategory")),
    tagId: positiveInteger(url.searchParams.get("forumTag")),
    topicId: positiveInteger(url.searchParams.get("forumTopic")),
    answerId: positiveInteger(url.searchParams.get("forumAnswer")),
    compose: url.searchParams.get("forumCompose") === "1",
    edit: url.searchParams.get("forumEdit") === "1",
    mine: url.searchParams.get("forumMine") === "1",
    search
  });
}

export function forumRouteUrl(input, changes = {}) {
  const url = new URL(input, globalThis.location?.origin ?? "http://localhost");
  const current = readForumRoute(url);
  const next = { ...current, ...changes };
  const mappings = [
    ["forumView", next.view === "recent" ? null : next.view],
    ["forumSort", next.sort === "recentes" ? null : next.sort],
    ["forumCategory", next.categoryId],
    ["forumTag", next.tagId],
    ["forumTopic", next.topicId],
    ["forumAnswer", next.answerId],
    ["forumCompose", next.compose ? 1 : null],
    ["forumEdit", next.edit ? 1 : null],
    ["forumMine", next.mine ? 1 : null],
    ["forumSearch", next.search || null]
  ];
  for (const [name, value] of mappings) {
    if (value === null || value === undefined || value === "") url.searchParams.delete(name);
    else url.searchParams.set(name, String(value));
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formattedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

// Small monochrome icons (currentColor, no fill) for the action row — plain
// glyphs like the rest of the module's icons (⌕, ✕, ↗), just as inline SVG
// since these shapes have no safe single-character Unicode equivalent.
const ICON_PATHS = {
  heart: '<path fill="currentColor" stroke="none" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  star: '<polygon fill="currentColor" stroke="none" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  link: '<path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/><line x1="8" y1="12" x2="16" y2="12"/>',
  checkSquare: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'
};

function icon(document, name) {
  const span = element(document, "span", "mse-forum__icon");
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;
  return span;
}

// Icon-only action (edit/archive/mark solution/permalink): the visible label
// moves entirely to title/aria-label so the row stays compact single-line.
function iconButton(document, tag, className, iconName, label) {
  const node = element(document, tag, className);
  node.append(icon(document, iconName));
  setIconButtonLabel(node, label);
  return node;
}

function setIconButtonLabel(node, label) {
  node.title = label;
  node.setAttribute("aria-label", label);
}

function errorMessage(error) {
  if (error?.code === "access-denied") return "Você não possui acesso aos dados deste fórum.";
  if (error?.code === "not-found") return "Uma estrutura necessária do fórum não foi encontrada.";
  if (error?.code === "concurrency-conflict") return "O tópico foi alterado. Reabra o formulário antes de salvar novamente.";
  if (error?.code === "invalid-state" || error?.code === "invalid-data" || error instanceof TypeError) return error.message;
  return "Não foi possível carregar o fórum. Tente novamente em instantes.";
}

export function createForumView({
  root,
  service,
  pageSize = 12,
  createRichTextEditor,
  renderRichText,
  sanitizeRichText,
  historyImpl = globalThis.history,
  locationImpl = globalThis.location,
  windowImpl = globalThis
} = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listTopics !== "function"
    || typeof service.listContributors !== "function"
    || typeof service.listTaxonomy !== "function"
    || typeof service.listCategorySummaries !== "function"
    || typeof service.listForumOverview !== "function"
    || typeof service.whoAmI !== "function"
    || typeof service.getTopic !== "function"
    || typeof service.listAnswers !== "function"
    || typeof service.createAnswer !== "function"
    || typeof service.getAnswerForEdit !== "function"
    || typeof service.updateAnswer !== "function"
    || typeof service.archiveAnswer !== "function"
    || typeof service.listReactions !== "function"
    || typeof service.toggleReaction !== "function"
    || typeof service.acceptAnswer !== "function"
    || typeof service.clearAcceptedAnswer !== "function"
    || typeof service.createTopic !== "function"
    || typeof service.getTopicForEdit !== "function"
    || typeof service.updateTopic !== "function"
    || typeof service.archiveTopic !== "function"
    || typeof service.loadTopicDraft !== "function"
    || typeof service.saveTopicDraft !== "function"
    || typeof service.deleteTopicDraft !== "function") {
    throw new TypeError("service deve implementar o contrato do fórum.");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new TypeError("pageSize deve ser um inteiro entre 1 e 50.");
  }
  if (renderRichText !== undefined && typeof renderRichText !== "function") {
    throw new TypeError("renderRichText deve ser uma função.");
  }
  if (sanitizeRichText !== undefined && typeof sanitizeRichText !== "function") {
    throw new TypeError("sanitizeRichText deve ser uma função.");
  }
  if (createRichTextEditor !== undefined && typeof createRichTextEditor !== "function") {
    throw new TypeError("createRichTextEditor deve ser uma função.");
  }

  const document = root.ownerDocument;
  let renderSequence = 0;
  let disposed = false;

  function currentHref() {
    return locationImpl?.href ?? document.location?.href ?? "http://localhost/";
  }

  function navigate(changes, { replace = false } = {}) {
    const href = forumRouteUrl(currentHref(), changes);
    historyImpl?.[replace ? "replaceState" : "pushState"]?.({}, "", href);
    return render();
  }

  function status(text, role = "status", modifier = "") {
    const className = ["mse-forum__status", modifier].filter(Boolean).join(" ");
    const node = element(document, "p", className, text);
    node.setAttribute("role", role);
    return node;
  }

  function publicationBody(value, format) {
    const node = element(document, "div", "mse-forum__body");
    if (format === "HtmlSeguroV1" && renderRichText) {
      node.classList.add("mse-forum__body--rich");
      renderRichText(node, value || "");
    } else node.textContent = plainTextFromNote(value) || "Sem conteúdo.";
    return node;
  }

  async function richTextEditor(initialContent = "", placeholder = "Escreva o conteúdo...") {
    if (typeof createRichTextEditor === "function") {
      try {
        const editorRoot = element(document, "div");
        const editor = await createRichTextEditor({
          root: editorRoot,
          initialHtml: initialContent,
          placeholder,
          sanitizeRichText
        });
        return {
          root: editorRoot,
          contentFormat: editor.contentFormat,
          getValue: editor.getValue,
          focus: editor.focus,
          clear: editor.clear
        };
      } catch (error) {
        console.warn("Quill indisponível; usando editor rico nativo.", error);
      }
    }
    const editor = createForumRichTextEditor({
      document,
      value: initialContent,
      renderRichText,
      sanitizeRichText,
      promptImpl: windowImpl?.prompt?.bind(windowImpl)
    });
    return {
      root: editor.root,
      contentFormat: editor.contentFormat,
      getValue: editor.getValue,
      focus: () => editor.editor.focus(),
      clear: editor.clear
    };
  }

  function topicCard(topic) {
    const article = element(document, "article", "mse-forum__topic");
    const main = element(document, "div", "mse-forum__topic-main");
    const link = element(document, "a", "mse-forum__topic-link", topic.Title || "Tópico sem título");
    link.href = forumRouteUrl(currentHref(), { topicId: topic.Id, answerId: null });
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ topicId: topic.Id, answerId: null });
    });
    main.append(link);

    const meta = element(document, "p", "mse-forum__meta");
    const author = topic.Author?.Title || "Autor não informado";
    meta.textContent = `${author} · ${formattedDate(topic.UltimaAtividade || topic.Modified || topic.Created)}`;
    main.append(meta);

    const badges = element(document, "div", "mse-forum__badges");
    if (topic.Fixado) badges.append(element(document, "span", "mse-forum__badge", "Fixado"));
    if (topic.Status) badges.append(element(document, "span", "mse-forum__badge", topic.Status));
    if (topic.category?.Title) {
      badges.append(element(document, "span", "mse-forum__badge mse-forum__badge--category", topic.category.Title));
    }
    for (const tag of topic.tags ?? []) {
      const tagLink = element(document, "a", "mse-forum__badge mse-forum__badge--tag", `#${tag.Title}`);
      tagLink.href = forumRouteUrl(currentHref(), { tagId: tag.Id, topicId: null });
      tagLink.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate({ tagId: tag.Id, topicId: null });
      });
      badges.append(tagLink);
    }
    if (badges.childElementCount) main.append(badges);

    const metrics = element(document, "dl", "mse-forum__metrics");
    for (const [label, value] of [
      ["Respostas", topic.QuantidadeRespostas ?? 0],
      ["Visualizações", topic.QuantidadeVisualizacoes ?? 0],
      ["Pontos", topic.Pontuacao ?? 0]
    ]) {
      const group = element(document, "div", "mse-forum__metric");
      group.append(element(document, "dt", null, label), element(document, "dd", null, String(value)));
      metrics.append(group);
    }

    article.append(main, metrics);
    return article;
  }

  function initials(name) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function pageBar(route) {
    const bar = element(document, "header", "mse-forum__pagebar");
    const inner = element(document, "div", "mse-forum__pagebar-inner");

    const crumb = element(document, "div", "mse-forum__breadcrumb");
    const home = element(document, "a", "mse-forum__breadcrumb-link", "Hub TD");
    home.href = "#inicio";
    crumb.append(home, element(document, "span", "mse-forum__breadcrumb-sep", "/"));
    crumb.lastChild.setAttribute("aria-hidden", "true");
    crumb.append(element(document, "h1", "mse-forum__pagebar-title", "Fórum"));
    inner.append(crumb);

    const searchLabel = element(document, "label", "mse-forum__search");
    searchLabel.append(element(document, "span", "mse-forum__search-icon", "⌕"));
    const search = element(document, "input", "mse-forum__search-input");
    search.type = "search";
    search.placeholder = "Buscar tópicos...";
    search.setAttribute("aria-label", "Buscar tópicos");
    search.maxLength = 100;
    search.value = route.search;
    let searchDebounce = null;
    search.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      const value = search.value;
      searchDebounce = setTimeout(async () => {
        if (disposed) return;
        await navigate({ search: value.trim().slice(0, 100), topicId: null });
        if (disposed) return;
        const refocused = root.querySelector(".mse-forum__search-input");
        if (refocused) {
          refocused.focus();
          const caret = refocused.value.length;
          refocused.setSelectionRange?.(caret, caret);
        }
      }, 250);
    });
    searchLabel.append(search);
    inner.append(searchLabel);

    const actions = element(document, "div", "mse-forum__pagebar-actions");
    const createLink = element(document, "a", "mse-forum__pagebar-button mse-forum__pagebar-button--primary", "+ Criar tópico");
    createLink.href = forumRouteUrl(currentHref(), { compose: true, topicId: null });
    createLink.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ compose: true, topicId: null });
    });
    const mine = element(document, "button", "mse-forum__pagebar-button mse-forum__pagebar-button--ghost", "Minha atividade");
    mine.type = "button";
    mine.setAttribute("aria-pressed", route.mine ? "true" : "false");
    if (route.mine) mine.classList.add("mse-forum__pagebar-button--active");
    mine.addEventListener("click", () => navigate({ mine: !route.mine, topicId: null }));
    actions.append(createLink, mine);
    inner.append(actions);

    bar.append(inner);
    return bar;
  }

  function tabBar(route, tabCounts) {
    const bar = element(document, "div", "mse-forum__tabbar");
    const tabs = element(document, "div", "mse-forum__tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Visões do fórum");
    for (const [view, label] of Object.entries(VIEW_LABELS)) {
      const tab = element(document, "a", "mse-forum__tab", label);
      tab.setAttribute("role", "tab");
      tab.href = forumRouteUrl(currentHref(), { view, topicId: null });
      const active = view === route.view;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      if (active) tab.classList.add("mse-forum__tab--active");
      tab.append(element(document, "span", "mse-forum__tab-count", ` ${tabCounts[view] ?? 0}`));
      tab.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate({ view, topicId: null, ...(view === "popular" ? { sort: "visualizacoes" } : {}) });
      });
      tabs.append(tab);
    }

    const sortLabel = element(document, "label", "mse-forum__sort");
    sortLabel.append(element(document, "span", "mse-forum__sort-label", "Ordenar por"));
    const sort = element(document, "select", "mse-forum__select");
    for (const [value, label] of Object.entries(SORT_LABELS)) {
      const option = element(document, "option", null, label);
      option.value = value;
      option.selected = value === route.sort;
      sort.append(option);
    }
    sort.addEventListener("change", () => navigate({ sort: sort.value, topicId: null }));
    sortLabel.append(sort);

    bar.append(tabs, sortLabel);
    return bar;
  }

  function indicatorsPanel(indicators) {
    const panel = element(document, "section", "mse-forum__indicators");
    for (const [value, label, modifier] of [
      [String(indicators.topics), "TÓPICOS"],
      [String(indicators.answers), "RESPOSTAS"],
      [`${indicators.resolvedPercent}%`, "RESOLVIDAS", "mse-forum__indicator-value--resolved"],
      [String(indicators.active), "ATIVOS"]
    ]) {
      const item = element(document, "div", "mse-forum__indicator");
      item.append(
        element(document, "b", ["mse-forum__indicator-value", modifier].filter(Boolean).join(" "), value),
        element(document, "span", "mse-forum__indicator-label", label)
      );
      panel.append(item);
    }
    return panel;
  }

  function categoriesPanel(route, categories) {
    const section = element(document, "section", "mse-forum__sidebar-section");
    section.append(element(document, "h3", "mse-forum__sidebar-title", "Categorias"));
    const list = element(document, "div", "mse-forum__category-list");
    const allButton = element(document, "button", "mse-forum__category-item", "Todas");
    allButton.type = "button";
    allButton.setAttribute("aria-pressed", route.categoryId ? "false" : "true");
    if (!route.categoryId) allButton.classList.add("mse-forum__category-item--active");
    allButton.addEventListener("click", () => navigate({ categoryId: null, topicId: null }));
    list.append(allButton);
    for (const category of categories) {
      const active = category.id === route.categoryId;
      const button = element(document, "button", "mse-forum__category-item");
      button.type = "button";
      button.style.setProperty("--accent", category.color);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) button.classList.add("mse-forum__category-item--active");
      button.append(
        element(document, "span", "mse-forum__category-item-name", category.title),
        element(document, "span", "mse-forum__category-item-count", String(category.count))
      );
      button.addEventListener("click", () => navigate({ categoryId: category.id, topicId: null }));
      list.append(button);
    }
    section.append(list);
    return section;
  }

  function tagsPanel(route, tags) {
    const section = element(document, "section", "mse-forum__sidebar-section");
    section.append(element(document, "h3", "mse-forum__sidebar-title", "Tags em alta"));
    const chips = element(document, "div", "mse-forum__tag-chips");
    for (const tag of tags) {
      const active = tag.id === route.tagId;
      const chip = element(document, "button", "mse-forum__tag-chip", `#${tag.title}`);
      chip.type = "button";
      chip.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) chip.classList.add("mse-forum__tag-chip--active");
      chip.addEventListener("click", () => navigate({ tagId: active ? null : tag.id, topicId: null }));
      chips.append(chip);
    }
    if (!tags.length) chips.append(status("Nenhuma tag em alta ainda.", "status", "mse-forum__status--empty"));
    section.append(chips);
    return section;
  }

  function unansweredPanel(overview) {
    const box = element(document, "section", "mse-forum__unanswered-panel");
    box.append(
      element(document, "h3", "mse-forum__sidebar-title", "Sem resposta há +3 dias"),
      element(document, "p", "mse-forum__unanswered-text",
        `${overview.unansweredOverdue} tópico${overview.unansweredOverdue === 1 ? "" : "s"} aguardando uma primeira resposta.`)
    );
    const cta = element(document, "button", "mse-forum__unanswered-button", "Ver quem precisa");
    cta.type = "button";
    cta.addEventListener("click", () => navigate({ view: "unanswered", categoryId: null, tagId: null, search: "", topicId: null }));
    box.append(cta);
    return box;
  }

  function filterSummary(route, overview) {
    const parts = [];
    if (route.categoryId) {
      parts.push(overview.categories.find((item) => item.id === route.categoryId)?.title ?? "categoria selecionada");
    }
    if (route.tagId) {
      const tag = overview.tags.find((item) => item.id === route.tagId);
      if (tag) parts.push(`#${tag.title}`);
    }
    if (route.search) parts.push(`"${route.search}"`);
    if (!parts.length) return null;
    const line = element(document, "div", "mse-forum__filter-summary");
    line.append(element(document, "span", null, parts.join(" · ")));
    const clear = element(document, "button", "mse-forum__clear-filters", "Limpar filtros ✕");
    clear.type = "button";
    clear.addEventListener("click", () =>
      navigate({ view: "recent", categoryId: null, tagId: null, search: "", mine: false, topicId: null }));
    line.append(clear);
    return line;
  }

  function topicListCard(topic) {
    const article = element(document, "article", "mse-forum__topic-card");
    article.style.setProperty("--accent", topic.category?.Cor || "#006298");

    const avatar = element(document, "div", "mse-forum__topic-avatar", initials(topic.Author?.Title));
    const body = element(document, "div", "mse-forum__topic-card-body");
    if (topic.Fixado) body.append(element(document, "span", "mse-forum__topic-pinned", "Fixado"));
    const link = element(document, "a", "mse-forum__topic-card-title", topic.Title || "Tópico sem título");
    link.href = forumRouteUrl(currentHref(), { topicId: topic.Id, answerId: null });
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ topicId: topic.Id, answerId: null });
    });
    body.append(link);

    const author = topic.Author?.Title || "Autor não informado";
    body.append(element(
      document,
      "p",
      "mse-forum__topic-card-meta",
      `${author} · última atividade ${formattedDate(topic.UltimaAtividade || topic.Modified || topic.Created)}`
    ));

    const badges = element(document, "div", "mse-forum__topic-card-badges");
    if (topic.category?.Title) {
      const badge = element(document, "span", "mse-forum__topic-badge mse-forum__topic-badge--category", topic.category.Title);
      badge.style.setProperty("--accent", topic.category.Cor || "#006298");
      badges.append(badge);
    }
    if (topic.Status === "Resolvido") {
      badges.append(element(document, "span", "mse-forum__topic-badge mse-forum__topic-badge--resolved", "✓ Resolvido"));
    } else if (Number(topic.QuantidadeRespostas ?? 0) === 0) {
      badges.append(element(document, "span", "mse-forum__topic-badge mse-forum__topic-badge--waiting", "Aguardando resposta"));
    }
    for (const tag of topic.tags ?? []) {
      badges.append(element(document, "span", "mse-forum__topic-badge mse-forum__topic-badge--tag", `#${tag.Title}`));
    }
    if (badges.childElementCount) body.append(badges);

    const metrics = element(document, "dl", "mse-forum__topic-card-metrics");
    const answersCount = Number(topic.QuantidadeRespostas ?? 0);
    const answersGroup = element(document, "div", "mse-forum__topic-card-metric");
    const answersValue = element(document, "dd",
      `mse-forum__topic-card-metric-value${answersCount === 0 ? " mse-forum__topic-card-metric-value--zero" : ""}`,
      String(answersCount));
    answersGroup.append(answersValue, element(document, "dt", "mse-forum__topic-card-metric-label", "RESP."));
    const viewsGroup = element(document, "div", "mse-forum__topic-card-metric");
    viewsGroup.append(
      element(document, "dd", "mse-forum__topic-card-metric-value", String(topic.QuantidadeVisualizacoes ?? 0)),
      element(document, "dt", "mse-forum__topic-card-metric-label", "VIEWS")
    );
    metrics.append(answersGroup, viewsGroup);

    article.append(avatar, body, metrics);
    return article;
  }

  function emptyState() {
    const box = element(document, "div", "mse-forum__empty");
    box.append(
      element(document, "p", "mse-forum__empty-title", "Nenhum tópico encontrado"),
      element(document, "p", "mse-forum__empty-text", "Ajuste os filtros ou seja o primeiro a abrir essa conversa.")
    );
    const cta = element(document, "a", "mse-forum__button", "Criar tópico");
    cta.href = forumRouteUrl(currentHref(), { compose: true, topicId: null });
    cta.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ compose: true, topicId: null });
    });
    box.append(cta);
    return box;
  }

  async function renderList(route, sequence) {
    const shell = element(document, "section", "mse-forum mse-forum--list");
    shell.append(pageBar(route));

    const page = element(document, "div", "mse-forum__page");
    const main = element(document, "main", "mse-forum__main");
    main.append(status("Carregando tópicos…"));
    page.append(main);
    shell.append(page);
    root.replaceChildren(shell);

    try {
      const [overview, firstPage, currentUser] = await Promise.all([
        service.listForumOverview(),
        service.listTopics({
          view: route.view,
          categoryId: route.categoryId,
          tagId: route.tagId,
          search: route.search,
          sort: route.sort,
          pageSize
        }),
        route.mine ? service.whoAmI() : null
      ]);
      if (disposed || sequence !== renderSequence) return;

      const filterMine = (items) => (route.mine && currentUser
        ? items.filter((topic) => topic.Author?.Id === currentUser.id)
        : items);

      const tabBarEl = tabBar(route, overview.tabCounts);
      const grid = element(document, "div", "mse-forum__grid");
      const sidebar = element(document, "aside", "mse-forum__sidebar");
      sidebar.append(indicatorsPanel(overview.indicators));
      sidebar.append(categoriesPanel(route, overview.categories));
      sidebar.append(tagsPanel(route, overview.tags));
      if (overview.unansweredOverdue > 0) sidebar.append(unansweredPanel(overview));

      const list = element(document, "div", "mse-forum__topic-list");
      const topics = [...filterMine(firstPage.topics)];
      let next = firstPage.next;
      const drawTopics = (items) => items.forEach((topic) => list.append(topicListCard(topic)));
      drawTopics(topics);

      const summary = filterSummary(route, overview);
      const newMain = element(document, "main", "mse-forum__main");
      if (summary) newMain.append(summary);

      if (!topics.length && !next) {
        newMain.append(emptyState());
      } else {
        newMain.append(list);
        if (next) {
          const more = element(document, "button", "mse-forum__button mse-forum__button--secondary", "Carregar mais tópicos");
          more.type = "button";
          more.addEventListener("click", async () => {
            more.disabled = true;
            more.textContent = "Carregando…";
            try {
              const nextPage = await service.listTopics({
                view: route.view,
                categoryId: route.categoryId,
                tagId: route.tagId,
                search: route.search,
                sort: route.sort,
                pageSize,
                cursor: next
              });
              if (disposed || sequence !== renderSequence) return;
              drawTopics(filterMine(nextPage.topics));
              next = nextPage.next;
              if (!next) more.remove();
              else {
                more.disabled = false;
                more.textContent = "Carregar mais tópicos";
              }
            } catch (error) {
              more.disabled = false;
              more.textContent = "Tentar novamente";
              newMain.append(status(errorMessage(error), "alert"));
            }
          });
          newMain.append(more);
        }
      }

      grid.append(sidebar, newMain);
      page.replaceChildren(tabBarEl, grid);
    } catch (error) {
      if (disposed || sequence !== renderSequence) return;
      main.replaceChildren(status(errorMessage(error), "alert"));
    }
  }

  async function renderEditor(route, sequence) {
    const editing = route.edit && route.topicId;
    const shell = element(document, "section", "mse-forum mse-forum--compose");
    const back = element(document, "a", "mse-forum__back", "← Voltar aos tópicos");
    const backChanges = editing ? { edit: null } : { compose: null };
    back.textContent = editing ? "← Voltar ao tópico" : "← Voltar aos tópicos";
    back.href = forumRouteUrl(currentHref(), backChanges);
    back.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(backChanges);
    });
    const heading = element(document, "h2", "mse-forum__title", editing ? "Editar tópico" : "Criar tópico");
    const description = element(
      document,
      "p",
      "mse-forum__description",
      editing
        ? "Atualize as informações sem sobrescrever alterações feitas por outra pessoa."
        : "Descreva sua dúvida ou compartilhe um conhecimento com a comunidade."
    );
    const content = element(document, "div", "mse-forum__content");
    content.append(status("Carregando formulário…"));
    shell.append(back, heading, description, content);
    root.replaceChildren(shell);

    try {
      const [categories, tags, editable, draftResult] = await Promise.all([
        service.listTaxonomy({ type: "Categoria" }),
        service.listTaxonomy({ type: "Tag" }),
        editing ? service.getTopicForEdit(route.topicId) : null,
        editing ? null : service.loadTopicDraft().then(
          (draft) => ({ draft, error: null }),
          (error) => ({ draft: null, error })
        )
      ]);
      if (disposed || sequence !== renderSequence) return;
      if (editing && !editable) {
        content.replaceChildren(status("O tópico solicitado não foi encontrado.", "alert"));
        return;
      }
      if (!categories.length) {
        content.replaceChildren(status("O fórum precisa de ao menos uma categoria ativa antes de receber tópicos.", "alert"));
        return;
      }
      const draft = draftResult?.draft ?? null;

      const form = element(document, "form", "mse-forum__compose-form");
      const titleLabel = element(document, "label", "mse-forum__field");
      titleLabel.append(element(document, "span", "mse-forum__field-label", "Título"));
      const title = element(document, "input", "mse-forum__input");
      title.name = "forumTitle";
      title.required = true;
      title.maxLength = 255;
      title.value = editable?.topic.Title ?? draft?.title ?? "";
      titleLabel.append(title);

      const contentLabel = element(document, "div", "mse-forum__field");
      contentLabel.append(element(document, "span", "mse-forum__field-label", "Conteúdo"));
      const contentFormat = editable?.topic.FormatoConteudo
        ?? draft?.contentFormat
        ?? "HtmlSeguroV1";
      const initialContent = editable?.topic.Conteudo ?? draft?.content ?? "";
      let richEditor = null;
      let body = null;
      if (contentFormat === "HtmlSeguroV1") {
        if (!renderRichText || !sanitizeRichText) {
          throw new TypeError("O editor HTML exige renderRichText e sanitizeRichText.");
        }
        richEditor = await richTextEditor(initialContent, "Escreva o conteúdo do tópico...");
        contentLabel.append(richEditor.root);
      } else {
        body = element(document, "textarea", "mse-forum__textarea");
        body.name = "forumContent";
        body.required = true;
        body.maxLength = 20000;
        body.rows = 10;
        body.value = initialContent;
        contentLabel.append(body);
      }

      const categoryLabel = element(document, "label", "mse-forum__field");
      categoryLabel.append(element(document, "span", "mse-forum__field-label", "Categoria"));
      const category = element(document, "select", "mse-forum__select");
      category.name = "forumCategory";
      category.required = true;
      category.append(element(document, "option", null, "Selecione uma categoria"));
      for (const item of categories) {
        const option = element(document, "option", null, item.Title);
        option.value = String(item.Id);
        option.selected = item.Id === (editable?.topic.CategoriaId ?? draft?.categoryId);
        category.append(option);
      }
      categoryLabel.append(category);

      const tagGroup = element(document, "fieldset", "mse-forum__tag-fieldset");
      tagGroup.append(element(document, "legend", "mse-forum__field-label", "Tags"));
      const tagOptions = element(document, "div", "mse-forum__tag-options");
      for (const item of tags) {
        const label = element(document, "label", "mse-forum__tag-option");
        const input = element(document, "input");
        input.type = "checkbox";
        input.name = "forumTags";
        input.value = String(item.Id);
        input.checked = editable?.topic.tags.some((tag) => tag.Id === item.Id)
          ?? draft?.tagIds.includes(item.Id)
          ?? false;
        label.append(input, element(document, "span", null, item.Title));
        tagOptions.append(label);
      }
      if (!tags.length) tagOptions.append(status("Nenhuma tag ativa disponível."));
      tagGroup.append(tagOptions);

      const feedback = element(document, "div", "mse-forum__compose-feedback");
      feedback.setAttribute("aria-live", "polite");
      if (draft) feedback.append(status("Rascunho pessoal restaurado."));
      else if (draftResult?.error) feedback.append(status(errorMessage(draftResult.error), "alert"));
      const preview = element(document, "section", "mse-forum__compose-preview");
      preview.hidden = true;
      preview.setAttribute("aria-label", "Pré-visualização do tópico");
      const actions = element(document, "div", "mse-forum__compose-actions");
      const previewButton = element(document, "button", "mse-forum__button mse-forum__button--secondary mse-forum__preview-button", "Pré-visualizar");
      previewButton.type = "button";
      const submit = element(document, "button", "mse-forum__button", editing ? "Salvar alterações" : "Publicar tópico");
      submit.type = "submit";
      actions.append(previewButton, submit);
      let saveDraft;
      let discardDraft;
      const values = () => ({
        title: title.value,
        content: richEditor ? richEditor.getValue() : body.value,
        contentFormat,
        categoryId: positiveInteger(category.value),
        tagIds: [...form.querySelectorAll('[name="forumTags"]:checked')].map((input) => Number(input.value))
      });
      previewButton.addEventListener("click", () => {
        const data = values();
        if (!data.content.trim()) {
          feedback.replaceChildren(status("Informe o conteúdo antes de pré-visualizar.", "alert"));
          preview.hidden = true;
          return;
        }
        const categoryName = category.selectedOptions[0]?.value
          ? category.selectedOptions[0].textContent
          : "Categoria não selecionada";
        const tagNames = [...form.querySelectorAll('[name="forumTags"]:checked')]
          .map((input) => input.closest("label")?.textContent?.trim())
          .filter(Boolean);
        const meta = element(document, "p", "mse-forum__meta", [categoryName, tagNames.join(", ")].filter(Boolean).join(" · "));
        preview.replaceChildren(
          element(document, "p", "mse-forum__preview-label", "Pré-visualização"),
          element(document, "h3", "mse-forum__preview-title", data.title.trim() || "Tópico sem título"),
          meta,
          publicationBody(data.content, data.contentFormat)
        );
        preview.hidden = false;
        previewButton.textContent = "Atualizar pré-visualização";
        feedback.replaceChildren();
      });
      if (!editing) {
        saveDraft = element(document, "button", "mse-forum__button mse-forum__button--secondary mse-forum__save-draft", "Salvar rascunho");
        saveDraft.type = "button";
        discardDraft = element(document, "button", "mse-forum__button mse-forum__button--secondary mse-forum__discard-draft", "Descartar rascunho");
        discardDraft.type = "button";
        discardDraft.hidden = !(draft || draftResult?.error);
        saveDraft.addEventListener("click", async () => {
          saveDraft.disabled = true;
          discardDraft.disabled = true;
          feedback.replaceChildren(status("Salvando rascunho…"));
          try {
            await service.saveTopicDraft(values());
            if (disposed || sequence !== renderSequence) return;
            discardDraft.hidden = false;
            feedback.replaceChildren(status("Rascunho pessoal salvo."));
          } catch (error) {
            if (disposed || sequence !== renderSequence) return;
            feedback.replaceChildren(status(errorMessage(error), "alert"));
          } finally {
            saveDraft.disabled = false;
            discardDraft.disabled = false;
          }
        });
        discardDraft.addEventListener("click", async () => {
          if (!windowImpl?.confirm?.("Descartar o rascunho salvo e limpar este formulário?")) return;
          saveDraft.disabled = true;
          discardDraft.disabled = true;
          feedback.replaceChildren(status("Descartando rascunho…"));
          try {
            await service.deleteTopicDraft();
            if (disposed || sequence !== renderSequence) return;
            form.reset();
            richEditor?.clear();
            discardDraft.hidden = true;
            feedback.replaceChildren(status("Rascunho descartado."));
            title.focus();
          } catch (error) {
            if (disposed || sequence !== renderSequence) return;
            feedback.replaceChildren(status(errorMessage(error), "alert"));
          } finally {
            saveDraft.disabled = false;
            discardDraft.disabled = false;
          }
        });
        actions.append(saveDraft, discardDraft);
      }
      form.append(titleLabel, contentLabel, categoryLabel, tagGroup, feedback, preview, actions);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        submit.textContent = "Salvando…";
        feedback.replaceChildren(status(editing ? "Atualizando tópico…" : "Salvando tópico…"));
        try {
          const result = editing
            ? await service.updateTopic({ topicId: route.topicId, etag: editable.etag, ...values() })
            : await service.createTopic(values());
          if (disposed || sequence !== renderSequence) return;
          if (!editing) {
            try { await service.deleteTopicDraft(); } catch { /* O tópico publicado não deve ser enviado novamente. */ }
          }
          await navigate({ compose: null, edit: null, topicId: result.topicId });
        } catch (error) {
          if (disposed || sequence !== renderSequence) return;
          if (error?.code === "partial-write" && error.topicId) {
            const message = status(error.message, "alert");
            const open = element(document, "a", "mse-forum__back", "Abrir o tópico criado");
            open.href = forumRouteUrl(currentHref(), { compose: null, edit: null, topicId: error.topicId });
            feedback.replaceChildren(message, open);
            return;
          }
          submit.disabled = false;
          submit.textContent = editing ? "Tentar salvar novamente" : "Tentar publicar novamente";
          feedback.replaceChildren(status(errorMessage(error), "alert"));
        }
      });
      content.replaceChildren(form);
      title.focus();
    } catch (error) {
      if (disposed || sequence !== renderSequence) return;
      content.replaceChildren(status(errorMessage(error), "alert"));
    }
  }

  async function renderDetail(route, sequence) {
    const shell = element(document, "article", "mse-forum mse-forum--detail");

    // Same blue .mse-forum__pagebar as the list page, so a reader landing
    // straight on a topic link still sees they're inside Fórum. "Hub TD /
    // Fórum" is available immediately; the third segment (topic title) is
    // appended once the topic loads, so the trail never disappears mid-load.
    const bar = element(document, "header", "mse-forum__pagebar");
    const barInner = element(document, "div", "mse-forum__pagebar-inner");
    const breadcrumb = element(document, "nav", "mse-forum__breadcrumb");
    breadcrumb.setAttribute("aria-label", "Caminho");
    const home = element(document, "a", "mse-forum__breadcrumb-link", "Hub TD");
    home.href = "#inicio";
    const forumLink = element(document, "a", "mse-forum__breadcrumb-link", "Fórum");
    forumLink.href = forumRouteUrl(currentHref(), { topicId: null, answerId: null });
    forumLink.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ topicId: null, answerId: null });
    });
    const sep = element(document, "span", "mse-forum__breadcrumb-sep", "/");
    sep.setAttribute("aria-hidden", "true");
    breadcrumb.append(home, sep, forumLink);
    barInner.append(breadcrumb);
    bar.append(barInner);

    const content = element(document, "div", "mse-forum__content mse-forum__page");
    content.append(status("Carregando discussão…"));
    shell.append(bar, content);
    root.replaceChildren(shell);

    try {
      const [topic, answerPage] = await Promise.all([
        service.getTopic(route.topicId),
        service.listAnswers(route.topicId, { pageSize: 50 })
      ]);
      if (disposed || sequence !== renderSequence) return;
      if (!topic) {
        content.replaceChildren(status("O tópico solicitado não foi encontrado.", "alert"));
        return;
      }
      let reactionSummary = await service.listReactions([
        { publicationType: "Topico", publicationId: topic.Id },
        ...answerPage.answers.map((answer) => ({ publicationType: "Resposta", publicationId: answer.Id }))
      ]);
      const relatedTopics = (await service.listTopics({
        view: "recent",
        categoryId: topic.CategoriaId,
        pageSize: 6
      })).topics.filter((item) => item.Id !== topic.Id).slice(0, 3);
      if (disposed || sequence !== renderSequence) return;

      function reactionBar(publicationType, publicationId, summary = {}) {
        const bar = element(document, "div", "mse-forum__reactions");
        for (const [reactionType, label, iconName] of [["Gostei", "Gostei", "heart"], ["Util", "Útil", "check"], ["Excelente", "Excelente", "star"]]) {
          const count = summary[reactionType] ?? 0;
          const button = element(document, "button", `mse-forum__reaction mse-forum__reaction--${reactionType.toLowerCase()}`);
          button.type = "button";
          button.append(icon(document, iconName), element(document, "span", "mse-forum__reaction-count", String(count)));
          button.title = `${label} (${count})`;
          button.setAttribute("aria-label", `${label} (${count})`);
          button.setAttribute("aria-pressed", summary.mine?.includes(reactionType) ? "true" : "false");
          if (count > 0) button.classList.add("mse-forum__reaction--counted");
          if (summary.mine?.includes(reactionType)) button.classList.add("mse-forum__reaction--active");
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await service.toggleReaction({ publicationType, publicationId, reactionType });
              if (disposed || sequence !== renderSequence) return;
              await render();
            } catch (error) {
              button.disabled = false;
              bar.append(status(errorMessage(error), "alert"));
            }
          });
          bar.append(button);
        }
        return bar;
      }

      const currentSep = element(document, "span", "mse-forum__breadcrumb-sep", "/");
      currentSep.setAttribute("aria-hidden", "true");
      breadcrumb.append(
        currentSep,
        element(document, "span", "mse-forum__breadcrumb-current", topic.Title || "Tópico sem título")
      );
      const heading = element(document, "h2", "mse-forum__title", topic.Title || "Tópico sem título");
      const body = publicationBody(topic.Conteudo, topic.FormatoConteudo);
      const topicActions = element(document, "div", "mse-forum__topic-actions");
      topicActions.append(reactionBar("Topico", topic.Id, reactionSummary[`Topico:${topic.Id}`]));
      if (topic.canEdit) {
        const edit = iconButton(document, "a", "mse-forum__icon-button", "edit", "Editar tópico");
        edit.href = forumRouteUrl(currentHref(), { edit: true });
        edit.addEventListener("click", (event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate({ edit: true });
        });
        const archive = iconButton(document, "button", "mse-forum__icon-button mse-forum__icon-button--danger", "archive", "Arquivar tópico");
        archive.type = "button";
        archive.addEventListener("click", async () => {
          if (!windowImpl?.confirm?.("Arquivar este tópico? Ele deixará de aparecer nas listagens.")) return;
          archive.disabled = true;
          setIconButtonLabel(archive, "Arquivando…");
          try {
            await service.archiveTopic(topic.Id);
            if (disposed || sequence !== renderSequence) return;
            await navigate({ topicId: null, edit: null });
          } catch (error) {
            archive.disabled = false;
            setIconButtonLabel(archive, "Tentar arquivar novamente");
            content.append(status(errorMessage(error), "alert"));
          }
        });
        topicActions.append(edit, archive);
      }
      topicActions.append(element(
        document,
        "span",
        "mse-forum__meta",
        `${topic.Author?.Title || "Autor não informado"} · ${formattedDate(topic.Created)}`
      ));
      const answersHeading = element(document, "h3", "mse-forum__answers-title", "Respostas");
      const answers = element(document, "div", "mse-forum__answers");
      let nextAnswers = answerPage.next;

      const answerEditor = async (initialContent = "", contentFormat = "HtmlSeguroV1") => {
        if (contentFormat === "HtmlSeguroV1") {
          if (!renderRichText || !sanitizeRichText) throw new TypeError("O editor HTML exige renderRichText e sanitizeRichText.");
          return richTextEditor(initialContent, "Escreva sua resposta...");
        }
        const textarea = element(document, "textarea", "mse-forum__textarea");
        textarea.required = true;
        textarea.maxLength = 20000;
        textarea.rows = 8;
        textarea.value = initialContent;
        return { root: textarea, contentFormat, getValue: () => textarea.value, focus: () => textarea.focus() };
      };

      const drawAnswer = (answer) => {
        const article = element(document, "article", "mse-forum__answer");
        article.id = `forumResposta-${answer.Id}`;
        const accepted = answer.Id === topic.RespostaAceitaId;
        if (accepted) article.classList.add("mse-forum__answer--accepted");
        if (answer.Id === route.answerId) {
          article.classList.add("mse-forum__answer--highlight");
          article.tabIndex = -1;
        }
        const metaLine = element(document, "span", "mse-forum__meta", `${answer.Author?.Title || "Autor não informado"} · ${formattedDate(answer.Created)}`);
        const answerActions = element(document, "div", "mse-forum__answer-actions");
        answerActions.append(reactionBar("Resposta", answer.Id, reactionSummary[`Resposta:${answer.Id}`]));
        const answerLink = iconButton(document, "a", "mse-forum__icon-button", "link", "Link da resposta");
        answerLink.href = forumRouteUrl(currentHref(), { answerId: answer.Id });
        answerLink.addEventListener("click", (event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate({ answerId: answer.Id });
        });
        answerActions.append(answerLink);
        if (topic.canEdit) {
          const solutionLabel = accepted ? "Remover solução" : "Marcar solução";
          const solution = iconButton(
            document,
            "button",
            `mse-forum__icon-button${accepted ? " mse-forum__icon-button--active" : ""}`,
            "checkSquare",
            solutionLabel
          );
          solution.type = "button";
          solution.addEventListener("click", async () => {
            solution.disabled = true;
            try {
              if (accepted) await service.clearAcceptedAnswer(topic.Id);
              else await service.acceptAnswer({ topicId: topic.Id, answerId: answer.Id });
              if (disposed || sequence !== renderSequence) return;
              await navigate({ answerId: answer.Id });
            } catch (error) {
              solution.disabled = false;
              article.append(status(errorMessage(error), "alert"));
            }
          });
          answerActions.append(solution);
        }
        if (answer.canEdit) {
          const editAnswer = iconButton(document, "button", "mse-forum__icon-button", "edit", "Editar resposta");
          editAnswer.type = "button";
          const archiveAnswer = iconButton(document, "button", "mse-forum__icon-button mse-forum__icon-button--danger", "archive", "Arquivar resposta");
          archiveAnswer.type = "button";
          editAnswer.addEventListener("click", async () => {
            editAnswer.disabled = true;
            try {
              const editableAnswer = await service.getAnswerForEdit(answer.Id);
              if (!editableAnswer || disposed || sequence !== renderSequence) return;
              const editor = await answerEditor(editableAnswer.answer.Conteudo || "", editableAnswer.answer.FormatoConteudo || "TextoSimples");
              const form = element(document, "form", "mse-forum__answer-form");
              const feedback = element(document, "div", "mse-forum__compose-feedback");
              feedback.setAttribute("aria-live", "polite");
              const save = element(document, "button", "mse-forum__button", "Salvar resposta");
              save.type = "submit";
              const cancel = element(document, "button", "mse-forum__button mse-forum__button--secondary", "Cancelar");
              cancel.type = "button";
              cancel.addEventListener("click", () => render());
              const editActions = element(document, "div", "mse-forum__compose-actions");
              editActions.append(save, cancel);
              form.append(editor.root, feedback, editActions);
              form.addEventListener("submit", async (event) => {
                event.preventDefault();
                save.disabled = true;
                feedback.replaceChildren(status("Salvando resposta…"));
                try {
                  await service.updateAnswer({
                    answerId: answer.Id,
                    etag: editableAnswer.etag,
                    content: editor.getValue(),
                    contentFormat: editor.contentFormat
                  });
                  if (disposed || sequence !== renderSequence) return;
                  await navigate({ answerId: answer.Id });
                } catch (error) {
                  save.disabled = false;
                  feedback.replaceChildren(status(errorMessage(error), "alert"));
                }
              });
              article.replaceChildren(form);
              editor.focus();
            } catch (error) {
              editAnswer.disabled = false;
              article.append(status(errorMessage(error), "alert"));
            }
          });
          archiveAnswer.addEventListener("click", async () => {
            if (!windowImpl?.confirm?.("Arquivar esta resposta?")) return;
            archiveAnswer.disabled = true;
            setIconButtonLabel(archiveAnswer, "Arquivando…");
            try {
              await service.archiveAnswer(answer.Id);
              if (disposed || sequence !== renderSequence) return;
              await navigate({ answerId: null });
            } catch (error) {
              archiveAnswer.disabled = false;
              setIconButtonLabel(archiveAnswer, "Tentar arquivar novamente");
              article.append(status(errorMessage(error), "alert"));
            }
          });
          answerActions.append(editAnswer, archiveAnswer);
        }
        answerActions.append(metaLine);
        article.append(publicationBody(answer.Conteudo || "", answer.FormatoConteudo), answerActions);
        answers.append(article);
      };

      answerPage.answers.forEach(drawAnswer);
      if (!answerPage.answers.length) {
        answers.append(status("Este tópico ainda não recebeu respostas.", "status", "mse-forum__status--empty"));
      }
      const loadMoreAnswers = nextAnswers
        ? element(document, "button", "mse-forum__button mse-forum__button--secondary", "Carregar mais respostas")
        : null;
      loadMoreAnswers?.addEventListener("click", async () => {
        loadMoreAnswers.disabled = true;
        loadMoreAnswers.textContent = "Carregando…";
        try {
          const page = await service.listAnswers(topic.Id, { pageSize: 50, cursor: nextAnswers });
          if (disposed || sequence !== renderSequence) return;
          reactionSummary = {
            ...reactionSummary,
            ...await service.listReactions(page.answers.map((answer) => ({ publicationType: "Resposta", publicationId: answer.Id })))
          };
          if (disposed || sequence !== renderSequence) return;
          page.answers.forEach(drawAnswer);
          nextAnswers = page.next;
          if (!nextAnswers) loadMoreAnswers.remove();
          else {
            loadMoreAnswers.disabled = false;
            loadMoreAnswers.textContent = "Carregar mais respostas";
          }
        } catch (error) {
          loadMoreAnswers.disabled = false;
          loadMoreAnswers.textContent = "Tentar novamente";
          answers.append(status(errorMessage(error), "alert"));
        }
      });

      const reply = element(document, "form", "mse-forum__answer-form");
      const replyTitle = element(document, "h3", "mse-forum__answers-title", "Responder");
      const replyEditor = await answerEditor();
      const replyFeedback = element(document, "div", "mse-forum__compose-feedback");
      replyFeedback.setAttribute("aria-live", "polite");
      const replySubmit = element(document, "button", "mse-forum__button", "Publicar resposta");
      replySubmit.type = "submit";
      reply.append(replyTitle, replyEditor.root, replyFeedback, replySubmit);
      reply.addEventListener("submit", async (event) => {
        event.preventDefault();
        replySubmit.disabled = true;
        replyFeedback.replaceChildren(status("Publicando resposta…"));
        try {
          const result = await service.createAnswer({
            topicId: topic.Id,
            content: replyEditor.getValue(),
            contentFormat: replyEditor.contentFormat
          });
          if (disposed || sequence !== renderSequence) return;
          await navigate({ answerId: result.answerId });
        } catch (error) {
          replySubmit.disabled = false;
          replyFeedback.replaceChildren(status(errorMessage(error), "alert"));
        }
      });

      const related = element(document, "section", "mse-forum__related");
      related.append(element(document, "h3", "mse-forum__answers-title", "Tópicos relacionados"));
      const relatedList = element(document, "div", "mse-forum__topic-list");
      for (const item of relatedTopics) relatedList.append(topicCard(item));
      if (!relatedTopics.length) {
        relatedList.append(status("Nenhum tópico relacionado encontrado.", "status", "mse-forum__status--empty"));
      }
      related.append(relatedList);

      content.replaceChildren(
        heading,
        body,
        topicActions,
        answersHeading,
        answers,
        ...(loadMoreAnswers ? [loadMoreAnswers] : []),
        ...(topic.Status === "Arquivado" || topic.Status === "Fechado" ? [] : [reply]),
        related
      );
      const highlighted = route.answerId ? document.getElementById(`forumResposta-${route.answerId}`) : null;
      if (highlighted) {
        highlighted.focus({ preventScroll: true });
        highlighted.scrollIntoView?.({ block: "center", behavior: "smooth" });
      }
    } catch (error) {
      if (disposed || sequence !== renderSequence) return;
      content.replaceChildren(status(errorMessage(error), "alert"));
    }
  }

  function render() {
    const sequence = ++renderSequence;
    const route = readForumRoute(currentHref());
    if (route.compose || (route.edit && route.topicId)) return renderEditor(route, sequence);
    return route.topicId ? renderDetail(route, sequence) : renderList(route, sequence);
  }

  const onPopState = () => render();
  windowImpl?.addEventListener?.("popstate", onPopState);
  render();

  return () => {
    disposed = true;
    renderSequence += 1;
    windowImpl?.removeEventListener?.("popstate", onPopState);
  };
}

// SharePoint's Note field wraps even plain text in <div class="ExternalClass…">
// (and HtmlSeguroV1 carries real markup) — strip tags unconditionally,
// turning line/paragraph breaks into "\n" first so multi-line content
// survives, then decode the handful of entities that survive.
function plainTextFromNote(value) {
  let text = String(value || "");
  if (!text) return "";
  text = text.replace(/<(?:br|\/p|\/div)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return " "; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return " "; } })
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&(?:#39|apos);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// A preview, never rendered: same stripping, collapsed to a single line.
function summaryExcerpt(value) {
  return plainTextFromNote(value).replace(/\s+/g, " ").trim();
}

// Read-only Home-page panel: a two-column preview of recent topics with a
// two-line excerpt and category chips to narrow the view, plus one button
// through to the full Forum page. Filtering is client-side over a single
// fetch — the real experience lives on Forum.aspx (createForumView).
export function createForumSummaryView({ root, service, pageHref, limit = 6, fetchSize = 14 } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listTopics !== "function") {
    throw new TypeError("service deve implementar listTopics().");
  }
  if (typeof pageHref !== "string" || !pageHref) {
    throw new TypeError("pageHref é obrigatório.");
  }

  const document = root.ownerDocument;
  let disposed = false;
  let allTopics = [];
  let activeCategory = null;

  function topicHref(topicId) {
    const url = new URL(pageHref, globalThis.location?.origin ?? "http://localhost");
    url.searchParams.set("forumTopic", String(topicId));
    return `${url.pathname}${url.search}`;
  }

  function categoriesFromTopics() {
    const seen = new Map();
    for (const topic of allTopics) {
      const id = topic.category?.Id;
      if (id && !seen.has(id)) {
        seen.set(id, { id, name: topic.category.Nome || topic.category.Title || "Categoria", color: topic.category.Cor || "#006298" });
      }
    }
    return [...seen.values()];
  }

  function visibleTopics() {
    const filtered = activeCategory === null
      ? allTopics
      : allTopics.filter((topic) => topic.category?.Id === activeCategory);
    return filtered.slice(0, limit);
  }

  function chipRow() {
    const categories = categoriesFromTopics();
    if (categories.length < 2) return null;
    const row = element(document, "div", "mse-forum__summary-chips");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Filtrar por categoria");

    const make = (label, value, color) => {
      const chip = element(document, "button", "mse-forum__summary-chip-btn", label);
      chip.type = "button";
      const on = activeCategory === value;
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) chip.classList.add("mse-forum__summary-chip-btn--on");
      if (color) chip.style.setProperty("--accent", color);
      chip.addEventListener("click", () => {
        if (disposed || activeCategory === value) return;
        activeCategory = value;
        renderShell();
      });
      return chip;
    };

    row.append(make("Todas", null, "#006298"));
    for (const category of categories) row.append(make(category.name, category.id, category.color));
    return row;
  }

  function topicCard(topic) {
    const card = element(document, "a", "mse-forum__summary-card");
    card.href = topicHref(topic.Id);
    card.style.setProperty("--accent", topic.category?.Cor || "#006298");

    card.append(element(document, "span", "mse-forum__summary-card-title", topic.Title || "Tópico sem título"));

    const excerpt = summaryExcerpt(topic.Conteudo);
    if (excerpt) card.append(element(document, "span", "mse-forum__summary-card-excerpt", excerpt));

    const meta = element(document, "span", "mse-forum__summary-card-meta");
    const tag = element(document, "span", "mse-forum__summary-card-tag", topic.category?.Nome || topic.category?.Title || "Geral");
    const count = Number(topic.QuantidadeRespostas ?? 0);
    meta.append(tag, element(document, "span", null, `${count} resposta${count === 1 ? "" : "s"}`));
    card.append(meta);
    return card;
  }

  function renderShell() {
    const panel = element(document, "section", "mse-forum__summary");

    const header = element(document, "div", "mse-forum__summary-header");
    header.append(element(document, "h2", "mse-forum__summary-title", "Fórum"));
    const cta = element(document, "a", "mse-forum__summary-cta", "Ver fórum completo");
    cta.href = pageHref;
    header.append(cta);
    panel.append(header);

    const chips = chipRow();
    if (chips) panel.append(chips);

    const list = element(document, "div", "mse-forum__summary-list");
    const topics = visibleTopics();
    list.replaceChildren(...(topics.length
      ? topics.map(topicCard)
      : [element(document, "p", "mse-forum__summary-empty", "Nenhum tópico nesta categoria.")]));
    panel.append(list);

    root.replaceChildren(panel);
  }

  async function render() {
    try {
      const { topics } = await service.listTopics({ view: "recent", sort: "recentes", pageSize: fetchSize });
      if (disposed) return;
      allTopics = topics;
      if (!allTopics.length) {
        root.replaceChildren(element(document, "p", "mse-forum__summary-empty", "Nenhum tópico publicado ainda."));
        return;
      }
      renderShell();
    } catch (error) {
      if (disposed) return;
      root.replaceChildren(element(document, "p", "mse-forum__summary-empty", errorMessage(error)));
    }
  }

  render();

  return () => {
    disposed = true;
  };
}
