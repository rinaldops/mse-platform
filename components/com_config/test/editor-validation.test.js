import assert from "node:assert/strict";
import { validateConfigurationValues } from "../config-editor.js";

const globalBase = { Title: "global", Escopo: "Global", TipoInstancia: "Full", Layout: "Contained", Tema: "default", ConfiguracaoJson: "{}", VersaoConfiguracao: 1, VersaoSettings: 1, Estado: "Publicado", Ativo: true };
assert.equal(validateConfigurationValues(globalBase).Escopo, "Global");
assert.equal(validateConfigurationValues(globalBase).Modulo, null);

const instanceBase = { Title: "sd-principal", Escopo: "Instancia", Modulo: "sd", TipoInstancia: "Full", Layout: "Herdar", ConfiguracaoJson: "{}", Estado: "Publicado", Ativo: true };
assert.equal(validateConfigurationValues(instanceBase).Modulo, "sd");
assert.throws(() => validateConfigurationValues({ ...instanceBase, Modulo: "" }), /Módulo/);

const extensionBase = { Title: "forum-config", Escopo: "Extensao", ExtensaoElemento: "forum", TipoInstancia: "Full", Layout: "Herdar", ConfiguracaoJson: "{}", Estado: "Publicado", Ativo: true };
assert.equal(validateConfigurationValues(extensionBase).ExtensaoElemento, "forum");
assert.throws(() => validateConfigurationValues({ ...extensionBase, ExtensaoElemento: "" }), /Elemento da extensão/);

assert.throws(() => validateConfigurationValues({ ...globalBase, Title: "outra-chave" }), /chave global/);
assert.throws(() => validateConfigurationValues({ ...globalBase, Escopo: "Invalida" }), /Escopo/);
assert.throws(() => validateConfigurationValues({ ...globalBase, Layout: "Invalido" }), /Layout/);
assert.throws(() => validateConfigurationValues({ ...globalBase, Estado: "Invalido" }), /Estado/);
assert.throws(() => validateConfigurationValues({ ...globalBase, ConfiguracaoJson: "[]" }), /Configuração JSON/);
assert.equal(validateConfigurationValues({ ...globalBase, VersaoConfiguracao: "", VersaoSettings: "" }).VersaoConfiguracao, 1);

console.log("editor-validation.test.js (com_config): verificações concluídas com sucesso.");
