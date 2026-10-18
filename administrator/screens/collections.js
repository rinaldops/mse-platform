export function renderCollectionScreen({ root, route, services = {} } = {}) {
  const document = root.ownerDocument; const panel=document.createElement("section"); panel.className="mse-administrator__panel"; const h=document.createElement("h1"); h.textContent=labels[route.option] || "Administrator"; const p=document.createElement("p"); p.textContent=services.status || "A tela está preparada para receber a fonte SharePoint correspondente."; panel.append(h,p); root.append(panel); return { dispose() { panel.remove(); } };
}
const labels={com_config:"Configuração global",com_extensions:"Extensões",com_menus:"Menus",com_modules:"Módulos",com_installer:"Instalador"};
