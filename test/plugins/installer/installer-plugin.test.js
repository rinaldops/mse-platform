import assert from "node:assert/strict";
import { createInstallerPlugin, INSTALLER_PLUGIN_MANIFEST } from "../../../plugins/installer/manifest.js";
import { validateInstallerContract } from "../../../plugins/installer/plugin.js";

const calls = [];
const plugin = createInstallerPlugin({
  inspect: async (ctx) => { calls.push(["inspect", ctx]); return { ok: true }; },
  verify: async (ctx) => { calls.push(["verify", ctx]); return { valid: true }; },
  apply: async (ctx, confirm) => { calls.push(["apply", ctx]); assert.equal(await confirm({ id: "plan" }), true); return { applied: true }; }
});

assert.equal(INSTALLER_PLUGIN_MANIFEST.type, "plugin");
assert.deepEqual(INSTALLER_PLUGIN_MANIFEST.events, ["onInstallerInspect", "onInstallerVerify", "onInstallerApply"]);
assert.equal(validateInstallerContract(plugin), true);
assert.deepEqual(await plugin.onInstallerInspect({ source: "test" }), { ok: true });
assert.deepEqual(await plugin.onInstallerVerify({ source: "test" }), { valid: true });
assert.deepEqual(await plugin.onInstallerApply({}, async () => true), { applied: true });
assert.equal(calls.length, 3);
assert.throws(() => createInstallerPlugin({ inspect() {}, verify() {} }), /apply/);
await assert.rejects(() => plugin.onInstallerApply({}, null), /confirm/);
console.log("plugins/installer: ok");

