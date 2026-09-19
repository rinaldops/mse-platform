const FORMAT = "mse-platform-configuration";
const MAX_BYTES = 64 * 1024;

export function exportConfiguration({ moduleId, instanceId, view, configuration } = {}) {
  if (typeof moduleId !== "string" || !moduleId) throw new TypeError("moduleId é obrigatório.");
  if (typeof instanceId !== "string" || !instanceId) throw new TypeError("instanceId é obrigatório.");
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw new TypeError("configuration deve ser um objeto.");
  }
  return JSON.stringify({ format: FORMAT, version: 1, moduleId, instanceId, view, configuration }, null, 2);
}

export function importConfiguration(text, { moduleId, allowedPaths, getValue, setValue } = {}) {
  if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_BYTES) {
    throw new TypeError("Arquivo de configuração inválido ou maior que 64 KB.");
  }
  const payload = JSON.parse(text);
  if (payload?.format !== FORMAT || payload.version !== 1 || payload.moduleId !== moduleId
    || !payload.configuration || typeof payload.configuration !== "object" || Array.isArray(payload.configuration)) {
    throw new TypeError("Arquivo de configuração incompatível.");
  }
  return allowedPaths.reduce((result, path) => {
    const value = getValue(payload.configuration, path);
    return value === undefined ? result : setValue(result, path, value);
  }, {});
}
