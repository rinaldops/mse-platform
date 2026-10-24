import assert from "node:assert/strict";
import { validateCategoryValues } from "../categories-editor.js";

const categoryBase = { Title: "Notícias", Alias: "noticias", Extension: "com_content", Description: "Categoria de notícias", ParentId: 0, Level: 1, Ordering: 0, Published: "Published", ParamsJson: "{}" };
assert.equal(validateCategoryValues(categoryBase).Alias, "noticias");
assert.throws(() => validateCategoryValues({ ...categoryBase, Title: "" }), /Título/);
assert.throws(() => validateCategoryValues({ ...categoryBase, Alias: "Notícias" }), /Alias/);
assert.throws(() => validateCategoryValues({ ...categoryBase, Extension: "" }), /Extensão/);
assert.throws(() => validateCategoryValues({ ...categoryBase, Published: "Rascunho" }), /Estado inválido/);
assert.throws(() => validateCategoryValues({ ...categoryBase, ParentId: -1 }), /Categoria pai/);
assert.throws(() => validateCategoryValues({ ...categoryBase, Level: 0 }), /Nível/);
assert.throws(() => validateCategoryValues({ ...categoryBase, Ordering: -1 }), /Ordem/);
assert.throws(() => validateCategoryValues({ ...categoryBase, ParamsJson: "[]" }), /ParamsJson/);
assert.equal(validateCategoryValues({ ...categoryBase, ParamsJson: "" }).ParamsJson, "{}");
assert.equal(validateCategoryValues({ ...categoryBase, ParentId: "" }).ParentId, 0);
assert.equal(validateCategoryValues({ ...categoryBase, Level: "" }).Level, 1);

console.log("editor-validation.test.js (com_categories): verificações concluídas com sucesso.");
