import assert from "node:assert/strict";
import { MSE_EXTENSOES_SCHEMA } from "../schemas/mse-extensoes.js";
import {
  isEnabled, resolveExtension, sortPlugins, listByType,
  EXTENSION_TYPE_BY_MANIFEST_TYPE, MANIFEST_TYPE_BY_EXTENSION_TYPE,
  extensionTypeFromManifestType, manifestTypeFromExtensionType
} from "../extension-registry.js";

// --- MSE_EXTENSOES_SCHEMA ------------------------------------------------

assert.ok(Object.isFrozen(MSE_EXTENSOES_SCHEMA));
assert.ok(Object.isFrozen(MSE_EXTENSOES_SCHEMA.fields));
assert.equal(MSE_EXTENSOES_SCHEMA.titleField.displayName, "Título");
assert.equal(MSE_EXTENSOES_SCHEMA.internalName, "MSEExtensoes");

const fieldNames = MSE_EXTENSOES_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(fieldNames, [
  "Tipo", "Elemento", "Versao", "Habilitado", "Protegido", "Ordem", "ParamsJson"
]);
// Title + 7 campos declarados em `fields[]` = 8 campos no total, como
// descrito na tarefa (Title, Tipo, Elemento, Versao, Habilitado, Protegido,
// Ordem, ParamsJson).
assert.equal(fieldNames.length + 1, 8);

for (const field of MSE_EXTENSOES_SCHEMA.fields) {
  assert.ok(Object.isFrozen(field));
  assert.ok(typeof field.displayName === "string" && field.displayName.length > 0);
  assert.ok(typeof field.type === "string" && field.type.length > 0);
  assert.equal(typeof field.required, "boolean");
}

const tipo = MSE_EXTENSOES_SCHEMA.fields.find((f) => f.internalName === "Tipo");
assert.deepEqual([...tipo.choices], ["Componente", "Modulo", "Plugin"]);

console.log("extension-registry.test.js: MSE_EXTENSOES_SCHEMA verificado.");

// --- fixtures -------------------------------------------------------------

