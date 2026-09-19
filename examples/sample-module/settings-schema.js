import { defineSettingsSchema } from "../../core/module-contract.js";

export default defineSettingsSchema({
  version: 1,
  groups: [{
    id: "content",
    label: "Conteúdo",
    fields: [{ id: "title", type: "text", label: "Título", default: "Módulo de exemplo" }]
  }]
});
