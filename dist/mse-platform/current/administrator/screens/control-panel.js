export function renderControlPanel({ root } = {}) {
  const document = root.ownerDocument; const panel = document.createElement("section"); panel.className = "mse-administrator__panel";
  const title = document.createElement("h1"); title.textContent = "Administrator";
  const intro = document.createElement("p"); intro.textContent = "Painel de administração do Mini Joomla!";
  const nav = document.createElement("nav"); nav.setAttribute("aria-label", "Administração");
  [["com_config", "Configuração global"], ["com_content", "Publicador"], ["com_extensions", "Extensões"], ["com_menus", "Menus"], ["com_modules", "Módulos"], ["com_installer", "Instalador"]].forEach(([option, label]) => { const a=document.createElement("a"); a.href=`#/administrator?option=${option}`; a.textContent=label; nav.append(a); });
  panel.append(title, intro, nav); root.append(panel); return { dispose() { panel.remove(); } };
}
