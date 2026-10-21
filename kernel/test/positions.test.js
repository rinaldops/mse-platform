import assert from "node:assert/strict";
import { MSE_MODULES_SCHEMA } from "../schemas/mse-modules.js";
import { MSE_MODULES_MENU_SCHEMA } from "../schemas/mse-modules-menu.js";
import { resolveModulesForPosition, groupModulesByPosition } from "../positions.js";

// --- MSE_MODULES_SCHEMA ---------------------------------------------------

assert.ok(Object.isFrozen(MSE_MODULES_SCHEMA));
assert.ok(Object.isFrozen(MSE_MODULES_SCHEMA.fields));
assert.equal(MSE_MODULES_SCHEMA.titleField.displayName, "Title");
assert.equal(MSE_MODULES_SCHEMA.internalName, "MSEModules");

const modulosFieldNames = MSE_MODULES_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(modulosFieldNames, [
  "Module", "Position", "Ordering", "Published", "PublishUp", "PublishDown",
  "ShowTitle", "Style", "MenuAssignment", "ParamsJson", "SchemaVersion"
]);

for (const field of MSE_MODULES_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}

const estadoModulos = MSE_MODULES_SCHEMA.fields.find((f) => f.internalName === "Published");
assert.deepEqual([...estadoModulos.choices], ["Published", "Unpublished", "Trashed"]);

const atribuicaoMenu = MSE_MODULES_SCHEMA.fields.find((f) => f.internalName === "MenuAssignment");
assert.deepEqual([...atribuicaoMenu.choices], ["All", "None", "Only", "AllExcept"]);

console.log("positions.test.js: MSE_MODULES_SCHEMA verificado.");

// --- MSE_MODULES_MENU_SCHEMA -----------------------------------------------

assert.ok(Object.isFrozen(MSE_MODULES_MENU_SCHEMA));
assert.ok(Object.isFrozen(MSE_MODULES_MENU_SCHEMA.fields));
assert.equal(MSE_MODULES_MENU_SCHEMA.titleField.displayName, "Title");
assert.equal(MSE_MODULES_MENU_SCHEMA.internalName, "MSEModulesMenu");

const modulosMenuFieldNames = MSE_MODULES_MENU_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(modulosMenuFieldNames, ["ModuleId", "MenuId"]);

for (const field of MSE_MODULES_MENU_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
  assert.equal(field.indexed, true);
}

console.log("positions.test.js: MSE_MODULES_MENU_SCHEMA verificado.");

// --- fixtures ---------------------------------------------------------------

const AGORA = new Date("2026-10-15T12:00:00Z");
const PASSADO = new Date("2020-01-01T00:00:00Z");
const FUTURO = new Date("2030-01-01T00:00:00Z");

function moduloBase(overrides) {
  return {
    Id: 0,
    Title: "Módulo",
    Module: "sd",
    Position: "topo-a",
    Ordering: 0,
    Published: "Published",
    PublishUp: null,
    PublishDown: null,
    ShowTitle: true,
    Style: null,
    MenuAssignment: "All",
    ParamsJson: null,
    SchemaVersion: 1,
    ...overrides
  };
}

// --- resolveModulesForPosition: filtro por posição e Published -------------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", Ordering: 2 }),
    moduloBase({ Id: 2, Position: "topo-a", Ordering: 1 }),
    moduloBase({ Id: 3, Position: "rodape", Ordering: 1 }),
    moduloBase({ Id: 4, Position: "topo-a", Ordering: 3, Published: "Unpublished" }),
    moduloBase({ Id: 5, Position: "topo-a", Ordering: 4, Published: "Trashed" })
  ];

  const resultado = resolveModulesForPosition(modulos, { posicao: "topo-a", agora: AGORA });
  assert.deepEqual(resultado.map((m) => m.Id), [2, 1]);

  console.log("positions.test.js: filtro por posição e Published ok.");
}

// --- resolveModulesForPosition: vigência (PublishUp/PublishDown) -----------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", Ordering: 1 }), // sem limites: sempre vigente
    moduloBase({ Id: 2, Position: "topo-a", Ordering: 2, PublishDown: PASSADO }), // expirado
    moduloBase({ Id: 3, Position: "topo-a", Ordering: 3, PublishUp: FUTURO }), // futuro
    moduloBase({ Id: 4, Position: "topo-a", Ordering: 4, PublishUp: PASSADO, PublishDown: FUTURO }) // dentro da janela
  ];

  const resultado = resolveModulesForPosition(modulos, { posicao: "topo-a", agora: AGORA });
  assert.deepEqual(resultado.map((m) => m.Id), [1, 4]);

  console.log("positions.test.js: vigência (expirado/futuro/sem limites) ok.");
}

// --- resolveModulesForPosition: MenuAssignment = All / None ----------------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", MenuAssignment: "All" }),
    moduloBase({ Id: 2, Position: "topo-a", MenuAssignment: "None" })
  ];

  const comMenu = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 10, agora: AGORA });
  assert.deepEqual(comMenu.map((m) => m.Id), [1]);

  const semMenu = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: null, agora: AGORA });
  assert.deepEqual(semMenu.map((m) => m.Id), [1]);

  console.log("positions.test.js: MenuAssignment All/None ok.");
}

