# Roteiro de validação de editores no SharePoint

Roteiro para executar por release; nenhum item abaixo representa um teste
executado nesta revisão documental. Confirme DEV/homologação e use o fluxo de
navegador autorizado pelo workspace. Evidências autenticadas ficam fora do
repositório público.

## Preparação

Siga [Instalação MSE](INSTALACAO-MSE.md), instale o Fórum e sua biblioteca
ForumMidia. No Admin, publique uma configuração para cada editor a testar:
Quill, Summernote e default. Não use os snippets legados de core/0.3.0.

## Assets

Na árvore publicada, confira HTTP, MIME e ausência de erros CSP/importação:

- core/editor.js, editor-quill.js, editor-quill.css;
- core/editor-summernote.js e editor-summernote.css;
- core/vendor/quill/2.0.3/quill.js, quill.core.css e quill.snow.css;
- core/vendor/jquery/3.7.1/jquery.min.js;
- core/vendor/summernote/0.9.0/summernote-lite.min.js e summernote-lite.min.css;
- fontes e licenças distribuídas junto dos fornecedores.

Não altere ou renomeie assets de uma release publicada para simular falha.
Faça simulações em cópia local descartável. default seleciona o editor nativo;
falha de download do fornecedor não comprova fallback automático.

## Fluxos funcionais

- [ ] Criar, editar e reabrir tópico com formatação, listas, citação e links.
- [ ] Salvar/reabrir rascunho, responder e editar resposta.
- [ ] Inserir PNG/JPEG/GIF/WebP, salvar e conferir URL em ForumMidia.
- [ ] Confirmar limites de dez imagens e 1 MiB por imagem.
- [ ] Confirmar que o campo salvo não contém Base64 das imagens incorporadas.
- [ ] Testar conteúdo próximo do limite textual após externalização.
- [ ] Validar falha de permissão de upload sem informar sucesso indevido.

## Segurança e interface

- [ ] HTML persistido e renderizado passa pelo sanitizador do Core.
- [ ] Scripts, handlers e URLs javascript não executam.
- [ ] Texto permitido permanece legível após salvar/reabrir.
- [ ] Teclado, foco visível, nomes acessíveis e anúncios são utilizáveis.
- [ ] Toolbar e diálogos funcionam em tela estreita e com zoom.
- [ ] Temas Standard/Lite mantêm legibilidade; conferir contraste no ambiente.

Não use detecção de window.DOMPurify como evidência: a implementação está em
[rich-text.js](../core/rich-text.js). Registre versão da release, editor,
resultado, limitações e referência privada da evidência para cada cenário.
