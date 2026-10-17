import assert from "node:assert/strict";
import {
  filterPublished,
  filterByCategoria,
  filterByTag,
  filterFeatured,
  sortByDate,
  paginate,
  composeFilters
} from "../content-services.js";

// --- filterPublished -------------------------------------------------------

{
  const artigos = [
    { id: 1, estado: "Publicado" },
    { id: 2, estado: "Despublicado" },
    { id: 3, estado: "Arquivado" },
    { id: 4, estado: "Lixeira" }
  ];
  assert.deepEqual(filterPublished(artigos).map((a) => a.id), [1]);
  console.log("content-services.test.js: filterPublished mantém só estado Publicado ok.");
}

{
  assert.deepEqual(filterPublished(undefined), []);
  assert.deepEqual(filterPublished([]), []);
  console.log("content-services.test.js: filterPublished tolera lista vazia/ausente ok.");
}

{
  const agora = new Date("2026-06-15T12:00:00Z");
  const artigos = [
    { id: "expirado", estado: "Publicado", publicarDe: "2026-01-01T00:00:00Z", publicarAte: "2026-02-01T00:00:00Z" },
    { id: "futuro", estado: "Publicado", publicarDe: "2026-12-01T00:00:00Z" },
    { id: "sem-limites", estado: "Publicado" },
    { id: "so-de-passado", estado: "Publicado", publicarDe: "2026-01-01T00:00:00Z" },
    { id: "so-ate-futuro", estado: "Publicado", publicarAte: "2026-12-31T00:00:00Z" },
    { id: "vigente", estado: "Publicado", publicarDe: "2026-06-01T00:00:00Z", publicarAte: "2026-06-30T00:00:00Z" }
  ];
  const resultado = filterPublished(artigos, agora).map((a) => a.id);
  assert.deepEqual(resultado, ["sem-limites", "so-de-passado", "so-ate-futuro", "vigente"]);
  console.log("content-services.test.js: filterPublished respeita janela de vigência (expirado/futuro/sem limites) ok.");
}

// --- filterByCategoria ------------------------------------------------------

{
  const artigos = [
    { id: 1, categoriaId: "noticias" },
    { id: 2, categoriaId: "eventos" },
    { id: 3 }
  ];
  assert.deepEqual(filterByCategoria(artigos, "noticias").map((a) => a.id), [1]);
  console.log("content-services.test.js: filterByCategoria filtra por categoriaId ok.");
}

{
  assert.deepEqual(filterByCategoria(undefined, "x"), []);
  assert.deepEqual(filterByCategoria([{ id: 1 }], "noticias"), []);
  console.log("content-services.test.js: filterByCategoria tolera lista vazia/ausência do campo ok.");
}

// --- filterByTag -------------------------------------------------------------

{
  const artigos = [
    { id: 1, tags: ["a", "b"] },
    { id: 2, tags: ["b"] },
    { id: 3, tags: [] },
    { id: 4 }
  ];
  assert.deepEqual(filterByTag(artigos, "a").map((a) => a.id), [1]);
  assert.deepEqual(filterByTag(artigos, "b").map((a) => a.id), [1, 2]);
  console.log("content-services.test.js: filterByTag combina artigos com múltiplas tags ok.");
}

{
  assert.deepEqual(filterByTag(undefined, "a"), []);
  assert.deepEqual(filterByTag([{ id: 1 }], "a"), []);
  console.log("content-services.test.js: filterByTag tolera lista vazia/item sem tags ok.");
}

// --- filterFeatured ------------------------------------------------------------

{
  const artigos = [
    { id: "sem-ordem-1", destaque: true },
    { id: "ordem-2", destaque: true, ordemDestaque: 2 },
    { id: "ordem-1", destaque: true, ordemDestaque: 1 },
    { id: "nao-destaque", destaque: false },
    { id: "sem-destaque" },
    { id: "sem-ordem-2", destaque: true }
  ];
  const resultado = filterFeatured(artigos).map((a) => a.id);
  // ordenado por ordemDestaque ascendente; sem ordem no final, estável entre si.
  assert.deepEqual(resultado, ["ordem-1", "ordem-2", "sem-ordem-1", "sem-ordem-2"]);
  console.log("content-services.test.js: filterFeatured ordena por ordemDestaque, estável, sem-ordem no final ok.");
}

{
  assert.deepEqual(filterFeatured(undefined), []);
  assert.deepEqual(filterFeatured([]), []);
  console.log("content-services.test.js: filterFeatured tolera lista vazia/ausente ok.");
}

{
  const agora = new Date("2026-06-15T12:00:00Z");
  const artigos = [
    { id: "expirado", destaque: true, destaqueDe: "2026-01-01T00:00:00Z", destaqueAte: "2026-02-01T00:00:00Z" },
    { id: "futuro", destaque: true, destaqueDe: "2026-12-01T00:00:00Z" },
    { id: "sem-janela", destaque: true },
    { id: "vigente", destaque: true, destaqueDe: "2026-06-01T00:00:00Z", destaqueAte: "2026-06-30T00:00:00Z" }
  ];
  const resultado = filterFeatured(artigos, { agora }).map((a) => a.id);
  assert.deepEqual(resultado.sort(), ["sem-janela", "vigente"].sort());
  console.log("content-services.test.js: filterFeatured respeita janela opcional de destaque ok.");
}

