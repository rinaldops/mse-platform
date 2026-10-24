import { defineSettingsSchema } from "../../core/module-contract.js";

export const FOOTER_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "footer",
      label: "Rodapé",
      fields: [
        { id: "copyrightText", type: "text", label: "Texto de direitos autorais", default: "Todos os direitos reservados." },
        { id: "showYear", type: "boolean", label: "Mostrar ano atual", default: true }
      ]
    }
  ]
});

export default FOOTER_SETTINGS_SCHEMA;
