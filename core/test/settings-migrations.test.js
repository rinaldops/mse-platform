import assert from "node:assert/strict";
import { migrateSettings } from "../settings-migrations.js";

const original = { pageSize: 12 };
const result = migrateSettings({
  configuration: original,
  fromVersion: 1,
  toVersion: 3,
  migrations: [
    { from: 1, to: 2, description: "Agrupa paginação", migrate: (value) => ({ content: { pageSize: value.pageSize } }) },
    { from: 2, to: 3, description: "Adiciona densidade", migrate: (value) => ({ ...value, layout: { density: "default" } }) }
  ]
});
assert.deepEqual(result.configuration, { content: { pageSize: 12 }, layout: { density: "default" } });
assert.equal(result.applied.length, 2);
assert.deepEqual(original, { pageSize: 12 });
assert.throws(
  () => migrateSettings({ configuration: {}, fromVersion: 1, toVersion: 2, migrations: [] }),
  /Não existe migração/
);

console.log("settings-migrations.test.js: verificações concluídas com sucesso.");
