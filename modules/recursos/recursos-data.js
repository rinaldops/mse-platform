const LINK_FIELDS = ["Id", "Title", "URL", "Categoria", "Descricao", "IconeChave", "Ordem", "AbrirNovaJanela"];

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const category = item.Categoria || "Outros";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups.entries()].map(([category, links]) => ({ category, links }));
}

export function createRecursosReadService({ dataSources } = {}) {
  if (!dataSources || typeof dataSources.get !== "function" || typeof dataSources.getClient !== "function") {
    throw new TypeError("dataSources deve ser um registro de fontes do núcleo.");
  }

  async function listGroupedLinks() {
    const source = dataSources.get("recursos-links");
    const items = await dataSources.getClient("recursos-links").getListItems(source, {
      select: LINK_FIELDS,
      filter: "Ativo eq 1",
      orderBy: "Categoria asc,Ordem asc,Title asc",
      top: 500
    });
    return groupByCategory(items);
  }

  return Object.freeze({ listGroupedLinks });
}
