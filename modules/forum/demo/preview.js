import { mountModule } from "../../../core/core.js";
import { renderRichText, sanitizeRichText } from "../../../core/rich-text.js";
import { createForumView } from "../forum-view.js";

const reportPreviewError = (error) => {
  const status = document.querySelector("#forum-demo-status");
  if (!status) return;
  status.textContent = `Falha no preview: ${error?.stack ?? error?.message ?? error}`;
  status.dataset.mseTestStatus = "failed";
};
addEventListener("error", (event) => reportPreviewError(event.error ?? event.message));
addEventListener("unhandledrejection", (event) => reportPreviewError(event.reason));

const taxonomy = [
  { Id: 1, Title: "SharePoint", Tipo: "Categoria" },
  { Id: 2, Title: "JavaScript", Tipo: "Categoria" },
  { Id: 20, Title: "REST", Tipo: "Tag" },
  { Id: 21, Title: "ETag", Tipo: "Tag" },
  { Id: 22, Title: "CSS", Tipo: "Tag" },
  { Id: 23, Title: "Listas", Tipo: "Tag" }
];
const topics = [
  {
    Id: 10,
    Title: "Como tratar concorrência com ETag?",
    Conteudo: '<p onclick="alert(1)">Estou atualizando um item e quero evitar <strong>sobrescrever</strong> alterações de outra pessoa.</p><script>globalThis.forumXss = true</script>',
    FormatoConteudo: "HtmlSeguroV1",
    CategoriaId: 1,
    Status: "Aberto",
    Fixado: true,
    QuantidadeRespostas: 2,
    QuantidadeVisualizacoes: 48,
    Pontuacao: 12,
    UltimaAtividade: "2026-08-15T14:00:00Z",
    Created: "2026-08-15T12:00:00Z",
    Author: { Title: "Ana Silva" },
    canEdit: true,
    category: taxonomy[0],
    tags: [{ Id: 20, Title: "REST" }, { Id: 21, Title: "ETag" }]
  },
  {
    Id: 11,
    Title: "Modern Script Editor com layout full bleed",
    Conteudo: "Exemplo de layout sem alterar o shell da página.",
    CategoriaId: 2,
    Status: "Resolvido",
    Fixado: false,
    QuantidadeRespostas: 4,
    QuantidadeVisualizacoes: 105,
    Pontuacao: 23,
    UltimaAtividade: "2026-08-14T16:30:00Z",
    Created: "2026-08-14T09:00:00Z",
    Author: { Title: "Bruno Costa" },
    category: taxonomy[1],
    tags: [{ Id: 22, Title: "CSS" }]
  },
  {
    Id: 12,
    Title: "Como organizar nomes internos das listas?",
    Conteudo: "Qual é a melhor forma de preservar nomes amigáveis com acentos?",
    CategoriaId: 1,
    Status: "Aberto",
    Fixado: false,
    QuantidadeRespostas: 0,
    QuantidadeVisualizacoes: 17,
    Pontuacao: 3,
    UltimaAtividade: "2026-08-13T10:15:00Z",
    Created: "2026-08-13T10:15:00Z",
    Author: { Title: "Carla Lima" },
    category: taxonomy[0],
    tags: [{ Id: 23, Title: "Listas" }]
  }
];
const answers = [
  {
    Id: 31,
    TopicoId: 10,
    Conteudo: "Leia a ETag atual e envie o mesmo valor em If-Match.",
    FormatoConteudo: "TextoSimples",
    Status: "Publicada",
    Created: "2026-08-15T12:30:00Z",
    Author: { Title: "Diego Santos" },
    canEdit: false
  },
  {
    Id: 32,
    TopicoId: 10,
    Conteudo: '<p>Se receber <code class="language-http">HTTP 412</code>, recarregue antes de tentar novamente.</p>',
    FormatoConteudo: "HtmlSeguroV1",
    Status: "Publicada",
    Created: "2026-08-15T13:00:00Z",
    Author: { Title: "Elisa Rocha" },
    canEdit: true
  }
];
const reactions = [];
let draft = null;
let topicWrites = 0;
let draftWrites = 0;
let nextAnswerId = 33;

