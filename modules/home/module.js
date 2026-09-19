import { createHomeView } from "./home-view.js";

export function normalizeSections(sections = []) {
  if (!Array.isArray(sections)) throw new TypeError("home.sections deve ser uma lista.");
  const ids = new Set();
  return Object.freeze(sections.map((section, index) => {
    const id = String(section?.id || "").trim();
    const moduleId = String(section?.moduleId || "").trim();
    const instanceId = String(section?.instanceId || "").trim();
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || ids.has(id)) throw new TypeError(`Seção inválida na posição ${index}.`);
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(moduleId) || !/^[a-z][a-z0-9-]{0,127}$/.test(instanceId)) {
      throw new TypeError(`Módulo ou instância inválida na seção ${id}.`);
    }
    ids.add(id);
    return Object.freeze({ id, moduleId, instanceId, enabled: section.enabled !== false });
  }).filter((section) => section.enabled));
}

export function sectionsFromSlots(slots = {}) {
  return [1, 2, 3].map((position) => {
    const slot = slots[position] ?? slots[String(position)] ?? {};
    return {
      id: `summary-${position}`,
      moduleId: slot.moduleId,
      instanceId: slot.instanceId,
      enabled: slot.enabled !== false
    };
  }).filter((section) => section.moduleId && section.instanceId);
}

export async function mount({ root, services, config = {} } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root é obrigatório.");
  const mountSummary = services?.host?.mountSummary;
  if (typeof mountSummary !== "function") throw new TypeError("services.host.mountSummary é obrigatório.");
  const disposeHero = createHomeView({ root, stats: config.home?.stats, content: config.home?.content });
  const disposers = [];
  const sections = normalizeSections(config.home?.sections ?? sectionsFromSlots(config.home?.slots));

  for (const section of sections) {
    const host = root.ownerDocument.createElement("section");
    host.dataset.mseSummary = section.moduleId;
    host.dataset.mseInstance = section.instanceId;
    root.append(host);
    try {
      const mounted = await mountSummary({ root: host, ...section });
      if (typeof mounted?.dispose === "function") disposers.push(mounted.dispose);
    } catch {
      host.textContent = "Este conteúdo está temporariamente indisponível.";
      host.dataset.status = "error";
    }
  }

  return Object.freeze({
    dispose() {
      disposers.reverse().forEach((dispose) => dispose());
      disposeHero?.();
      root.replaceChildren();
    }
  });
}

export function dispose() {}
