import assert from "node:assert/strict";
import { createForumReadService } from "../forum-data.js";

const ids = {
  "forum-taxonomy": "00000000-0000-4000-8000-000000000001",
  "forum-topics": "00000000-0000-4000-8000-000000000002",
  "forum-topic-tags": "00000000-0000-4000-8000-000000000003",
  "forum-answers": "00000000-0000-4000-8000-000000000004",
  "forum-preferences": "00000000-0000-4000-8000-000000000005",
  "forum-reactions": "00000000-0000-4000-8000-000000000006",
  "forum-media": "00000000-0000-4000-8000-000000000007"
};
const calls = [];
let draftRecord = null;
let reactionRecord = null;
const client = {
  async getListItems(source, options) {
    calls.push({ method: "all", source, options });
    if (source.key === "forum-taxonomy") return [
      { Id: 10, Title: "JavaScript", Tipo: "Categoria" },
      { Id: 20, Title: "SharePoint", Tipo: "Tag" },
      { Id: 21, Title: "REST", Tipo: "Tag" }
    ];
    if (source.key === "forum-topics") return [
      { Id: 1, Status: "Aberto", QuantidadeRespostas: 3, Pontuacao: 4, Author: { Id: 7, Title: "Ana" } },
      { Id: 2, Status: "Resolvido", QuantidadeRespostas: 1, Pontuacao: 1, Author: { Id: 8, Title: "Bruno" } }
    ];
    if (source.key === "forum-answers") return [
      { Id: 5, Status: "Publicada", Pontuacao: 2, Author: { Id: 7, Title: "Ana" } },
      { Id: 6, Status: "Publicada", Pontuacao: 0, Author: { Id: 8, Title: "Bruno" } }
    ];
    if (source.key === "forum-topic-tags") return [{ Id: 40, TopicoId: 1, TagId: 20 }];
    if (source.key === "forum-preferences") return draftRecord ? [{ ...draftRecord }] : [];
    if (source.key === "forum-reactions") return reactionRecord ? [{ ...reactionRecord }] : [];
    return [];
  },
  async getListItemPage(source, options) {
    calls.push({ method: "page", source, options });
    if (source.key === "forum-topics" && options.filter.startsWith("Id eq")) {
      return { items: [{ Id: 1, Title: "Detalhe", CategoriaId: 10, Author: { Id: 7 } }], next: null };
    }
    if (source.key === "forum-topics") {
      return {
        items: [{ Id: 1, Title: "Primeiro tópico", CategoriaId: 10 }],
        next: `https://contoso.sharepoint.com/teams/forum/_api/web/lists(guid'${ids["forum-topics"]}')/items?$skiptoken=2`
      };
    }
    return { items: [{ Id: 5, TopicoId: 1, Conteudo: "Resposta", Status: "Publicada", Author: { Id: 7 } }], next: null };
  },
  async createListItem(source, values) {
    calls.push({ method: "create", source, values });
    if (source.key === "forum-preferences") {
      draftRecord = { Id: 60, Modified: "2026-08-15T15:00:00Z", ...values };
      return { item: { Id: draftRecord.Id } };
    }
    if (source.key === "forum-reactions") {
      reactionRecord = { Id: 70, ...values };
      return { item: { Id: reactionRecord.Id } };
    }
    return { item: { Id: source.key === "forum-topics" ? 2 : 50 } };
  },
  async getListItem(source, id, options) {
    calls.push({ method: "item", source, id, options });
    if (source.key === "forum-topics") {
      return { item: { Id: id, Title: "Detalhe", Conteudo: "Texto", CategoriaId: 10, Author: { Id: 7 } }, etag: '"topic-1"' };
    }
    if (source.key === "forum-answers") {
      return {
        item: {
          Id: id,
          TopicoId: 1,
          Conteudo: '<p><strong>Resposta</strong></p>',
          FormatoConteudo: "HtmlSeguroV1",
          Status: "Publicada",
          Author: { Id: 7 }
        },
        etag: '"answer-1"'
      };
    }
    if (source.key === "forum-preferences") return { item: { Id: id }, etag: '"draft-1"' };
    if (source.key === "forum-reactions") return { item: { Id: id }, etag: '"reaction-1"' };
    return { item: { Id: id }, etag: '"relation-1"' };
  },
  async updateListItem(source, id, values, options) {
    calls.push({ method: "update", source, id, values, options });
    if (source.key === "forum-preferences") draftRecord = { ...draftRecord, ...values };
    return { item: null, etag: '"updated"' };
  },
  async deleteListItem(source, id, options) {
    calls.push({ method: "delete", source, id, options });
    if (source.key === "forum-preferences") draftRecord = null;
    if (source.key === "forum-reactions") reactionRecord = null;
    return { status: 204 };
  },
  async request(path) {
    calls.push({ method: "request", path });
    return { data: { Id: 7 } };
  },
  async uploadFile(source, options) {
    calls.push({ method: "upload", source, options });
    return {
      serverRelativeUrl: `/teams/forum/ForumMidia/${options.fileName}`,
      status: 201
    };
  }
};
const dataSources = {
  get(key) {
    return { key, webUrl: "/teams/forum", listId: ids[key] };
  },
  getClient() {
    return client;
  }
};

