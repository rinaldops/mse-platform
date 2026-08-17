import assert from "node:assert/strict";
import { createRecursosReadService } from "../recursos-data.js";

const items = [
  { Id: 1, Title: "Power Automate 101", URL: "https://a", Categoria: "Power Platform", Ordem: 10 },
  { Id: 2, Title: "Power BI dicas", URL: "https://b", Categoria: "Power Platform", Ordem: 20 },
  { Id: 3, Title: "SAP Scripting docs", URL: "https://c", Categoria: "SAP", Ordem: 10 }
];

const dataSources = {
  get: (key) => ({ key }),
  getClient: () => ({
    getListItems: async (source, options) => {
      assert.equal(source.key, "recursos-links");
      assert.equal(options.filter, "Ativo eq 1");
      return items;
    }
  })
};

const service = createRecursosReadService({ dataSources });
const groups = await service.listGroupedLinks();

assert.equal(groups.length, 2);
assert.equal(groups[0].category, "Power Platform");
assert.equal(groups[0].links.length, 2);
assert.equal(groups[1].category, "SAP");
assert.equal(groups[1].links.length, 1);

assert.throws(() => createRecursosReadService({}), TypeError);

console.log("recursos-data.test.js: verificações concluídas com sucesso.");