const service = {
  async listTaxonomy({ type } = {}) { return taxonomy.filter((item) => !type || item.Tipo === type); },
  async listTopics({ view, categoryId, tagId, search }) {
    let result = topics;
    if (view === "recent") result = result.filter((topic) => topic.Status !== "Arquivado");
    if (view === "unanswered") result = result.filter((topic) => topic.QuantidadeRespostas === 0);
    if (view === "resolved") result = result.filter((topic) => topic.Status === "Resolvido");
    if (view === "pinned") result = result.filter((topic) => topic.Fixado);
    if (categoryId) result = result.filter((topic) => topic.CategoriaId === categoryId);
    if (tagId) result = result.filter((topic) => topic.tags.some((tag) => tag.Id === tagId));
    if (search) result = result.filter((topic) => topic.Title.toLowerCase().includes(search.toLowerCase()));
    return { topics: result, next: null };
  },
  async listContributors({ limit = 5 } = {}) {
    const scores = new Map();
    const bump = (author, values) => {
      const current = scores.get(author.Title) ?? { name: author.Title, topics: 0, answers: 0, points: 0, score: 0 };
      current.topics += values.topics ?? 0;
      current.answers += values.answers ?? 0;
      current.points += values.points ?? 0;
      current.score += values.score ?? 0;
      scores.set(author.Title, current);
    };
    for (const topic of topics) bump(topic.Author, {
      topics: 1,
      points: topic.Pontuacao,
      score: 5 + topic.QuantidadeRespostas + topic.Pontuacao
    });
    for (const answer of answers.filter((item) => item.Status === "Publicada")) bump(answer.Author, {
      answers: 1,
      points: answer.Pontuacao ?? 0,
      score: 2 + (answer.Pontuacao ?? 0)
    });
    return [...scores.values()].sort((left, right) => right.score - left.score).slice(0, limit);
  },
  async getTopic(id) { return topics.find((topic) => topic.Id === Number(id)) ?? null; },
  async listAnswers(topicId) {
    return { answers: answers.filter((answer) => answer.TopicoId === Number(topicId) && answer.Status === "Publicada"), next: null };
  },
  async createAnswer({ topicId, content, contentFormat }) {
    const topic = topics.find((item) => item.Id === Number(topicId));
    const answer = {
      Id: nextAnswerId,
      TopicoId: topic.Id,
      Conteudo: contentFormat === "HtmlSeguroV1" ? sanitizeRichText(content) : content.trim(),
      FormatoConteudo: contentFormat,
      Status: "Publicada",
      Created: new Date().toISOString(),
      Author: { Title: "Usuário de demonstração" },
      canEdit: true
    };
    nextAnswerId += 1;
    answers.push(answer);
    topic.QuantidadeRespostas += 1;
    topic.UltimaAtividade = answer.Created;
    return { answerId: answer.Id, topicId: topic.Id };
  },
  async getAnswerForEdit(id) {
    const answer = answers.find((item) => item.Id === Number(id) && item.Status === "Publicada");
    return answer?.canEdit ? { answer, etag: `"answer-${answer.Id}"` } : null;
  },
  async updateAnswer({ answerId, content, contentFormat }) {
    const answer = answers.find((item) => item.Id === Number(answerId));
    answer.Conteudo = contentFormat === "HtmlSeguroV1" ? sanitizeRichText(content) : content.trim();
    answer.FormatoConteudo = contentFormat;
    return { answerId: answer.Id, topicId: answer.TopicoId };
  },
  async archiveAnswer(id) {
    const answer = answers.find((item) => item.Id === Number(id));
    const topic = topics.find((item) => item.Id === answer.TopicoId);
    answer.Status = "Arquivada";
    topic.QuantidadeRespostas = Math.max(0, topic.QuantidadeRespostas - 1);
    return { answerId: answer.Id, topicId: answer.TopicoId, status: answer.Status };
  },
  async listReactions(publications) {
    const summary = {};
    for (const item of publications) {
      summary[`${item.publicationType}:${item.publicationId}`] = { Gostei: 0, Util: 0, Excelente: 0, mine: [] };
    }
    for (const reaction of reactions) {
      const key = `${reaction.publicationType}:${reaction.publicationId}`;
      if (!summary[key]) continue;
      summary[key][reaction.reactionType] += 1;
      summary[key].mine.push(reaction.reactionType);
    }
    return summary;
  },
  async toggleReaction({ publicationType, publicationId, reactionType }) {
    const index = reactions.findIndex((item) =>
      item.publicationType === publicationType
      && item.publicationId === publicationId
      && item.reactionType === reactionType
    );
    const active = index < 0;
    if (active) reactions.push({ publicationType, publicationId, reactionType });
    else reactions.splice(index, 1);
    const collection = publicationType === "Topico" ? topics : answers;
    const record = collection.find((item) => item.Id === Number(publicationId));
    record.Pontuacao = Math.max(0, (record.Pontuacao ?? 0) + (active ? 1 : -1));
    return { publicationType, publicationId, reactionType, active };
  },
  async acceptAnswer({ topicId, answerId }) {
    const topic = topics.find((item) => item.Id === Number(topicId));
    topic.RespostaAceitaId = Number(answerId);
    topic.Status = "Resolvido";
    return { topicId: topic.Id, answerId: topic.RespostaAceitaId, status: topic.Status };
  },
  async clearAcceptedAnswer(topicId) {
    const topic = topics.find((item) => item.Id === Number(topicId));
    topic.RespostaAceitaId = null;
    topic.Status = "Aberto";
    return { topicId: topic.Id, answerId: null, status: topic.Status };
  },
  async createTopic({ title, content, contentFormat, categoryId, tagIds }) {
    topicWrites += 1;
    const topic = {
      Id: 13,
      Title: title.trim(),
      Conteudo: contentFormat === "HtmlSeguroV1" ? sanitizeRichText(content) : content.trim(),
      FormatoConteudo: contentFormat,
      CategoriaId: categoryId,
      Status: "Aberto",
      Fixado: false,
      QuantidadeRespostas: 0,
      QuantidadeVisualizacoes: 0,
      Pontuacao: 0,
      UltimaAtividade: new Date().toISOString(),
      Created: new Date().toISOString(),
      Author: { Title: "Usuário de demonstração" },
      canEdit: true,
      category: taxonomy.find((item) => item.Id === categoryId),
      tags: taxonomy.filter((item) => tagIds.includes(item.Id))
    };
    topics.unshift(topic);
    return { topicId: topic.Id, tagIds };
  },
  async getTopicForEdit(id) {
    const topic = topics.find((item) => item.Id === Number(id));
    return topic ? { topic, etag: `"topic-${topic.Id}"` } : null;
  },
  async updateTopic({ topicId, title, content, contentFormat, categoryId, tagIds }) {
    topicWrites += 1;
    const topic = topics.find((item) => item.Id === Number(topicId));
    topic.Title = title.trim();
    topic.Conteudo = contentFormat === "HtmlSeguroV1" ? sanitizeRichText(content) : content.trim();
    topic.FormatoConteudo = contentFormat;
    topic.CategoriaId = categoryId;
    topic.category = taxonomy.find((item) => item.Id === categoryId);
    topic.tags = taxonomy.filter((item) => tagIds.includes(item.Id));
    return { topicId: topic.Id, tagIds };
  },
  async archiveTopic(id) {
    const topic = topics.find((item) => item.Id === Number(id));
    topic.Status = "Arquivado";
    topic.canEdit = false;
    return { topicId: topic.Id, status: topic.Status };
  },
  async loadTopicDraft() { return draft ? { id: 60, ...draft } : null; },
  async saveTopicDraft(values) {
    draftWrites += 1;
    draft = {
      ...values,
      content: values.contentFormat === "HtmlSeguroV1" ? sanitizeRichText(values.content) : values.content
    };
    return { id: 60, ...draft };
  },
  async deleteTopicDraft() {
    const existed = Boolean(draft);
    draft = null;
    return existed;
  }
};

