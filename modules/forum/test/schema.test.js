import assert from "node:assert/strict";
import { defineListSchema } from "../../../core/list-provisioning.js";
import { FORUM_LIST_SCHEMAS, FORUM_SCHEMA_VERSION } from "../forum-schema.js";

const schemas = FORUM_LIST_SCHEMAS.map(defineListSchema);
assert.equal(FORUM_SCHEMA_VERSION, 5);
assert.equal(schemas.length, 7);
assert.equal(new Set(schemas.map((schema) => schema.key)).size, 7);
assert.equal(new Set(schemas.map((schema) => schema.internalName)).size, 7);
assert.ok(schemas.every((schema) => schema.displayName.startsWith("Fórum — ")));
assert.ok(schemas.every((schema) => schema.versioning));
assert.equal(schemas.find((schema) => schema.internalName === "ForumMidia").template, 101);
assert.equal(schemas.find((schema) => schema.internalName === "ForumMidia").writeSecurity, 1);
assert.equal(schemas.some((schema) => schema.internalName === "ForumEstatisticasUsuarios"), false);
assert.equal(schemas.find((schema) => schema.internalName === "ForumTaxonomia").writeSecurity, 4);
assert.equal(schemas.find((schema) => schema.internalName === "ForumTopicos").writeSecurity, 2);
assert.equal(schemas.find((schema) => schema.internalName === "ForumPreferencias").readSecurity, 2);
assert.equal(schemas.find((schema) => schema.internalName === "ForumPreferencias").titleField.unique, false);

for (const schema of schemas) {
  const indexCount = schema.fields.filter((field) => field.indexed).length
    + (schema.titleField.indexed ? 1 : 0);
  assert.ok(indexCount <= 20, `${schema.displayName} excedeu o limite planejado de índices.`);
}

const topics = schemas.find((schema) => schema.internalName === "ForumTopicos");
assert.equal(topics.fields.find((field) => field.internalName === "Conteudo").richText, true);
assert.deepEqual(
  topics.fields.find((field) => field.internalName === "FormatoConteudo").choices,
  ["TextoSimples", "HtmlSeguroV1"]
);
assert.equal(topics.fields.find((field) => field.internalName === "UltimaAtividade").indexed, true);

const relations = schemas.find((schema) => schema.internalName === "ForumTopicoTags");
assert.equal(relations.titleField.unique, true);
assert.ok(relations.fields.every((field) => field.type === "Number" && field.indexed));

const answers = schemas.find((schema) => schema.internalName === "ForumRespostas");
assert.equal(answers.fields.some((field) => field.internalName === "Aceita"), false);
assert.equal(answers.fields.find((field) => field.internalName === "FormatoConteudo").defaultValue, "TextoSimples");

const reactions = schemas.find((schema) => schema.internalName === "ForumReacoes");
assert.equal(reactions.titleField.unique, true);
assert.deepEqual(
  reactions.fields.find((field) => field.internalName === "TipoReacao").choices,
  ["Gostei", "Util", "Excelente"]
);

console.log("forum schema.test.js: verificações concluídas com sucesso.");
