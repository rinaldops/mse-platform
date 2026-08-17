function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function errorMessage(error) {
  if (error?.code === "access-denied") return "Você não possui acesso aos links deste site.";
  return "Não foi possível carregar os recursos. Tente novamente em instantes.";
}

function renderGroup(document, group, { onToggle }) {
  const details = element(document, "details", "mse-recursos__group");
  const summary = element(document, "summary", "mse-recursos__group-title");
  summary.append(
    element(document, "span", null, group.category),
    element(document, "span", "mse-recursos__group-count", String(group.links.length))
  );
  details.append(summary);

  const list = element(document, "ul", "mse-recursos__links");
  for (const link of group.links) {
    const item = element(document, "li", "mse-recursos__link");
    const anchor = element(document, "a", "mse-recursos__link-anchor");
    anchor.href = link.URL;
    if (link.AbrirNovaJanela) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    anchor.append(element(document, "span", "mse-recursos__link-title", link.Title));
    if (link.Descricao) {
      anchor.append(element(document, "span", "mse-recursos__link-description", link.Descricao));
    }
    item.append(anchor);
    list.append(item);
  }
  details.append(list);

  details.addEventListener("toggle", () => {
    if (details.open) onToggle(details);
  });

  return details;
}

export function createRecursosView({ root, service } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listGroupedLinks !== "function") {
    throw new TypeError("service deve implementar listGroupedLinks().");
  }

  const document = root.ownerDocument;
  let disposed = false;

  function closeOthers(openDetails) {
    for (const details of root.querySelectorAll(".mse-recursos__group")) {
      if (details !== openDetails) details.open = false;
    }
  }

  async function render() {
    root.replaceChildren(element(document, "p", "mse-recursos__status", "Carregando recursos..."));
    let groups;
    try {
      groups = await service.listGroupedLinks();
    } catch (error) {
      if (disposed) return;
      root.replaceChildren(element(document, "p", "mse-recursos__status mse-recursos__status--error", errorMessage(error)));
      return;
    }
    if (disposed) return;

    if (!groups.length) {
      root.replaceChildren(element(document, "p", "mse-recursos__status", "Nenhum recurso publicado ainda."));
      return;
    }

    const container = element(document, "div", "mse-recursos__accordion");
    groups.forEach((group, index) => {
      const details = renderGroup(document, group, { onToggle: closeOthers });
      if (index === 0) details.open = true;
      container.append(details);
    });
    root.replaceChildren(container);
  }

  render();

  return () => {
    disposed = true;
  };
}
