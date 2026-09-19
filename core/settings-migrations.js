function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function defineSettingsMigrations(migrations = []) {
  if (!Array.isArray(migrations)) throw new TypeError("migrations deve ser uma lista.");
  const normalized = [...migrations]
    .map((migration) => {
      if (!Number.isInteger(migration?.from) || !Number.isInteger(migration?.to) || migration.to !== migration.from + 1) {
        throw new TypeError("Cada migração deve avançar exatamente uma versão.");
      }
      if (typeof migration.migrate !== "function") throw new TypeError("migration.migrate deve ser uma função.");
      return Object.freeze({ from: migration.from, to: migration.to, migrate: migration.migrate, description: String(migration.description || "") });
    })
    .sort((left, right) => left.from - right.from);
  normalized.forEach((migration, index) => {
    if (index && migration.from === normalized[index - 1].from) throw new TypeError(`Migração duplicada para v${migration.from}.`);
  });
  return Object.freeze(normalized);
}

export function migrateSettings({ configuration, fromVersion, toVersion, migrations }) {
  if (!Number.isInteger(fromVersion) || !Number.isInteger(toVersion) || fromVersion < 1 || toVersion < fromVersion) {
    throw new TypeError("Intervalo de versões inválido.");
  }
  const available = defineSettingsMigrations(migrations);
  let value = clone(configuration);
  const applied = [];
  for (let version = fromVersion; version < toVersion; version += 1) {
    const migration = available.find((candidate) => candidate.from === version);
    if (!migration) throw new Error(`Não existe migração de settings v${version} para v${version + 1}.`);
    const next = migration.migrate(clone(value));
    if (!next || Array.isArray(next) || typeof next !== "object") {
      throw new TypeError(`A migração v${version} deve retornar um objeto.`);
    }
    value = clone(next);
    applied.push(Object.freeze({ from: migration.from, to: migration.to, description: migration.description }));
  }
  return Object.freeze({ configuration: Object.freeze(value), applied: Object.freeze(applied) });
}
