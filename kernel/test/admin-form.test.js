import assert from "node:assert/strict";
import { buildFormFields } from "../admin-form.js";
import { MSE_EXTENSIONS_SCHEMA } from "../schemas/mse-extensions.js";
import { MSE_MODULES_SCHEMA } from "../schemas/mse-modules.js";
import { MSE_MODULES_MENU_SCHEMA } from "../schemas/mse-modules-menu.js";
import { MSE_MENU_SCHEMA } from "../schemas/mse-menu.js";
import { MSE_MENU_TYPES_SCHEMA } from "../schemas/mse-menu-types.js";

function byName(descriptors, name) {
  const found = descriptors.find((descriptor) => descriptor.name === name);
  assert.ok(found, `descriptor "${name}" não encontrado`);
  return found;
}

// --- mapeamento de cada tipo SharePoint para o inputType esperado ----------

{
  // Schema sintético cobrindo todos os tipos mapeados nesta rodada.
  const schema = {
    fields: [
      { internalName: "CampoTexto", displayName: "Campo texto", type: "Text", required: true, maxLength: 64 },
      { internalName: "CampoNota", displayName: "Campo nota", type: "Note", required: false },
      {
        internalName: "CampoEscolha",
        displayName: "Campo escolha",
        type: "Choice",
        required: true,
        choices: ["A", "B", "C"],
        defaultValue: "B"
      },
      { internalName: "CampoBooleano", displayName: "Campo booleano", type: "Boolean", required: true, defaultValue: true },
      { internalName: "CampoNumero", displayName: "Campo número", type: "Number", required: false, min: 0, defaultValue: 5 },
      { internalName: "CampoData", displayName: "Campo data", type: "DateTime", required: false }
    ]
  };

  const descriptors = buildFormFields(schema);
  assert.equal(descriptors.length, 6);
  assert.ok(Object.isFrozen(descriptors));

  assert.equal(byName(descriptors, "CampoTexto").inputType, "text");
  assert.equal(byName(descriptors, "CampoNota").inputType, "textarea");
  assert.equal(byName(descriptors, "CampoEscolha").inputType, "select");
  assert.equal(byName(descriptors, "CampoBooleano").inputType, "boolean");
  assert.equal(byName(descriptors, "CampoNumero").inputType, "number");
  assert.equal(byName(descriptors, "CampoData").inputType, "date");

  console.log("admin-form.test.js: mapeamento de tipos sintéticos ok.");
}

// --- required / defaultValue / choices preservados corretamente ------------

{
  const schema = {
    fields: [
      {
        internalName: "Estado",
        displayName: "Estado",
        type: "Choice",
        required: true,
        choices: ["Publicado", "Despublicado", "Lixeira"],
        defaultValue: "Publicado"
      },
      { internalName: "Opcional", displayName: "Opcional", type: "Text", required: false, maxLength: 32 },
      { internalName: "ComMinimo", displayName: "Com mínimo", type: "Number", required: false, min: 10 },
      { internalName: "SemDefault", displayName: "Sem default", type: "Boolean", required: true, defaultValue: false }
    ]
  };

  const descriptors = buildFormFields(schema);

  const estado = byName(descriptors, "Estado");
  assert.equal(estado.required, true);
  assert.deepEqual(estado.options, ["Publicado", "Despublicado", "Lixeira"]);
  assert.equal(estado.defaultValue, "Publicado");

  const opcional = byName(descriptors, "Opcional");
  assert.equal(opcional.required, false);
  assert.equal(opcional.maxLength, 32);
  assert.equal("defaultValue" in opcional, false);

  const comMinimo = byName(descriptors, "ComMinimo");
  assert.equal(comMinimo.min, 10);

  const semDefault = byName(descriptors, "SemDefault");
  assert.equal(semDefault.defaultValue, false); // false é um defaultValue válido, não "ausente"

  console.log("admin-form.test.js: required/defaultValue/choices preservados ok.");
}

// --- schema vazio não lança; devolve lista vazia ----------------------------

{
  assert.deepEqual([...buildFormFields({ fields: [] })], []);

  console.log("admin-form.test.js: schema.fields vazio devolve [] ok.");
}

// --- schema malformado lança TypeError claro --------------------------------

{
  assert.throws(() => buildFormFields(undefined), TypeError);
  assert.throws(() => buildFormFields(null), TypeError);
  assert.throws(() => buildFormFields("texto"), TypeError);
  assert.throws(() => buildFormFields([]), TypeError); // array não é o shape esperado
  assert.throws(() => buildFormFields({}), TypeError); // sem fields
  assert.throws(() => buildFormFields({ fields: "não-array" }), TypeError);
  assert.throws(() => buildFormFields({ fields: [null] }), TypeError); // campo malformado
  assert.throws(() => buildFormFields({ fields: [{ internalName: "X", type: "TipoDesconhecido" }] }), TypeError);

  console.log("admin-form.test.js: schema malformado lança TypeError ok.");
}

