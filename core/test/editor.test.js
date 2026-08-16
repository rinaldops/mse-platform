import assert from "node:assert/strict";
import { DEFAULT_EDITOR, normalizeEditorName, selectRichTextEditor, SUPPORTED_EDITORS } from "../editor.js";

assert.equal(DEFAULT_EDITOR, "Quill");
assert.deepEqual(SUPPORTED_EDITORS, ["Quill", "Summernote", "default"]);
assert.equal(normalizeEditorName("Summernote"), "Summernote");
assert.equal(normalizeEditorName("summernote"), "Summernote");
assert.equal(normalizeEditorName("Quill"), "Quill");
assert.equal(normalizeEditorName("default"), "default");
assert.equal(typeof selectRichTextEditor("Quill"), "function");
assert.equal(typeof selectRichTextEditor("Summernote"), "function");
assert.equal(selectRichTextEditor("default"), undefined);
assert.throws(() => normalizeEditorName("TinyMCE"), /Editor inválido/);

console.log("editor.test.js: verificações concluídas com sucesso.");
