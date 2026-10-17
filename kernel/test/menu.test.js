import assert from "node:assert/strict";
import { MSE_MENU_SCHEMA, MSE_MENU_TIPOS_SCHEMA } from "../schemas/mse-menu.js";
import { buildMenuTree, buildPathway, findActiveMenuItem } from "../menu.js";

// --- MSE_MENU_TIPOS_SCHEMA ---------------------------------------------

assert.ok(Object.isFrozen(MSE_MENU_TIPOS_SCHEMA));
assert.ok(Object.isFrozen(MSE_MENU_TIPOS_SCHEMA.fields));
assert.equal(MSE_MENU_TIPOS_SCHEMA.internalName, "MSEMenuTipos");
assert.equal(MSE_MENU_TIPOS_SCHEMA.titleField.displayName, "Título");
const tiposFieldNames = MSE_MENU_TIPOS_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(tiposFieldNames, ["Chave", "Descricao"]);
for (const field of MSE_MENU_TIPOS_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}
assert.equal(MSE_MENU_TIPOS_SCHEMA.fields.find((f) => f.internalName === "Chave").indexed, true);

// --- MSE_MENU_SCHEMA ----------------------------------------------------

assert.ok(Object.isFrozen(MSE_MENU_SCHEMA));
assert.ok(Object.isFrozen(MSE_MENU_SCHEMA.fields));
assert.equal(MSE_MENU_SCHEMA.internalName, "MSEMenu");
assert.equal(MSE_MENU_SCHEMA.titleField.displayName, "Título");
const menuFieldNames = MSE_MENU_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(menuFieldNames, [
  "Alias", "TipoMenu", "ParentId", "Caminho", "Nivel", "Ordem",
  "Componente", "Visao", "ParamsJson", "Padrao", "AbrirEm", "Estado"
]);
for (const field of MSE_MENU_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}
const abrirEm = MSE_MENU_SCHEMA.fields.find((f) => f.internalName === "AbrirEm");
assert.deepEqual([...abrirEm.choices], ["MesmaAba", "NovaAba"]);
const estado = MSE_MENU_SCHEMA.fields.find((f) => f.internalName === "Estado");
assert.deepEqual([...estado.choices], ["Publicado", "Despublicado", "Lixeira"]);

console.log("menu.test.js: esquemas verificados.");

// --- fixture compartilhada: 3 níveis -----------------------------------
//
// Início (raiz, Padrao)
// Blog (raiz)
//   Destaques (filho de Blog)
//     Em Foco (nieto de Blog, filho de Destaques)
//   Rascunho (filho de Blog, Despublicado -> deve ser ignorado)
// Contatos (raiz, Despublicado -> deve ser ignorado por completo)

function fixtureItems() {
  return [
    { Id: 1, Title: "Início", Alias: "", TipoMenu: "principal", ParentId: 0, Caminho: "", Nivel: 1, Ordem: 1, Componente: null, Visao: null, ParamsJson: null, Padrao: true, AbrirEm: "MesmaAba", Estado: "Publicado" },
    { Id: 2, Title: "Blog", Alias: "blog", TipoMenu: "principal", ParentId: 0, Caminho: "blog", Nivel: 1, Ordem: 2, Componente: "blog", Visao: "lista", ParamsJson: null, Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado" },
    { Id: 3, Title: "Destaques", Alias: "destaques", TipoMenu: "principal", ParentId: 2, Caminho: "blog/destaques", Nivel: 2, Ordem: 1, Componente: "blog", Visao: "destaques", ParamsJson: null, Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado" },
    { Id: 4, Title: "Em Foco", Alias: "em-foco", TipoMenu: "principal", ParentId: 3, Caminho: "blog/destaques/em-foco", Nivel: 3, Ordem: 1, Componente: "blog", Visao: "em-foco", ParamsJson: null, Padrao: false, AbrirEm: "MesmaAba", Estado: "Publicado" },
    { Id: 5, Title: "Rascunho", Alias: "rascunho", TipoMenu: "principal", ParentId: 2, Caminho: "blog/rascunho", Nivel: 2, Ordem: 2, Componente: "blog", Visao: "lista", ParamsJson: null, Padrao: false, AbrirEm: "MesmaAba", Estado: "Despublicado" },
    { Id: 6, Title: "Contatos", Alias: "contatos", TipoMenu: "principal", ParentId: 0, Caminho: "contatos", Nivel: 1, Ordem: 3, Componente: "contatos", Visao: null, ParamsJson: null, Padrao: false, AbrirEm: "MesmaAba", Estado: "Despublicado" }
  ];
}

// --- buildMenuTree --------------------------------------------------------

{
  const tree = buildMenuTree(fixtureItems());
  // apenas raízes publicadas: Início (ordem 1) e Blog (ordem 2); Contatos ignorado
  assert.equal(tree.length, 2);
  assert.equal(tree[0].Title, "Início");
  assert.equal(tree[1].Title, "Blog");

  const blog = tree[1];
  // Rascunho (despublicado) não aparece entre os filhos de Blog
  assert.equal(blog.children.length, 1);
  assert.equal(blog.children[0].Title, "Destaques");

  const destaques = blog.children[0];
  assert.equal(destaques.children.length, 1);
  assert.equal(destaques.children[0].Title, "Em Foco");
  assert.equal(destaques.children[0].children.length, 0);

  console.log("menu.test.js: buildMenuTree ok.");
}

// --- findActiveMenuItem ----------------------------------------------------

{
  const items = fixtureItems();

  const byAlias = findActiveMenuItem(items, { alias: "destaques" });
  assert.ok(byAlias);
  assert.equal(byAlias.Id, 3);

  const fallbackToDefault = findActiveMenuItem(items, { alias: "" });
  assert.ok(fallbackToDefault);
  assert.equal(fallbackToDefault.Id, 1);
  assert.equal(fallbackToDefault.Padrao, true);

  const fallbackNoRoute = findActiveMenuItem(items, undefined);
  assert.ok(fallbackNoRoute);
  assert.equal(fallbackNoRoute.Id, 1);

  const notFound = findActiveMenuItem(items, { alias: "inexistente" });
  assert.equal(notFound, null);

  const despublicadoNaoEncontrado = findActiveMenuItem(items, { alias: "contatos" });
  assert.equal(despublicadoNaoEncontrado, null);

  console.log("menu.test.js: findActiveMenuItem ok.");
}

// --- buildPathway --------------------------------------------------------

{
  const items = fixtureItems();

  const emFoco = items.find((item) => item.Id === 4);
  const pathway = buildPathway(items, emFoco);
  assert.deepEqual(pathway, [
    { title: "Blog", alias: "blog" },
    { title: "Destaques", alias: "destaques" },
    { title: "Em Foco", alias: "em-foco" }
  ]);

  const inicio = items.find((item) => item.Id === 1);
  const rootPathway = buildPathway(items, inicio);
  assert.deepEqual(rootPathway, [{ title: "Início", alias: "" }]);

  assert.deepEqual(buildPathway(items, null), []);

  console.log("menu.test.js: buildPathway ok.");
}

console.log("menu.test.js: verificações concluídas com sucesso.");
