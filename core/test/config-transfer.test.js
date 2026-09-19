import assert from "node:assert/strict";
import { exportConfiguration, importConfiguration } from "../../admin/config-transfer.js";
import { getSettingValue, setSettingValue } from "../../admin/settings-renderer.js";

const text = exportConfiguration({
  moduleId: "videoteca",
  instanceId: "principal",
  view: "Full",
  configuration: { layout: { mode: "contained", ignored: true } }
});
const imported = importConfiguration(text, {
  moduleId: "videoteca",
  allowedPaths: ["layout.mode"],
  getValue: getSettingValue,
  setValue: setSettingValue
});
assert.deepEqual(imported, { layout: { mode: "contained" } });
assert.throws(() => importConfiguration(text, {
  moduleId: "forum",
  allowedPaths: [],
  getValue: getSettingValue,
  setValue: setSettingValue
}), /incompatível/);
assert.throws(() => importConfiguration("x".repeat(70_000), {
  moduleId: "videoteca",
  allowedPaths: [],
  getValue: getSettingValue,
  setValue: setSettingValue
}), /64 KB/);

console.log("config-transfer.test.js: verificações concluídas com sucesso.");
