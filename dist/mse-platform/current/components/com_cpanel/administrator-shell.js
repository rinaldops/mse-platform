/**
 * Shell formal do Administrator — análogo ao template de backend do
 * Joomla! real (`atum`): cabeçalho + navegação persistente (visível em
 * TODA tela do Administrator, não só na tela inicial) + 1 slot de conteúdo
 * onde a tela ativa (`option=com_*`) é montada.
 *
 * Antes deste módulo, cada `*-screen.js` (com_config, com_content/publisher,
 * com_diagnostics, com_extensions, com_installer, com_menus, com_modules,
 * com_templates) só criava seu próprio `<section class="mse-administrator__panel">`
 * — sem nenhuma navegação além da tela inicial (`control-panel.js`, cujo
 * `<nav>` próprio só aparecia em `option=com_cpanel`). Resultado: ao entrar
 * em qualquer outra tela, não havia como voltar/trocar de seção sem editar a
 * URL manualmente. Este shell resolve isso: `components/com_cpanel/
 * component.js#mount` passa a montar ESTE shell uma vez por navegação e
 * injetar a tela ativa dentro de `contentElement`, em vez de cada tela
 * aparecer "nua" sem chrome compartilhado.
 *
 * Reaproveita exatamente os mesmos links que `control-panel.js` desenhava
 * inline (mesmo rótulo/opção) — a tela inicial deixa de desenhar seu próprio
 * `<nav>` porque este shell já cobre esse papel em toda tela, inclusive ela.
 *
 * Contrato deliberadamente mínimo, nenhum acoplamento a `kernel/*`: só fatos
 * de DOM, mesmo princípio de qualquer `createTemplate()` de
 * `templates/<nome>/index.js` — este shell NÃO é um Template de Site (não
 * implementa `createTemplate({root,positions,componentPosition})`), é
 * puramente a composição visual fixa do Administrator.
 *
 * @param {{ root: Element, activeOption?: string }} options
 * @returns {{ contentElement: Element, dispose(): void }}
 */
export const ADMINISTRATOR_NAV_LINKS = Object.freeze([
  ["com_cpanel", "Painel"],
  ["com_config", "Configuração global"],
  ["com_diagnostics", "Diagnóstico"],
  ["com_content", "Publicador"],
  ["com_extensions", "Extensões"],
  ["com_menus", "Menus"],
  ["com_modules", "Módulos"],
  ["com_templates", "Templates"],
  ["com_installer", "Instalador"]
]);

export function createAdministratorShell({ root, activeOption } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const document = root.ownerDocument;
  root.replaceChildren();
  root.classList.add("mse-administrator-shell");

  const header = document.createElement("header");
  header.className = "mse-administrator-shell__header";
  const brand = document.createElement("strong");
  brand.className = "mse-administrator-shell__brand";
  brand.textContent = "Administrator";
  header.append(brand);

  const body = document.createElement("div");
  body.className = "mse-administrator-shell__body";

  const nav = document.createElement("nav");
  nav.className = "mse-administrator-shell__nav";
  nav.setAttribute("aria-label", "Administração");
  for (const [option, label] of ADMINISTRATOR_NAV_LINKS) {
    const a = document.createElement("a");
    a.href = `#/administrator?option=${option}`;
    a.textContent = label;
    if (option === activeOption) a.setAttribute("aria-current", "page");
    nav.append(a);
  }

  const content = document.createElement("div");
  content.className = "mse-administrator-shell__content";

  body.append(nav, content);
  root.append(header, body);

  return {
    contentElement: content,
    dispose() {
      root.replaceChildren();
      root.classList.remove("mse-administrator-shell");
    }
  };
}
