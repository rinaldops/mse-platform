import assert from "node:assert/strict";
import { mapArticleItem, mapArticleItems } from "../article-mapper.js";

// --- mapArticleItem: shape padrão (DEFAULT_FIELD_MAP) -----------------------

{
  const raw = {
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
  };
  const artigo = mapArticleItem(raw);
  assert.deepEqual(artigo, {
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
    raw
  });
  console.log("article-mapper.test.js: mapArticleItem mapeia shape padrão (DEFAULT_FIELD_MAP) ok.");
}

// --- mapArticleItem: fieldMap customizado -----------------------------------

{
  const fieldMap = { titulo: "Nome", estadoEditorial: "Status", categoria: "CategoriaId", criadoEm: "DataCriacao" };
  const raw = { Id: 1, Nome: "Outro título", Status: "Publicado", CategoriaId: 9, DataCriacao: "2026-03-01T00:00:00.000Z" };
  const artigo = mapArticleItem(raw, { fieldMap });
  assert.equal(artigo.titulo, "Outro título");
  assert.equal(artigo.estado, "Publicado");
  assert.equal(artigo.categoriaId, 9);
  assert.equal(artigo.criadoEm, "2026-03-01T00:00:00.000Z");
  console.log("article-mapper.test.js: mapArticleItem respeita fieldMap customizado ok.");
}

// --- mapArticleItem: tolerância a dados ausentes/corrompidos ----------------

{
  const artigo = mapArticleItem({ Id: 2 });
  assert.equal(artigo.titulo, "");
  assert.deepEqual(artigo.tags, []);
  assert.equal(artigo.destaque, false);
  assert.equal(artigo.ordemDestaque, undefined);
  assert.equal(artigo.categoriaId, null);
  assert.equal(artigo.criadoEm, undefined);
  console.log("article-mapper.test.js: mapArticleItem tolera item mínimo (só Id) ok.");
}

{
  const artigo = mapArticleItem({ Id: 3, TagsTexto: "{não-json" });
  assert.deepEqual(artigo.tags, []);
  console.log("article-mapper.test.js: mapArticleItem tolera TagsTexto corrompido (JSON inválido) ok.");
}

{
  assert.throws(() => mapArticleItem(undefined), TypeError);
  assert.throws(() => mapArticleItem(null), TypeError);
  console.log("article-mapper.test.js: mapArticleItem valida presença de raw ok.");
}

// --- mapArticleItem: normalização de boolean/número -------------------------

{
  assert.equal(mapArticleItem({ Id: 1, Destaque: "true" }).destaque, true);
  assert.equal(mapArticleItem({ Id: 1, Destaque: 1 }).destaque, true);
  assert.equal(mapArticleItem({ Id: 1, Destaque: 0 }).destaque, false);
  assert.equal(mapArticleItem({ Id: 1, OrdemDestaque: "" }).ordemDestaque, undefined);
  assert.equal(mapArticleItem({ Id: 1, OrdemDestaque: "3" }).ordemDestaque, 3);
  console.log("article-mapper.test.js: mapArticleItem normaliza boolean/número tolerantemente ok.");
}

// --- mapArticleItems ---------------------------------------------------------

{
  assert.deepEqual(mapArticleItems(undefined), []);
  const itens = mapArticleItems([{ Id: 1, Title: "Um" }, { Id: 2, Title: "Dois" }]);
  assert.deepEqual(itens.map((item) => item.titulo), ["Um", "Dois"]);
  console.log("article-mapper.test.js: mapArticleItems mapeia array/tolera ausência ok.");
}

console.log("article-mapper.test.js: todas as verificações concluídas com sucesso.");
