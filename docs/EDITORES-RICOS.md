# Editores ricos no núcleo

## Estado atual

A partir do `core/0.13.2`, o núcleo oferece um seletor comum de editor rico para módulos hospedados em Modern Script Editor.

Editores suportados:

| Valor | Resultado |
|---|---|
| `Quill` | Carrega o adaptador Quill local. |
| `Summernote` | Carrega Summernote Lite local, com jQuery local. |
| `default` | Não carrega dependência externa e usa o editor nativo do módulo consumidor. |

O seletor público fica em:

```text
core/0.13.2/editor.js
```

API principal:

```js
selectRichTextEditor("Quill")
selectRichTextEditor("Summernote")
selectRichTextEditor("default")
```

## Decisões implementadas

- Dependências são publicadas localmente em `SiteAssets`; não há CDN em runtime.
- Cada editor fica em adaptador separado para evitar acoplamento dos módulos ao fornecedor.
- O módulo consumidor recebe uma função de criação de editor; se ela for `undefined`, usa fallback nativo.
- O conteúdo persistido continua sendo `HtmlSeguroV1`.
- Todo HTML é sanitizado antes de salvar e antes de renderizar.
- O tema visual usa tokens `--mse-*` para aproximar o editor do host SharePoint.
- Pastas publicadas são imutáveis; correção exige nova versão.

## Assets do core `0.13.2`

```text
core/0.13.2/editor.js
core/0.13.2/editor-quill.js
core/0.13.2/editor-quill.css
core/0.13.2/editor-summernote.js
core/0.13.2/editor-summernote.css
core/0.13.2/vendor/quill/2.0.3/
core/0.13.2/vendor/jquery/3.7.1/
core/0.13.2/vendor/summernote/0.9.0/
```

## Quill

Quill foi mantido como editor padrão inicial porque é moderno, não depende de jQuery e expõe API adequada para toolbar controlada.

Aprendizado importante em SharePoint:

- o bundle UMD do Quill pode tentar registrar via AMD quando a página expõe `define.amd`;
- nesse cenário, `window.Quill` não é criado;
- o adaptador mascara `define` somente durante o carregamento do arquivo do Quill e restaura o valor original logo depois.

Esse comportamento foi validado em página SharePoint autenticada.

## Summernote Lite

Summernote foi adicionado para testar uma experiência com inserção de imagens mais completa.

Decisões:

- usar `summernote-lite`, sem Bootstrap;
- empacotar jQuery `3.7.1` localmente;
- empacotar CSS, fontes e licença do Summernote;
- manter Quill instalado e selecionável.

Aprendizado importante:

- Summernote Lite ainda depende de jQuery;
- o CSS referencia fontes próprias, então as fontes precisam ser publicadas junto do CSS;
- o botão de imagem funciona, mas imagens base64 aumentam rapidamente o tamanho do HTML.

## Imagens

O sanitizador passou a permitir `img` com:

- `http`;
- `https`;
- `data:image/png`;
- `data:image/jpeg`;
- `data:image/gif`;
- `data:image/webp`.

Restrições:

- atributos perigosos, como `onerror`, são removidos;
- `javascript:` é rejeitado;
- `style` inline é removido;
- `alt` é preservado e limitado;
- imagens base64 são limitadas;
- o HTML total sanitizado aceita até `500 KB`.

Essa decisão é suficiente para MVP e teste funcional. Para produto definitivo, o caminho recomendado é upload para biblioteca SharePoint e inserção da URL da imagem no conteúdo, evitando armazenar blobs base64 em listas.

## Configuração no fórum

O fórum `0.18.6` aceita:

```html
data-editor="Quill"
data-editor="Summernote"
data-editor="default"
```

Também aceita configuração de instância:

```json
{
  "forum": {
    "editor": "Summernote"
  }
}
```

`Editor` com inicial maiúscula também é aceito para compatibilidade com administradores que usem essa grafia em JSON.

## Critérios de aceite validados

- Quill carrega sem CDN.
- Summernote carrega sem CDN.
- Summernote carrega com jQuery local.
- Summernote mostra toolbar e botão de imagem.
- O fórum carrega Quill, Summernote ou editor nativo conforme configuração.
- Imagem base64 pequena é preservada.
- Handler/script/URLs inseguras são removidos.
- O `forum-loader.js` repassa `data-editor`.

## Limites conhecidos

- Imagens base64 não são recomendadas para produção.
- Não há upload automático para biblioteca SharePoint nesta versão.
- O editor nativo continua mais leve, mas tem menos recursos.
- Summernote aumenta o volume de assets do core por trazer jQuery, CSS e fontes.
- O botão de code view do Summernote não dispensa sanitização; o HTML continua passando pelo sanitizador.

## Referências

- Quill API: https://quilljs.com/docs/api
- Quill Delta: https://quilljs.com/docs/delta/
- Licença Quill: https://github.com/slab/quill/blob/main/LICENSE
- Summernote: https://summernote.org/
- Summernote Getting Started: https://summernote.org/getting-started/
- Summernote GitHub: https://github.com/summernote/summernote
