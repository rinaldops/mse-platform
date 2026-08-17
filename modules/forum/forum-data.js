const TOPIC_FIELDS = [
  "Id",
  "Title",
  "Conteudo",
  "FormatoConteudo",
  "CategoriaId",
  "Status",
  "Fixado",
  "RespostaAceitaId",
  "QuantidadeRespostas",
  "QuantidadeVisualizacoes",
  "Pontuacao",
  "UltimaAtividade",
  "Created",
  "Modified",
  "Author/Id",
  "Author/Title"
];

const ANSWER_FIELDS = [
  "Id",
  "Title",
  "TopicoId",
  "Conteudo",
  "FormatoConteudo",
  "RespostaCitadaId",
  "Status",
  "Pontuacao",
  "Created",
  "Modified",
  "Author/Id",
  "Author/Title"
];

const MAX_TAG_SCAN_PAGES = 10;
const TOPIC_DRAFT_VERSION = 2;
const MAX_CONTENT_LENGTH = 20000;
const MAX_RICH_INPUT_LENGTH = 15000000;
const MAX_INLINE_IMAGES = 10;
const MAX_IMAGE_BYTES = 1024 * 1024;
const CONTENT_FORMATS = new Set(["TextoSimples", "HtmlSeguroV1"]);
const PUBLICATION_TYPES = new Set(["Topico", "Resposta"]);
const REACTION_TYPES = new Set(["Gostei", "Util", "Excelente"]);

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new TypeError(`${label} deve ser um inteiro positivo.`);
  return number;
}

