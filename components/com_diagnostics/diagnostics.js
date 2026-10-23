import { diagnoseAdministratorStructure } from "../../kernel/administrator-diagnostics.js";
import { queryEffectivePermissions } from "../../kernel/administrator-permissions.js";

function text(document, tag, value = "") { const node = document.createElement(tag); node.textContent = String(value); return node; }

/** Tela read-only de diagnóstico estrutural e permissões nativas do SharePoint. */
export function renderDiagnosticsScreen({ root, services = {} } = {}) {
  const document = root?.ownerDocument;
  if (!document) throw new TypeError("root é obrigatório.");
  const panel = document.createElement("section");
  panel.className = "mse-administrator__panel mse-administrator__diagnostics";
  panel.append(text(document, "h1", "Diagnóstico estrutural"));
  const summary = text(document, "p", "Carregando diagnóstico...");
  const list = document.createElement("ul");
  list.className = "mse-administrator__issues";
  panel.append(summary, list);
  const permissionHost = document.createElement("div");
  permissionHost.className = "mse-administrator__permissions";
  permissionHost.append(text(document, "h2", "Permissões efetivas"));
  panel.append(permissionHost);
  root.append(panel);

  const renderStructure = (source = {}) => {
    const result = diagnoseAdministratorStructure(source);
    summary.textContent = result.ok ? "Estrutura consistente." : `${result.issues.length} ponto(s) requer(em) atenção.`;
    summary.className = result.ok ? "mse-administrator__success" : "mse-administrator__error";
    if (list.replaceChildren) list.replaceChildren(); else list.children.length = 0;
    for (const issue of result.issues) {
      const item = text(document, "li", `[${issue.severity}] ${issue.message}`);
      item.className = `mse-administrator__issue mse-administrator__issue--${issue.severity === "error" ? "error" : "warning"}`;
      item.dataset.code = issue.code;
      list.append(item);
    }
  };
  const structurePromise = typeof services.loadAdministratorStructure === "function"
    ? services.loadAdministratorStructure()
    : Promise.resolve(services.structure ?? {});
  structurePromise.then(renderStructure).catch((error) => {
    summary.textContent = `Não foi possível carregar diagnóstico: ${error?.message || "erro desconhecido"}.`;
    summary.className = "mse-administrator__error";
  });

  const permissionClient = services.adminClient;
  const permissionList = services.listIds?.MSEConfiguracoes ?? services.listIds?.MSEMenu;
  if (!permissionClient || !permissionList || typeof permissionClient.getEffectiveBasePermissions !== "function") {
    permissionHost.append(text(document, "p", "Consulta de permissões não configurada."));
  } else {
    queryEffectivePermissions({ client: permissionClient, list: permissionList }).then((permissions) => {
      permissionHost.append(text(document, "p", `Leitura: ${permissions.canRead ? "sim" : "não"}; escrita: ${permissions.canWrite ? "sim" : "não"}; gerenciamento de listas: ${permissions.canManageLists ? "sim" : "não"}.`));
    }).catch((error) => {
      permissionHost.append(text(document, "p", `Não foi possível consultar permissões: ${error?.message || "erro desconhecido"}.`));
    });
  }
  return { dispose() { panel.remove(); } };
}