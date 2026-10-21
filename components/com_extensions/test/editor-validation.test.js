import assert from "node:assert/strict";
import { validateExtensionValues } from "../extensions-editor.js";

const extensionBase = { Title: "BLOG", Tipo: "Componente", Elemento: "blog", Versao: "1.0.0", Habilitado: true, Protegido: false, Ordem: 1, ParamsJson: "{}" };
assert.equal(validateExtensionValues(extensionBase).Elemento, "blog");
assert.throws(() => validateExtensionValues({ ...extensionBase, Tipo: "Widget" }), /Tipo/);
assert.throws(() => validateExtensionValues({ ...extensionBase, Elemento: "Blog Principal" }), /Elemento/);
assert.throws(() => validateExtensionValues({ ...extensionBase, ParamsJson: "true" }), /ParamsJson/);
assert.equal(validateExtensionValues({ ...extensionBase, Ordem: "" }).Ordem, null);

console.log("editor-validation.test.js (com_extensions): verificações concluídas com sucesso.");
