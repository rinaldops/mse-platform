import assert from "node:assert/strict";
import { readMediaService, parseExtensions, filterImagesByExtension, pickRandomImage } from "../random-data.js";

// --- readMediaService --------------------------------------------------------

{
  assert.throws(() => readMediaService({}), TypeError);
  assert.throws(() => readMediaService({ adminClient: { getListItems() {} } }), TypeError);

  const service = readMediaService({
    adminClient: { async getListItems() { return []; } },
    listIds: { MSEMedia: { listId: "guid-fake" } }
  });
  assert.equal(typeof service.listMedia, "function");
  console.log("random-data.test.js: readMediaService valida e resolve o serviço ok.");
}

{
  const calls = [];
  const service = readMediaService({
    adminClient: {
      async getListItems(list, options) {
        calls.push({ list, options });
        return [{ Id: 1, FileLeafRef: "foto.png" }];
      }
    },
    listIds: { MSEMedia: { listId: "guid-fake" } }
  });
  const items = await service.listMedia();
  assert.deepEqual(items, [{ Id: 1, FileLeafRef: "foto.png" }]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].list, { listId: "guid-fake" });
  assert.deepEqual(calls[0].options.select, ["Id", "FileLeafRef", "FileRef", "AltText", "Description"]);
  console.log("random-data.test.js: listMedia delega a listAdminItems com os campos corretos ok.");
}

// --- parseExtensions ----------------------------------------------------------

{
  assert.deepEqual(parseExtensions("jpg,jpeg,png"), ["jpg", "jpeg", "png"]);
  assert.deepEqual(parseExtensions(" JPG , .PNG ,gif "), ["jpg", "png", "gif"]);
  assert.deepEqual(parseExtensions(""), []);
  assert.deepEqual(parseExtensions(undefined), []);
  console.log("random-data.test.js: parseExtensions normaliza espaços/caixa/ponto ok.");
}

// --- filterImagesByExtension ---------------------------------------------------

{
  const items = [
    { Id: 1, FileLeafRef: "foto.png" },
    { Id: 2, FileLeafRef: "documento.pdf" },
    { Id: 3, FileLeafRef: "banner.JPG" },
    { Id: 4, FileLeafRef: "sem-extensao" }
  ];
  const result = filterImagesByExtension(items, "png,jpg");
  assert.deepEqual(result.map((item) => item.Id), [1, 3]);
  console.log("random-data.test.js: filterImagesByExtension filtra case-insensitive e ignora sem extensão ok.");
}

{
  assert.deepEqual(filterImagesByExtension(undefined, "png"), []);
  assert.deepEqual(filterImagesByExtension([{ Id: 1, FileLeafRef: "foto.png" }], ""), []);
  console.log("random-data.test.js: filterImagesByExtension tolera lista ausente/extensões vazias ok.");
}

// --- pickRandomImage -----------------------------------------------------------

{
  assert.equal(pickRandomImage([]), null);
  assert.equal(pickRandomImage(undefined), null);
  console.log("random-data.test.js: pickRandomImage devolve null sem imagens ok.");
}

{
  const images = [{ Id: 1 }, { Id: 2 }, { Id: 3 }];
  assert.deepEqual(pickRandomImage(images, { random: () => 0 }), images[0]);
  assert.deepEqual(pickRandomImage(images, { random: () => 0.9999 }), images[2]);
  assert.deepEqual(pickRandomImage(images, { random: () => 0.5 }), images[1]);
  console.log("random-data.test.js: pickRandomImage respeita random injetável (determinístico) ok.");
}

console.log("random-data.test.js: verificações concluídas com sucesso.");