// --- schemas REAIS do kernel: MSEExtensions ----------------------------------

{
  const descriptors = buildFormFields(MSE_EXTENSIONS_SCHEMA);
  assert.equal(descriptors.length, MSE_EXTENSIONS_SCHEMA.fields.length);

  assert.equal(byName(descriptors, "Type").inputType, "select");
  assert.deepEqual(byName(descriptors, "Type").options, ["Component", "Module", "Plugin", "Template"]);
  assert.equal(byName(descriptors, "Element").inputType, "text");
  assert.equal(byName(descriptors, "Element").maxLength, 128);
  assert.equal(byName(descriptors, "Enabled").inputType, "boolean");
  assert.equal(byName(descriptors, "Enabled").defaultValue, true);
  assert.equal(byName(descriptors, "Protected").defaultValue, false);
  assert.equal(byName(descriptors, "Ordering").inputType, "number");
  assert.equal(byName(descriptors, "ParamsJson").inputType, "textarea");

  console.log("admin-form.test.js: MSE_EXTENSIONS_SCHEMA real ok.");
}

// --- schemas REAIS do kernel: MSEModules / MSEModulesMenu -------------------

{
  const descriptors = buildFormFields(MSE_MODULES_SCHEMA);
  assert.equal(descriptors.length, MSE_MODULES_SCHEMA.fields.length);

  assert.equal(byName(descriptors, "Module").inputType, "text");
  assert.equal(byName(descriptors, "Position").inputType, "text");
  assert.equal(byName(descriptors, "Ordering").inputType, "number");
  assert.equal(byName(descriptors, "Published").inputType, "select");
  assert.deepEqual(byName(descriptors, "Published").options, ["Published", "Unpublished", "Trashed"]);
  assert.equal(byName(descriptors, "PublishUp").inputType, "date");
  assert.equal(byName(descriptors, "PublishDown").inputType, "date");
  assert.equal(byName(descriptors, "ShowTitle").inputType, "boolean");
  assert.equal(byName(descriptors, "MenuAssignment").inputType, "select");
  assert.deepEqual(byName(descriptors, "MenuAssignment").options, ["All", "None", "Only", "AllExcept"]);
  assert.equal(byName(descriptors, "ParamsJson").inputType, "textarea");
  assert.equal(byName(descriptors, "SchemaVersion").inputType, "number");

  const modulosMenuDescriptors = buildFormFields(MSE_MODULES_MENU_SCHEMA);
  assert.equal(modulosMenuDescriptors.length, 2);
  assert.equal(byName(modulosMenuDescriptors, "ModuleId").inputType, "number");
  assert.equal(byName(modulosMenuDescriptors, "MenuId").inputType, "number");

  console.log("admin-form.test.js: MSE_MODULES_SCHEMA/MSE_MODULES_MENU_SCHEMA reais ok.");
}

// --- schemas REAIS do kernel: MSEMenu / MSEMenuTypes ------------------------

{
  const descriptors = buildFormFields(MSE_MENU_SCHEMA);
  assert.equal(descriptors.length, MSE_MENU_SCHEMA.fields.length);

  assert.equal(byName(descriptors, "Alias").inputType, "text");
  assert.equal(byName(descriptors, "MenuType").inputType, "text");
  assert.equal(byName(descriptors, "ParentId").inputType, "number");
  assert.equal(byName(descriptors, "Level").inputType, "number");
  assert.equal(byName(descriptors, "Component").inputType, "text");
  assert.equal(byName(descriptors, "ParamsJson").inputType, "textarea");
  assert.equal(byName(descriptors, "Default").inputType, "boolean");
  assert.equal(byName(descriptors, "Target").inputType, "select");
  assert.deepEqual(byName(descriptors, "Target").options, ["SameTab", "NewTab"]);
  assert.equal(byName(descriptors, "Published").inputType, "select");

  const menuTiposDescriptors = buildFormFields(MSE_MENU_TYPES_SCHEMA);
  assert.equal(menuTiposDescriptors.length, 2);
  assert.equal(byName(menuTiposDescriptors, "Key").inputType, "text");
  assert.equal(byName(menuTiposDescriptors, "Description").inputType, "textarea");

  console.log("admin-form.test.js: MSE_MENU_SCHEMA/MSE_MENU_TYPES_SCHEMA reais ok.");
}

console.log("admin-form.test.js: verificações concluídas com sucesso.");
