import assert from "node:assert/strict";
import { MSE_TEMPLATE_STYLES_SCHEMA } from "../schemas/mse-template-styles.js";
import { resolveActiveTemplateName, listTemplateStylesByClient, resolveTemplateNameForMenuItem } from "../template-registry.js";

// --- MSE_TEMPLATE_STYLES_SCHEMA ---------------------------------------------

assert.ok(Object.isFrozen(MSE_TEMPLATE_STYLES_SCHEMA));
assert.ok(Object.isFrozen(MSE_TEMPLATE_STYLES_SCHEMA.fields));
assert.equal(MSE_TEMPLATE_STYLES_SCHEMA.titleField.displayName, "Title");
assert.equal(MSE_TEMPLATE_STYLES_SCHEMA.internalName, "MSETemplateStyles");

const fieldNames = MSE_TEMPLATE_STYLES_SCHEMA.fields.map((field) => field.internalName);
assert.deepEqual(fieldNames, ["Template", "ClientId", "Home", "ParamsJson"]);

const clientField = MSE_TEMPLATE_STYLES_SCHEMA.fields.find((f) => f.internalName === "ClientId");
assert.deepEqual([...clientField.choices], ["Site", "Administrator"]);
assert.equal(clientField.defaultValue, "Site");

const homeField = MSE_TEMPLATE_STYLES_SCHEMA.fields.find((f) => f.internalName === "Home");
assert.equal(homeField.type, "Boolean");
assert.equal(homeField.defaultValue, false);

console.log("template-registry.test.js: MSE_TEMPLATE_STYLES_SCHEMA verificado.");

// --- resolveActiveTemplateName ----------------------------------------------

{
  const styles = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-default", Template: "mse-default", ClientId: "Site", Home: false },
    { Id: 3, Title: "Administrator — padrão", Template: "mse-administrator-default", ClientId: "Administrator", Home: true }
  ];
  assert.equal(resolveActiveTemplateName(styles), "camap-tema-01");
  assert.equal(resolveActiveTemplateName(styles, { clientId: "Site" }), "camap-tema-01");
  assert.equal(resolveActiveTemplateName(styles, { clientId: "Administrator" }), "mse-administrator-default");
  console.log("template-registry.test.js: resolveActiveTemplateName resolve por ClientId/Home ok.");
}

// Nenhum Home=true para o ClientId pedido -> null, sem lançar.
{
  const styles = [{ Id: 1, Title: "x", Template: "camap-tema-01", ClientId: "Site", Home: false }];
  assert.equal(resolveActiveTemplateName(styles, { clientId: "Site" }), null);
  assert.equal(resolveActiveTemplateName(styles, { clientId: "Administrator" }), null);
  console.log("template-registry.test.js: ausência de Home=true devolve null ok.");
}

// Entradas ausentes/inválidas são toleradas (nunca lançam).
{
  assert.equal(resolveActiveTemplateName(undefined), null);
  assert.equal(resolveActiveTemplateName(null), null);
  assert.equal(resolveActiveTemplateName("não-array"), null);
  assert.equal(resolveActiveTemplateName([null, undefined, { ClientId: "Site" }]), null);
  console.log("template-registry.test.js: entradas malformadas toleradas (sem lançar) ok.");
}

// Múltiplos Home=true para o mesmo ClientId (dado malformado): primeiro vence,
// determinístico, sem lançar.
{
  const styles = [
    { Id: 1, Title: "a", Template: "tema-a", ClientId: "Site", Home: true },
    { Id: 2, Title: "b", Template: "tema-b", ClientId: "Site", Home: true }
  ];
  assert.equal(resolveActiveTemplateName(styles, { clientId: "Site" }), "tema-a");
  console.log("template-registry.test.js: múltiplos Home=true resolve deterministicamente (primeiro) ok.");
}

// --- listTemplateStylesByClient ---------------------------------------------

{
  const styles = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-default", Template: "mse-default", ClientId: "Site", Home: false },
    { Id: 3, Title: "Administrator — padrão", Template: "mse-administrator-default", ClientId: "Administrator", Home: true }
  ];
  const siteStyles = listTemplateStylesByClient(styles, { clientId: "Site" });
  assert.equal(siteStyles.length, 2);
  assert.deepEqual(siteStyles.map((s) => s.Template), ["camap-tema-01", "mse-default"]);

  const adminStyles = listTemplateStylesByClient(styles, { clientId: "Administrator" });
  assert.equal(adminStyles.length, 1);
  assert.equal(adminStyles[0].Template, "mse-administrator-default");

  assert.deepEqual(listTemplateStylesByClient(undefined), []);
  assert.deepEqual(listTemplateStylesByClient(styles, { clientId: "Outro" }), []);
  console.log("listTemplateStylesByClient: filtra por ClientId, tolera ausência/inválido ok.");
}

// --- resolveTemplateNameForMenuItem ------------------------------------------

{
  const styles = [
    { Id: 1, Title: "CAMAP-AGP — Tema 1", Template: "camap-tema-01", ClientId: "Site", Home: true },
    { Id: 2, Title: "mse-default", Template: "mse-default", ClientId: "Site", Home: false },
    { Id: 3, Title: "Administrator — padrão", Template: "mse-administrator-default", ClientId: "Administrator", Home: true }
  ];

  // Item de menu com override válido para um estilo "Site".
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: 2 }, { clientId: "Site" }), "mse-default");

  // menuItem ausente/inválido -> null, sem lançar.
  assert.equal(resolveTemplateNameForMenuItem(styles, null), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, undefined), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, {}), null);

  // TemplateStyleId ausente/0/null/inválido -> null (sem override).
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: null }), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: 0 }), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: "" }), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: -1 }), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: 1.5 }), null);

  // TemplateStyleId referenciando Id inexistente -> null.
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: 999 }), null);

  // TemplateStyleId referenciando um estilo de OUTRO ClientId -> null (não
  // cruza client).
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: 3 }, { clientId: "Site" }), null);
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: 1 }, { clientId: "Administrator" }), null);

  // styles ausente/inválido -> null, sem lançar.
  assert.equal(resolveTemplateNameForMenuItem(undefined, { TemplateStyleId: 1 }), null);
  assert.equal(resolveTemplateNameForMenuItem(null, { TemplateStyleId: 1 }), null);

  // TemplateStyleId como string numérica válida (ex.: vindo de query/route).
  assert.equal(resolveTemplateNameForMenuItem(styles, { TemplateStyleId: "2" }, { clientId: "Site" }), "mse-default");

  console.log("resolveTemplateNameForMenuItem: resolve por TemplateStyleId/ClientId, tolera ausência/inválido ok.");
}

console.log("template-registry.test.js: verificações concluídas com sucesso.");
