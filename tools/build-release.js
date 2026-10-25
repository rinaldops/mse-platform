import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildExtensionIndex, validateExtensionIndex, writeExtensionIndexFile } from "./extension-index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];
const output = path.resolve(process.argv[3] || path.join(root, ".tmp", "release", version || "invalid"));
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version || "")) {
  throw new TypeError("Uso: node tools/build-release.js <vers?o-semver> [diret?rio-de-sa?da]");
}

async function packageVersion(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8")).version;
}

const platformVersion = await packageVersion("package.json");
if (version !== platformVersion) throw new Error(`A release deve usar a vers?o ${platformVersion} do package.json.`);

// Packages hist?ricos: mantidos para compatibilidade com o fluxo atual.
// Plugins n?o s?o packages npm no mse-platform; entram no `extension-index.json`.
const packages = {
  core: await packageVersion("core/package.json"),
  ui: await packageVersion("libraries/ui/package.json"),
  forum: await packageVersion("modules/mod_forum/package.json"),
  "explore-mais": await packageVersion("modules/mod_recursos/package.json"),
  videoteca: await packageVersion("modules/mod_videoteca/package.json"),
  home: await packageVersion("modules/mod_home/package.json"),
  menu: await packageVersion("modules/mod_menu/package.json"),
  breadcrumbs: await packageVersion("modules/mod_breadcrumbs/package.json"),
  footer: await packageVersion("modules/mod_footer/package.json"),
  admin: await packageVersion("admin/package.json"),
  "host-modern-script-editor": await packageVersion("host-adapters/modern-script-editor/package.json")
};

// Roots de arquivos que podem compor uma release publicada.
// Nota: `plugins/` passa a ser inclu?do (Fase 3: grupos system/content/extension/installer).
const roots = ["admin", "core", "host-adapters", "modules", "libraries", "themes", "templates", "components", "kernel", "plugins"];

const excludedDirectories = new Set(["demo", "snippets", "test", "tests", "node_modules"]);
const excludedFiles = new Set(["core/core.js", "core/core.css", "core/theme-adapter.js"]);
const allowedExtensions = new Set([".css", ".html", ".js", ".json"]);
const forbidden = [
  /petrobrasbr/iu,
  /tecnologiasdigitais/iu,
  /comunidades-de-interesse/iu,
  /petrobras/iu,
  /https?:\/\/[^\s"']+\.sharepoint\.com/iu
];

async function filesUnder(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await filesUnder(absolute));
    else if (allowedExtensions.has(path.extname(entry.name))) result.push(absolute);
  }
  return result;
}

try {
  await stat(output);
  throw new Error(`A sa?da j? existe e n?o ser? sobrescrita: ${output}`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const sourceFiles = (await Promise.all(roots.map((directory) => filesUnder(path.join(root, directory)))))
  .flat()
  .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);

const manifest = { platformVersion: version, packages, files: [] };
await mkdir(output, { recursive: true });

for (const source of sourceFiles) {
  const relative = path.relative(root, source).replaceAll("\\", "/");
  if (excludedFiles.has(relative)) continue;
  const bytes = await readFile(source);
  const text = bytes.toString("utf8");
  if (forbidden.some((pattern) => pattern.test(text))) {
    throw new Error(`Refer?ncia espec?fica de consumidor encontrada em ${relative}.`);
  }
  const target = path.join(output, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { errorOnExist: true, force: false });
  manifest.files.push({
    path: relative,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

// --- extension-index.json -------------------------------------------------
// Gerado a partir do reposit?rio fonte (root), mas validado e gravado na release.
const extensionIndex = await buildExtensionIndex({ root, platformVersion: version });
validateExtensionIndex(extensionIndex);

const extensionIndexBytes = await writeExtensionIndexFile({ outputDir: output, index: extensionIndex });
manifest.files.push({
  path: "extension-index.json",
  bytes: extensionIndexBytes.length,
  sha256: createHash("sha256").update(extensionIndexBytes).digest("hex")
});

await writeFile(
  path.join(output, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" }
);

console.log(`Release ${version}: ${manifest.files.length} arquivos em ${output}`);
