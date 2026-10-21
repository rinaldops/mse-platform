import assert from "node:assert/strict";
import { defineListSchema } from "../../../core/list-provisioning.js";
import { VIDEOTECA_LIST_SCHEMAS, VIDEOTECA_SCHEMA_VERSION } from "../videoteca-schema.js";

const schemas = VIDEOTECA_LIST_SCHEMAS.map(defineListSchema);
assert.equal(VIDEOTECA_SCHEMA_VERSION, 7);
assert.equal(schemas.length, 3);

const taxonomy = schemas.find((schema) => schema.internalName === "VideotecaTaxonomia");
assert.ok(taxonomy?.fields.some((field) => field.internalName === "Tipo" && field.type === "Choice"));
const relations = schemas.find((schema) => schema.internalName === "VideotecaVideoTags");
assert.ok(relations?.fields.some((field) => field.internalName === "VideoId" && field.type === "Number"));
assert.ok(relations?.fields.some((field) => field.internalName === "TagId" && field.type === "Number"));

const videos = schemas.find((schema) => schema.internalName === "VideotecaVideos");
assert.ok(videos, "VideotecaVideos schema deve existir.");
assert.equal(videos.template, 101);
assert.equal(videos.writeSecurity, 1);
assert.equal(videos.readSecurity, 1);
assert.ok(videos.fields.some((field) => field.internalName === "CategoriaId"
  && field.displayName === "Categoria"
  && field.type === "Number"));
assert.ok(!videos.fields.some((field) => ["Categoria", "Categorias"].includes(field.internalName)));
assert.ok(videos.fields.some((field) => field.internalName === "Destaque" && field.type === "Boolean"));
assert.ok(videos.fields.some((field) => field.internalName === "OrdemCarrossel" && field.type === "Number"));
assert.ok(videos.fields.some((field) => field.internalName === "Visualizacoes" && field.type === "Number"));
assert.ok(videos.fields.some((field) => field.internalName === "Apresentadores" && field.type === "UserMulti"));
assert.ok(!videos.fields.some((field) => field.internalName === "Apresentador"));
assert.ok(videos.fields.some((field) => field.internalName === "LegacyMigrationId" && field.unique));

console.log("videoteca schema.test.js: verificações concluídas com sucesso.");
