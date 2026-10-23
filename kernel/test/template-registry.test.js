import assert from "node:assert/strict";
import { MSE_TEMPLATE_STYLES_SCHEMA } from "../schemas/mse-template-styles.js";
import { resolveActiveTemplateName, listTemplateStylesByClient } from "../template-registry.js";

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

console.log("template-registry.test.js: verificações concluídas com sucesso.");
