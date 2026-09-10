import assert from "node:assert/strict";
import { createVideotecaReadService } from "../videoteca-data.js";

const items = [
  { Id: 1, Title: "WS0038 - Treinamento", Categoria: "Power Platform", Destaque: true, OrdemCarrossel: 20 },
  { Id: 2, Title: "WS0037 - Checklist", Categoria: "SAP", Destaque: true, OrdemCarrossel: 10 },
  { Id: 3, Title: "WS0036 - RTI", Categoria: "SAP", Destaque: false, OrdemCarrossel: 0 }
];

const dataSources = {
  get: (key) => ({ key }),
  getClient: () => ({
    getListItems: async (source, options) => {
      assert.equal(source.key, "videoteca-videos");
      assert.equal(options.filter, "Ativo eq 1");
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
assert.equal(groups.find((g) => g.category === "Power Platform").videos.length, 1);

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
