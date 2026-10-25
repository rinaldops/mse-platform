import assert from "node:assert/strict";
import { validateFilterValues } from "../finder-editor.js";

const filterBase = { Title: "Notícias recentes", Alias: "noticias-recentes", CreatedByAlias: "", State: "Published" };
assert.equal(validateFilterValues(filterBase).Alias, "noticias-recentes");
assert.throws(() => validateFilterValues({ ...filterBase, Title: "" }), /Título/);
assert.throws(() => validateFilterValues({ ...filterBase, Alias: "Notícias" }), /Alias/);
assert.throws(() => validateFilterValues({ ...filterBase, State: "Trashed" }), /Estado inválido/);
assert.equal(validateFilterValues({ ...filterBase, CreatedByAlias: "  Equipe  " }).CreatedByAlias, "Equipe");

console.log("editor-validation.test.js (com_finder): verificações concluídas com sucesso.");
