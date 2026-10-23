// Nota (shell formal do Administrator, components/com_cpanel/
// administrator-shell.js): o shell passou a desenhar a navegação lateral
// persistente (visível em TODA tela do Administrator). Esta tela, porém,
// mantém seu próprio `<nav>` de cards — equivalente aos "ícones rápidos" do
// painel inicial do Joomla! real (`com_cpanel`): mesmas opções da barra
// lateral, mas como atalhos grandes/clicáveis na própria tela inicial,
// papel que a barra lateral (estreita, texto corrido) não substitui.
// Regressão 22/10/2026: este `<nav>` tinha sido removido daqui ao
// introduzir o shell, com a suposição incorreta de que a navegação lateral
// já cobria esse papel — restaurado.
import { ADMINISTRATOR_NAV_LINKS } from "./administrator-shell.js";

export function renderControlPanel({ root } = {}) {
  const document = root.ownerDocument; const panel = document.createElement("section"); panel.className = "mse-administrator__panel";
  const title = document.createElement("h1"); title.textContent = "Administrator";
  const intro = document.createElement("p"); intro.textContent = "Painel de administração do Mini Joomla!";
  const nav = document.createElement("nav"); nav.setAttribute("aria-label", "Administração");
  ADMINISTRATOR_NAV_LINKS.filter(([option]) => option !== "com_cpanel").forEach(([option, label]) => { const a=document.createElement("a"); a.href=`#/administrator?option=${option}`; a.textContent=label; nav.append(a); });
  panel.append(title, intro, nav); root.append(panel); return { dispose() { panel.remove(); } };
}
