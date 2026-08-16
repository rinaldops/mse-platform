import assert from "node:assert/strict";
import { sanitizeRichText } from "../rich-text.js";

const documentImpl = globalThis.document;
const tinyPng = "data:image/png;base64,iVBORw0KGgo=";

if (!documentImpl?.createElement) {
  console.log("rich-text.test.js: ignorado sem DOM.");
  process.exit(0);
}

assert.equal(
  sanitizeRichText(`<p>Imagem <img src="${tinyPng}" onerror="alert(1)" alt="ok"></p>`, { documentImpl }),
  `<p>Imagem <img src="${tinyPng}" alt="ok"></p>`
);

assert.equal(
  sanitizeRichText('<p><img src="javascript:alert(1)" alt="x">Texto</p>', { documentImpl }),
  "<p>Texto</p>"
);

assert.equal(
  sanitizeRichText('<p><img src="https://example.test/a.png" style="width:999px" alt="A"></p>', { documentImpl }),
  '<p><img src="https://example.test/a.png" alt="A"></p>'
);

console.log("rich-text.test.js: verificações concluídas com sucesso.");
