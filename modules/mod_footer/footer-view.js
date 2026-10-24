/**
 * View pura (sem rede) do módulo de posição `mod_footer`: `<footer>` com o
 * ano atual (se habilitado) seguido do texto de direitos autorais
 * configurado. Config-driven, sem `dataSources` — ver
 * `footer-settings-schema.js`.
 */

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {{
 *   root: Element,
 *   copyrightText: string,
 *   showYear: boolean,
 *   year?: number
 * }} options `year` é injetável para teste; por padrão usa o ano corrente.
 * @returns {() => void} função de limpeza.
 */
export function createFooterView({ root, copyrightText, showYear, year = new Date().getFullYear() } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");

  const document = root.ownerDocument;
  const footer = element(document, "footer", "mse-module-footer");

  const text = showYear ? `© ${year} ${copyrightText}` : copyrightText;
  footer.append(element(document, "p", "mse-module-footer__text", text));

  root.replaceChildren(footer);

  return () => {
    root.replaceChildren();
  };
}
