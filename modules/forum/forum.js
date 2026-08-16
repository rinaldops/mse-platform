import { mountModule } from "../../../core/0.10.0/core.js";
import { renderRichText, sanitizeRichText } from "../../../core/0.10.0/rich-text.js";
import { createForumView } from "./forum-view.js";

export const FORUM_VERSION = "0.15.2";
export const SUPPORTED_CORE_MAJOR = 0;

export function mountForum({ service, globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "forum",
    selector: '[data-mse-module="forum"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" },
      forum: { pageSize: 12 }
    },
    render({ root, config }) {
      return createForumView({
        root,
        service,
        renderRichText,
        sanitizeRichText,
        pageSize: config.forum?.pageSize ?? 12
      });
    }
  });
}
