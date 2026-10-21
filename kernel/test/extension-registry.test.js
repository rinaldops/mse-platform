import assert from "node:assert/strict";
import { MSE_EXTENSIONS_SCHEMA } from "../schemas/mse-extensions.js";
import { isEnabled, resolveExtension, sortPlugins, listByType } from "../extension-registry.js";

// --- MSE_EXTENSIONS_SCHEMA ------------------------------------------------

assert.ok(Object.isFrozen(MSE_EXTENSIONS_SCHEMA));
assert.ok(Object.isFrozen(MSE_EXTENSIONS_SCHEMA.fields));
assert.equal(MSE_EXTENSIONS_SCHEMA.titleField.displayName, "Title");
assert.equal(MSE_EXTENSIONS_SCHEMA.internalName, "MSEExtensions");

const fieldNames = MSE_EXTENSIONS_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(fieldNames, [
  "Type", "Element", "Version", "Enabled", "Protected", "Ordering", "ParamsJson"
]);
// Title + 7 campos declarados em `fields[]` = 8 campos no total, como
// descrito na tarefa (Title, Type, Element, Version, Enabled, Protected,
// Ordering, ParamsJson).
assert.equal(fieldNames.length + 1, 8);

for (const field of MSE_EXTENSIONS_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}

const tipo = MSE_EXTENSIONS_SCHEMA.fields.find((f) => f.internalName === "Type");
assert.deepEqual([...tipo.choices], ["Component", "Module", "Plugin"]);

console.log("extension-registry.test.js: MSE_EXTENSIONS_SCHEMA verificado.");

// --- fixtures -------------------------------------------------------------

function fixtureItems() {
  return [
    { Title: "Fórum", Type: "Component", Element: "forum", Version: "1.0.0", Enabled: true, Protected: false, Ordering: undefined, ParamsJson: null },
    { Title: "Explore Mais", Type: "Module", Element: "explore-mais", Version: "1.0.0", Enabled: false, Protected: false, Ordering: undefined, ParamsJson: null },
    { Title: "Breadcrumbs", Type: "Module", Element: "breadcrumbs", Version: "1.0.0", Enabled: true, Protected: true, Ordering: undefined, ParamsJson: null },
    { Title: "Auditoria", Type: "Plugin", Element: "auditoria", Version: "1.0.0", Enabled: true, Protected: true, Ordering: 2, ParamsJson: null },
    { Title: "Cache", Type: "Plugin", Element: "cache", Version: "1.0.0", Enabled: true, Protected: false, Ordering: 1, ParamsJson: null },
    { Title: "Legado", Type: "Plugin", Element: "legado", Version: "0.9.0", Enabled: true, Protected: false, ParamsJson: null }, // sem Ordering
    { Title: "Beta", Type: "Plugin", Element: "beta", Version: "0.1.0", Enabled: true, Protected: false, ParamsJson: null }, // sem Ordering, após Legado
    { Title: "Desligado", Type: "Plugin", Element: "desligado", Version: "1.0.0", Enabled: false, Protected: false, Ordering: 0, ParamsJson: null }
  ];
}

// --- isEnabled -------------------------------------------------------------

{
  const items = fixtureItems();
  assert.equal(isEnabled(items, "forum"), true);
  assert.equal(isEnabled(items, "explore-mais"), false);
  assert.equal(isEnabled(items, "inexistente"), false);
  assert.equal(isEnabled(undefined, "forum"), false);
  assert.equal(isEnabled([], "forum"), false);

  console.log("extension-registry.test.js: isEnabled ok.");
}

// --- resolveExtension --------------------------------------------------

{
  const items = fixtureItems();

  const found = resolveExtension(items, "forum");
  assert.ok(found);
  assert.equal(found.Title, "Fórum");

  assert.equal(resolveExtension(items, "inexistente"), null);
  assert.equal(resolveExtension([], "forum"), null);
  assert.equal(resolveExtension(undefined, "forum"), null);
  assert.equal(resolveExtension(null, "forum"), null);

  console.log("extension-registry.test.js: resolveExtension ok.");
}

// --- sortPlugins ---------------------------------------------------------

{
  const items = fixtureItems();
  const originalOrder = items.map((item) => item.Element);

  const plugins = sortPlugins(items);

  // Apenas Plugins habilitados: auditoria, cache, legado, beta (desligado e
  // não-Plugin excluídos).
  assert.deepEqual(
    plugins.map((p) => p.Element),
    ["cache", "auditoria", "legado", "beta"]
  );

  // Não muta o array de entrada nem os itens.
  assert.deepEqual(items.map((item) => item.Element), originalOrder);

  // Sort estável entre itens sem Ordering: Legado aparece antes de Beta na
  // fixture original, e essa ordem relativa é preservada.
  const semOrdem = plugins.filter((p) => typeof p.Ordering !== "number");
  assert.deepEqual(semOrdem.map((p) => p.Element), ["legado", "beta"]);

  // Lista vazia / sem Plugins não quebra.
  assert.deepEqual(sortPlugins([]), []);
  assert.deepEqual(sortPlugins(undefined), []);
  assert.deepEqual(sortPlugins([{ Type: "Component", Enabled: true, Element: "forum" }]), []);

  console.log("extension-registry.test.js: sortPlugins ok.");
}

// --- listByType ------------------------------------------------------------

{
  const items = fixtureItems();

  const modulos = listByType(items, "Module");
  assert.deepEqual(
    modulos.map((m) => m.Element).sort(),
    ["breadcrumbs", "explore-mais"]
  );
  // Inclui habilitados e desabilitados.
  assert.ok(modulos.some((m) => m.Enabled === false));
  assert.ok(modulos.some((m) => m.Enabled === true));

  const plugins = listByType(items, "Plugin");
  assert.equal(plugins.length, 5); // auditoria, cache, legado, beta, desligado
  assert.ok(plugins.some((p) => p.Enabled === false));

  assert.deepEqual(listByType([], "Plugin"), []);
  assert.deepEqual(listByType(undefined, "Plugin"), []);
  assert.deepEqual(listByType(items, "Inexistente"), []);

  console.log("extension-registry.test.js: listByType ok.");
}

console.log("extension-registry.test.js: verificações concluídas com sucesso.");
