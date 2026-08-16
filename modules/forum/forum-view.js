import { createForumRichTextEditor } from "./forum-editor.js";

const VIEWS = new Set(["recent", "unanswered", "resolved", "pinned"]);

const VIEW_LABELS = Object.freeze({
  recent: "Recentes",
  unanswered: "Sem resposta",
  resolved: "Resolvidos",
  pinned: "Fixados"
});

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export function readForumRoute(input = globalThis.location?.href) {
  const url = new URL(input, globalThis.location?.origin ?? "http://localhost");
  const requestedView = url.searchParams.get("forumView");
  const search = (url.searchParams.get("forumSearch") ?? "").trim().slice(0, 100);
  return Object.freeze({
    view: VIEWS.has(requestedView) ? requestedView : "recent",
    categoryId: positiveInteger(url.searchParams.get("forumCategory")),
    tagId: positiveInteger(url.searchParams.get("forumTag")),
    topicId: positiveInteger(url.searchParams.get("forumTopic")),
    answerId: positiveInteger(url.searchParams.get("forumAnswer")),
    compose: url.searchParams.get("forumCompose") === "1",
    edit: url.searchParams.get("forumEdit") === "1",
    search
  });
}

export function forumRouteUrl(input, changes = {}) {
  const url = new URL(input, globalThis.location?.origin ?? "http://localhost");
  const current = readForumRoute(url);
  const next = { ...current, ...changes };
  const mappings = [
    ["forumView", next.view === "recent" ? null : next.view],
    ["forumCategory", next.categoryId],
    ["forumTag", next.tagId],
    ["forumTopic", next.topicId],
    ["forumAnswer", next.answerId],
    ["forumCompose", next.compose ? 1 : null],
    ["forumEdit", next.edit ? 1 : null],
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

  function status(text, role = "status") {
    const node = element(document, "p", "mse-forum__status", text);
    node.setAttribute("role", role);
    return node;
  }

  function publicationBody(value, format) {
    const node = element(document, "div", "mse-forum__body");
    if (format === "HtmlSeguroV1" && renderRichText) {
      node.classList.add("mse-forum__body--rich");
      renderRichText(node, value || "");
    } else node.textContent = value || "Sem conteúdo.";
    return node;
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

  async function renderList(route, sequence) {
    const shell = element(document, "section", "mse-forum");
    const header = element(document, "header", "mse-forum__header");
    const heading = element(document, "h2", "mse-forum__title", "Fórum de discussões");
    const description = element(
      document,
      "p",
      "mse-forum__description",
      "Compartilhe conhecimento, tire dúvidas e encontre soluções construídas pela comunidade."
    );
    const createLink = element(document, "a", "mse-forum__button mse-forum__create-link", "Novo tópico");
    createLink.href = forumRouteUrl(currentHref(), { compose: true, topicId: null });
    createLink.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ compose: true, topicId: null });
    });
    header.append(heading, description, createLink);

    const tabs = element(document, "nav", "mse-forum__tabs");
    tabs.setAttribute("aria-label", "Visões do fórum");
    for (const [view, label] of Object.entries(VIEW_LABELS)) {
      const link = element(document, "a", "mse-forum__tab", label);
      link.href = forumRouteUrl(currentHref(), { view, topicId: null });
      if (view === route.view) {
        link.classList.add("mse-forum__tab--active");
        link.setAttribute("aria-current", "page");
      }
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate({ view, topicId: null });
      });
      tabs.append(link);
    }

    const filters = element(document, "form", "mse-forum__filters");
    const searchLabel = element(document, "label", "mse-forum__field");
    searchLabel.append(element(document, "span", "mse-forum__field-label", "Buscar por título"));
    const search = element(document, "input", "mse-forum__input");
    search.type = "search";
    search.name = "forumSearch";
    search.maxLength = 100;
    search.value = route.search;
    searchLabel.append(search);

    const categoryLabel = element(document, "label", "mse-forum__field");
    categoryLabel.append(element(document, "span", "mse-forum__field-label", "Categoria"));
    const category = element(document, "select", "mse-forum__select");
    category.name = "forumCategory";
    category.append(element(document, "option", null, "Todas as categorias"));
    categoryLabel.append(category);

    const tagLabel = element(document, "label", "mse-forum__field");
    tagLabel.append(element(document, "span", "mse-forum__field-label", "Tag"));
    const tag = element(document, "select", "mse-forum__select");
    tag.name = "forumTag";
    tag.append(element(document, "option", null, "Todas as tags"));
    tagLabel.append(tag);
    const submit = element(document, "button", "mse-forum__button", "Aplicar filtros");
    submit.type = "submit";
    filters.append(searchLabel, categoryLabel, tagLabel, submit);
    filters.addEventListener("submit", (event) => {
      event.preventDefault();
      navigate({
        search: search.value.trim().slice(0, 100),
        categoryId: positiveInteger(category.value),
        tagId: positiveInteger(tag.value),
        topicId: null
      });
    });

    const content = element(document, "div", "mse-forum__content");
    content.append(status("Carregando tópicos…"));
    shell.append(header, tabs, filters, content);
    root.replaceChildren(shell);

    try {
      const [categories, tags, firstPage, contributors] = await Promise.all([
        service.listTaxonomy({ type: "Categoria" }),
        service.listTaxonomy({ type: "Tag" }),
        service.listTopics({
          view: route.view,
          categoryId: route.categoryId,
          tagId: route.tagId,
          search: route.search,
          pageSize
        }),
        service.listContributors({ limit: 5 })
      ]);
      if (disposed || sequence !== renderSequence) return;

      for (const item of categories) {
        const option = element(document, "option", null, item.Title);
        option.value = String(item.Id);
        option.selected = item.Id === route.categoryId;
        category.append(option);
      }
      for (const item of tags) {
        const option = element(document, "option", null, item.Title);
        option.value = String(item.Id);
        option.selected = item.Id === route.tagId;
        tag.append(option);
      }

      const contributorPanel = element(document, "section", "mse-forum__contributors");
      contributorPanel.append(element(document, "h3", "mse-forum__answers-title", "Destaques da comunidade"));
      const contributorList = element(document, "ol", "mse-forum__contributor-list");
      for (const contributor of contributors) {
        const item = element(document, "li", "mse-forum__contributor");
        item.append(
          element(document, "span", "mse-forum__contributor-name", contributor.name),
          element(document, "span", "mse-forum__contributor-meta", `${contributor.score} pts · ${contributor.topics} tópico${contributor.topics === 1 ? "" : "s"} · ${contributor.answers} resposta${contributor.answers === 1 ? "" : "s"}`)
        );
        contributorList.append(item);
      }
      contributorPanel.append(contributorList.childElementCount ? contributorList : status("Ainda não há participação suficiente para ranking."));

      const list = element(document, "div", "mse-forum__topic-list");
      const topics = [...firstPage.topics];
      let next = firstPage.next;
      const drawTopics = (items) => items.forEach((topic) => list.append(topicCard(topic)));
      drawTopics(topics);

      if (!topics.length && !next) {
        content.replaceChildren(status("Nenhum tópico corresponde aos filtros selecionados."));
        return;
      }

      content.replaceChildren(contributorPanel, list);
      let emptyPageMessage = null;
      if (!topics.length) {
        emptyPageMessage = status("Nenhum tópico encontrado neste trecho. Continue a busca.");
        content.prepend(emptyPageMessage);
      }
      if (next) {
        const more = element(document, "button", "mse-forum__button mse-forum__button--secondary", "Carregar mais");
        more.type = "button";
        more.addEventListener("click", async () => {
          more.disabled = true;
          more.textContent = "Carregando…";
          try {
            const page = await service.listTopics({
              view: route.view,
              categoryId: route.categoryId,
              tagId: route.tagId,
              search: route.search,
              pageSize,
              cursor: next
            });
            if (disposed || sequence !== renderSequence) return;
            drawTopics(page.topics);
            if (page.topics.length) {
              emptyPageMessage?.remove();
              emptyPageMessage = null;
            }
            next = page.next;
            if (!next) more.remove();
            else {
              more.disabled = false;
              more.textContent = "Carregar mais";
            }
          } catch (error) {
            more.disabled = false;
            more.textContent = "Tentar novamente";
            content.append(status(errorMessage(error), "alert"));
          }
        });
        content.append(more);
      }
    } catch (error) {
      if (disposed || sequence !== renderSequence) return;
      content.replaceChildren(status(errorMessage(error), "alert"));
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
        richEditor = createForumRichTextEditor({
          document,
          value: initialContent,
          renderRichText,
          sanitizeRichText,
          promptImpl: windowImpl?.prompt?.bind(windowImpl)
        });
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
    const back = element(document, "a", "mse-forum__back", "← Voltar aos tópicos");
    back.href = forumRouteUrl(currentHref(), { topicId: null, answerId: null });
    back.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate({ topicId: null, answerId: null });
    });
    const content = element(document, "div", "mse-forum__content");
    content.append(status("Carregando discussão…"));
    shell.append(back, content);
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
        for (const [reactionType, label] of [["Gostei", "Gostei"], ["Util", "Útil"], ["Excelente", "Excelente"]]) {
          const button = element(document, "button", "mse-forum__reaction", `${label} ${summary[reactionType] ?? 0}`);
          button.type = "button";
          button.setAttribute("aria-pressed", summary.mine?.includes(reactionType) ? "true" : "false");
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

      const heading = element(document, "h2", "mse-forum__title", topic.Title || "Tópico sem título");
      const meta = element(
        document,
        "p",
        "mse-forum__meta",
        `${topic.Author?.Title || "Autor não informado"} · ${formattedDate(topic.Created)}`
      );
      const body = publicationBody(topic.Conteudo, topic.FormatoConteudo);
      const topicActions = element(document, "div", "mse-forum__topic-actions");
      topicActions.append(reactionBar("Topico", topic.Id, reactionSummary[`Topico:${topic.Id}`]));
      if (topic.canEdit) {
        const edit = element(document, "a", "mse-forum__button", "Editar tópico");
        edit.href = forumRouteUrl(currentHref(), { edit: true });
        edit.addEventListener("click", (event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate({ edit: true });
        });
        const archive = element(document, "button", "mse-forum__button mse-forum__button--danger", "Arquivar tópico");
        archive.type = "button";
        archive.addEventListener("click", async () => {
          if (!windowImpl?.confirm?.("Arquivar este tópico? Ele deixará de aparecer nas listagens.")) return;
          archive.disabled = true;
          archive.textContent = "Arquivando…";
          try {
            await service.archiveTopic(topic.Id);
            if (disposed || sequence !== renderSequence) return;
            await navigate({ topicId: null, edit: null });
          } catch (error) {
            archive.disabled = false;
            archive.textContent = "Tentar arquivar novamente";
            content.append(status(errorMessage(error), "alert"));
          }
        });
        topicActions.append(edit, archive);
      }
      const answersHeading = element(document, "h3", "mse-forum__answers-title", "Respostas");
      const answers = element(document, "div", "mse-forum__answers");
      let nextAnswers = answerPage.next;

      const answerEditor = (initialContent = "", contentFormat = "HtmlSeguroV1") => {
        if (contentFormat === "HtmlSeguroV1") {
          if (!renderRichText || !sanitizeRichText) throw new TypeError("O editor HTML exige renderRichText e sanitizeRichText.");
          const editor = createForumRichTextEditor({
            document,
            value: initialContent,
            renderRichText,
            sanitizeRichText,
            promptImpl: windowImpl?.prompt?.bind(windowImpl)
          });
          return { root: editor.root, contentFormat, getValue: editor.getValue, focus: () => editor.editor.focus() };
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
        const metaLine = element(document, "p", "mse-forum__meta", `${answer.Author?.Title || "Autor não informado"} · ${formattedDate(answer.Created)}`);
        const answerActions = element(document, "div", "mse-forum__answer-actions");
        if (accepted) answerActions.append(element(document, "span", "mse-forum__badge mse-forum__badge--accepted", "Solução aceita"));
        answerActions.append(reactionBar("Resposta", answer.Id, reactionSummary[`Resposta:${answer.Id}`]));
        const answerLink = element(document, "a", "mse-forum__back", "Link da resposta");
        answerLink.href = forumRouteUrl(currentHref(), { answerId: answer.Id });
        answerLink.addEventListener("click", (event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          navigate({ answerId: answer.Id });
        });
        answerActions.append(answerLink);
        if (topic.canEdit) {
          const solution = element(
            document,
            "button",
            "mse-forum__button mse-forum__button--secondary",
            accepted ? "Remover solução" : "Marcar solução"
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
          const editAnswer = element(document, "button", "mse-forum__button mse-forum__button--secondary", "Editar resposta");
          editAnswer.type = "button";
          const archiveAnswer = element(document, "button", "mse-forum__button mse-forum__button--danger", "Arquivar resposta");
          archiveAnswer.type = "button";
          editAnswer.addEventListener("click", async () => {
            editAnswer.disabled = true;
            try {
              const editableAnswer = await service.getAnswerForEdit(answer.Id);
              if (!editableAnswer || disposed || sequence !== renderSequence) return;
              const editor = answerEditor(editableAnswer.answer.Conteudo || "", editableAnswer.answer.FormatoConteudo || "TextoSimples");
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
              article.replaceChildren(metaLine, form);
              editor.focus();
            } catch (error) {
              editAnswer.disabled = false;
              article.append(status(errorMessage(error), "alert"));
            }
          });
          archiveAnswer.addEventListener("click", async () => {
            if (!windowImpl?.confirm?.("Arquivar esta resposta?")) return;
            archiveAnswer.disabled = true;
            archiveAnswer.textContent = "Arquivando…";
            try {
              await service.archiveAnswer(answer.Id);
              if (disposed || sequence !== renderSequence) return;
              await navigate({ answerId: null });
            } catch (error) {
              archiveAnswer.disabled = false;
              archiveAnswer.textContent = "Tentar arquivar novamente";
              article.append(status(errorMessage(error), "alert"));
            }
          });
          answerActions.append(editAnswer, archiveAnswer);
        }
        article.append(metaLine, publicationBody(answer.Conteudo || "", answer.FormatoConteudo), answerActions);
        answers.append(article);
      };

      answerPage.answers.forEach(drawAnswer);
      if (!answerPage.answers.length) answers.append(status("Este tópico ainda não recebeu respostas."));
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
      const replyEditor = answerEditor();
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
      if (!relatedTopics.length) relatedList.append(status("Nenhum tópico relacionado encontrado."));
      related.append(relatedList);

      content.replaceChildren(
        heading,
        meta,
        body,
        topicActions,
        answersHeading,
        answers,
        ...(loadMoreAnswers ? [loadMoreAnswers] : []),
        related,
        ...(topic.Status === "Arquivado" || topic.Status === "Fechado" ? [] : [reply])
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