let sanitizeCalls = 0;
const service = createForumReadService({
  dataSources,
  sanitizeRichText(input) {
    sanitizeCalls += 1;
    return input.replace(/ onclick="[^"]*"/g, "");
  }
});
assert.equal((await service.listTaxonomy({ type: "Categoria" }))[0].Id, 10);
assert.equal(await service.loadTopicDraft(), null);
const firstDraft = await service.saveTopicDraft({
  title: " Título parcial ",
  content: "",
  categoryId: 10,
  tagIds: [20, 20]
});
assert.deepEqual(firstDraft, {
  id: 60,
  title: " Título parcial ",
  content: "",
  contentFormat: "TextoSimples",
  categoryId: 10,
  tagIds: [20]
});
assert.equal((await service.loadTopicDraft()).title, " Título parcial ");
const updatedDraft = await service.saveTopicDraft({
  title: "Título revisado",
  content: "Texto ainda incompleto",
  categoryId: null,
  tagIds: [21]
});
assert.equal(updatedDraft.id, 60);
assert.equal(updatedDraft.contentFormat, "TextoSimples");
assert.ok(calls.some((call) => call.method === "update"
  && call.source.key === "forum-preferences" && call.options.etag === '"draft-1"'));
assert.equal(await service.deleteTopicDraft(), true);
assert.equal(await service.loadTopicDraft(), null);
assert.equal(await service.deleteTopicDraft(), false);
draftRecord = {
  Id: 61,
  Modified: "2026-08-15T15:30:00Z",
  ConteudoRascunho: JSON.stringify({
    version: 1,
    title: "Rascunho legado",
    content: "Texto simples preservado",
    categoryId: 10,
    tagIds: []
  })
};
assert.equal((await service.loadTopicDraft()).contentFormat, "TextoSimples");
draftRecord = null;
const richDraft = await service.saveTopicDraft({
  title: "Rascunho formatado",
  content: '<p onclick="alert(1)"><strong>Conteúdo</strong></p>',
  contentFormat: "HtmlSeguroV1",
  categoryId: 10
});
assert.equal(richDraft.content, "<p><strong>Conteúdo</strong></p>");
assert.equal((await service.loadTopicDraft()).contentFormat, "HtmlSeguroV1");
await service.deleteTopicDraft();
await assert.rejects(service.saveTopicDraft({}), /ao menos um campo/);
const recent = await service.listTopics({
  view: "unanswered",
  categoryId: 10,
  search: "d'água",
  pageSize: 10
});
assert.equal(recent.topics[0].category.Title, "JavaScript");
assert.equal(recent.topics[0].tags[0].Title, "SharePoint");
assert.match(recent.next, /skiptoken/);
const topicCall = calls.find((call) => call.method === "page" && call.source.key === "forum-topics");
assert.match(topicCall.options.filter, /QuantidadeRespostas eq 0/);
assert.match(topicCall.options.filter, /CategoriaId eq 10/);
assert.match(topicCall.options.filter, /substringof\('d''água',Title\)/);
assert.equal(topicCall.options.top, 10);

const tagged = await service.listTopics({ tagId: 20, pageSize: 1 });
assert.equal(tagged.topics[0].Id, 1);
const tagRelationCall = calls.find((call) =>
  call.method === "all"
  && call.source.key === "forum-topic-tags"
  && call.options.filter === "TagId eq 20"
);
assert.deepEqual(tagRelationCall.options.select, ["TopicoId"]);
assert.deepEqual(await service.listTopics({ tagId: 999, pageSize: 1 }), {
  topics: [],
  next: null
});

let scannedPages = 0;
const scanClient = {
  async getListItems(source) {
    if (source.key === "forum-taxonomy") return [{ Id: 20, Title: "SharePoint", Tipo: "Tag" }];
    if (source.key === "forum-topic-tags") return [{ TopicoId: 2, TagId: 20 }];
    return [];
  },
  async getListItemPage() {
    scannedPages += 1;
    if (scannedPages === 1) {
      return {
        items: [{ Id: 1, Title: "Sem a tag" }],
        next: `https://contoso.sharepoint.com/teams/forum/_api/web/lists(guid'${ids["forum-topics"]}')/items?$skiptoken=2`
      };
    }
    return { items: [{ Id: 2, Title: "Com a tag" }], next: null };
  }
};
const scanService = createForumReadService({
  dataSources: {
    get: dataSources.get,
    getClient: () => scanClient
  }
});
const scanned = await scanService.listTopics({ tagId: 20, pageSize: 1 });
assert.equal(scanned.topics[0].Id, 2);
assert.equal(scannedPages, 2);
const contributors = await service.listContributors({ limit: 2 });
assert.deepEqual(contributors.map((item) => item.name), ["Ana", "Bruno"]);
assert.equal(contributors[0].topics, 1);
assert.equal(contributors[0].answers, 1);
assert.equal(contributors[0].score, 16);

