import assert from "node:assert/strict";
import {
  DEFAULT_FIELD_MAP,
  createArticle,
  updateArticle,
  transitionEditorialState,
  scheduleArticle,
  uploadCoverImage,
  listArticleVersions,
  restoreArticleVersion
} from "../publisher-data.js";

/**
 * Fake client em memória, mesmo princípio de `kernel/test/installer.test.js`
 * (fake local por arquivo, sem framework externo, sem rede real): registra
 * cada chamada em `calls` para que os testes abaixo possam verificar
 * exatamente o que `kernel/publisher-data.js` repassou (ETag incluída,
 * nomes reais de campo já traduzidos, etc.), sem depender de um client REST
 * real nem de DOM (ver `sanitize` fake abaixo — este arquivo roda em Node
 * puro, sem jsdom, por isso NUNCA usa a `sanitizeRichText` real importada
 * de `core/rich-text.js`, que exige `document` global).
 */
function createFakeClient({ item = { Id: 7 }, etag = '"etag-1"' } = {}) {
  const calls = [];

  return {
    calls,
    client: {
      async createListItem(list, values) {
        calls.push({ op: "createListItem", list, values });
        return { item: { Id: 1, ...values }, etag: '"etag-created"', status: 201 };
      },
      async getListItem(list, id, options) {
        calls.push({ op: "getListItem", list, id, options });
        return { item: { ...item, Id: id }, etag, status: 200 };
      },
      async updateListItem(list, id, values, options) {
        calls.push({ op: "updateListItem", list, id, values, options });
        return { item: { ...item, Id: id, ...values }, etag: '"etag-updated"', status: 204 };
      },
      async uploadFile(library, options) {
        calls.push({ op: "uploadFile", library, options });
        return {
          file: { Name: options.fileName },
          serverRelativeUrl: `/sites/teste/Capas/${options.fileName}`,
          etag: '"file-etag"',
          status: 201
        };
      },
      async listVersions(list, id) {
        calls.push({ op: "listVersions", list, id });
        return [{ versionId: "1.0", createdAt: "2026-10-01T00:00:00.000Z", isCurrentVersion: false }];
      },
      async restoreVersion(list, id, versionId) {
        calls.push({ op: "restoreVersion", list, id, versionId });
        return { status: 204, etag: null };
      }
    }
  };
}

/**
 * `sanitize` fake simples e determinístico: remove qualquer tag `<script>`
 * (com ou sem conteúdo) do HTML recebido, o suficiente para os testes
 * confirmarem que `createArticle`/`updateArticle` SEMPRE chamam a função de
 * sanitização recebida antes de montar o payload — sem precisar da
 * sanitização real de `core/rich-text.js` (que exige DOM).
 */
function fakeSanitize(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

const LIST = { listId: "10000000-0000-4000-8000-000000000001" };
const LIBRARY = { listId: "10000000-0000-4000-8000-000000000002" };

// --- createArticle: sanitiza HTML perigoso (<script> removido do corpo) ----
{
  const { client, calls } = createFakeClient();
  const perigoso = "<p>Olá</p><script>alert(1)</script>";
  const result = await createArticle({
    client,
    list: LIST,
    values: { titulo: "Artigo 1", corpoHtml: perigoso, estadoEditorial: "Despublicado" },
    sanitize: fakeSanitize
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, "createListItem");
  assert.equal(calls[0].values[DEFAULT_FIELD_MAP.corpoHtml], "<p>Olá</p>");
  assert.ok(!calls[0].values[DEFAULT_FIELD_MAP.corpoHtml].includes("<script>"));
  assert.equal(calls[0].values[DEFAULT_FIELD_MAP.titulo], "Artigo 1");
  assert.equal(calls[0].values[DEFAULT_FIELD_MAP.estadoEditorial], "Despublicado");
  assert.equal(result.status, 201);
}

// createArticle: estadoEditorial inválido em `values` é rejeitado (mesma
// validação de transitionEditorialState, aplicada via buildPayload).
{
  const { client, calls } = createFakeClient();
  await assert.rejects(
    createArticle({
      client,
      list: LIST,
      values: { titulo: "X", estadoEditorial: "Removido" },
      sanitize: fakeSanitize
    }),
    TypeError
  );
  assert.equal(calls.length, 0);
}

// --- fieldMap: default do CAMAP é usado quando fieldMap é omitido; um
// fieldMap parcial sobrescreve só os campos informados ----------------------
{
  const { client, calls } = createFakeClient();
  await createArticle({
    client,
    list: LIST,
    fieldMap: { titulo: "Titulo" },
    values: { titulo: "Artigo 2", resumo: "Resumo breve" },
    sanitize: fakeSanitize
  });
  assert.equal(calls[0].values.Titulo, "Artigo 2");
  assert.equal(calls[0].values[DEFAULT_FIELD_MAP.resumo], "Resumo breve");
}

// --- updateArticle: preserva/propaga a ETag buscada antes de escrever ------
{
  const { client, calls } = createFakeClient({ etag: '"etag-atual"' });
  const result = await updateArticle({
    client,
    list: LIST,
    id: 42,
    values: { corpoHtml: "<p>novo</p><script>x()</script>" },
    sanitize: fakeSanitize
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].op, "getListItem");
  assert.deepEqual(calls[0].options, { select: ["Id"] });
  assert.equal(calls[1].op, "updateListItem");
  assert.equal(calls[1].id, 42);
  assert.equal(calls[1].options.etag, '"etag-atual"');
  assert.equal(calls[1].values[DEFAULT_FIELD_MAP.corpoHtml], "<p>novo</p>");
  assert.equal(result.status, 204);
}

// --- transitionEditorialState: rejeita estado inválido (TypeError claro),
// sem nenhuma chamada ao client ----------------------------------------------
{
  const { client, calls } = createFakeClient();
  await assert.rejects(
    transitionEditorialState({ client, list: LIST, id: 1, toState: "Removido" }),
    TypeError
  );
  assert.equal(calls.length, 0);
}

// transitionEditorialState: estado válido grava só o campo de estado, com ETag.
{
  const { client, calls } = createFakeClient({ etag: '"etag-estado"' });
  const result = await transitionEditorialState({ client, list: LIST, id: 9, toState: "Arquivado" });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].values, { [DEFAULT_FIELD_MAP.estadoEditorial]: "Arquivado" });
  assert.equal(calls[1].options.etag, '"etag-estado"');
  assert.equal(result.status, 204);
}

