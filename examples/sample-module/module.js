let roots = new WeakSet();

export function mount({ root, config = {}, context } = {}) {
  if (!root) throw new TypeError("root é obrigatório.");
  const heading = root.ownerDocument.createElement("h2");
  heading.textContent = config.title || "Módulo de exemplo";
  const description = root.ownerDocument.createElement("p");
  description.textContent = `Instância ${context.instanceId} montada pelo host ${context.host}.`;
  root.replaceChildren(heading, description);
  roots.add(root);
  return Object.freeze({ dispose: () => { root.replaceChildren(); roots.delete(root); } });
}

export function dispose() {
  roots = new WeakSet();
}