const waitFor = async (predicate) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
};

const demoWindow = Object.create(window);
demoWindow.confirm = () => true;
demoWindow.addEventListener = window.addEventListener.bind(window);
demoWindow.removeEventListener = window.removeEventListener.bind(window);
demoWindow.prompt = window.prompt.bind(window);

const result = await mountModule({
  name: "forum",
  selector: '[data-mse-module="forum"]',
  moduleDefaults: { layout: { mode: "fullBleed" } },
  render({ root }) { return createForumView({ root, service, renderRichText, sanitizeRichText, windowImpl: demoWindow }); }
});

const contentField = () => document.querySelector('[name="forumContent"]');
const setContent = (value) => {
  const field = contentField();
  if (field.matches("textarea")) field.value = value;
  else field.innerHTML = value;
};

const checks = [];
checks.push(result.mounted.length === 1);
checks.push(await waitFor(() => document.querySelectorAll(".mse-forum__topic").length === 3));
const forumRoot = document.querySelector('[data-mse-module="forum"]');
const forumShellStyle = getComputedStyle(document.querySelector(".mse-forum"));
checks.push(forumRoot.classList.contains("mse-app--full-bleed"));
checks.push(forumShellStyle.borderLeftWidth === "0px" && forumShellStyle.borderRightWidth === "0px");
checks.push(forumShellStyle.borderRadius === "0px" && forumShellStyle.boxShadow === "none");
checks.push(parseFloat(forumShellStyle.paddingLeft) >= 16 && parseFloat(forumShellStyle.paddingRight) >= 16);
checks.push(document.querySelectorAll(".mse-forum__tab").length === 4);
checks.push(document.querySelector(".mse-forum__contributors")?.textContent.includes("Bruno Costa"));

