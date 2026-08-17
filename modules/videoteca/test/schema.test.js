import assert from "node:assert/strict";
import { defineListSchema } from "../../../core/list-provisioning.js";
import { VIDEOTECA_LIST_SCHEMAS, VIDEOTECA_SCHEMA_VERSION } from "../videoteca-schema.js";

const schemas = VIDEOTECA_LIST_SCHEMAS.map(defineListSchema);
assert.equal(VIDEOTECA_SCHEMA_VERSION, 1);
assert.equal(schemas.length, 1);

const videos = schemas.find((schema) => schema.internalName === "VideotecaVideos");
assert.ok(videos, "VideotecaVideos schema deve existir.");
assert.equal(videos.writeSecurity, 4);
assert.equal(videos.readSecurity, 1);
assert.ok(videos.fields.some((field) => field.internalName === "Categoria" && field.type === "Choice"));
assert.ok(videos.fields.some((field) => field.internalName === "Destaque" && field.type === "Boolean"));
assert.ok(videos.fields.some((field) => field.internalName === "OrdemCarrossel" && field.type === "Number"));

console.log("videoteca schema.test.js: verificações concluídas com sucesso.");