// --- sortByDate ------------------------------------------------------------------

{
  const artigos = [
    { id: 1, criadoEm: "2026-01-01T00:00:00Z" },
    { id: 2, criadoEm: "2026-03-01T00:00:00Z" },
    { id: 3, criadoEm: "2026-02-01T00:00:00Z" }
  ];
  assert.deepEqual(sortByDate(artigos).map((a) => a.id), [2, 3, 1]);
  assert.deepEqual(sortByDate(artigos, { direction: "asc" }).map((a) => a.id), [1, 3, 2]);
  console.log("content-services.test.js: sortByDate ordena por criadoEm desc (padrão) e asc ok.");
}

{
  const artigos = [
    { id: 1, publicadoEm: "2026-02-01T00:00:00Z" },
    { id: 2, publicadoEm: "2026-01-01T00:00:00Z" }
  ];
  assert.deepEqual(sortByDate(artigos, { field: "publicadoEm", direction: "asc" }).map((a) => a.id), [2, 1]);
  console.log("content-services.test.js: sortByDate aceita campo customizado ok.");
}

{
  // item sem o campo opcional vai para o final, independente da direção; ordenação estável entre empates.
  const artigos = [
    { id: "sem-data-1" },
    { id: "com-data", criadoEm: "2026-01-01T00:00:00Z" },
    { id: "sem-data-2" }
  ];
  assert.deepEqual(sortByDate(artigos).map((a) => a.id), ["com-data", "sem-data-1", "sem-data-2"]);
  assert.deepEqual(
    sortByDate(artigos, { direction: "asc" }).map((a) => a.id),
    ["com-data", "sem-data-1", "sem-data-2"]
  );
  assert.deepEqual(sortByDate(undefined), []);
  console.log("content-services.test.js: sortByDate manda item sem campo para o final e tolera lista ausente ok.");
}

// --- paginate ------------------------------------------------------------------

{
  const artigos = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
  const pagina1 = paginate(artigos, { page: 1, pageSize: 10 });
  assert.deepEqual(pagina1.items.map((a) => a.id), Array.from({ length: 10 }, (_, i) => i + 1));
  assert.deepEqual(
    { page: pagina1.page, pageSize: pagina1.pageSize, total: pagina1.total, totalPages: pagina1.totalPages },
    { page: 1, pageSize: 10, total: 25, totalPages: 3 }
  );

  const pagina3 = paginate(artigos, { page: 3, pageSize: 10 });
  assert.deepEqual(pagina3.items.map((a) => a.id), [21, 22, 23, 24, 25]);
  console.log("content-services.test.js: paginate recorta páginas completas e parciais ok.");
}

{
  const artigos = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
  const foraDoIntervalo = paginate(artigos, { page: 99, pageSize: 10 });
  assert.deepEqual(foraDoIntervalo.items, []);
  assert.equal(foraDoIntervalo.total, 5);
  assert.equal(foraDoIntervalo.totalPages, 1);

  const paginaZero = paginate(artigos, { page: 0, pageSize: 10 });
  assert.deepEqual(paginaZero.items, []);
  console.log("content-services.test.js: paginate com página fora do intervalo devolve items vazio mas metadados corretos ok.");
}

{
  const vazio = paginate(undefined);
  assert.deepEqual(vazio, { items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
  console.log("content-services.test.js: paginate tolera lista ausente e aplica padrões ok.");
}

// --- composeFilters --------------------------------------------------------------

{
  const agora = new Date("2026-06-15T12:00:00Z");
  const artigos = [
    { id: 1, estado: "Publicado", categoriaId: "noticias", tags: ["a"], destaque: true, ordemDestaque: 2 },
    { id: 2, estado: "Publicado", categoriaId: "noticias", tags: ["a", "b"], destaque: true, ordemDestaque: 1 },
    { id: 3, estado: "Publicado", categoriaId: "eventos", tags: ["a"] },
    { id: 4, estado: "Despublicado", categoriaId: "noticias", tags: ["a"], destaque: true, ordemDestaque: 0 }
  ];
  const resultado = composeFilters(artigos, {
    publicadosApenas: true,
    categoriaId: "noticias",
    tag: "a",
    destaque: true,
    agora,
    page: 1,
    pageSize: 10
  });
  assert.deepEqual(resultado.items.map((a) => a.id), [2, 1]);
  assert.equal(resultado.total, 2);
  console.log("content-services.test.js: composeFilters aplica publicadosApenas+categoria+tag+destaque em sequência ok.");
}

{
  const artigos = [{ id: 1, estado: "Publicado" }, { id: 2, estado: "Despublicado" }];
  const semFiltros = composeFilters(artigos);
  assert.deepEqual(semFiltros.items.map((a) => a.id), [1, 2]);
  assert.equal(semFiltros.page, 1);
  assert.equal(semFiltros.pageSize, 10);
  console.log("content-services.test.js: composeFilters sem filtros devolve tudo paginado com padrões ok.");
}

{
  assert.deepEqual(composeFilters(undefined, { publicadosApenas: true }).items, []);
  console.log("content-services.test.js: composeFilters tolera artigos ausente ok.");
}

console.log("content-services.test.js: verificações concluídas com sucesso.");
