import assert from "node:assert/strict";
import { createRichTextEditor } from "../editor-quill.js";

await assert.rejects(
  createRichTextEditor(),
  /root deve ser um elemento DOM/
);

await assert.rejects(
  createRichTextEditor({ root: { ownerDocument: { createElement() {} } } }),
  /sanitizeRichText deve ser uma função/
);

console.log("editor-quill.test.js: verificações concluídas com sucesso.");
