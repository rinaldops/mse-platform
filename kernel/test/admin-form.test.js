import assert from "node:assert/strict";
import { buildFormFields } from "../admin-form.js";
import { MSE_EXTENSOES_SCHEMA } from "../schemas/mse-extensoes.js";
import { MSE_MODULOS_SCHEMA, MSE_MODULOS_MENU_SCHEMA } from "../schemas/mse-modulos.js";
import { MSE_MENU_SCHEMA, MSE_MENU_TIPOS_SCHEMA } from "../schemas/mse-menu.js";

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

// --- schemas REAIS do kernel: MSEExtensoes ----------------------------------

{
  const descriptors = buildFormFields(MSE_EXTENSOES_SCHEMA);
  assert.equal(descriptors.length, MSE_EXTENSOES_SCHEMA.fields.length);

  assert.equal(byName(descriptors, "Tipo").inputType, "select");
  assert.deepEqual(byName(descriptors, "Tipo").options, ["Componente", "Modulo", "Plugin"]);
  assert.equal(byName(descriptors, "Elemento").inputType, "text");
  assert.equal(byName(descriptors, "Elemento").maxLength, 128);
  assert.equal(byName(descriptors, "Habilitado").inputType, "boolean");
  assert.equal(byName(descriptors, "Habilitado").defaultValue, true);
  assert.equal(byName(descriptors, "Protegido").defaultValue, false);
  assert.equal(byName(descriptors, "Ordem").inputType, "number");
  assert.equal(byName(descriptors, "ParamsJson").inputType, "textarea");

  console.log("admin-form.test.js: MSE_EXTENSOES_SCHEMA real ok.");
}

// --- schemas REAIS do kernel: MSEModulos / MSEModulosMenu -------------------

{
  const descriptors = buildFormFields(MSE_MODULOS_SCHEMA);
  assert.equal(descriptors.length, MSE_MODULOS_SCHEMA.fields.length);

  assert.equal(byName(descriptors, "ModuloTipo").inputType, "text");
  assert.equal(byName(descriptors, "Posicao").inputType, "text");
  assert.equal(byName(descriptors, "Ordem").inputType, "number");
  assert.equal(byName(descriptors, "Estado").inputType, "select");
  assert.deepEqual(byName(descriptors, "Estado").options, ["Publicado", "Despublicado", "Lixeira"]);
  assert.equal(byName(descriptors, "PublicarEm").inputType, "date");
  assert.equal(byName(descriptors, "PublicarAte").inputType, "date");
  assert.equal(byName(descriptors, "MostrarTitulo").inputType, "boolean");
  assert.equal(byName(descriptors, "AtribuicaoMenu").inputType, "select");
  assert.deepEqual(byName(descriptors, "AtribuicaoMenu").options, ["Todas", "Nenhuma", "Somente", "Todas exceto"]);
  assert.equal(byName(descriptors, "ParamsJson").inputType, "textarea");
  assert.equal(byName(descriptors, "SchemaVersao").inputType, "number");

  const modulosMenuDescriptors = buildFormFields(MSE_MODULOS_MENU_SCHEMA);
  assert.equal(modulosMenuDescriptors.length, 2);
  assert.equal(byName(modulosMenuDescriptors, "ModuloId").inputType, "number");
  assert.equal(byName(modulosMenuDescriptors, "MenuId").inputType, "number");

  console.log("admin-form.test.js: MSE_MODULOS_SCHEMA/MSE_MODULOS_MENU_SCHEMA reais ok.");
}

// --- schemas REAIS do kernel: MSEMenu / MSEMenuTipos ------------------------

{
  const descriptors = buildFormFields(MSE_MENU_SCHEMA);
  assert.equal(descriptors.length, MSE_MENU_SCHEMA.fields.length);

  assert.equal(byName(descriptors, "Alias").inputType, "text");
  assert.equal(byName(descriptors, "TipoMenu").inputType, "text");
  assert.equal(byName(descriptors, "ParentId").inputType, "number");
  assert.equal(byName(descriptors, "Nivel").inputType, "number");
  assert.equal(byName(descriptors, "Componente").inputType, "text");
  assert.equal(byName(descriptors, "ParamsJson").inputType, "textarea");
  assert.equal(byName(descriptors, "Padrao").inputType, "boolean");
  assert.equal(byName(descriptors, "AbrirEm").inputType, "select");
  assert.deepEqual(byName(descriptors, "AbrirEm").options, ["MesmaAba", "NovaAba"]);
  assert.equal(byName(descriptors, "Estado").inputType, "select");

  const menuTiposDescriptors = buildFormFields(MSE_MENU_TIPOS_SCHEMA);
  assert.equal(menuTiposDescriptors.length, 2);
  assert.equal(byName(menuTiposDescriptors, "Chave").inputType, "text");
  assert.equal(byName(menuTiposDescriptors, "Descricao").inputType, "textarea");

  console.log("admin-form.test.js: MSE_MENU_SCHEMA/MSE_MENU_TIPOS_SCHEMA reais ok.");
}

console.log("admin-form.test.js: verificações concluídas com sucesso.");
