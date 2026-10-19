function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = String(text); return value; }
function bind(target, handler) { if (typeof target.addEventListener === "function") target.addEventListener("click", handler); else target.onclick = handler; }

/** Tela do instalador: inspeção/verificação são read-only; apply exige ação explícita. */
export function renderInstallerScreen({ root, services = {} } = {}) {
  const document = root?.ownerDocument;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__installer";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const output = document.createElement("pre"); output.className = "mse-administrator__installer-output";
  const toolbar = document.createElement("div"); const inspect = node(document, "button", "Inspecionar listas"); const verify = node(document, "button", "Verificar listas"); const apply = node(document, "button", "Aplicar provisionamento"); toolbar.append(inspect, verify, apply);
  panel.append(node(document, "h1", "Instalador"), node(document, "p", "Inspeção e verificação são somente leitura. Aplicar exige confirmação explícita."), error, toolbar, output); root.append(panel);
  const installer = services.installer;
  const moduleId = services.installerModuleId || "administrator";
  const renderResult = (value) => { output.textContent = JSON.stringify(value, null, 2); };
  const run = async (operation) => { error.textContent = ""; try { if (!installer || typeof installer[operation] !== "function") throw new Error("Serviço de instalador não configurado."); renderResult(await installer[operation](moduleId)); } catch (cause) { error.textContent = `Falha no instalador: ${cause?.message || "erro desconhecido"}`; } };
  bind(inspect, () => run("inspect")); bind(verify, () => run("verify")); bind(apply, async () => { if (!globalThis.confirm?.("Aplicar o provisionamento das listas do Administrator?")) return; await run("apply"); });
  return { dispose() { panel.remove(); } };
}
