import { FORUM_MANIFEST } from "../modules/forum/manifest.js";
import { FORUM_SETTINGS_SCHEMA } from "../modules/forum/settings-schema.js";
import { HOME_MANIFEST } from "../modules/home/manifest.js";
import { HOME_SETTINGS_SCHEMA } from "../modules/home/settings-schema.js";
import { RECURSOS_MANIFEST } from "../modules/recursos/manifest.js";
import { RECURSOS_SETTINGS_SCHEMA } from "../modules/recursos/settings-schema.js";
import { VIDEOTECA_MANIFEST } from "../modules/videoteca/manifest.js";
import { VIDEOTECA_SETTINGS_SCHEMA } from "../modules/videoteca/settings-schema.js";
import { createModuleCatalog } from "./catalog.js";

export function createDefaultCatalog() {
  return createModuleCatalog([
    { manifest: HOME_MANIFEST, settingsSchema: HOME_SETTINGS_SCHEMA },
    { manifest: FORUM_MANIFEST, settingsSchema: FORUM_SETTINGS_SCHEMA },
    { manifest: VIDEOTECA_MANIFEST, settingsSchema: VIDEOTECA_SETTINGS_SCHEMA },
    { manifest: RECURSOS_MANIFEST, settingsSchema: RECURSOS_SETTINGS_SCHEMA }
  ]);
}
