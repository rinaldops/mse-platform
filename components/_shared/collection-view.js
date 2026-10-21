/**
 * Infraestrutura comum mínima para telas administrativas ainda não
 * conectadas a dados reais (`com_config`/`com_installer`) — extraída de um
 * único `administrator/screens/collections.js` para que cada componente
 * administrativo vire sua própria pasta física (`components/com_config/`,
 * `components/com_installer/`), seguindo a convenção de diretórios do
 * Joomla! (um componente = uma pasta).
 *
 * Nota de limpeza desta extração: o `collections.js` original também tinha
 * um caminho `LIST_BINDINGS`/`renderListPanel` (tabela somente-leitura
 * genérica para `com_extensions`/`com_menus`/`com_modules`) que era morto
 * em tempo de execução — `renderCollectionScreen` sempre interceptava essas
 * três opções mais acima, delegando para o editor CRUD de cada uma antes
 * de chegar a esse caminho. Não foi carregado aqui.
 *
 * Prefixo `_` (`components/_shared/`): esta pasta não é um componente
 * Joomla! de fato (não tem `option=com_xxx` próprio) — é infraestrutura
 * interna compartilhada entre componentes, mesma convenção de pastas do
 * workspace para esse tipo de conteúdo (ver `AGENTS.md`).
 */

/**
 * Renderiza uma tela placeholder (`com_config`/`com_installer`): título +
 * parágrafo informativo, sem nenhuma fonte de dados real conectada ainda
 * (decisão de escopo já tomada, ver `components/com_config/README.md` e
 * `components/com_installer/README.md`).
 *
 * @param {object} options
 * @param {Element} options.root
 * @param {Document} options.document
 * @param {string} options.label
 * @param {object} [options.services]
 * @returns {{ dispose(): void }}
 */
export function renderPlaceholderScreen({ root, document, label, services = {} } = {}) {
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const h = document.createElement("h1");
  h.textContent = label;
  const p = document.createElement("p");
  p.textContent = services.status || "A tela está preparada para receber a fonte SharePoint correspondente.";
  panel.append(h, p);
  root.append(panel);
  return {
    dispose() {
      panel.remove();
    }
  };
}