function fixtureItems() {
  return [
    { Title: "Fórum", Tipo: "Componente", Elemento: "forum", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: undefined, ParamsJson: null },
    { Title: "Explore Mais", Tipo: "Modulo", Elemento: "explore-mais", Versao: "1.0.0", Habilitado: false, Protegido: false, Ordem: undefined, ParamsJson: null },
    { Title: "Breadcrumbs", Tipo: "Modulo", Elemento: "breadcrumbs", Versao: "1.0.0", Habilitado: true, Protegido: true, Ordem: undefined, ParamsJson: null },
    { Title: "Auditoria", Tipo: "Plugin", Elemento: "auditoria", Versao: "1.0.0", Habilitado: true, Protegido: true, Ordem: 2, ParamsJson: null },
    { Title: "Cache", Tipo: "Plugin", Elemento: "cache", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: 1, ParamsJson: null },
    { Title: "Legado", Tipo: "Plugin", Elemento: "legado", Versao: "0.9.0", Habilitado: true, Protegido: false, ParamsJson: null }, // sem Ordem
    { Title: "Beta", Tipo: "Plugin", Elemento: "beta", Versao: "0.1.0", Habilitado: true, Protegido: false, ParamsJson: null }, // sem Ordem, após Legado
    { Title: "Desligado", Tipo: "Plugin", Elemento: "desligado", Versao: "1.0.0", Habilitado: false, Protegido: false, Ordem: 0, ParamsJson: null }
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
  const originalOrder = items.map((item) => item.Elemento);

  const plugins = sortPlugins(items);

  // Apenas Plugins habilitados: auditoria, cache, legado, beta (desligado e
  // não-Plugin excluídos).
  assert.deepEqual(
    plugins.map((p) => p.Elemento),
    ["cache", "auditoria", "legado", "beta"]
  );

  // Não muta o array de entrada nem os itens.
  assert.deepEqual(items.map((item) => item.Elemento), originalOrder);

  // Sort estável entre itens sem Ordem: Legado aparece antes de Beta na
  // fixture original, e essa ordem relativa é preservada.
  const semOrdem = plugins.filter((p) => typeof p.Ordem !== "number");
  assert.deepEqual(semOrdem.map((p) => p.Elemento), ["legado", "beta"]);

  // Lista vazia / sem Plugins não quebra.
  assert.deepEqual(sortPlugins([]), []);
  assert.deepEqual(sortPlugins(undefined), []);
  assert.deepEqual(sortPlugins([{ Tipo: "Componente", Habilitado: true, Elemento: "forum" }]), []);

  console.log("extension-registry.test.js: sortPlugins ok.");
}

// --- listByType ------------------------------------------------------------

{
  const items = fixtureItems();

  const modulos = listByType(items, "Modulo");
  assert.deepEqual(
    modulos.map((m) => m.Elemento).sort(),
    ["breadcrumbs", "explore-mais"]
  );
  // Inclui habilitados e desabilitados.
  assert.ok(modulos.some((m) => m.Habilitado === false));
  assert.ok(modulos.some((m) => m.Habilitado === true));

  const plugins = listByType(items, "Plugin");
  assert.equal(plugins.length, 5); // auditoria, cache, legado, beta, desligado
  assert.ok(plugins.some((p) => p.Habilitado === false));

  assert.deepEqual(listByType([], "Plugin"), []);
  assert.deepEqual(listByType(undefined, "Plugin"), []);
  assert.deepEqual(listByType(items, "Inexistente"), []);

  console.log("extension-registry.test.js: listByType ok.");
}

// --- mapeamento type (manifesto v2) <-> Tipo (MSEExtensoes) ---------------

{
  assert.ok(Object.isFrozen(EXTENSION_TYPE_BY_MANIFEST_TYPE));
  assert.ok(Object.isFrozen(MANIFEST_TYPE_BY_EXTENSION_TYPE));

  assert.deepEqual(EXTENSION_TYPE_BY_MANIFEST_TYPE, {
    component: "Componente", module: "Modulo", plugin: "Plugin"
  });

  // As choices do schema real devem bater exatamente com os valores do mapa,
  // para nunca divergir do que é persistido na lista MSEExtensoes.
  const tipoField = MSE_EXTENSOES_SCHEMA.fields.find((f) => f.internalName === "Tipo");
  assert.deepEqual(
    [...tipoField.choices].sort(),
    Object.values(EXTENSION_TYPE_BY_MANIFEST_TYPE).sort()
  );

  // Round-trip nos dois sentidos.
  for (const manifestType of ["component", "module", "plugin"]) {
    const tipo = extensionTypeFromManifestType(manifestType);
    assert.equal(manifestTypeFromExtensionType(tipo), manifestType);
  }
  assert.equal(extensionTypeFromManifestType("component"), "Componente");
  assert.equal(extensionTypeFromManifestType("module"), "Modulo");
  assert.equal(extensionTypeFromManifestType("plugin"), "Plugin");
  assert.equal(manifestTypeFromExtensionType("Componente"), "component");
  assert.equal(manifestTypeFromExtensionType("Modulo"), "module");
  assert.equal(manifestTypeFromExtensionType("Plugin"), "plugin");

  // Valores desconhecidos lançam, nunca retornam undefined silenciosamente.
  assert.throws(() => extensionTypeFromManifestType("widget"), TypeError);
  assert.throws(() => extensionTypeFromManifestType(undefined), TypeError);
  assert.throws(() => manifestTypeFromExtensionType("Módulo"), TypeError); // com acento: não é o literal persistido
  assert.throws(() => manifestTypeFromExtensionType(undefined), TypeError);

  console.log("extension-registry.test.js: mapeamento type<->Tipo ok.");
}

console.log("extension-registry.test.js: verificações concluídas com sucesso.");
