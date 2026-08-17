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

console.log("videoteca-data.test.js: verificações concluídas com sucesso.");
