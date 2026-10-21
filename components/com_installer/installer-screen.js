/**
 * Tela do Administrator para `option=com_installer` — Instalador do kernel
 * mini-Joomla! (ver `kernel/installer.js#createKernelInstaller`).
 *
 * Inspeção e verificação são sempre somente leitura; aplicar o
 * provisionamento exige confirmação explícita em dois pontos: antes de
 * iniciar (`globalThis.confirm` genérico) e de novo por item do plano, via
 * o callback `confirm(plan)` que `kernel/installer.js`/
 * `core/list-provisioning.js#provisionLists` exigem antes de qualquer
 * escrita real no SharePoint — mesmo princípio de "nenhuma escrita sem
 * confirmação visível" de `docs/PROMPT-CRUD-SHAREPOINT.md`.
 *
 * `services.kernelInstaller` é injetado por
 * `host-adapters/modern-script-editor/site-boot.js#buildAdministratorServices`
 * (`createKernelInstaller({ client })`). Diferente do antigo
 * `administrator/screens/installer.js` (pré-normalização), esta tela não
 * precisa suportar o contrato legado "instalador modular por `moduleId`"
 * (`admin/installer.js`): esse é o modelo antigo de 1 MSE por módulo, fora
 * do escopo do Site Kernel/Administrator.
 *
 * @param {{ root: Element, services?: object }} options
 * @returns {{ dispose(): void }}
 */

function node(document, tag, text = "") { const value = document.createElement(tag); value.textContent = String(text); return value; }
function bind(target, handler) { if (typeof target.addEventListener === "function") target.addEventListener("click", handler); else target.onclick = handler; }

export function renderInstallerScreen({ root, services = {} } = {}) {
  const document = root?.ownerDocument;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section"); panel.className = "mse-administrator__panel mse-administrator__installer";
  const error = node(document, "p"); error.className = "mse-administrator__error";
  const output = document.createElement("pre"); output.className = "mse-administrator__installer-output";
  const toolbar = document.createElement("div");
  const inspectButton = node(document, "button", "Inspecionar listas");
  const verifyButton = node(document, "button", "Verificar listas");
  const applyButton = node(document, "button", "Aplicar provisionamento");
  toolbar.append(inspectButton, verifyButton, applyButton);
  panel.append(
    node(document, "h1", "Instalador"),
    node(document, "p", "Inspeção e verificação são somente leitura. Aplicar exige confirmação explícita."),
    error,
    toolbar,
    output
  );
  root.append(panel);

  const installer = services.kernelInstaller;
  const renderResult = (value) => { output.textContent = JSON.stringify(value, null, 2); };

  async function run(operation, { confirmPlan } = {}) {
    error.textContent = "";
    try {
      if (!installer || typeof installer[operation] !== "function") {
        throw new Error("Serviço de instalador do kernel (kernelInstaller) não configurado.");
      }
      const result = operation === "apply" ? await installer.apply(confirmPlan) : await installer[operation]();
      renderResult(result);
    } catch (cause) {
      error.textContent = `Falha no instalador: ${cause?.message || "erro desconhecido"}`;
    }
  }

  bind(inspectButton, () => run("inspect"));
  bind(verifyButton, () => run("verify"));
  bind(applyButton, async () => {
    if (!globalThis.confirm?.("Aplicar o provisionamento das listas do kernel?")) return;
    const confirmPlan = async (plan) => globalThis.confirm?.(`Aplicar este plano?\n\n${JSON.stringify(plan, null, 2)}`) === true;
    await run("apply", { confirmPlan });
  });

  return { dispose() { panel.remove(); } };
}
