# Plano para editor rico com Quill

## Decisão

O Quill deve ser avaliado como recurso do núcleo, não como dependência direta de um módulo específico. A entrega esperada é um adaptador compartilhado que qualquer módulo possa usar para edição rica, preservando sanitização, tema, acessibilidade e publicação versionada.

O editor nativo atual permanece como fallback leve até o adaptador Quill estar validado em ambiente real.

## Motivação

- Quill é permissivamente licenciado sob BSD 3-Clause.
- A API expõe conteúdo estruturado em Delta e também permite obter HTML semântico.
- O editor é modular e adequado para toolbar controlada.
- A centralização no núcleo evita duplicação de editores por módulo.

## Escopo do núcleo

Adicionar um pacote versionado:

```text
core/0.13.2/editor-quill.js
core/0.13.2/editor-quill.css
core/0.13.2/vendor/quill/
```

O adaptador público deve expor uma API pequena:

```js
createRichTextEditor({
  root,
  initialHtml,
  placeholder,
  toolbar,
  sanitizeRichText,
  onChange
})
```

Contrato mínimo:

- `getHtml()`;
- `getDelta()`;
- `setHtml(html)`;
- `focus()`;
- `destroy()`.

## Status de implementacao

- `core/0.13.2`: adaptador Quill local entregue no nucleo.
- `forum/0.18.2`: primeiro consumo do adaptador iniciado no modulo de forum, com fallback nativo.

## Fases

### Q1 — Spike local

- Baixar e empacotar Quill localmente, sem CDN.
- Registrar licença BSD 3-Clause junto aos arquivos distribuídos.
- Criar demo local isolada no núcleo.
- Validar toolbar mínima: parágrafo, títulos, negrito, itálico, listas, link, citação, código e tabela somente se suportada sem plugin instável.

### Q2 — Integração com segurança

- Converter saída do Quill para `HtmlSeguroV1`.
- Sanitizar antes de salvar e antes de renderizar.
- Confirmar que scripts, handlers, estilos inline perigosos, iframes e URLs `javascript:` continuam removidos.
- Decidir se o Delta será persistido junto do HTML ou se ficará apenas como formato de edição.

Decisão inicial recomendada:

- persistir HTML sanitizado para leitura/renderização;
- avaliar Delta como campo opcional somente se edição round-trip perder informação relevante.

### Q3 — Tema e acessibilidade

- Adaptar Snow/theme do Quill para tokens `--mse-*`.
- Validar foco visível, navegação por teclado e contraste.
- Remover excesso visual que conflite com o host SharePoint.
- Garantir fallback para textarea/editor nativo se o Quill falhar ao carregar.

### Q4 — Primeiro consumidor

- Substituir o editor do fórum por `createRichTextEditor`.
- Manter o editor nativo como fallback.
- Validar criar tópico, editar tópico, salvar rascunho, responder e editar resposta.

### Q5 — Validação SharePoint

- Publicar o núcleo `0.13.2` e o módulo consumidor em pastas versionadas.
- Testar em Modern Script Editor com scripts externos.
- Medir tamanho dos ativos e tempo de carregamento.
- Confirmar ausência de erros no console.

## Fora do escopo inicial

- Upload de imagens.
- Colagem de HTML complexo do Word.
- Menções, autocomplete e mídia embarcada.
- Plugins não oficiais de tabela.
- Edição colaborativa em tempo real.

## Critérios de aceite

- O editor funciona sem CDN.
- O módulo consumidor não importa Quill diretamente.
- O conteúdo salvo passa pelo sanitizador do núcleo.
- A renderização continua segura sem depender do Quill.
- O editor respeita os tokens de tema do núcleo.
- O fallback nativo continua disponível.

## Atualização após implementação

O plano começou como avaliação do Quill, mas a entrega consolidada virou uma estratégia de editores ricos configuráveis no núcleo.

Entregas acumuladas:

- `core/0.12.2`: Quill local validado em SharePoint, incluindo contorno para páginas que expõem `define.amd`.
- `core/0.13.2`: seletor `editor.js`, Summernote Lite, jQuery local, CSS/fontes/licenças locais e sanitização de imagens pequenas.
- `forum/0.18.2`: seleção por `data-editor`, `forum.editor` ou `forum.Editor`.
- `core/0.13.5`: sanitização de imagens incorporadas até 1 MiB e upload binário para bibliotecas SharePoint.
- `forum/0.18.8`: externalização automática de Base64 para `ForumMidia` antes da persistência.

Valores aceitos:

- `Quill`;
- `Summernote`;
- `default`.

Aprendizados principais:

- dependências de editor devem ficar no núcleo, não dentro do módulo consumidor;
- o módulo não deve importar fornecedor diretamente, apenas receber uma função de criação de editor;
- SharePoint pode interferir com bundles UMD por causa de AMD;
- Summernote Lite evita Bootstrap, mas ainda exige jQuery;
- o CSS do Summernote exige publicar as fontes junto dos estilos;
- Base64 é apenas o formato temporário do editor; a persistência deve usar a URL do arquivo enviado à biblioteca;
- o sanitizador continua sendo a fronteira de segurança, inclusive quando o editor possui code view.

Documento consolidado: [`EDITORES-RICOS.md`](EDITORES-RICOS.md).

## Referências

- Quill API: https://quilljs.com/docs/api
- Quill Delta: https://quilljs.com/docs/delta/
- Licença Quill: https://github.com/slab/quill/blob/main/LICENSE