const tag = document.querySelector('[name="forumTag"]');
tag.value = "21";
document.querySelector(".mse-forum__filters").requestSubmit();
checks.push(await waitFor(() => document.querySelectorAll(".mse-forum__topic").length === 1));
checks.push(location.search.includes("forumTag=21"));

const search = document.querySelector(".mse-forum__input");
search.value = "ETag";
document.querySelector(".mse-forum__filters").requestSubmit();
checks.push(await waitFor(() => document.querySelectorAll(".mse-forum__topic").length === 1));

document.querySelector(".mse-forum__topic-link").click();
checks.push(await waitFor(() => document.querySelectorAll(".mse-forum__answer").length === 2));
const detailTitleRect = document.querySelector(".mse-forum__title").getBoundingClientRect();
const detailBodyRect = document.querySelector(".mse-forum__body").getBoundingClientRect();
checks.push(Math.abs(detailTitleRect.left - detailBodyRect.left) < 1
  && Math.abs(detailTitleRect.right - detailBodyRect.right) < 1);
checks.push(document.querySelector(".mse-forum__body strong")?.textContent === "sobrescrever");
checks.push(!document.querySelector(".mse-forum__body script") && !globalThis.forumXss);
checks.push([...document.querySelectorAll(".mse-forum__related .mse-forum__topic-link")]
  .some((link) => link.textContent.includes("nomes internos")));
document.querySelector(".mse-forum__topic-actions .mse-forum__reaction").click();
checks.push(await waitFor(() => document.querySelector(".mse-forum__topic-actions .mse-forum__reaction")?.getAttribute("aria-pressed") === "true"));
document.querySelector("#forumResposta-32 .mse-forum__reaction").click();
checks.push(await waitFor(() => document.querySelector("#forumResposta-32 .mse-forum__reaction")?.getAttribute("aria-pressed") === "true"));
[...document.querySelectorAll("#forumResposta-32 .mse-forum__button--secondary")]
  .find((button) => button.textContent.includes("Marcar"))
  .click();
