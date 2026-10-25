import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineExtensionContract } from "../../../../core/extension-contract.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifests = [
  ["system", "../manifest.json"],
  ["content", "../../manifest.json"]
];
for (const [name, relative] of manifests) {
  const value = JSON.parse(await readFile(path.resolve(here, relative), "utf8"));
  const normalized = defineExtensionContract(value);
  assert.equal(normalized.type, "plugin");
  assert.equal(normalized.entrypoints.full.startsWith("./"), true);
}
console.log("plugin manifests: ok");
