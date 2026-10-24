/**
 * Esquema declarativo da lista MSEMedia (Site Kernel) — componente
 * `components/com_media/` do Administrator.
 *
 * MSEMedia ≈ diretório de mídia do Joomla! real (`images/`): aqui modelado
 * como uma BIBLIOTECA de documentos do SharePoint (`template: 101`, não
 * uma lista genérica `100`), diferente de MSEExtensions/MSEModules/MSEMenu
 * — cada arquivo enviado é, ao mesmo tempo, um documento na
 * `RootFolder/Files` e um item de lista com metadados (ver
 * `core/rest.js#uploadFile`, `core/list-provisioning.js#defineListSchema`,
 * que exige `readSecurity`/`writeSecurity` 1/1 para `template === 101`).
 *
 * Nome/tamanho/URL do arquivo já vêm de campos nativos do SharePoint
 * (`FileLeafRef`, `FileRef`, `File_x0020_Size`) — não redeclarados aqui,
 * mesmo princípio de `modules/mod_videoteca/videoteca-schema.js#VideotecaVideos`
 * (também `template: 101`), que também não duplica esses campos nativos.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_MEDIA_SCHEMA = defineListSchema({
  key: "mse-media",
  internalName: "MSEMedia",
  displayName: "MSE Media",
  description: "Biblioteca de documentos usada pelo gerenciador de mídia do Administrator (component com_media).",
  template: 101,
  readSecurity: 1,
  writeSecurity: 1,
  // Arquivos podem não ter título customizado além do nome do próprio
  // arquivo — mesmo padrão de VideotecaVideos.titleField.
  titleField: { displayName: "Título", required: false, indexed: true },
  fields: [
    {
      internalName: "AltText",
      displayName: "Texto alternativo",
      type: "Text",
      maxLength: 255
      // Texto alternativo para imagens — ≈ atributo `alt` do HTML.
    },
    {
      internalName: "Description",
      displayName: "Descrição",
      type: "Note",
      lines: 3
    }
  ]
});
