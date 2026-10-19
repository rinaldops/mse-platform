import assert from "node:assert/strict";
import { allowedEditorialTransitions, assertEditorialTransition, filterPublisherItems, normalizePublisherFilters } from "../screens/publisher-filters.js";

const items = [
  { Id: 1, Title: "Notícia Petrobras", Slug: "noticia", Resumo: "Energia", EstadoEditorial: "Publicado", CategoriaTexto: "Energia", Destaque: true, DataPublicacao: "2026-01-01T00:00:00Z", DataExpiracao: "2026-12-31T00:00:00Z" },
  { Id: 2, Title: "Rascunho de projeto", EstadoEditorial: "Despublicado", CategoriaTexto: "Projetos", Destaque: false },
  { Id: 3, Title: "Notícia expirada", EstadoEditorial: "Publicado", CategoriaTexto: "Energia", Destaque: true, DataExpiracao: "2025-12-31T00:00:00Z" }
];
assert.deepEqual(filterPublisherItems(items, { estado: "Publicado" }).map((item) => item.Id), [1, 3]);
assert.deepEqual(filterPublisherItems(items, { termo: "projeto" }).map((item) => item.Id), [2]);
assert.deepEqual(filterPublisherItems(items, { categoria: "energia", destaque: true, vigenteEm: "2026-06-01T00:00:00Z" }).map((item) => item.Id), [1]);
assert.deepEqual(normalizePublisherFilters({ destaque: "false" }).destaque, false);
assert.throws(() => normalizePublisherFilters({ estado: "Inexistente" }), /Estado editorial inválido/);
assert.deepEqual(allowedEditorialTransitions("Lixeira"), ["Despublicado"]);
assert.equal(assertEditorialTransition("Despublicado", "Publicado"), "Publicado");
assert.throws(() => assertEditorialTransition("Lixeira", "Publicado"), /não permitida/);
console.log("publisher-filters.test.js: verificações concluídas com sucesso.");
