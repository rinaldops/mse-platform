/**
 * Toolbar unificado de listagem do Administrator — função pura de DOM,
 * mesmo princípio de `administrator-shell.js`/`control-panel.js`: nenhum
 * acoplamento a `kernel/*`, só monta/alterna elementos do DOM recebido.
 *
 * Elimina a duplicação hoje presente em cada `*-editor.js`/`publisher.js`:
 * cada um montava sua própria `<div class="mse-administrator__toolbar">`
 * com botão(ões) de ação primária + "Recarregar" à mão, sem busca
 * client-side alguma (confirmado por leitura direta de cada arquivo —
 * `extensions-editor.js`, `menus-editor.js`, `modules-editor.js`,
 * `config-editor.js`, `templates-editor.js`, `publisher.js`). Fidelidade ao
 * Joomla! real (item 4 da rodada "ainda está longe do layout correto"): o
 * `atum` real tem busca+filtros persistentes em toda tela de listagem —
 * este módulo cobre o MVP (ações + busca client-side por termo livre).
 * Sort-by/page-size/column-visibility ficam fora desta rodada (ver plano).
 *
 * @param {{
 *   root: Element,
 *   primaryActions?: Array<{ label: string, onClick: () => void }>,
 *   secondaryActions?: Array<{ label: string, onClick: () => void }>,
 *   search?: { placeholder?: string, onInput: (value: string) => void },
 * }} options
 * @returns {{ toolbarElement: Element, searchInput: Element|null, dispose(): void }}
 */
export function createAdministratorToolbar({ root, primaryActions = [], secondaryActions = [], search } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;

  const toolbarElement = document.createElement("div");
  toolbarElement.className = "mse-administrator__toolbar";

  function appendActionButtons(actions) {
    for (const action of actions) {
      if (!action || typeof action.onClick !== "function") continue;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label ?? "";
      if (typeof button.addEventListener === "function") button.addEventListener("click", action.onClick);
      else button.onclick = action.onClick;
      toolbarElement.append(button);
    }
  }
  appendActionButtons(primaryActions);
  appendActionButtons(secondaryActions);

  let searchInput = null;
  if (search && typeof search.onInput === "function") {
    searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "mse-administrator__toolbar-search";
    if (search.placeholder) searchInput.placeholder = search.placeholder;
    const handleInput = () => search.onInput(searchInput.value);
    if (typeof searchInput.addEventListener === "function") searchInput.addEventListener("input", handleInput);
    else searchInput.oninput = handleInput;
    toolbarElement.append(searchInput);
  }

  root.append(toolbarElement);

  return {
    toolbarElement,
    searchInput,
    dispose() {
      if (typeof toolbarElement.remove === "function") toolbarElement.remove();
    }
  };
}
