import assert from "node:assert/strict";
import { MSE_MENU_SCHEMA } from "../schemas/mse-menu.js";
import { MSE_MENU_TYPES_SCHEMA } from "../schemas/mse-menu-types.js";
import { buildMenuTree, buildPathway, findActiveMenuItem } from "../menu.js";

// --- MSE_MENU_TYPES_SCHEMA ---------------------------------------------

assert.ok(Object.isFrozen(MSE_MENU_TYPES_SCHEMA));
assert.ok(Object.isFrozen(MSE_MENU_TYPES_SCHEMA.fields));
assert.equal(MSE_MENU_TYPES_SCHEMA.internalName, "MSEMenuTypes");
assert.equal(MSE_MENU_TYPES_SCHEMA.titleField.displayName, "Title");
const tiposFieldNames = MSE_MENU_TYPES_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(tiposFieldNames, ["Key", "Description"]);
for (const field of MSE_MENU_TYPES_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}
assert.equal(MSE_MENU_TYPES_SCHEMA.fields.find((f) => f.internalName === "Key").indexed, true);

// --- MSE_MENU_SCHEMA ----------------------------------------------------

assert.ok(Object.isFrozen(MSE_MENU_SCHEMA));
assert.ok(Object.isFrozen(MSE_MENU_SCHEMA.fields));
assert.equal(MSE_MENU_SCHEMA.internalName, "MSEMenu");
assert.equal(MSE_MENU_SCHEMA.titleField.displayName, "Título");
const menuFieldNames = MSE_MENU_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(menuFieldNames, [
  "Alias", "ParentId", "ParamsJson",
  // Fase 5 da normalização Joomla! (docs/JOOMLA-CONVENCOES-E-MIGRACAO.md,
  // 23/10/2026): os 9 campos PT (TipoMenu/Caminho/Nivel/Ordem/Componente/
  // Visao/Padrao/AbrirEm/Estado) foram decomissionados — ver
  // tools/decommission-mse-legacy-pt.js. Só os campos em inglês permanecem.
  "MenuType", "Path", "Level", "Ordering", "Component", "View",
  "Default", "Target", "Published",
  // 23/10/2026 — atribuição de template por item de menu (ver
  // docs/AUDITORIA-JOOMLA-PENTE-FINO.md §3): campo novo, sem equivalente PT.
  "TemplateStyleId"
]);
for (const field of MSE_MENU_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}
const target = MSE_MENU_SCHEMA.fields.find((f) => f.internalName === "Target");
assert.deepEqual([...target.choices], ["SameTab", "NewTab"]);
const published = MSE_MENU_SCHEMA.fields.find((f) => f.internalName === "Published");
assert.deepEqual([...published.choices], ["Published", "Unpublished", "Trashed"]);

console.log("menu.test.js: esquemas verificados.");

// --- fixture compartilhada: 3 níveis -----------------------------------
//
// Início (raiz, Default)
// Blog (raiz)
//   Destaques (filho de Blog)
//     Em Foco (nieto de Blog, filho de Destaques)
//   Rascunho (filho de Blog, Unpublished -> deve ser ignorado)
// Contatos (raiz, Unpublished -> deve ser ignorado por completo)

function fixtureItems() {
  return [
    { Id: 1, Title: "Início", Alias: "", MenuType: "principal", ParentId: 0, Path: "", Level: 1, Ordering: 1, Component: null, View: null, ParamsJson: null, Default: true, Target: "SameTab", Published: "Published" },
    { Id: 2, Title: "Blog", Alias: "blog", MenuType: "principal", ParentId: 0, Path: "blog", Level: 1, Ordering: 2, Component: "blog", View: "lista", ParamsJson: null, Default: false, Target: "SameTab", Published: "Published" },
    { Id: 3, Title: "Destaques", Alias: "destaques", MenuType: "principal", ParentId: 2, Path: "blog/destaques", Level: 2, Ordering: 1, Component: "blog", View: "destaques", ParamsJson: null, Default: false, Target: "SameTab", Published: "Published" },
    { Id: 4, Title: "Em Foco", Alias: "em-foco", MenuType: "principal", ParentId: 3, Path: "blog/destaques/em-foco", Level: 3, Ordering: 1, Component: "blog", View: "em-foco", ParamsJson: null, Default: false, Target: "SameTab", Published: "Published" },
    { Id: 5, Title: "Rascunho", Alias: "rascunho", MenuType: "principal", ParentId: 2, Path: "blog/rascunho", Level: 2, Ordering: 2, Component: "blog", View: "lista", ParamsJson: null, Default: false, Target: "SameTab", Published: "Unpublished" },
    { Id: 6, Title: "Contatos", Alias: "contatos", MenuType: "principal", ParentId: 0, Path: "contatos", Level: 1, Ordering: 3, Component: "contatos", View: null, ParamsJson: null, Default: false, Target: "SameTab", Published: "Unpublished" }
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
  assert.equal(fallbackToDefault.Default, true);

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
