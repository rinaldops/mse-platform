import { epubSettingsGroups } from "../core/epub-settings.js";

export const ADMIN_SETTINGS_SCHEMA = Object.freeze({
  version: 1,
  groups: epubSettingsGroups("Administração de EPUBs")
});
