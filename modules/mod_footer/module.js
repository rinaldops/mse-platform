import { settingsDefaults } from "../../core/module-contract.js";
import { FOOTER_SETTINGS_SCHEMA } from "./footer-settings-schema.js";
import { createFooterView } from "./footer-view.js";

const DEFAULTS = settingsDefaults(FOOTER_SETTINGS_SCHEMA);

export function mount({ root, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");

  const copyrightText = config.copyrightText ?? DEFAULTS.copyrightText;
  const showYear = config.showYear ?? DEFAULTS.showYear;

  const disposeView = createFooterView({ root, copyrightText, showYear });

  return Object.freeze({
    dispose() {
      disposeView?.();
    }
  });
}

export function dispose() {}
