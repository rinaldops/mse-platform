// Nota (shell formal do Administrator, components/com_cpanel/
// administrator-shell.js): o shell passou a desenhar a navegação lateral
// persistente (visível em TODA tela do Administrator). Esta tela, porém,
// mantém seu próprio bloco de cards — equivalente aos "ícones rápidos"
// (`cpanel-modules`, grupos "Site"/"System") do painel inicial do Joomla!
// real: mesmas opções da barra lateral, mas como atalhos grandes/clicáveis
// na própria tela inicial, papel que a barra lateral (estreita, texto
// corrido) não substitui.
// Regressão 22/10/2026: este bloco de cards tinha sido removido daqui ao
// introduzir o shell, com a suposição incorreta de que a navegação lateral
// já cobria esse papel — restaurado.
//
// Redesenho visual (ver docs/PROMPT-REDESIGN-VISUAL-ADMINISTRATOR.md):
// cada card ganhou um ícone (reaproveita exatamente os mesmos SVGs inline
// de administrator-shell.js, pela mesma opção) e uma frase curta de
// descrição — só marcação/apresentação nova, nenhum link adicionado além
// dos 8 que já existiam (todas as opções de ADMINISTRATOR_NAV_LINKS exceto
// com_cpanel, exatamente como antes).
//
// Agrupamento por categoria (24/10/2026 — fidelidade estrutural ao
// Joomla! real): o painel inicial do `atum` real agrupa os cards em
// blocos com cabeçalho ("Site", "System"), não uma grade plana única.
// Esta tela passa a reaproveitar EXATAMENTE os mesmos grupos
// (`ADMINISTRATOR_NAV_GROUPS`) e rótulos (`ADMINISTRATOR_NAV_LINKS`) que
// o shell usa na sidebar — fonte única de verdade, nenhuma lista
// duplicada — mas como blocos de cards com cabeçalho, em vez de uma
// navegação de texto corrido. Isso resolve a percepção de "dois menus
// com os mesmos itens repetidos" relatada pelo usuário nesta rodada: a
// sidebar e os cards agora contam a MESMA hierarquia de categorias, só em
// dois formatos (texto compacto vs. atalho grande), exatamente como no
// Joomla! real (sidebar `atum` vs. cards do `com_cpanel`).
import { ADMINISTRATOR_NAV_LINKS, ADMINISTRATOR_NAV_GROUPS } from "./administrator-shell.js";
import { ADMINISTRATOR_NAV_ICON_PATHS } from "./administrator-shell.js";

const CARD_DESCRIPTIONS = Object.freeze({
  com_config: "Ajustes globais de layout, tema e comportamento do site.",
  com_diagnostics: "Verifica a saúde estrutural do site e permissões efetivas.",
  com_content: "Cria, edita e publica artigos do site.",
  com_categories: "Organiza o conteúdo em categorias hierárquicas.",
  com_extensions: "Gerencia componentes, módulos, plugins e templates instalados.",
  com_menus: "Organiza os itens de menu e a navegação do site.",
  com_modules: "Posiciona e configura instâncias de módulo nas páginas.",
  com_templates: "Escolhe o template ativo do site.",
  com_installer: "Inspeciona, verifica e aplica o provisionamento das listas do kernel."
});

function cardIcon(document, option) {
  const paths = ADMINISTRATOR_NAV_ICON_PATHS[option];
  if (!paths) return null;
  const span = document.createElement("span");
  span.className = "mse-administrator__card-icon";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return span;
}

function createCard(document, option, label) {
  const a = document.createElement("a");
  a.className = "mse-administrator__card";
  a.href = `#/administrator?option=${option}`;
  const icon = cardIcon(document, option);
  if (icon) a.append(icon);
  const heading = document.createElement("strong");
  heading.className = "mse-administrator__card-title";
  heading.textContent = label;
  a.append(heading);
  const description = CARD_DESCRIPTIONS[option];
  if (description) {
    const descriptionNode = document.createElement("span");
    descriptionNode.className = "mse-administrator__card-description";
    descriptionNode.textContent = description;
    a.append(descriptionNode);
  }
  return a;
}

export function renderControlPanel({ root } = {}) {
  const document = root.ownerDocument;
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel";
  const title = document.createElement("h1");
  title.textContent = "Administrator";
  const intro = document.createElement("p");
  intro.className = "mse-administrator__hint";
  intro.textContent = "Painel de administração do Mini Joomla!";
  panel.append(title, intro);

  const labelByOption = new Map(ADMINISTRATOR_NAV_LINKS);
  for (const group of ADMINISTRATOR_NAV_GROUPS) {
    const section = document.createElement("section");
    section.className = "mse-administrator__card-group";
    const heading = document.createElement("h2");
    heading.className = "mse-administrator__card-group-title";
    heading.textContent = group.label;
    const nav = document.createElement("nav");
    nav.className = "mse-administrator__cards";
    nav.setAttribute("aria-label", group.label);
    for (const option of group.options) {
      const label = labelByOption.get(option);
      if (label == null) continue;
      nav.append(createCard(document, option, label));
    }
    section.append(heading, nav);
    panel.append(section);
  }

  root.append(panel);
  return { dispose() { panel.remove(); } };
}
