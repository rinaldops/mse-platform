import assert from "node:assert/strict";
import { validateTagValues } from "../tags-editor.js";

const tagBase = { Title: "Destaque", Alias: "destaque", Description: "Conteúdo em destaque.", Ordering: 0, Published: "Published", ParamsJson: "{}" };
assert.equal(validateTagValues(tagBase).Alias, "destaque");
assert.throws(() => validateTagValues({ ...tagBase, Title: "" }), /Título/);
assert.throws(() => validateTagValues({ ...tagBase, Alias: "Destaque" }), /Alias/);
assert.throws(() => validateTagValues({ ...tagBase, Published: "Invalido" }), /Estado inválido/);
assert.throws(() => validateTagValues({ ...tagBase, Ordering: -1 }), /Ordem/);
assert.throws(() => validateTagValues({ ...tagBase, Ordering: 1.5 }), /Ordem/);
assert.equal(validateTagValues({ ...tagBase, Ordering: "" }).Ordering, 0);
assert.throws(() => validateTagValues({ ...tagBase, ParamsJson: "[]" }), /ParamsJson/);
assert.equal(validateTagValues({ ...tagBase, ParamsJson: "" }).ParamsJson, "{}");

console.log("editor-validation.test.js (com_tags): verificações concluídas com sucesso.");