checks.push(await waitFor(() => document.querySelector("#forumResposta-32 .mse-forum__badge--accepted")));
const replyEditor = document.querySelector(".mse-forum__answer-form [role='textbox']");
replyEditor.innerHTML = '<p onclick="alert(1)">Resposta pelo <strong>smoke</strong>.</p><script>globalThis.answerXss=true</script>';
document.querySelector(".mse-forum__answer-form").requestSubmit();
checks.push(await waitFor(() => location.search.includes("forumAnswer=33")));
checks.push(document.querySelector(".mse-forum__answer--highlight .mse-forum__body strong")?.textContent === "smoke");
checks.push(!document.querySelector(".mse-forum__answer--highlight script") && !globalThis.answerXss);
[...document.querySelectorAll(".mse-forum__answer--highlight .mse-forum__button--secondary")]
  .find((button) => button.textContent.includes("Editar"))
  .click();
checks.push(await waitFor(() => document.querySelector(".mse-forum__answer--highlight .mse-forum__answer-form")));
document.querySelector(".mse-forum__answer--highlight [role='textbox']").innerHTML = "<p>Resposta <strong>editada</strong>.</p>";
document.querySelector(".mse-forum__answer--highlight .mse-forum__answer-form").requestSubmit();
checks.push(await waitFor(() => document.querySelector(".mse-forum__answer--highlight .mse-forum__body strong")?.textContent === "editada"
  && !document.querySelector(".mse-forum__answer--highlight .mse-forum__answer-form")));
document.querySelector(".mse-forum__answer--highlight .mse-forum__button--danger").click();
checks.push(await waitFor(() => !location.search.includes("forumAnswer=33")));
checks.push(document.querySelectorAll(".mse-forum__answer").length === 2);
history.pushState({}, "", location.pathname);
dispatchEvent(new PopStateEvent("popstate"));
checks.push(await waitFor(() => document.querySelectorAll(".mse-forum__topic").length === 3));

document.querySelector(".mse-forum__create-link").click();
checks.push(await waitFor(() => document.querySelector('.mse-forum__compose-form')));
checks.push(document.querySelectorAll(".mse-forum__editor-toolbar button").length === 8);
const editor = contentField();
editor.focus();
const pasteRange = document.createRange();
pasteRange.selectNodeContents(editor);
pasteRange.collapse(false);
document.getSelection().removeAllRanges();
document.getSelection().addRange(pasteRange);
const paste = new Event("paste", { bubbles: true, cancelable: true });
Object.defineProperty(paste, "clipboardData", {
  value: { getData: (type) => type === "text/html"
    ? '<p onclick="alert(1)">Colagem <strong>segura</strong><img src="https://example.test/rastreio.png"></p><script>globalThis.pasteXss=true</script>'
    : "" }
});
editor.dispatchEvent(paste);
checks.push(editor.querySelector("strong")?.textContent === "segura");
checks.push(!editor.querySelector("script, [onclick]")
  && editor.querySelector('img[src="https://example.test/rastreio.png"]')
  && !globalThis.pasteXss);
