import assert from "node:assert/strict";
import { createSummernoteRichTextEditor } from "../editor-summernote.js";

await assert.rejects(
  createSummernoteRichTextEditor(),
  /root deve ser um elemento DOM/
);

await assert.rejects(
  createSummernoteRichTextEditor({ root: { ownerDocument: { createElement() {} } } }),
  /sanitizeRichText deve ser uma função/
);

console.log("editor-summernote.test.js: verificações concluídas com sucesso.");
