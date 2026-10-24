import assert from "node:assert/strict";
import { createArticlesReadService, resolveArticlesList } from "../articles-data.js";

// --- resolveArticlesList: mesma ordem de fallback de
// components/com_content/publisher.js#resolvePublisherList ------------------

assert.equal(resolveArticlesList(undefined), null);
assert.equal(resolveArticlesList({}), null);
assert.deepEqual(resolveArticlesList({ CAMAPPublicacoes: { listId: "a" } }), { listId: "a" });
assert.deepEqual(resolveArticlesList({ MSEPublicacoes: { listId: "b" } }), { listId: "b" });
assert.deepEqual(resolveArticlesList({ Publicacoes: { listId: "c" } }), { listId: "c" });
assert.deepEqual(resolveArticlesList({ publicacoes: { listId: "d" } }), { listId: "d" });
assert.deepEqual(resolveArticlesList({ publisher: { listId: "e" } }), { listId: "e" });
assert.deepEqual(
  resolveArticlesList({ publisher: { listId: "e" }, CAMAPPublicacoes: { listId: "a" } }),
  { listId: "a" }
);

// --- createArticlesReadService: validação de parâmetros --------------------

assert.throws(() => createArticlesReadService({}), TypeError);
assert.throws(() => createArticlesReadService({ client: {} }), TypeError);
assert.throws(
  () => createArticlesReadService({ client: { getListItems: async () => [] } }),
  TypeError
);

// --- createArticlesReadService: listArticles() lê e mapeia -----------------

const list = { listId: "guid-fake" };
const raw = [
  {
    Id: 7,
    Title: "Notícia de teste",
    Slug: "noticia-de-teste",
    Resumo: "Resumo curto",
    CorpoHtmlSeguroV1: "<p>Corpo</p>",
    EstadoEditorial: "Publicado",
    Destaque: true,
    OrdemDestaque: 2,
    DataPublicacao: "2026-01-01T00:00:00.000Z",
    DataExpiracao: "2026-02-01T00:00:00.000Z",
    CategoriaTexto: "noticias",
    TagsTexto: JSON.stringify(["a", "b"]),
    ImagemUrl: "/sites/x/img.png",
    Created: "2025-12-01T00:00:00.000Z"
  }
];

{
  let received = null;
  const client = {
    async getListItems(receivedList, options) {
      received = { receivedList, options };
      return raw;
    }
  };
  const service = createArticlesReadService({ client, list });
  const result = await service.listArticles();
  assert.equal(received.receivedList, list);
  assert.ok(received.options.select.includes("Title"));
  assert.ok(received.options.select.includes("Id"));
  assert.ok(received.options.select.includes("Created"));
  assert.deepEqual(result, [
    {
      id: 7,
      titulo: "Notícia de teste",
      slug: "noticia-de-teste",
      resumo: "Resumo curto",
      corpoHtml: "<p>Corpo</p>",
      estado: "Publicado",
      categoriaId: "noticias",
      tags: ["a", "b"],
      destaque: true,
      ordemDestaque: 2,
      publicarDe: "2026-01-01T00:00:00.000Z",
      publicarAte: "2026-02-01T00:00:00.000Z",
      imagemCapaUrl: "/sites/x/img.png",
      criadoEm: "2025-12-01T00:00:00.000Z",
      raw: raw[0]
    }
  ]);
}

// --- createArticlesReadService: fieldMap parcial é repassado ao mapper -----

{
  const client = {
    async getListItems(_list, options) {
      assert.ok(options.select.includes("TituloCustom"));
      return [{ Id: 1, TituloCustom: "Custom", Created: "2026-01-01T00:00:00.000Z" }];
    }
  };
  const service = createArticlesReadService({ client, list, fieldMap: { titulo: "TituloCustom" } });
  const result = await service.listArticles();
  assert.equal(result[0].titulo, "Custom");
}

console.log("articles-data.test.js: verificações concluídas com sucesso.");
