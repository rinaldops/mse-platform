import assert from "node:assert/strict";
import { accentFor } from "../videoteca-view.js";

assert.equal(accentFor("SAP"), accentFor("SAP"));
assert.equal(accentFor("Qualquer Categoria Nova"), accentFor("Qualquer Categoria Nova"));
assert.notEqual(accentFor("SAP"), accentFor("Outra Categoria Bem Diferente"));
assert.match(accentFor("Categoria de outro site, sem relacao com TD"), /^#[0-9A-F]{6}$/);
assert.match(accentFor(""), /^#[0-9A-F]{6}$/);
assert.match(accentFor(undefined), /^#[0-9A-F]{6}$/);

console.log("videoteca-view.test.js: verificações concluídas com sucesso.");
