import { defineSettingsSchema } from "../../core/module-contract.js";

export const SEARCH_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "search",
      label: "Busca",
      fields: [
        { id: "placeholder", type: "text", label: "Texto de ajuda do campo de busca", default: "Buscar..." },
        { id: "maxResults", type: "number", label: "Máximo de resultados exibidos", default: 10, min: 1, max: 50 }
      ]
    }
  ]
});

export default SEARCH_SETTINGS_SCHEMA;