editor.replaceChildren();
document.querySelector('[name="forumTitle"]').value = "Como criar um tópico?";
document.querySelector('.mse-forum__save-draft').click();
checks.push(await waitFor(() => document.querySelector('.mse-forum__compose-feedback')?.textContent.includes("salvo")));
document.querySelector(".mse-forum__back").click();
checks.push(await waitFor(() => document.querySelector(".mse-forum__create-link")));
document.querySelector(".mse-forum__create-link").click();
checks.push(await waitFor(() => document.querySelector('[name="forumTitle"]')?.value === "Como criar um tópico?"));
setContent('<p onclick="alert(1)">Conteúdo criado pelo <strong>teste</strong> do formulário.</p><img src="https://example.test/rastreio.png"><script>globalThis.previewXss=true</script>');
document.querySelector('.mse-forum__compose-form [name="forumCategory"]').value = "1";
document.querySelector('[name="forumTags"][value="20"]').checked = true;
const writesBeforePreview = topicWrites + draftWrites;
document.querySelector(".mse-forum__preview-button").click();
checks.push(await waitFor(() => !document.querySelector(".mse-forum__compose-preview").hidden));
checks.push(document.querySelector(".mse-forum__compose-preview .mse-forum__preview-title")?.textContent === "Como criar um tópico?");
checks.push(document.querySelector(".mse-forum__compose-preview .mse-forum__body strong")?.textContent === "teste");
checks.push(!document.querySelector(".mse-forum__compose-preview script, .mse-forum__compose-preview [onclick]")
  && document.querySelector('.mse-forum__compose-preview img[src="https://example.test/rastreio.png"]')
  && !globalThis.previewXss);
checks.push(topicWrites + draftWrites === writesBeforePreview);
document.querySelector(".mse-forum__compose-form").requestSubmit();
checks.push(await waitFor(() => document.querySelector(".mse-forum__title")?.textContent === "Como criar um tópico?"));
checks.push(location.search.includes("forumTopic=13"));
checks.push(draft === null);
checks.push(document.querySelector(".mse-forum__body strong")?.textContent === "teste");
checks.push(document.querySelectorAll(".mse-forum__topic-actions .mse-forum__button").length === 2);

document.querySelector(".mse-forum__topic-actions .mse-forum__button").click();
checks.push(await waitFor(() => document.querySelector('[name="forumTitle"]')?.value === "Como criar um tópico?"));
document.querySelector('[name="forumTitle"]').value = "Como editar um tópico?";
document.querySelector('[name="forumTags"][value="20"]').checked = false;
document.querySelector('[name="forumTags"][value="21"]').checked = true;
document.querySelector(".mse-forum__compose-form").requestSubmit();
checks.push(await waitFor(() => document.querySelector(".mse-forum__title")?.textContent === "Como editar um tópico?"));

history.pushState({}, "", location.pathname);
dispatchEvent(new PopStateEvent("popstate"));
checks.push(await waitFor(() => document.querySelectorAll(".mse-forum__topic").length === 4));
checks.push(document.documentElement.scrollWidth <= document.documentElement.clientWidth);
document.querySelector(".mse-forum__topic-link").click();
checks.push(await waitFor(() => document.querySelector(".mse-forum__title")?.textContent === "Como editar um tópico?"));
document.querySelector(".mse-forum__topic-actions .mse-forum__button").click();
checks.push(await waitFor(() => document.querySelector('[name="forumTitle"]')?.value === "Como editar um tópico?"));

history.pushState({}, "", location.pathname);
dispatchEvent(new PopStateEvent("popstate"));
checks.push(await waitFor(() => document.querySelector(".mse-forum__create-link")));
document.querySelector(".mse-forum__create-link").click();
checks.push(await waitFor(() => document.querySelector('.mse-forum__compose-form')));
document.querySelector('[name="forumTitle"]').value = "Rascunho para continuar depois";
setContent("<p>O salvamento aceita conteúdo ainda incompleto.</p>");
document.querySelector('.mse-forum__save-draft').click();
checks.push(await waitFor(() => document.querySelector('.mse-forum__compose-feedback')?.textContent.includes("salvo")));
checks.push(document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const status = document.querySelector("#forum-demo-status");
const passed = checks.every(Boolean);
const failedChecks = checks.flatMap((result, index) => result ? [] : [index + 1]);
status.textContent = passed
  ? `${checks.length} verificações concluídas.`
  : `O preview apresentou falhas nas verificações: ${failedChecks.join(", ")}.`;
status.dataset.mseTestStatus = passed ? "passed" : "failed";
