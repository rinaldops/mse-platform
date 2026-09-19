import { renderSettingsForm } from "../../admin/settings-renderer.js";
import sampleSettings from "../sample-module/settings-schema.js";
import { mount } from "../sample-module/module.js";

const root = document.querySelector("#sample");
let current;

async function preview(config) {
  current?.dispose();
  current = await mount({
    root,
    config,
    services: {},
    context: { host: "local", instanceId: "sample-local", webUrl: "" }
  });
}

renderSettingsForm({
  root: document.querySelector("#settings"),
  schema: sampleSettings,
  onPreview: preview,
  onSubmit: preview,
  onReset: preview
});
preview({ title: "Módulo de exemplo" });
