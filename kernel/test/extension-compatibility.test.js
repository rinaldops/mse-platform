import assert from "node:assert/strict";
import { parseCoreCompatibility, isManifestCompatibleWithCore, parseExtensionParams } from "../extension-compatibility.js";

// --- parseCoreCompatibility ------------------------------------------------

assert.deepEqual(parseCoreCompatibility(">=0.8.0 <2.0.0"), { min: [0,8,0], max: [2,0,0] });
assert.equal(parseCoreCompatibility(""), null);
assert.equal(parseCoreCompatibility("^0.8.0"), null);
assert.equal(parseCoreCompatibility(">=0.8 <2.0.0"), null);

console.log("extension-compatibility.test.js: parseCoreCompatibility ok.");

// --- isManifestCompatibleWithCore -----------------------------------------

{
  const manifest = { coreCompatibility: ">=0.8.0 <1.0.0" };
  assert.equal(isManifestCompatibleWithCore(manifest, "0.8.0"), true);
  assert.equal(isManifestCompatibleWithCore(manifest, "0.9.9"), true);
  assert.equal(isManifestCompatibleWithCore(manifest, "1.0.0"), false);
  assert.equal(isManifestCompatibleWithCore(manifest, "0.7.9"), false);
  assert.equal(isManifestCompatibleWithCore(manifest, "garbage"), false);
  assert.equal(isManifestCompatibleWithCore({}, "0.8.0"), false);

  console.log("extension-compatibility.test.js: isManifestCompatibleWithCore ok.");
}

// --- parseExtensionParams --------------------------------------------------

assert.deepEqual(parseExtensionParams(null), {});
assert.deepEqual(parseExtensionParams(""), {});
assert.deepEqual(parseExtensionParams("  "), {});
assert.deepEqual(parseExtensionParams("[]"), {});
assert.deepEqual(parseExtensionParams("42"), {});
assert.deepEqual(parseExtensionParams("{\"x\":1}"), { x: 1 });
assert.deepEqual(parseExtensionParams("{bad"), {});

console.log("extension-compatibility.test.js: parseExtensionParams ok.");
console.log("extension-compatibility.test.js: verificações concluídas com sucesso.");