function escapeODataText(value) {
  if (typeof value !== "string") throw new TypeError("search deve ser texto.");
  const normalized = value.trim();
  if (normalized.length > 100) throw new TypeError("search deve possuir até 100 caracteres.");
  return normalized.replaceAll("'", "''");
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string") throw new TypeError(`${label} deve ser texto.`);
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${label} é obrigatório.`);
  if (normalized.length > maxLength) throw new TypeError(`${label} deve possuir até ${maxLength} caracteres.`);
  return normalized;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new TypeError(`${label} deve ser texto.`);
  if (value.length > maxLength) throw new TypeError(`${label} deve possuir até ${maxLength} caracteres.`);
  return value;
}

function decodeBase64(value) {
  const normalized = value.replace(/\s/g, "");
  let decoded;
  try {
    decoded = globalThis.atob(normalized);
  } catch {
    throw new TypeError("A mensagem contém uma imagem Base64 inválida.");
  }
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function mediaFileName(extension) {
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `forum-${id}.${extension}`;
}

function validateCursor(source, cursor) {
  if (cursor === undefined || cursor === null || cursor === "") return undefined;
  let decoded = "";
  try {
    decoded = typeof cursor === "string" ? decodeURIComponent(cursor).toLowerCase() : "";
  } catch {
    decoded = "";
  }
  if (!decoded.includes(`/lists(guid'${source.listId}')/items?`)) {
    throw new TypeError(`cursor não pertence à fonte ${source.key} configurada.`);
  }
  return cursor;
}

function topicFilter({ view, categoryId, search }) {
  const filters = [];
  if (view === "unanswered") filters.push("Status eq 'Aberto'", "QuantidadeRespostas eq 0");
  else if (view === "resolved") filters.push("Status eq 'Resolvido'");
  else if (view === "pinned") filters.push("Fixado eq 1", "Status ne 'Arquivado'");
  else if (view === "recent") filters.push("Status ne 'Arquivado'");
  else throw new TypeError("view deve ser recent, unanswered, resolved ou pinned.");

  if (categoryId !== undefined && categoryId !== null && categoryId !== "") {
    filters.push(`CategoriaId eq ${positiveInteger(categoryId, "categoryId")}`);
  }
  const escapedSearch = escapeODataText(search ?? "");
  if (escapedSearch) filters.push(`substringof('${escapedSearch}',Title)`);
  return filters.join(" and ");
}

function freezeResult(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeResult);
    Object.freeze(value);
  }
  return value;
}

function invalidState(message) {
  const error = new Error(message);
  error.code = "invalid-state";
  return error;
}

function accessDenied(message) {
  const error = new Error(message);
  error.code = "access-denied";
  return error;
}

function reactionInput({ publicationType, publicationId, reactionType } = {}) {
  if (!PUBLICATION_TYPES.has(publicationType)) throw new TypeError("publicationType deve ser Topico ou Resposta.");
  if (!REACTION_TYPES.has(reactionType)) throw new TypeError("reactionType deve ser Gostei, Util ou Excelente.");
  return {
    publicationType,
    publicationId: positiveInteger(publicationId, "publicationId"),
    reactionType
  };
}

export function createForumReadService({ dataSources, sanitizeRichText } = {}) {
  if (!dataSources || typeof dataSources.get !== "function" || typeof dataSources.getClient !== "function") {
    throw new TypeError("dataSources deve ser um registro de fontes do núcleo.");
  }

  let taxonomyPromise;
  let currentUserPromise;
  const topicIdsByTag = new Map();

  async function externalizeInlineImages(input) {
    const imagePattern = /<img\b[^>]*\bsrc\s*=\s*(["'])(data:image\/(png|jpe?g|gif|webp);base64,([a-z0-9+/=\s]+))\1[^>]*>/gi;
    const matches = [...input.matchAll(imagePattern)];
    if (matches.length > MAX_INLINE_IMAGES) {
      throw new TypeError(`A mensagem deve possuir no máximo ${MAX_INLINE_IMAGES} imagens incorporadas.`);
    }
    if (!matches.length) return input;

    const source = dataSources.get("forum-media");
    const client = dataSources.getClient("forum-media");
    let result = "";
    let cursor = 0;
    for (const match of matches) {
      const [tag, quote, dataUrl, subtype, base64] = match;
      const bytes = decodeBase64(base64);
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) {
        throw new TypeError("Cada imagem deve possuir no máximo 1 MB.");
      }
      const normalizedSubtype = subtype.toLowerCase() === "jpg" ? "jpeg" : subtype.toLowerCase();
      const extension = normalizedSubtype === "jpeg" ? "jpg" : normalizedSubtype;
      const uploaded = await client.uploadFile(source, {
        fileName: mediaFileName(extension),
        content: bytes,
        contentType: `image/${normalizedSubtype}`
      });
      const updatedTag = tag.replace(`${quote}${dataUrl}${quote}`, `${quote}${uploaded.serverRelativeUrl}${quote}`);
      result += input.slice(cursor, match.index) + updatedTag;
      cursor = match.index + tag.length;
    }
    return result + input.slice(cursor);
  }

  async function normalizeContent(content, contentFormat, { required = true } = {}) {
    const validate = required ? requiredText : optionalText;
    if (contentFormat === "TextoSimples") return validate(content, "content", MAX_CONTENT_LENGTH);
    if (typeof sanitizeRichText !== "function") {
      throw new TypeError("sanitizeRichText é obrigatório para HtmlSeguroV1.");
    }
    const source = validate(content, "content", MAX_RICH_INPUT_LENGTH);
    const externalized = await externalizeInlineImages(source);
    return validate(sanitizeRichText(externalized), "content", MAX_CONTENT_LENGTH);
  }
  async function taxonomy() {
    taxonomyPromise ??= (async () => {
      const source = dataSources.get("forum-taxonomy");
      const items = await dataSources.getClient("forum-taxonomy").getListItems(source, {
        select: ["Id", "Title", "Tipo", "Descricao", "Cor", "Ordem", "PaiId"],
        filter: "Ativo eq 1",
        orderBy: "Ordem asc,Title asc",
        top: 5000
      });
      return new Map(items.map((item) => [item.Id, freezeResult({ ...item })]));
    })().catch((error) => {
      taxonomyPromise = null;
      throw error;
    });
    return taxonomyPromise;
  }

  async function listTaxonomy({ type } = {}) {
    if (type !== undefined && type !== "Categoria" && type !== "Tag") {
      throw new TypeError("type deve ser Categoria ou Tag.");
    }
    const items = await taxonomy();
    return freezeResult([...items.values()].filter((item) => !type || item.Tipo === type));
  }

  async function currentUserId() {
    currentUserPromise ??= (async () => {
      const response = await dataSources.getClient("forum-topics").request("/_api/web/currentuser?$select=Id");
      return positiveInteger(response.data?.Id ?? response.data?.d?.Id, "currentUser.Id");
    })().catch((error) => {
      currentUserPromise = null;
      throw error;
    });
    return currentUserPromise;
  }

  async function topicsForTag(tagId) {
    const id = positiveInteger(tagId, "tagId");
    const taxonomyById = await taxonomy();
    if (taxonomyById.get(id)?.Tipo !== "Tag") return new Set();
    if (!topicIdsByTag.has(id)) {
      const request = (async () => {
        const source = dataSources.get("forum-topic-tags");
        const relations = await dataSources.getClient("forum-topic-tags").getListItems(source, {
          select: ["TopicoId"],
          filter: `TagId eq ${id}`,
          top: 5000
        });
        return new Set(relations.map((relation) => positiveInteger(relation.TopicoId, "TopicoId")));
      })().catch((error) => {
        topicIdsByTag.delete(id);
        throw error;
      });
      topicIdsByTag.set(id, request);
    }
    return topicIdsByTag.get(id);
  }

  async function enrichTopics(topics) {
    if (!topics.length) return [];
    const taxonomyById = await taxonomy();
    const topicIds = topics.map((topic) => positiveInteger(topic.Id, "topic.Id"));
    const relationSource = dataSources.get("forum-topic-tags");
    const relations = await dataSources.getClient("forum-topic-tags").getListItems(relationSource, {
      select: ["TopicoId", "TagId"],
      filter: topicIds.map((id) => `TopicoId eq ${id}`).join(" or "),
      top: 5000
    });
    const tagsByTopic = new Map();
    for (const relation of relations) {
      const tag = taxonomyById.get(relation.TagId);
      if (!tag || tag.Tipo !== "Tag") continue;
      if (!tagsByTopic.has(relation.TopicoId)) tagsByTopic.set(relation.TopicoId, []);
      tagsByTopic.get(relation.TopicoId).push(tag);
    }
    return topics.map((topic) => freezeResult({
      ...topic,
      category: taxonomyById.get(topic.CategoriaId) ?? null,
      tags: tagsByTopic.get(topic.Id) ?? []
    }));
  }

  async function listTopics({
    view = "recent",
    categoryId,
    tagId,
    search = "",
    pageSize = 20,
    cursor
  } = {}) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw new TypeError("pageSize deve ser um inteiro entre 1 e 50.");
    }
    const source = dataSources.get("forum-topics");
    const client = dataSources.getClient("forum-topics");
    const selectedTopicIds = tagId === undefined || tagId === null || tagId === ""
      ? null
      : await topicsForTag(tagId);
    if (selectedTopicIds?.size === 0) return freezeResult({ topics: [], next: null });

    const topics = [];
    let next = validateCursor(source, cursor);
    let pages = 0;
    do {
      const page = await client.getListItemPage(source, {
        select: TOPIC_FIELDS,
        expand: "Author",
        filter: topicFilter({ view, categoryId, search }),
        orderBy: "Fixado desc,UltimaAtividade desc,Id desc",
        top: pageSize,
        cursor: next
      });
      topics.push(...(selectedTopicIds
        ? page.items.filter((topic) => selectedTopicIds.has(topic.Id))
        : page.items));
      next = page.next;
      pages += 1;
      // ponytail: varredura limitada; denormalizar tags se dez pÃ¡ginas por aÃ§Ã£o forem insuficientes.
    } while (selectedTopicIds && topics.length < pageSize && next && pages < MAX_TAG_SCAN_PAGES);

    return freezeResult({ topics: await enrichTopics(topics), next });
  }

  async function listContributors({ limit = 5 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      throw new TypeError("limit deve ser um inteiro entre 1 e 20.");
    }
    const contributors = new Map();
    const bump = (author, changes) => {
      const id = positiveInteger(author?.Id, "Author.Id");
      const current = contributors.get(id) ?? {
        userId: id,
        name: author?.Title || "Autor não informado",
        topics: 0,
        answers: 0,
        points: 0,
        score: 0
      };
      current.topics += changes.topics ?? 0;
      current.answers += changes.answers ?? 0;
      current.points += changes.points ?? 0;
      current.score += changes.score ?? 0;
      contributors.set(id, current);
    };
    const topicSource = dataSources.get("forum-topics");
    const answerSource = dataSources.get("forum-answers");
    const [topics, answers] = await Promise.all([
      dataSources.getClient("forum-topics").getListItems(topicSource, {
        select: ["Id", "Status", "QuantidadeRespostas", "Pontuacao", "Author/Id", "Author/Title"],
        expand: "Author",
        filter: "Status ne 'Arquivado'",
        orderBy: "UltimaAtividade desc,Id desc",
        top: 500
      }),
      dataSources.getClient("forum-answers").getListItems(answerSource, {
        select: ["Id", "Status", "Pontuacao", "Author/Id", "Author/Title"],
        expand: "Author",
        filter: "Status eq 'Publicada'",
        orderBy: "Created desc,Id desc",
        top: 500
      })
    ]);
    for (const topic of topics) {
      if (topic.Author?.Id) bump(topic.Author, {
        topics: 1,
        points: Number(topic.Pontuacao ?? 0),
        score: 5 + Number(topic.QuantidadeRespostas ?? 0) + Number(topic.Pontuacao ?? 0)
      });
    }
    for (const answer of answers) {
      if (answer.Author?.Id) bump(answer.Author, {
        answers: 1,
        points: Number(answer.Pontuacao ?? 0),
        score: 2 + Number(answer.Pontuacao ?? 0)
      });
    }
    // ponytail: ranking amostral do MVP; consolidar em ForumEstatisticasUsuarios se o piloto exigir escala.
    return freezeResult([...contributors.values()]
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "pt-BR"))
      .slice(0, limit));
  }

  async function getTopic(topicId) {
    const id = positiveInteger(topicId, "topicId");
    const source = dataSources.get("forum-topics");
    const page = await dataSources.getClient("forum-topics").getListItemPage(source, {
      select: TOPIC_FIELDS,
      expand: "Author",
      filter: `Id eq ${id}`,
      top: 1
    });
    const topic = (await enrichTopics(page.items))[0] ?? null;
    if (!topic) return null;
    return freezeResult({
      ...topic,
      canEdit: topic.Status !== "Arquivado" && topic.Author?.Id === await currentUserId()
    });
  }

  async function getTopicForEdit(topicId) {
    const id = positiveInteger(topicId, "topicId");
    const source = dataSources.get("forum-topics");
    const [loaded, userId] = await Promise.all([
      dataSources.getClient("forum-topics").getListItem(source, id, {
        select: TOPIC_FIELDS,
        expand: "Author"
      }),
      currentUserId()
    ]);
    if (!loaded.item) return null;
    if (loaded.item.Status === "Arquivado") {
      const error = new Error("Tópicos arquivados não podem ser alterados.");
      error.code = "invalid-state";
      throw error;
    }
    if (loaded.item.Author?.Id !== userId) {
      const error = new Error("Somente o autor pode alterar este tópico.");
      error.code = "access-denied";
      throw error;
    }
    return freezeResult({ topic: (await enrichTopics([loaded.item]))[0], etag: loaded.etag });
  }

  async function listAnswers(topicId, { pageSize = 30, cursor } = {}) {
    const id = positiveInteger(topicId, "topicId");
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new TypeError("pageSize deve ser um inteiro entre 1 e 100.");
    }
    const source = dataSources.get("forum-answers");
    const page = await dataSources.getClient("forum-answers").getListItemPage(source, {
      select: ANSWER_FIELDS,
      expand: "Author",
      filter: `TopicoId eq ${id} and Status eq 'Publicada'`,
      orderBy: "Created asc,Id asc",
      top: pageSize,
      cursor: validateCursor(source, cursor)
    });
    const userId = await currentUserId();
    return freezeResult({
      answers: page.items.map((item) => ({ ...item, canEdit: item.Author?.Id === userId })),
      next: page.next
    });
  }

  async function answerInput({ content, contentFormat = "HtmlSeguroV1", quotedAnswerId } = {}) {
    if (!CONTENT_FORMATS.has(contentFormat)) {
      throw new TypeError("contentFormat deve ser TextoSimples ou HtmlSeguroV1.");
    }
    const normalizedContent = await normalizeContent(content, contentFormat);
    return {
      normalizedContent,
      normalizedContentFormat: contentFormat,
      normalizedQuotedAnswerId: quotedAnswerId === undefined || quotedAnswerId === null || quotedAnswerId === ""
        ? null
        : positiveInteger(quotedAnswerId, "quotedAnswerId")
    };
  }

  async function getTopicForAnswer(topicId) {
    const loaded = await dataSources.getClient("forum-topics").getListItem(
      dataSources.get("forum-topics"),
      positiveInteger(topicId, "topicId"),
      { select: ["Id", "Status", "QuantidadeRespostas", "UltimaAtividade"] }
    );
    if (!loaded.item) return null;
    if (loaded.item.Status === "Arquivado" || loaded.item.Status === "Fechado") {
      throw invalidState("Este tópico não aceita novas respostas.");
    }
    return loaded;
  }

  async function updateTopicAnswerCount(topicId, delta) {
    const loaded = await getTopicForAnswer(topicId);
    if (!loaded) return null;
    const current = Number(loaded.item.QuantidadeRespostas ?? 0);
    await dataSources.getClient("forum-topics").updateListItem(
      dataSources.get("forum-topics"),
      loaded.item.Id,
      {
        QuantidadeRespostas: Math.max(0, current + delta),
        UltimaAtividade: new Date().toISOString()
      },
      { etag: loaded.etag }
    );
    return loaded.item.Id;
  }

  async function getAnswerForEdit(answerId) {
    const id = positiveInteger(answerId, "answerId");
    const source = dataSources.get("forum-answers");
    const [loaded, userId] = await Promise.all([
      dataSources.getClient("forum-answers").getListItem(source, id, {
        select: ANSWER_FIELDS,
        expand: "Author"
      }),
      currentUserId()
    ]);
    if (!loaded.item) return null;
    if (loaded.item.Status !== "Publicada") throw invalidState("Respostas arquivadas ou ocultas não podem ser alteradas.");
    if (loaded.item.Author?.Id !== userId) throw accessDenied("Somente o autor pode alterar esta resposta.");
    return freezeResult({ answer: { ...loaded.item, canEdit: true }, etag: loaded.etag });
  }

  async function createAnswer({ topicId, ...input } = {}) {
    const id = positiveInteger(topicId, "topicId");
    const { normalizedContent, normalizedContentFormat, normalizedQuotedAnswerId } = await answerInput(input);
    const topic = await getTopicForAnswer(id);
    if (!topic) throw invalidState("O tópico informado não foi encontrado.");
    const title = normalizedContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Resposta";
    const created = await dataSources.getClient("forum-answers").createListItem(dataSources.get("forum-answers"), {
      Title: title,
      TopicoId: id,
      Conteudo: normalizedContent,
      FormatoConteudo: normalizedContentFormat,
      RespostaCitadaId: normalizedQuotedAnswerId,
      Status: "Publicada",
      Pontuacao: 0
    });
    const answerId = positiveInteger(created.item?.Id, "answer.Id");
    await dataSources.getClient("forum-topics").updateListItem(
      dataSources.get("forum-topics"),
      topic.item.Id,
      {
        QuantidadeRespostas: Number(topic.item.QuantidadeRespostas ?? 0) + 1,
        UltimaAtividade: new Date().toISOString()
      },
      { etag: topic.etag }
    );
    return freezeResult({ answerId, topicId: id });
  }

  async function updateAnswer({ answerId, etag, ...input } = {}) {
    const editable = await getAnswerForEdit(answerId);
    if (!editable) return null;
    const { normalizedContent, normalizedContentFormat } = await answerInput(input);
    const title = normalizedContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Resposta";
    await dataSources.getClient("forum-answers").updateListItem(
      dataSources.get("forum-answers"),
      editable.answer.Id,
      { Title: title, Conteudo: normalizedContent, FormatoConteudo: normalizedContentFormat },
      { etag: etag ?? editable.etag }
    );
    await updateTopicAnswerCount(editable.answer.TopicoId, 0);
    return freezeResult({ answerId: editable.answer.Id, topicId: editable.answer.TopicoId });
  }

  async function archiveAnswer(answerId) {
    const editable = await getAnswerForEdit(answerId);
    if (!editable) return null;
    await dataSources.getClient("forum-answers").updateListItem(
      dataSources.get("forum-answers"),
      editable.answer.Id,
      { Status: "Arquivada" },
      { etag: editable.etag }
    );
    await updateTopicAnswerCount(editable.answer.TopicoId, -1);
    return freezeResult({ answerId: editable.answer.Id, topicId: editable.answer.TopicoId, status: "Arquivada" });
  }

  async function listReactions(publications = []) {
    if (!Array.isArray(publications)) throw new TypeError("publications deve ser uma lista.");
    const normalized = publications.map((item) => reactionInput({
      publicationType: item?.publicationType,
      publicationId: item?.publicationId,
      reactionType: "Gostei"
    })).map(({ publicationType, publicationId }) => ({ publicationType, publicationId }));
    if (!normalized.length) return freezeResult({});
    const userId = await currentUserId();
    const filter = normalized
      .map((item) => `(PublicacaoTipo eq '${item.publicationType}' and PublicacaoId eq ${item.publicationId})`)
      .join(" or ");
    const items = await dataSources.getClient("forum-reactions").getListItems(dataSources.get("forum-reactions"), {
      select: ["Id", "PublicacaoTipo", "PublicacaoId", "TipoReacao", "UsuarioId"],
      filter,
      top: 5000
    });
    const summary = {};
    for (const item of normalized) {
      summary[`${item.publicationType}:${item.publicationId}`] = {
        Gostei: 0,
        Util: 0,
        Excelente: 0,
        mine: []
      };
    }
    for (const item of items) {
      const key = `${item.PublicacaoTipo}:${item.PublicacaoId}`;
      if (!summary[key] || !REACTION_TYPES.has(item.TipoReacao)) continue;
      summary[key][item.TipoReacao] += 1;
      if (item.UsuarioId === userId) summary[key].mine.push(item.TipoReacao);
    }
    return freezeResult(summary);
  }

  async function updatePublicationScore(publicationType, publicationId, delta) {
    const sourceKey = publicationType === "Topico" ? "forum-topics" : "forum-answers";
    const source = dataSources.get(sourceKey);
    const client = dataSources.getClient(sourceKey);
    const current = await client.getListItem(source, publicationId, { select: ["Id", "Pontuacao"] });
    if (!current.item) throw invalidState("A publicação informada não foi encontrada.");
    await client.updateListItem(
      source,
      publicationId,
      { Pontuacao: Math.max(0, Number(current.item.Pontuacao ?? 0) + delta) },
      { etag: current.etag }
    );
  }

  async function toggleReaction(input) {
    const { publicationType, publicationId, reactionType } = reactionInput(input);
    const userId = await currentUserId();
    const title = `${publicationType}:${publicationId}:${reactionType}:${userId}`;
    const source = dataSources.get("forum-reactions");
    const client = dataSources.getClient("forum-reactions");
    const existing = await client.getListItems(source, {
      select: ["Id", "Title"],
      filter: `Title eq '${title}'`,
      top: 1
    });
    if (existing.length) {
      const current = await client.getListItem(source, existing[0].Id, { select: ["Id"] });
      await client.deleteListItem(source, existing[0].Id, { etag: current.etag });
      await updatePublicationScore(publicationType, publicationId, -1);
      return freezeResult({ publicationType, publicationId, reactionType, active: false });
    }
    await client.createListItem(source, {
      Title: title,
      PublicacaoTipo: publicationType,
      PublicacaoId: publicationId,
      TipoReacao: reactionType,
      UsuarioId: userId
    });
    await updatePublicationScore(publicationType, publicationId, 1);
    return freezeResult({ publicationType, publicationId, reactionType, active: true });
  }

  async function acceptAnswer({ topicId, answerId } = {}) {
    const editable = await getTopicForEdit(topicId);
    if (!editable) return null;
    const answer = await dataSources.getClient("forum-answers").getListItem(
      dataSources.get("forum-answers"),
      positiveInteger(answerId, "answerId"),
      { select: ANSWER_FIELDS, expand: "Author" }
    );
    if (!answer.item || answer.item.TopicoId !== editable.topic.Id || answer.item.Status !== "Publicada") {
      throw invalidState("A resposta aceita deve estar publicada no tópico.");
    }
    await dataSources.getClient("forum-topics").updateListItem(
      dataSources.get("forum-topics"),
      editable.topic.Id,
      {
        RespostaAceitaId: answer.item.Id,
        Status: "Resolvido",
        UltimaAtividade: new Date().toISOString()
      },
      { etag: editable.etag }
    );
    return freezeResult({ topicId: editable.topic.Id, answerId: answer.item.Id, status: "Resolvido" });
  }

  async function clearAcceptedAnswer(topicId) {
    const editable = await getTopicForEdit(topicId);
    if (!editable) return null;
    await dataSources.getClient("forum-topics").updateListItem(
      dataSources.get("forum-topics"),
      editable.topic.Id,
      {
        RespostaAceitaId: null,
        Status: "Aberto",
        UltimaAtividade: new Date().toISOString()
      },
      { etag: editable.etag }
    );
    return freezeResult({ topicId: editable.topic.Id, answerId: null, status: "Aberto" });
  }

  async function topicInput({
    title,
    content,
    contentFormat = "TextoSimples",
    categoryId,
    tagIds = []
  } = {}) {
    const normalizedTitle = requiredText(title, "title", 255);
    if (!CONTENT_FORMATS.has(contentFormat)) {
      throw new TypeError("contentFormat deve ser TextoSimples ou HtmlSeguroV1.");
    }
    const normalizedContent = await normalizeContent(content, contentFormat);
    const normalizedCategoryId = positiveInteger(categoryId, "categoryId");
    if (!Array.isArray(tagIds)) throw new TypeError("tagIds deve ser uma lista.");
    const normalizedTagIds = [...new Set(tagIds.map((id) => positiveInteger(id, "tagId")))];
    const taxonomyById = await taxonomy();
    if (taxonomyById.get(normalizedCategoryId)?.Tipo !== "Categoria") {
      throw new TypeError("categoryId deve identificar uma categoria ativa.");
    }
    if (normalizedTagIds.some((id) => taxonomyById.get(id)?.Tipo !== "Tag")) {
      throw new TypeError("tagIds deve conter somente tags ativas.");
    }
    return {
      normalizedTitle,
      normalizedContent,
      normalizedContentFormat: contentFormat,
      normalizedCategoryId,
      normalizedTagIds
    };
  }

  async function draftInput({
    title,
    content,
    contentFormat = "TextoSimples",
    categoryId,
    tagIds = []
  } = {}) {
    const normalizedTitle = optionalText(title, "title", 255);
    if (!CONTENT_FORMATS.has(contentFormat)) {
      throw new TypeError("contentFormat deve ser TextoSimples ou HtmlSeguroV1.");
    }
    const normalizedContent = await normalizeContent(content, contentFormat, { required: false });
    const normalizedCategoryId = categoryId === undefined || categoryId === null || categoryId === ""
      ? null
      : positiveInteger(categoryId, "categoryId");
    if (!Array.isArray(tagIds)) throw new TypeError("tagIds deve ser uma lista.");
    const normalizedTagIds = [...new Set(tagIds.map((id) => positiveInteger(id, "tagId")))];
    if (!normalizedTitle.trim() && !normalizedContent.trim() && !normalizedCategoryId && !normalizedTagIds.length) {
      throw new TypeError("Preencha ao menos um campo antes de salvar o rascunho.");
    }
    const taxonomyById = await taxonomy();
    if (normalizedCategoryId && taxonomyById.get(normalizedCategoryId)?.Tipo !== "Categoria") {
      throw new TypeError("categoryId deve identificar uma categoria ativa.");
    }
    if (normalizedTagIds.some((id) => taxonomyById.get(id)?.Tipo !== "Tag")) {
      throw new TypeError("tagIds deve conter somente tags ativas.");
    }
    return {
      title: normalizedTitle,
      content: normalizedContent,
      contentFormat,
      categoryId: normalizedCategoryId,
      tagIds: normalizedTagIds
    };
  }

  function topicDraftKey(userId) {
    return `rascunho-topico:${positiveInteger(userId, "userId")}`;
  }

  async function topicDraftRecords(userId) {
    const source = dataSources.get("forum-preferences");
    const key = topicDraftKey(userId);
    const items = await dataSources.getClient("forum-preferences").getListItems(source, {
      select: ["Id", "Title", "Tipo", "UsuarioId", "ConteudoRascunho", "Modified"],
      filter: `Title eq '${key}' and Tipo eq 'Rascunho' and UsuarioId eq ${userId}`,
      orderBy: "Modified desc,Id desc",
      top: 50
    });
    return { source, key, items };
  }

  async function loadTopicDraft() {
    const userId = await currentUserId();
    const { items } = await topicDraftRecords(userId);
    const record = items[0];
    if (!record) return null;
    let stored;
    try {
      stored = JSON.parse(record.ConteudoRascunho || "{}");
    } catch {
      const error = new Error("O rascunho salvo possui conteúdo inválido e precisa ser descartado.");
      error.code = "invalid-data";
      throw error;
    }
    if (stored.version !== 1 && stored.version !== TOPIC_DRAFT_VERSION) {
      const error = new Error("A versão deste rascunho não é mais compatível e precisa ser descartada.");
      error.code = "invalid-data";
      throw error;
    }
    if (stored.version === 1) stored.contentFormat = "TextoSimples";
    return freezeResult({
      id: positiveInteger(record.Id, "draft.Id"),
      modified: record.Modified ?? null,
      ...(await draftInput(stored))
    });
  }

  async function saveTopicDraft(input) {
    const [userId, draft] = await Promise.all([currentUserId(), draftInput(input)]);
    const { source, key, items } = await topicDraftRecords(userId);
    const client = dataSources.getClient("forum-preferences");
    const values = {
      Title: key,
      Tipo: "Rascunho",
      UsuarioId: userId,
      ConteudoRascunho: JSON.stringify({ version: TOPIC_DRAFT_VERSION, ...draft })
    };
    let id;
    if (items.length) {
      id = positiveInteger(items[0].Id, "draft.Id");
      const current = await client.getListItem(source, id, { select: ["Id"] });
      await client.updateListItem(source, id, values, { etag: current.etag });
    } else {
      const created = await client.createListItem(source, values);
      id = positiveInteger(created.item?.Id, "draft.Id");
    }
    return freezeResult({ id, ...draft });
  }

  async function deleteTopicDraft() {
    const userId = await currentUserId();
    const { source, items } = await topicDraftRecords(userId);
    const client = dataSources.getClient("forum-preferences");
    for (const record of items) {
      const id = positiveInteger(record.Id, "draft.Id");
      const current = await client.getListItem(source, id, { select: ["Id"] });
      await client.deleteListItem(source, id, { etag: current.etag });
    }
    return items.length > 0;
  }

  function partialWrite(topicId, cause) {
    const error = new Error("O tópico foi salvo, mas nem todas as tags puderam ser atualizadas.", { cause });
    error.code = "partial-write";
    error.topicId = topicId;
    return error;
  }

  async function createTopic(input) {
    const {
      normalizedTitle,
      normalizedContent,
      normalizedContentFormat,
      normalizedCategoryId,
      normalizedTagIds
    } = await topicInput(input);

    const source = dataSources.get("forum-topics");
    const created = await dataSources.getClient("forum-topics").createListItem(source, {
      Title: normalizedTitle,
      Conteudo: normalizedContent,
      FormatoConteudo: normalizedContentFormat,
      CategoriaId: normalizedCategoryId,
      Status: "Aberto",
      Fixado: false,
      QuantidadeRespostas: 0,
      QuantidadeVisualizacoes: 0,
      Pontuacao: 0,
      UltimaAtividade: new Date().toISOString()
    });
    const topicId = positiveInteger(created.item?.Id, "topic.Id");
    const relationSource = dataSources.get("forum-topic-tags");
    const relationClient = dataSources.getClient("forum-topic-tags");
    for (const tagId of normalizedTagIds) {
      try {
        await relationClient.createListItem(relationSource, {
          Title: `${topicId}:${tagId}`,
          TopicoId: topicId,
          TagId: tagId
        });
        const cachedIds = topicIdsByTag.get(tagId);
        if (cachedIds) (await cachedIds).add(topicId);
      } catch (cause) {
        throw partialWrite(topicId, cause);
      }
    }
    return freezeResult({ topicId, tagIds: normalizedTagIds });
  }

  async function updateTopic({ topicId, etag, ...input } = {}) {
    const id = positiveInteger(topicId, "topicId");
    const {
      normalizedTitle,
      normalizedContent,
      normalizedContentFormat,
      normalizedCategoryId,
      normalizedTagIds
    } = await topicInput(input);
    const relationSource = dataSources.get("forum-topic-tags");
    const relationClient = dataSources.getClient("forum-topic-tags");
    const existing = await relationClient.getListItems(relationSource, {
      select: ["Id", "TopicoId", "TagId"],
      filter: `TopicoId eq ${id}`,
      top: 5000
    });
    const existingByTag = new Map(existing.map((relation) => [relation.TagId, relation]));
    const selected = new Set(normalizedTagIds);
    const source = dataSources.get("forum-topics");
    await dataSources.getClient("forum-topics").updateListItem(source, id, {
      Title: normalizedTitle,
      Conteudo: normalizedContent,
      FormatoConteudo: normalizedContentFormat,
      CategoriaId: normalizedCategoryId,
      UltimaAtividade: new Date().toISOString()
    }, { etag });

    try {
      for (const relation of existing) {
        if (selected.has(relation.TagId)) continue;
        const current = await relationClient.getListItem(relationSource, relation.Id, { select: ["Id"] });
        await relationClient.deleteListItem(relationSource, relation.Id, { etag: current.etag });
      }
      for (const tagId of normalizedTagIds) {
        if (existingByTag.has(tagId)) continue;
        await relationClient.createListItem(relationSource, {
          Title: `${id}:${tagId}`,
          TopicoId: id,
          TagId: tagId
        });
      }
    } catch (cause) {
      throw partialWrite(id, cause);
    } finally {
      for (const tagId of new Set([...existingByTag.keys(), ...normalizedTagIds])) topicIdsByTag.delete(tagId);
    }
    return freezeResult({ topicId: id, tagIds: normalizedTagIds });
  }

  async function archiveTopic(topicId) {
    const editable = await getTopicForEdit(topicId);
    if (!editable) return null;
    await dataSources.getClient("forum-topics").updateListItem(
      dataSources.get("forum-topics"),
      editable.topic.Id,
      { Status: "Arquivado", UltimaAtividade: new Date().toISOString() },
      { etag: editable.etag }
    );
    for (const tag of editable.topic.tags) topicIdsByTag.delete(tag.Id);
    return freezeResult({ topicId: editable.topic.Id, status: "Arquivado" });
  }

  async function listCategorySummaries({ recentLimit = 3 } = {}) {
    const categories = await listTaxonomy({ type: "Categoria" });
    const source = dataSources.get("forum-topics");
    const topics = await dataSources.getClient("forum-topics").getListItems(source, {
      select: ["Id", "Title", "CategoriaId", "Author/Id", "Author/Title", "UltimaAtividade"],
      expand: "Author",
      filter: "Status ne 'Arquivado'",
      orderBy: "UltimaAtividade desc,Id desc",
      top: 500
    });

    const byCategory = new Map();
    for (const topic of topics) {
      const list = byCategory.get(topic.CategoriaId) ?? [];
      list.push(topic);
      byCategory.set(topic.CategoriaId, list);
    }

    return freezeResult(categories.map((category) => {
      const items = byCategory.get(category.Id) ?? [];
      return {
        id: category.Id,
        title: category.Title,
        color: category.Cor || "",
        count: items.length,
        recentTopics: items.slice(0, recentLimit).map((topic) => ({
          id: topic.Id,
          title: topic.Title,
          author: topic.Author?.Title || "Autor não informado",
          date: topic.UltimaAtividade
        }))
      };
    }));
  }

  return Object.freeze({
    listTaxonomy,
    listCategorySummaries,
    listTopics,
    listContributors,
    getTopic,
    getTopicForEdit,
    listAnswers,
    getAnswerForEdit,
    createAnswer,
    updateAnswer,
    archiveAnswer,
    listReactions,
    toggleReaction,
    acceptAnswer,
    clearAcceptedAnswer,
    createTopic,
    updateTopic,
    archiveTopic,
    loadTopicDraft,
    saveTopicDraft,
    deleteTopicDraft
  });
}
