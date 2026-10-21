import assert from "node:assert/strict";
import { validateModuleValues } from "../modules-editor.js";

const moduleBase = { Title: "Hero", ModuloTipo: "sd", Posicao: "home-a", Ordem: 0, Estado: "Publicado", PublicarEm: "2026-01-01T00:00:00Z", PublicarAte: "2026-12-31T00:00:00Z", MostrarTitulo: false, Estilo: "card", AtribuicaoMenu: "Todas", ParamsJson: "{}", SchemaVersao: 1 };
assert.equal(validateModuleValues(moduleBase).ModuloTipo, "sd");
assert.throws(() => validateModuleValues({ ...moduleBase, Posicao: "Home A" }), /Posição/);
assert.throws(() => validateModuleValues({ ...moduleBase, PublicarEm: "2026-12-31T00:00:00Z", PublicarAte: "2026-01-01T00:00:00Z" }), /Publicar até/);
assert.throws(() => validateModuleValues({ ...moduleBase, ParamsJson: "[]" }), /ParamsJson/);
assert.equal(validateModuleValues({ ...moduleBase, SchemaVersao: "" }).SchemaVersao, null);

console.log("editor-validation.test.js (com_modules): verificações concluídas com sucesso.");
