import assert from "node:assert/strict";
import { validateConfigurationValues } from "../config-editor.js";

const globalBase = { Title: "global", Scope: "Global", TipoInstancia: "Full", Layout: "Contained", Theme: "default", ConfigurationJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, State: "Published", Active: true };
assert.equal(validateConfigurationValues(globalBase).Scope, "Global");
assert.equal(validateConfigurationValues(globalBase).Module, null);

const instanceBase = { Title: "sd-principal", Scope: "Instance", Module: "sd", TipoInstancia: "Full", Layout: "Herdar", ConfigurationJson: "{}", State: "Published", Active: true };
assert.equal(validateConfigurationValues(instanceBase).Module, "sd");
assert.throws(() => validateConfigurationValues({ ...instanceBase, Module: "" }), /Módulo/);

const extensionBase = { Title: "forum-config", Scope: "Extension", ExtensionElement: "forum", TipoInstancia: "Full", Layout: "Herdar", ConfigurationJson: "{}", State: "Published", Active: true };
assert.equal(validateConfigurationValues(extensionBase).ExtensionElement, "forum");
assert.throws(() => validateConfigurationValues({ ...extensionBase, ExtensionElement: "" }), /Elemento da extensão/);

assert.throws(() => validateConfigurationValues({ ...globalBase, Title: "outra-chave" }), /chave global/);
assert.throws(() => validateConfigurationValues({ ...globalBase, Scope: "Invalida" }), /Escopo/);
assert.throws(() => validateConfigurationValues({ ...globalBase, Layout: "Invalido" }), /Layout/);
assert.throws(() => validateConfigurationValues({ ...globalBase, State: "Invalido" }), /Estado/);
assert.throws(() => validateConfigurationValues({ ...globalBase, ConfigurationJson: "[]" }), /Configuração JSON/);
assert.equal(validateConfigurationValues({ ...globalBase, VersaoConfiguracao: "", VersaoSettings: "" }).VersaoConfiguracao, 1);

console.log("editor-validation.test.js (com_config): verificações concluídas com sucesso.");
