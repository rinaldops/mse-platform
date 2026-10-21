import assert from "node:assert/strict";
import { renderMenusEditor, validateMenuValues } from "../menus-editor.js";

class FakeElement {
  constructor(tag = "div") { this.tagName = tag.toUpperCase(); this.children = []; this.ownerDocument = null; this.parentNode = null; this.textContent = ""; this.className = ""; this.value = ""; this.checked = false; this.name = ""; this.type = ""; this.onclick = null; }
  append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
  remove() { if (this.parentNode) { const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); this.parentNode = null; } }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  querySelectorAll(tag) { const wanted = tag.toUpperCase(); const result = []; const walk = (node) => { for (const child of node.children) { if (child.tagName === wanted) result.push(child); walk(child); } }; walk(this); return result; }
  click() { return this.onclick?.({ currentTarget: this }); }
}
const document = { createElement(tag) { const node = new FakeElement(tag); node.ownerDocument = document; return node; } };
const root = () => { const node = new FakeElement(); node.ownerDocument = document; return node; };
const list = { listId: "10000000-0000-4000-8000-000000000001" };
const valid = { Title: "Início", Alias: "inicio", MenuType: "principal", ParentId: 0, Path: "inicio", Level: 1, Ordering: 0, Component: "", View: "", ParamsJson: "{}", Default: false, Target: "SameTab", Published: "Published" };

assert.equal(validateMenuValues(valid).Alias, "inicio");
assert.throws(() => validateMenuValues({ ...valid, Alias: "Não-válido" }), /Alias/);
assert.throws(() => validateMenuValues({ ...valid, ParamsJson: "[]" }), /ParamsJson/);
assert.throws(() => validateMenuValues({ ...valid, Ordering: -1 }), /Ordem/);

const calls = [];
let items = [{ Id: 1, ...valid, Title: "Início" }];
const client = {
  async getListItems() { return items; },
  async createListItem(_list, values) { calls.push(["create", values]); items.push({ Id: 2, ...values }); return { status: 201 }; },
  async getListItem(_list, id) { calls.push(["get", id]); return { etag: `etag-${id}` }; },
  async updateListItem(_list, id, values, options) { calls.push(["update", id, values, options]); return { status: 204 }; },
  async deleteListItem(_list, id, options) { calls.push(["delete", id, options]); return { status: 204 }; }
};
const viewRoot = root();
renderMenusEditor({ root: viewRoot, services: { adminClient: client, listIds: { MSEMenu: list } } });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(viewRoot.querySelectorAll("table").length, 1);
const buttons = viewRoot.querySelectorAll("button");
assert.ok(buttons.some((button) => button.textContent === "Novo item"));
assert.ok(buttons.some((button) => button.textContent === "Editar"));
assert.ok(buttons.some((button) => button.textContent === "Excluir"));

// New item: click Novo, populate controls by name and save.
buttons.find((button) => button.textContent === "Novo item").click();
const inputs = viewRoot.querySelectorAll("input");
const byName = Object.fromEntries(inputs.map((input) => [input.name, input]));
byName.Title.value = "Notícias"; byName.Alias.value = "noticias"; byName.Path.value = "noticias";
viewRoot.querySelectorAll("button").find((button) => button.textContent === "Salvar").click();
await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve();
assert.equal(calls[0][0], "create");

// Edit and delete exercise admin-data's ETag pre-read.
const edit = viewRoot.querySelectorAll("button").find((button) => button.textContent === "Editar");
edit.click();
viewRoot.querySelectorAll("button").find((button) => button.textContent === "Salvar").click();
await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve();
assert.ok(calls.some(([kind]) => kind === "get"));
assert.ok(calls.some(([kind]) => kind === "update"));
const remove = viewRoot.querySelectorAll("button").find((button) => button.textContent === "Excluir");
await remove.click(); await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve();
assert.ok(calls.some(([kind]) => kind === "delete"));

// Friendly HTTP errors are rendered instead of thrown.
const deniedRoot = root();
const denied = { ...client, async createListItem() { const error = new Error("forbidden"); error.status = 403; throw error; } };
renderMenusEditor({ root: deniedRoot, services: { adminClient: denied, listIds: { MSEMenu: list } } });
await new Promise((resolve) => setTimeout(resolve, 0));
deniedRoot.querySelectorAll("button").find((button) => button.textContent === "Novo item").click();
const deniedInputs = Object.fromEntries(deniedRoot.querySelectorAll("input").map((input) => [input.name, input]));
deniedInputs.Title.value = "Bloqueado"; deniedInputs.Alias.value = "bloqueado";
deniedRoot.querySelectorAll("button").find((button) => button.textContent === "Salvar").click();
await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve();
assert.match(deniedRoot.querySelectorAll("p").find((node) => node.className.includes("error")).textContent, /403/);

console.log("menus-editor.test.js: verificações concluídas com sucesso.");
