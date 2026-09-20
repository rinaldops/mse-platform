import assert from "node:assert/strict";
import { createVideotecaReadService } from "../videoteca-data.js";

const items = [
  { Id: 1, Title: "WS0038 - Treinamento", FileRef: "/teams/td/VideotecaVideos/ws0038.mp4", CategoriaId: 11, Destaque: true, OrdemCarrossel: 20 },
  { Id: 2, Title: "WS0037 - Checklist", FileRef: "/teams/td/VideotecaVideos/ws0037.mp4", CategoriaId: 10, Destaque: true, OrdemCarrossel: 10 },
  { Id: 3, Title: "WS0036 - RTI", FileRef: "/teams/td/VideotecaVideos/ws0036.mp4", CategoriaId: 10, Destaque: false, OrdemCarrossel: 0 }
];
const taxonomy = [
  { Id: 10, Title: "SAP", Tipo: "Categoria", Cor: "#008542", Ordem: 10 },
  { Id: 11, Title: "Power Platform", Tipo: "Categoria", Ordem: 20 },
  { Id: 20, Title: "Power Platform", Tipo: "Tag", Ordem: 10 }
];
const relations = [{ VideoId: 2, TagId: 20 }];

const dataSources = {
  get: (key) => ({ key, listId: "194ee687-703d-4cea-93f1-2ecb0eb99466", webUrl: "/teams/td" }),
  getClient: () => ({
    request: async () => ({ data: { value: [{
      id: "drive-id",
      webUrl: "https://example.test/teams/td/VideotecaVideos",
      sharepointIds: { listId: "194ee687-703d-4cea-93f1-2ecb0eb99466" }
    }] } }),
    getListItems: async (source, options) => {
      if (source.key === "videoteca-taxonomy") return taxonomy;
      if (source.key === "videoteca-video-tags") return relations;
      assert.equal(source.key, "videoteca-videos");
      assert.equal(options.filter, "FSObjType eq 0 and Ativo eq 1");
      assert.ok(options.select.includes("Apresentadores/Title"));
      assert.equal(options.expand, "Apresentadores");
      return items;
    }
  })
};

const service = createVideotecaReadService({ dataSources });
const { featured, groups } = await service.listCatalog();

assert.equal(featured.length, 2);
assert.deepEqual(featured.map((v) => v.Id), [2, 1]);

assert.equal(groups.length, 2);
assert.equal(groups.find((g) => g.category === "SAP").videos.length, 2);
assert.equal(groups.find((g) => g.category === "SAP").color, "#008542");
assert.equal(groups.find((g) => g.category === "SAP").videos[0].CategoriaCor, "#008542");
assert.equal(groups.find((g) => g.category === "Power Platform").videos.length, 1);
assert.deepEqual(featured[0].Tags, ["Power Platform"]);
assert.equal(featured[0].URL, "/teams/td/VideotecaVideos/ws0037.mp4");
assert.match(groups.find((g) => g.category === "SAP").videos[0].Miniatura, /\/drives\/drive-id\//);
assert.match(groups.find((g) => g.category === "SAP").videos[0].Miniatura, /c1280x720\/content$/);

assert.throws(() => createVideotecaReadService({}), TypeError);

{
  const updates = [];
  const viewDataSources = {
    get: (key) => ({ key }),
    getClient: () => ({
      getListItem: async (source, id) => {
        assert.equal(source.key, "videoteca-videos");
        assert.equal(id, 2);
        return { item: { Id: 2, Visualizacoes: 4 }, etag: '"v-1"' };
      },
      updateListItem: async (source, id, values, options) => {
        updates.push({ source, id, values, options });
        return { item: null, etag: '"v-2"' };
      }
    })
  };
  const viewService = createVideotecaReadService({ dataSources: viewDataSources });
  assert.equal(await viewService.registerView(2), 2);
  assert.equal(updates[0].values.Visualizacoes, 5);
  assert.equal(updates[0].options.etag, '"v-1"');
  await assert.rejects(viewService.registerView(-1), TypeError);
}

console.log("videoteca-data.test.js: verificações concluídas com sucesso.");