const created = await service.createTopic({
  title: " Novo tópico ",
  content: " Conteúdo seguro ",
  categoryId: 10,
  tagIds: [20, 20]
});
assert.deepEqual(created, { topicId: 2, tagIds: [20] });
const createdTopicCall = calls.find((call) => call.method === "create" && call.source.key === "forum-topics");
assert.equal(createdTopicCall.values.Title, "Novo tópico");
assert.equal(createdTopicCall.values.Conteudo, "Conteúdo seguro");
assert.equal(createdTopicCall.values.FormatoConteudo, "TextoSimples");
assert.equal(createdTopicCall.values.CategoriaId, 10);
assert.match(createdTopicCall.values.UltimaAtividade, /^\d{4}-\d{2}-\d{2}T/);
const createdRelationCall = calls.find((call) => call.method === "create" && call.source.key === "forum-topic-tags");
assert.deepEqual(createdRelationCall.values, { Title: "2:20", TopicoId: 2, TagId: 20 });
const richTopic = await service.createTopic({
  title: "Tópico formatado",
  content: '<p onclick="alert(1)"><strong>Conteúdo</strong></p>',
  contentFormat: "HtmlSeguroV1",
  categoryId: 10
});
assert.equal(richTopic.topicId, 2);
const richTopicCall = calls.find((call) => call.method === "create" && call.values.Title === "Tópico formatado");
assert.equal(richTopicCall.values.Conteudo, "<p><strong>Conteúdo</strong></p>");
assert.equal(richTopicCall.values.FormatoConteudo, "HtmlSeguroV1");
const largeImageBase64 = "a".repeat(24000);
const imageTopic = await service.createTopic({
  title: "Tópico com imagem",
  content: `<p>Mensagem curta com imagem.</p><img src="data:image/png;base64,${largeImageBase64}" alt="Diagrama">`,
  contentFormat: "HtmlSeguroV1",
  categoryId: 10
});
assert.equal(imageTopic.topicId, 2);
const uploadCall = calls.find((call) => call.method === "upload" && call.source.key === "forum-media");
assert.equal(uploadCall.options.contentType, "image/png");
assert.equal(uploadCall.options.content.length, 18000);
const imageTopicCall = calls.find((call) => call.method === "create" && call.values.Title === "Tópico com imagem");
assert.match(imageTopicCall.values.Conteudo, /src="\/teams\/forum\/ForumMidia\/forum-.+\.png"/);
assert.doesNotMatch(imageTopicCall.values.Conteudo, /data:image|base64/);
assert.ok(imageTopicCall.values.Conteudo.length < 20000);
assert.ok(sanitizeCalls >= 3);
await assert.rejects(
  createForumReadService({ dataSources }).createTopic({
    title: "Sem sanitizador",
    content: "<p>Conteúdo</p>",
    contentFormat: "HtmlSeguroV1",
    categoryId: 10
  }),
  /sanitizeRichText é obrigatório/
);
await assert.rejects(
  service.createTopic({ title: "Título", content: "Conteúdo", categoryId: 20 }),
  /categoria ativa/
);
await assert.rejects(
  service.createTopic({ title: "Título", content: "Conteúdo", categoryId: 10, tagIds: [999] }),
  /tags ativas/
);

const detail = await service.getTopic(1);
assert.equal(detail.Title, "Detalhe");
assert.equal(detail.canEdit, true);
const foreignService = createForumReadService({
  dataSources: {
    get: dataSources.get,
    getClient: () => ({ ...client, async request() { return { data: { Id: 8 } }; } })
  }
});
assert.equal((await foreignService.getTopic(1)).canEdit, false);
await assert.rejects(foreignService.getTopicForEdit(1), (error) => error.code === "access-denied");
const editable = await service.getTopicForEdit(1);
assert.equal(editable.etag, '"topic-1"');
const updated = await service.updateTopic({
  topicId: 1,
  etag: editable.etag,
  title: "Detalhe atualizado",
  content: "Novo texto",
  categoryId: 10,
  tagIds: [21]
});
assert.deepEqual(updated, { topicId: 1, tagIds: [21] });
const updateCall = calls.find((call) => call.method === "update" && call.values.Title === "Detalhe atualizado");
assert.equal(updateCall.options.etag, '"topic-1"');
assert.ok(calls.some((call) => call.method === "delete" && call.source.key === "forum-topic-tags" && call.id === 40));
assert.ok(calls.some((call) => call.method === "create"
  && call.source.key === "forum-topic-tags" && call.values.Title === "1:21"));
