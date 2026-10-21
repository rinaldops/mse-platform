import assert from "node:assert/strict";
import { validateModuleValues } from "../modules-editor.js";

const moduleBase = { Title: "Hero", Module: "sd", Position: "home-a", Ordering: 0, Published: "Published", PublishUp: "2026-01-01T00:00:00Z", PublishDown: "2026-12-31T00:00:00Z", ShowTitle: false, Style: "card", MenuAssignment: "All", ParamsJson: "{}", SchemaVersion: 1 };
assert.equal(validateModuleValues(moduleBase).Module, "sd");
assert.throws(() => validateModuleValues({ ...moduleBase, Position: "Home A" }), /Posição/);
assert.throws(() => validateModuleValues({ ...moduleBase, PublishUp: "2026-12-31T00:00:00Z", PublishDown: "2026-01-01T00:00:00Z" }), /Publicar até/);
assert.throws(() => validateModuleValues({ ...moduleBase, PublishUp: "não é uma data" }), /Publicar em.*válida/);
assert.throws(() => validateModuleValues({ ...moduleBase, PublishDown: "não é uma data" }), /Publicar até.*válida/);
assert.equal(validateModuleValues(moduleBase).PublishUp, new Date(moduleBase.PublishUp).toISOString());
assert.equal(validateModuleValues({ ...moduleBase, PublishUp: "", PublishDown: "" }).PublishUp, null);
assert.throws(() => validateModuleValues({ ...moduleBase, ParamsJson: "[]" }), /ParamsJson/);
assert.equal(validateModuleValues({ ...moduleBase, SchemaVersion: "" }).SchemaVersion, null);

console.log("editor-validation.test.js (com_modules): verificações concluídas com sucesso.");
