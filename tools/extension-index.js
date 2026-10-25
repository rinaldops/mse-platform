import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Índice de extensões empacotadas na release.
 *
 * Objetivo:
 * - oferecer um mapa rápido de extensões/manifestos para validação e inspeção;
 * - suportar futura resolução por host (ex.: cache busting e manifest resolvers)
 *   sem depender de crawling no SharePoint.
 *
 * IMPORTANTE: não altera runtime. É um artefato da release.
 */

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * @typedef {{ kind: "component"|"module"|"plugin"|"template", element: string, manifestPath: string, version: string, group?: string, entry?: string, events?: string[] }} ExtensionIndexEntry
 */

/**
 * @typedef {{ platformVersion: string, generatedAt: string, entries: ExtensionIndexEntry[] }} ExtensionIndex
 */

async function listDirs(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (err) {
    if (err && err.code === "ENOENT") return false;
    throw err;
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function normalizeKindFromType(type) {
  const t = String(type || "").trim().toLowerCase();
  if (t === "component" || t === "module" || t === "plugin") return t;
  return null;
}

/**
 * Varre o repo fonte e monta um índice mínimo.
 *
 * Regras de descoberta (compatíveis com a release atual):
 * - módulos (Joomla mod_*): `modules/mod_<element>/manifest.js` exporting default manifest
 * - componentes (Joomla com_*): `components/com_<name>/manifest.js`
 * - templates (pacotes de template): `templates/<name>/template.json`
 * - plugins: `plugins/<group>/<element>/manifest.json`
 *
 * @param {{ root: string, platformVersion: string }} args
 * @returns {Promise<ExtensionIndex>}
 */
export async function buildExtensionIndex({ root, platformVersion }) {
  if (!SEMVER.test(platformVersion || "")) {
    throw new TypeError("platformVersion inválida para extension-index.");
  }

  /** @type {ExtensionIndexEntry[]} */
  const entries = [];

  // --- modules/mod_* ------------------------------------------------------
  for (const dir of await listDirs(path.join(root, "modules"))) {
    if (!dir.startsWith("mod_")) continue;
    const element = dir.slice("mod_".length);
    const manifestPath = `modules/${dir}/manifest.js`;
    const manifestFile = path.join(root, manifestPath);
    if (!(await exists(manifestFile))) continue;

    const mod = await import(pathToFileUrl(manifestFile));
    const manifest = mod.default ?? mod.MANIFEST ?? mod.manifest;
    if (!manifest || typeof manifest !== "object") {
      throw new TypeError(`Manifest inválido em ${manifestPath}.`);
    }

    entries.push({
      kind: "module",
      element,
      manifestPath,
      version: String(manifest.version || "0.0.0")
    });
  }

  // --- components/com_* ---------------------------------------------------
  for (const dir of await listDirs(path.join(root, "components"))) {
    if (!dir.startsWith("com_")) continue;
    const element = dir; // preserva com_* como Element
    const manifestPath = `components/${dir}/manifest.js`;
    const manifestFile = path.join(root, manifestPath);
    if (!(await exists(manifestFile))) continue;

    const mod = await import(pathToFileUrl(manifestFile));
    const manifest = mod.default ?? mod.MANIFEST ?? mod.manifest;
    if (!manifest || typeof manifest !== "object") {
      throw new TypeError(`Manifest inválido em ${manifestPath}.`);
    }

    const kind = normalizeKindFromType(manifest.type) || "component";
    // com_* nunca deve reportar module/plugin aqui.
    entries.push({
      kind: kind === "component" ? "component" : "component",
      element,
      manifestPath,
      version: String(manifest.version || "0.0.0")
    });
  }

  // --- templates/* --------------------------------------------------------
  for (const name of await listDirs(path.join(root, "templates"))) {
    const templateJsonPath = `templates/${name}/template.json`;
    const templateFile = path.join(root, templateJsonPath);
    if (!(await exists(templateFile))) continue;
    const json = await readJson(templateFile);
    entries.push({
      kind: "template",
      element: name,
      manifestPath: templateJsonPath,
      version: String(json.version || "0.0.0")
    });
  }

  // --- plugins/<group>/<element> -----------------------------------------
  for (const group of await listDirs(path.join(root, "plugins"))) {
    if (group.startsWith(".")) continue;
    const groupDir = path.join(root, "plugins", group);
    for (const element of await listDirs(groupDir)) {
      if (element.startsWith("_")) continue;
      const manifestPath = `plugins/${group}/${element}/manifest.json`;
      const manifestFile = path.join(root, manifestPath);
      if (!(await exists(manifestFile))) continue;
      const json = await readJson(manifestFile);

      entries.push({
        kind: "plugin",
        group,
        element,
        manifestPath,
        version: String(json.version || "0.0.0"),
        entry: typeof json.entry === "string" ? json.entry : undefined,
        events: Array.isArray(json.events) ? json.events.map(String) : undefined
      });
    }
  }

  // determinismo
  entries.sort((a, b) => {
    const ka = `${a.kind}:${a.group || ""}:${a.element}`;
    const kb = `${b.kind}:${b.group || ""}:${b.element}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  return Object.freeze({
    platformVersion,
    generatedAt: new Date().toISOString(),
    entries
  });
}

function pathToFileUrl(file) {
  // Node 16: URL precisa de file://
  const resolved = path.resolve(file);
  const url = new URL("file:///");
  url.pathname = resolved.replaceAll("\\", "/");
  return url.href;
}

/**
 * Validação mínima do índice gerado.
 * @param {any} index
 * @returns {asserts index is ExtensionIndex}
 */
export function validateExtensionIndex(index) {
  if (!index || typeof index !== "object") throw new TypeError("extension-index inválido.");
  if (!SEMVER.test(index.platformVersion || "")) throw new TypeError("extension-index.platformVersion inválido.");
  if (typeof index.generatedAt !== "string" || !index.generatedAt) throw new TypeError("extension-index.generatedAt inválido.");
  if (!Array.isArray(index.entries)) throw new TypeError("extension-index.entries deve ser array.");

  const seen = new Set();
  for (const entry of index.entries) {
    if (!entry || typeof entry !== "object") throw new TypeError("extension-index entry inválida.");
    if (!["component", "module", "plugin", "template"].includes(entry.kind)) throw new TypeError("entry.kind inválido.");
    if (typeof entry.element !== "string" || !entry.element) throw new TypeError("entry.element inválido.");
    if (typeof entry.manifestPath !== "string" || !entry.manifestPath) throw new TypeError("entry.manifestPath inválido.");
    if (typeof entry.version !== "string" || !entry.version) throw new TypeError("entry.version inválido.");

    const key = `${entry.kind}:${entry.group || ""}:${entry.element}`;
    if (seen.has(key)) throw new Error(`extension-index duplicado: ${key}`);
    seen.add(key);

    if (entry.kind === "plugin") {
      if (typeof entry.group !== "string" || !entry.group) throw new TypeError("plugin.group inválido.");
      if (entry.events && (!Array.isArray(entry.events) || !entry.events.length)) throw new TypeError("plugin.events inválido.");
      if (entry.entry && typeof entry.entry !== "string") throw new TypeError("plugin.entry inválido.");
    }
  }
}

/**
 * Grava `extension-index.json` no diretório de output e devolve os bytes.
 * @param {{ outputDir: string, index: ExtensionIndex }} args
 * @returns {Promise<Buffer>}
 */
export async function writeExtensionIndexFile({ outputDir, index }) {
  const bytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "extension-index.json"), bytes, { flag: "wx" });
  return bytes;
}