// --- scheduleArticle: rejeita publicarDe > publicarAte, sem nenhuma
// chamada ao client -----------------------------------------------------------
{
  const { client, calls } = createFakeClient();
  await assert.rejects(
    scheduleArticle({
      client,
      list: LIST,
      id: 3,
      publicarDe: "2026-12-01T00:00:00.000Z",
      publicarAte: "2026-11-01T00:00:00.000Z"
    }),
    TypeError
  );
  assert.equal(calls.length, 0);
}

// scheduleArticle: janela válida grava só os campos de data, com ETag.
{
  const { client, calls } = createFakeClient({ etag: '"etag-janela"' });
  const result = await scheduleArticle({
    client,
    list: LIST,
    id: 5,
    publicarDe: "2026-01-01T00:00:00.000Z",
    publicarAte: "2026-02-01T00:00:00.000Z"
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].values[DEFAULT_FIELD_MAP.publicarDe], "2026-01-01T00:00:00.000Z");
  assert.equal(calls[1].values[DEFAULT_FIELD_MAP.publicarAte], "2026-02-01T00:00:00.000Z");
  assert.equal(calls[1].options.etag, '"etag-janela"');
  assert.equal(result.status, 204);
}

// scheduleArticle: aceita só um lado informado (o outro fica undefined, não
// é enviado no payload) e exige ao menos um dos dois.
{
  const { client, calls } = createFakeClient({ etag: '"etag-parcial"' });
  await scheduleArticle({ client, list: LIST, id: 6, publicarDe: "2026-03-01T00:00:00.000Z" });
  assert.deepEqual(Object.keys(calls[1].values), [DEFAULT_FIELD_MAP.publicarDe]);

  await assert.rejects(
    scheduleArticle({ client, list: LIST, id: 6 }),
    TypeError
  );
}

// --- uploadCoverImage: repassa corretamente para client.uploadFile e
// retorna a serverRelativeUrl -------------------------------------------------
{
  const { client, calls } = createFakeClient();
  const content = new Uint8Array([1, 2, 3]);
  const result = await uploadCoverImage({
    client,
    library: LIBRARY,
    fileName: "capa.jpg",
    content,
    contentType: "image/jpeg"
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, "uploadFile");
  assert.equal(calls[0].library, LIBRARY);
  assert.equal(calls[0].options.fileName, "capa.jpg");
  assert.equal(calls[0].options.content, content);
  assert.equal(calls[0].options.contentType, "image/jpeg");
  assert.equal(result.serverRelativeUrl, "/sites/teste/Capas/capa.jpg");
  assert.equal(result.status, 201);
}

// --- listArticleVersions / restoreArticleVersion: chamam o client fake com
// os parâmetros certos ---------------------------------------------------------
{
  const { client, calls } = createFakeClient();
  const versions = await listArticleVersions({ client, list: LIST, id: 11 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { op: "listVersions", list: LIST, id: 11 });
  assert.equal(versions.length, 1);
  assert.equal(versions[0].versionId, "1.0");

  const restored = await restoreArticleVersion({ client, list: LIST, id: 11, versionId: "1.0" });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], { op: "restoreVersion", list: LIST, id: 11, versionId: "1.0" });
  assert.equal(restored.status, 204);
}

console.log("publisher-data.test.js (kernel): verificações concluídas com sucesso.");