// --- resolveModulesForPosition: MenuAssignment = Only -----------------------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", MenuAssignment: "Only" })
  ];
  const modulosMenu = [
    { Id: 100, ModuleId: 1, MenuId: 10 },
    { Id: 101, ModuleId: 1, MenuId: 20 }
  ];

  const noItemListado = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 10, modulosMenu, agora: AGORA });
  assert.deepEqual(noItemListado.map((m) => m.Id), [1]);

  const foraDaLista = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 30, modulosMenu, agora: AGORA });
  assert.deepEqual(foraDaLista.map((m) => m.Id), []);

  const semMenuAtivo = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: null, modulosMenu, agora: AGORA });
  assert.deepEqual(semMenuAtivo.map((m) => m.Id), []);

  console.log("positions.test.js: MenuAssignment Only ok.");
}

// --- resolveModulesForPosition: MenuAssignment = AllExcept ------------------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", MenuAssignment: "AllExcept" })
  ];
  const modulosMenu = [
    { Id: 100, ModuleId: 1, MenuId: 10 }
  ];

  const itemExcluido = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 10, modulosMenu, agora: AGORA });
  assert.deepEqual(itemExcluido.map((m) => m.Id), []);

  const itemNaoExcluido = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 99, modulosMenu, agora: AGORA });
  assert.deepEqual(itemNaoExcluido.map((m) => m.Id), [1]);

  const semMenuAtivo = resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: null, modulosMenu, agora: AGORA });
  assert.deepEqual(semMenuAtivo.map((m) => m.Id), [1]);

  console.log("positions.test.js: MenuAssignment AllExcept ok.");
}

// --- resolveModulesForPosition: ordenação com e sem Ordering ----------------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", Ordering: 5 }),
    moduloBase({ Id: 2, Position: "topo-a", Ordering: undefined }),
    moduloBase({ Id: 3, Position: "topo-a", Ordering: 1 }),
    moduloBase({ Id: 4, Position: "topo-a", Ordering: undefined }), // após Id 2, sem Ordering
    moduloBase({ Id: 5, Position: "topo-a", Ordering: 1 }) // empate com Id 3, mantém ordem relativa de entrada
  ];

  const resultado = resolveModulesForPosition(modulos, { posicao: "topo-a", agora: AGORA });
  assert.deepEqual(resultado.map((m) => m.Id), [3, 5, 1, 2, 4]);

  console.log("positions.test.js: ordenação com e sem Ordering ok.");
}

// --- resolveModulesForPosition: parâmetros ausentes tolerados --------------

{
  assert.deepEqual(resolveModulesForPosition(undefined, { posicao: "topo-a" }), []);
  assert.deepEqual(resolveModulesForPosition(null, { posicao: "topo-a" }), []);
  assert.deepEqual(resolveModulesForPosition([], { posicao: "topo-a" }), []);

  const modulos = [moduloBase({ Id: 1, Position: "topo-a", MenuAssignment: "Only" })];
  // modulosMenu ausente/undefined tratado como lista vazia (nunca lança).
  assert.deepEqual(resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 10 }), []);
  assert.deepEqual(resolveModulesForPosition(modulos, { posicao: "topo-a", menuItemId: 10, modulosMenu: null }), []);

  console.log("positions.test.js: modulos/modulosMenu ausentes tolerados ok.");
}

// --- resolveModulesForPosition: posicao malformada lança TypeError ---------

{
  assert.throws(() => resolveModulesForPosition([], {}), TypeError);
  assert.throws(() => resolveModulesForPosition([], { posicao: "" }), TypeError);
  assert.throws(() => resolveModulesForPosition([], { posicao: "   " }), TypeError);
  assert.throws(() => resolveModulesForPosition([], { posicao: 123 }), TypeError);
  assert.throws(() => resolveModulesForPosition([], { posicao: null }), TypeError);

  console.log("positions.test.js: posicao malformada lança TypeError ok.");
}

// --- groupModulesByPosition: agrupamento de múltiplas posições -------------

{
  const modulos = [
    moduloBase({ Id: 1, Position: "topo-a", Ordering: 2 }),
    moduloBase({ Id: 2, Position: "topo-a", Ordering: 1 }),
    moduloBase({ Id: 3, Position: "rodape", Ordering: 1 }),
    moduloBase({ Id: 4, Position: "rodape", Ordering: 2, Published: "Unpublished" }), // excluído
    moduloBase({ Id: 5, Position: "lateral", Ordering: 1, MenuAssignment: "Only" }) // sem par -> excluído
  ];

  const agrupado = groupModulesByPosition(modulos, { menuItemId: 10, agora: AGORA });

  assert.deepEqual(Object.keys(agrupado), ["topo-a", "rodape", "lateral"]);
  assert.deepEqual(agrupado["topo-a"].map((m) => m.Id), [2, 1]);
  assert.deepEqual(agrupado["rodape"].map((m) => m.Id), [3]);
  assert.deepEqual(agrupado["lateral"].map((m) => m.Id), []);

  console.log("positions.test.js: groupModulesByPosition agrupa por posição ok.");
}

// --- groupModulesByPosition: modulos/modulosMenu ausentes tolerados --------

{
  assert.deepEqual(groupModulesByPosition(undefined), {});
  assert.deepEqual(groupModulesByPosition(null), {});
  assert.deepEqual(groupModulesByPosition([]), {});

  const modulos = [moduloBase({ Id: 1, Position: "topo-a" })];
  assert.deepEqual(
    Object.keys(groupModulesByPosition(modulos, { modulosMenu: undefined, agora: AGORA })),
    ["topo-a"]
  );

  console.log("positions.test.js: groupModulesByPosition tolera ausências ok.");
}

console.log("positions.test.js: verificações concluídas com sucesso.");
