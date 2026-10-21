import { createForumView } from "./forum-view.js";

function dependencies(services) {
  const service = services?.forum ?? services?.service;
  const richText = services?.richText;
  if (!service || typeof service.listTopics !== "function") {
    throw new TypeError("O serviço de dados do Fórum é obrigatório.");
  }
  if (!richText || typeof richText.selectEditor !== "function"
    || typeof richText.render !== "function" || typeof richText.sanitize !== "function") {
    throw new TypeError("Os serviços de rich text do Fórum são obrigatórios.");
  }
  return { service, richText };
}

export function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const { service, richText } = dependencies(services);
  const editor = config.forum?.editor ?? root.dataset?.editor ?? "default";
  const cleanup = createForumView({
    root,
    service,
    createRichTextEditor: richText.selectEditor(editor),
    renderRichText: richText.render,
    sanitizeRichText: richText.sanitize,
    pageSize: config.forum?.pageSize ?? 20
  });
  return Object.freeze({ dispose: () => cleanup?.() });
}

export function dispose() {}
