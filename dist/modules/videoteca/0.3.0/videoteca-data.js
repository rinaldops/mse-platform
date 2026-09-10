const VIDEO_FIELDS = [
  "Id", "Title", "URL", "Categoria", "Apresentador", "Data",
  "Duracao", "Miniatura", "Descricao", "Destaque", "OrdemCarrossel", "Visualizacoes"
];

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new TypeError(`${label} deve ser um inteiro positivo.`);
  return number;
}

function groupByCategory(items) {
  const groups = new Map();
  for (const item of items) {
    const category = item.Categoria || "Outros";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  return [...groups.entries()].map(([category, videos]) => ({ category, videos }));
}

export function createVideotecaReadService({ dataSources } = {}) {
  if (!dataSources || typeof dataSources.get !== "function" || typeof dataSources.getClient !== "function") {
    throw new TypeError("dataSources deve ser um registro de fontes do núcleo.");
  }

  async function listAllActive() {
    const source = dataSources.get("videoteca-videos");
    return dataSources.getClient("videoteca-videos").getListItems(source, {
      select: VIDEO_FIELDS,
      filter: "Ativo eq 1",
      orderBy: "Data desc,Id desc",
      top: 500
    });
  }

  async function listCatalog() {
    const items = await listAllActive();
    const featured = items
      .filter((item) => item.Destaque)
      .sort((a, b) => (a.OrdemCarrossel ?? 0) - (b.OrdemCarrossel ?? 0));
    return { featured, groups: groupByCategory(items) };
  }

  async function registerView(videoId) {
    const id = positiveInteger(videoId, "videoId");
    const source = dataSources.get("videoteca-videos");
    const client = dataSources.getClient("videoteca-videos");
    const current = await client.getListItem(source, id, { select: ["Id", "Visualizacoes"] });
    if (!current.item) return null;
    await client.updateListItem(
      source,
      id,
      { Visualizacoes: Number(current.item.Visualizacoes ?? 0) + 1 },
      { etag: current.etag }
    );
    return id;
  }

  return Object.freeze({ listCatalog, registerView });
}
