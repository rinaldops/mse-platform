import { mountAccordion } from "../ui/accordion/accordion.js";

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

function renderLinks(group, index, document) {
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
  return list;
}

export function createRecursosView({ root, service } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento do DOM.");
  if (!service || typeof service.listGroupedLinks !== "function") {
    throw new TypeError("service deve implementar listGroupedLinks().");
  }

  const document = root.ownerDocument;
  let disposed = false;

  let accordion = null;

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
    accordion = mountAccordion({
      root: container,
      items: groups,
      initiallyOpen: 0,
      itemClass: "mse-recursos__group",
      buttonClass: "mse-recursos__group-title",
      panelClass: "mse-recursos__group-panel",
      renderTitle(group, index, ownerDocument) {
        return [
          element(ownerDocument, "span", null, group.category),
          element(ownerDocument, "span", "mse-recursos__group-count", String(group.links.length))
        ];
      },
      renderContent: renderLinks
    });
    root.replaceChildren(container);
  }

  render();

  return () => {
    disposed = true;
    accordion?.destroy();
    root.replaceChildren();
  };
}
