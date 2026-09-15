import { createRichTextEditor as createQuillRichTextEditor } from "./editor-quill.js";
import { createSummernoteRichTextEditor } from "./editor-summernote.js";

export const DEFAULT_EDITOR = "Quill";
export const SUPPORTED_EDITORS = Object.freeze(["Quill", "Summernote", "default"]);

export function normalizeEditorName(value = DEFAULT_EDITOR) {
  const text = String(value || DEFAULT_EDITOR).trim().toLowerCase();
  if (text === "quill") return "Quill";
  if (text === "summernote") return "Summernote";
  if (text === "default") return "default";
  throw new TypeError(`Editor inválido: ${value}. Use Quill, Summernote ou default.`);
}

export function selectRichTextEditor(value = DEFAULT_EDITOR) {
  const editor = normalizeEditorName(value);
  if (editor === "Quill") return createQuillRichTextEditor;
  if (editor === "Summernote") return createSummernoteRichTextEditor;
  return undefined;
}
