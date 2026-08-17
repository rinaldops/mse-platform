import assert from "node:assert/strict";
import { defineListSchema } from "../../../core/list-provisioning.js";
import { RECURSOS_LIST_SCHEMAS, RECURSOS_SCHEMA_VERSION } from "../recursos-schema.js";

const schemas = RECURSOS_LIST_SCHEMAS.map(defineListSchema);
assert.equal(RECURSOS_SCHEMA_VERSION, 1);
assert.equal(schemas.length, 1);

const links = schemas.find((schema) => schema.internalName === "RecursosLinks");
assert.ok(links, "RecursosLinks schema deve existir.");
assert.equal(links.writeSecurity, 4);
assert.equal(links.readSecurity, 1);
assert.ok(links.fields.some((field) => field.internalName === "Categoria" && field.type === "Choice"));
assert.ok(links.fields.some((field) => field.internalName === "URL" && field.required));
assert.ok(links.fields.some((field) => field.internalName === "Ativo" && field.defaultValue === true));

console.log("recursos schema.test.js: verificações concluídas com sucesso.");
