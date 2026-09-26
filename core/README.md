# MSE Core

Pacote `0.8.0`, compartilhado pelos módulos da plataforma. A versão do Core
não é a versão da release completa; consulte a [matriz](../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Recursos

- Cliente REST com digest, ETag, erros HTTP e leitura paginada.
- Upload binário de arquivos e resolução de listas por identificadores.
- Registro de fontes de dados com allowlist explícita de sites.
- Contratos de módulos, migração de settings e resolução de configuração.
- Persistência em `MSEConfiguracoes`, rascunho/publicação e histórico.
- Diagnóstico e provisionamento declarativo administrativo.
- Sanitização de HTML, renderização rica e seleção de editor.
- Utilitários de acessibilidade e navegação.

`selectRichTextEditor` aceita `Quill`, `Summernote` ou `default`; o último
retorna ausência de adaptador externo para o consumidor usar seu editor nativo.
Veja [editores ricos](../docs/EDITORES-RICOS.md).

## Runtime atual e compatibilidade

O adaptador MSE atual aplica layout e tema por `bootstrap.js`, `layout.css` e
`themes/base/theme.js`. `core.js`, `core.css` e `theme-adapter.js` pertencem ao
fluxo legado e são excluídos pelo empacotador atual. Não misture instruções de
publicação antigas com a árvore de releases.

Instalação usa inspect/apply/verify com confirmação. A leitura normal resolve
estruturas existentes, sem criá-las. Uploads persistem a URL retornada pelo
SharePoint; HTML de mensagens não deve armazenar imagens Base64.

## Validação

Na raiz: `npm test`. Para os testes deste pacote: `npm --prefix core test`.
Os scripts Edge existentes são legados: em ambiente corporativo, qualquer
validação de navegador deve seguir a ferramenta autorizada pelo workspace.

## Publicação

Use a [árvore de release](../docs/INSTALACAO-MSE.md), preservando imports e
licenças. Publique correções em nova pasta e retenha a anterior para rollback.
Componentes de carrossel e acordeão estão em [UI](../modules/ui/README.md).
