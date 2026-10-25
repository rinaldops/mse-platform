import { defineSettingsSchema } from "../../core/module-contract.js";

/**
 * Esquema de settings do `mod_random_image`, adaptado de
 * `mod_random_image.xml` do Joomla! real (ver cabeçalho de `random-data.js`
 * para a correspondência completa de cada campo e o que ficou fora do MVP).
 *
 * `folder` (Joomla! real: pasta do sistema de arquivos a varrer) fica FORA
 * do MVP: `MSEMedia` (ver `kernel/schemas/mse-media.js`) é uma biblioteca
 * única e plana (mesmo princípio de `components/com_media`), sem conceito
 * de subpastas — não há "pasta" para configurar aqui.
 *
 * `width`/`height` (Joomla! real: calculados com base nas dimensões REAIS
 * do arquivo no disco via `getimagesize`, preservando proporção) ficam
 * fora do MVP: `MSEMedia` não declara campos de dimensão da imagem (ver
 * `kernel/schemas/mse-media.js`) — não há como calcular a proporção real
 * aqui. Este módulo expõe só `maxWidth` (limite de exibição via CSS
 * `max-width`, sem cálculo de proporção).
 *
 * `layout`/`moduleclass_sfx` (Joomla! real) ficam fora do MVP: não há
 * mecanismo de layout alternativo no Site Kernel hoje — mesmo limite já
 * assumido por `mod_tags_popular`/`mod_tags_similar`/`mod_related_items`.
 */
export const RANDOM_IMAGE_SETTINGS_SCHEMA = defineSettingsSchema({
  version: 1,
  groups: [
    {
      id: "random-image",
      label: "Imagem aleatória",
      fields: [
        { id: "extensions", type: "text", label: "Extensões aceitas (separadas por vírgula)", default: "jpg,jpeg,png,gif,webp" },
        { id: "link", type: "text", label: "URL de destino ao clicar na imagem (opcional)", default: "" },
        { id: "maxWidth", type: "number", label: "Largura máxima de exibição (px)", default: 200, min: 1 },
        { id: "noImageText", type: "text", label: "Texto quando não há imagens", default: "Nenhuma imagem disponível." }
      ]
    }
  ]
});

export default RANDOM_IMAGE_SETTINGS_SCHEMA;
