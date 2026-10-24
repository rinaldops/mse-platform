# Rodapé

Módulo de posição config-driven que renderiza o rodapé/copyright do site.
Equivalente ao `mod_footer` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Texto de direitos autorais configurável (`copyrightText`, padrão "Todos
  os direitos reservados.").
- Ano atual opcional antes do texto (`showYear`, padrão `true`).
- Sem `dataSources` — não lê nenhuma lista do SharePoint.
- Posição padrão: `rodape` (ver `templates/mse-default/template.json`).

## Limites

Sem suporte a múltiplas linhas, links ou HTML no texto configurado — apenas
texto plano.

Execute `npm --prefix modules/mod_footer test` a partir da raiz.
