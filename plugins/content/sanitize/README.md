# plg-content-sanitize

Plugin do grupo `content` para sanitização de HTML.

## Objetivo

Garantir que campos HTML (ex.: resumo e corpo) sejam **transformados em HTML
seguro** antes da renderização/persistência.

## Contrato

- Arquivo de entrada: `plg-content-sanitize.js`
- Manifeste (Joomla-like): `manifest.js` (`type: "plugin"`)
- Eventos:
  - `onAfterRoute`
  - `onBeforeRender`

Payload/Context esperado:

```js
{
  content: {
    summaryHtml?: string,
    bodyHtml?: string
  },
  sanitizeRichText?: (html, { documentImpl, baseUrl }) => string,
  documentImpl?: Document,
  baseUrl?: string
}
```

## Observações

- Não depende de loader global de plugins; pode ser executado manualmente via
  `kernel/events.js#createEventBus()`.

