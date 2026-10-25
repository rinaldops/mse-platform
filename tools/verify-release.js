import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateExtensionIndex } from "./extension-index.js";

const directory = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new TypeError("Uso: node tools/verify-release.js <diret?rio-da-release>");

const manifest = JSON.parse(await readFile(path.join(directory, "release-manifest.json"), "utf8"));

for (const file of manifest.files) {
  const bytes = await readFile(path.join(directory, file.path));
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== file.sha256 || bytes.length !== file.bytes) {
    throw new Error(`Artefato inv?lido: ${file.path}`);
  }
}

// extension-index.json precisa existir e ser v?lido
{
  const indexBytes = await readFile(path.join(directory, "extension-index.json"));
  const index = JSON.parse(indexBytes.toString("utf8"));
  validateExtensionIndex(index);

  // sanity check: platformVersion deve bater com release-manifest
  assert.equal(index.platformVersion, manifest.platformVersion);
  console.log("verify-release.js: extension-index.json ok.");
}

console.log(`Release ${manifest.platformVersion} verificada: ${manifest.files.length} arquivos.`);
