import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const directory = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw new TypeError("Uso: node tools/verify-release.js <diretório-da-release>");
const manifest = JSON.parse(await readFile(path.join(directory, "release-manifest.json"), "utf8"));
for (const file of manifest.files) {
  const bytes = await readFile(path.join(directory, file.path));
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== file.sha256 || bytes.length !== file.bytes) throw new Error(`Artefato inválido: ${file.path}`);
}
console.log(`Release ${manifest.platformVersion} verificada: ${manifest.files.length} arquivos.`);
