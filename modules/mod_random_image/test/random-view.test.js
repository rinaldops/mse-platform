import assert from "node:assert/strict";
import { createRandomImageView } from "../random-view.js";

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, value); }
}

class FakeElement {
  constructor(tag, ownerDocument) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.style = new FakeStyle();
    this.src = "";
    this.alt = "";
    this.href = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

function findAll(node, predicate, out = []) {
  if (predicate(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, predicate, out);
  return out;
}

const document = { createElement(tag) { return new FakeElement(tag, document); } };
const root = new FakeElement("div", document);

// --- com imagem, sem link ------------------------------------------------

{
  const cleanup = createRandomImageView({
    root,
    image: { FileRef: "/sites/x/MSEMedia/foto.png", AltText: "Uma foto", FileLeafRef: "foto.png" },
    maxWidth: 150
  });

  const wrapper = root.children[0];
  assert.equal(wrapper.className, "mse-module-random-image");

  const img = findAll(wrapper, (node) => node.className === "mse-module-random-image__image")[0];
  assert.ok(img, "imagem deve ser renderizada");
  assert.equal(img.src, "/sites/x/MSEMedia/foto.png");
  assert.equal(img.alt, "Uma foto");
  assert.equal(img.style.values.get("max-width"), "150px");
  assert.equal(findAll(wrapper, (node) => node.className === "mse-module-random-image__link").length, 0);

  cleanup();
  assert.equal(root.children.length, 0);
}

// --- com imagem, com link --------------------------------------------------

{
  createRandomImageView({
    root,
    image: { FileRef: "/sites/x/MSEMedia/foto.png", FileLeafRef: "foto.png" },
    link: "https://exemplo.test/destino"
  });

  const link = findAll(root, (node) => node.className === "mse-module-random-image__link")[0];
  assert.ok(link, "link deve envolver a imagem quando configurado");
  assert.equal(link.href, "https://exemplo.test/destino");
  const img = findAll(link, (node) => node.className === "mse-module-random-image__image")[0];
  assert.ok(img, "imagem deve estar dentro do link");
  // alt cai para FileLeafRef quando AltText está ausente.
  assert.equal(img.alt, "foto.png");

  root.replaceChildren();
}

// --- sem imagem: mensagem de "sem imagens" ---------------------------------

{
  const emptyRoot = new FakeElement("div", document);
  createRandomImageView({ root: emptyRoot, image: null, noImageText: "Nada disponível." });
  const empty = findAll(emptyRoot, (node) => node.className === "mse-module-random-image__empty")[0];
  assert.equal(empty.textContent, "Nada disponível.");
}

assert.throws(() => createRandomImageView({ root: {} }), /root/);

console.log("random-view.test.js: verificações concluídas com sucesso.");