assert.deepEqual(await service.archiveTopic(1), { topicId: 1, status: "Arquivado" });
assert.ok(calls.some((call) => call.method === "update" && call.values.Status === "Arquivado"));
const answers = await service.listAnswers(1);
assert.equal(answers.answers[0].Id, 5);
assert.equal(answers.answers[0].canEdit, true);
assert.ok(Object.isFrozen(answers));
const createdAnswer = await service.createAnswer({
  topicId: 1,
  content: '<p onclick="alert(1)">Resposta <strong>nova</strong></p>',
  contentFormat: "HtmlSeguroV1"
});
assert.deepEqual(createdAnswer, { answerId: 50, topicId: 1 });
const createdAnswerCall = calls.find((call) => call.method === "create" && call.source.key === "forum-answers");
assert.equal(createdAnswerCall.values.FormatoConteudo, "HtmlSeguroV1");
assert.equal(createdAnswerCall.values.Conteudo, "<p>Resposta <strong>nova</strong></p>");
assert.ok(calls.some((call) => call.method === "update"
  && call.source.key === "forum-topics"
  && call.values.QuantidadeRespostas === 1));
const editableAnswer = await service.getAnswerForEdit(5);
assert.equal(editableAnswer.etag, '"answer-1"');
const updatedAnswer = await service.updateAnswer({
  answerId: 5,
  etag: editableAnswer.etag,
  content: "<p>Resposta editada</p>",
  contentFormat: "HtmlSeguroV1"
});
assert.deepEqual(updatedAnswer, { answerId: 5, topicId: 1 });
assert.ok(calls.some((call) => call.method === "update"
  && call.source.key === "forum-answers"
  && call.id === 5
  && call.values.Conteudo === "<p>Resposta editada</p>"));
const archivedAnswer = await service.archiveAnswer(5);
assert.deepEqual(archivedAnswer, { answerId: 5, topicId: 1, status: "Arquivada" });
assert.ok(calls.some((call) => call.method === "update"
  && call.source.key === "forum-answers"
  && call.values.Status === "Arquivada"));
assert.deepEqual(await service.listReactions([
  { publicationType: "Topico", publicationId: 1 },
  { publicationType: "Resposta", publicationId: 5 }
]), {
  "Topico:1": { Gostei: 0, Util: 0, Excelente: 0, mine: [] },
  "Resposta:5": { Gostei: 0, Util: 0, Excelente: 0, mine: [] }
});
assert.deepEqual(await service.toggleReaction({
  publicationType: "Resposta",
  publicationId: 5,
  reactionType: "Util"
}), { publicationType: "Resposta", publicationId: 5, reactionType: "Util", active: true });
assert.equal(reactionRecord.Title, "Resposta:5:Util:7");
assert.deepEqual((await service.listReactions([{ publicationType: "Resposta", publicationId: 5 }]))["Resposta:5"], {
  Gostei: 0,
  Util: 1,
  Excelente: 0,
  mine: ["Util"]
});
assert.deepEqual(await service.toggleReaction({
  publicationType: "Resposta",
  publicationId: 5,
  reactionType: "Util"
}), { publicationType: "Resposta", publicationId: 5, reactionType: "Util", active: false });
assert.equal(reactionRecord, null);
assert.deepEqual(await service.acceptAnswer({ topicId: 1, answerId: 5 }), {
  topicId: 1,
  answerId: 5,
  status: "Resolvido"
});
assert.ok(calls.some((call) => call.method === "update"
  && call.source.key === "forum-topics"
  && call.values.RespostaAceitaId === 5
  && call.values.Status === "Resolvido"));
assert.deepEqual(await service.clearAcceptedAnswer(1), { topicId: 1, answerId: null, status: "Aberto" });
assert.ok(calls.some((call) => call.method === "update"
  && call.source.key === "forum-topics"
  && call.values.RespostaAceitaId === null
  && call.values.Status === "Aberto"));

await assert.rejects(service.listTopics({ view: "invalid" }), /view deve ser/);
await assert.rejects(service.listTopics({ pageSize: 51 }), /entre 1 e 50/);
await assert.rejects(
  service.listTopics({ cursor: "https://contoso.sharepoint.com/teams/forum/_api/web/lists" }),
  /cursor não pertence/
);

console.log("forum-data.test.js: verificações concluídas com sucesso.");
