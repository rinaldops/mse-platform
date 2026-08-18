import { mountModule } from "../../../core/0.13.6/core.js";
import { createHomeView } from "./home-view.js";

export const HOME_VERSION = "0.1.0";
export const SUPPORTED_CORE_MAJOR = 0;

export function mountHome({ stats, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "home",
    selector: '[data-mse-module="home"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" }
    },
    render({ root }) {
      return createHomeView({ root, stats });
    }
  });
}
