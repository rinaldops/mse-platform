/**
 * Esquema declarativo da lista MSETemplateStyles (Site Kernel).
 *
 * MSETemplateStyles ≈ Joomla! #__template_styles: um registro por "estilo"
 * de template instalado — qual `Template` (pasta/pacote), para qual
 * `ClientId` ("Site" ≈ `client_id=0`/"Administrator" ≈ `client_id=1`), e se é
 * o `Home` (≈ `home`) — o estilo ativo-padrão para aquele client. O
 * `Title` nativo do item é o nome amigável do estilo (ex.: "CAMAP-AGP —
 * Tema 1"), mesmo papel do `Joomla! #__template_styles.title`.
 *
 * Trazido ao escopo junto com o mecanismo de Templates instaláveis/fallback
 * (ver `kernel/template-registry.js`, `host-adapters/modern-script-editor/
 * site-boot.js#createTemplateLayoutResolver`): antes desta lista, o template
 * ativo do site era só um campo texto solto, `MSEConfiguracoes.Tema`
 * (escopo Global) — sem registro de QUAIS templates estão instalados, sem
 * conceito de "estilo", sem separação Site/Administrator. `site-boot.js`
 * passa a resolver o template ativo a partir desta lista (`ClientId="Site"`,
 * `Home=true`), mantendo `MSEConfiguracoes.Tema` como fallback de
 * compatibilidade enquanto a lista nova não tiver uma linha `Home=true`
 * (migração suave — ver `tools/migrate-create-template-styles.js`).
 *
 * Segue o mesmo formato de `defineListSchema` em `core/list-provisioning.js`
 * já usado por `kernel/schemas/mse-extensions.js`/`mse-modules.js`: objeto
 * normalizado/congelado com `key`, `internalName`, `displayName`,
 * `titleField` e `fields[]`.
 */

import { defineListSchema } from "../../core/list-provisioning.js";

export const MSE_TEMPLATE_STYLES_SCHEMA = defineListSchema({
  key: "mse-template-styles",
  internalName: "MSETemplateStyles",
  displayName: "MSE Template Styles",
  titleField: { displayName: "Title", required: true, indexed: false, unique: false },
  fields: [
    {
      internalName: "Template",
      displayName: "Template",
      type: "Text",
      required: true,
      indexed: true,
      maxLength: 128
      // ≈ #__template_styles.template. Nome técnico do pacote (ex.:
      // "camap-tema-01", "mse-default", "system") — mesma convenção de
      // pasta de kernel/installer.js e MSEExtensions.Element quando
      // Type === "Template".
    },
    {
      internalName: "ClientId",
      displayName: "Client",
      type: "Choice",
      required: true,
      indexed: true,
      choices: ["Site", "Administrator"],
      defaultValue: "Site"
      // ≈ #__template_styles.client_id (0=site/1=administrator). Usa texto
      // em vez do inteiro 0/1 do Joomla! original pelo mesmo motivo de
      // MSEModules.Published usar texto em vez de código numérico: Choice
      // field do SharePoint é mais legível/editável por um gestor.
    },
    {
      internalName: "Home",
      displayName: "Default style",
      type: "Boolean",
      required: true,
      indexed: true,
      defaultValue: false
      // ≈ #__template_styles.home. true = este é o estilo ativo-padrão
      // para o ClientId correspondente. Deve haver no máximo 1 linha com
      // Home=true por ClientId — invariante aplicado pela tela
      // com_templates (kernel/template-registry.js não impõe isso: é uma
      // função pura de leitura, não de escrita).
      //
      // Divergência de tipo/propósito vs. Joomla! real (documentada, não
      // corrigida — ver docs/AUDITORIA-JOOMLA-PENTE-FINO.md §3):
      // `#__template_styles.home` é `char(7)` com uso DUAL — `'0'`/`'1'`
      // (não é/é o padrão) OU um código de idioma (ex. `'pt-BR'`), para
      // templates específicos de uma língua num site multi-idioma. Aqui é
      // só `Boolean` — o mse-platform não tem, hoje, nenhum conceito de
      // multi-idioma por site (nenhum campo `language` em
      // MSEMenu/MSEModules/MSETemplateStyles), então não há "padrão para
      // este idioma" a representar; `Boolean` puro é mais claro/seguro que
      // introduzir um texto dual sem suporte real a idioma por trás.
    },
    {
      internalName: "ParamsJson",
      displayName: "Parameters (JSON)",
      type: "Note",
      required: false,
      lines: 8
      // Reservado para parâmetros de template por estilo (ex.: variações de
      // cor), análogo a #__template_styles.params. Não consumido hoje por
      // nenhum template real — só reserva de campo, mesma convenção de
      // ParamsJson em MSEModules/MSEExtensions.
    }
  ]
});
