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
core/0.13.0/editor-quill.js
core/0.13.0/editor-quill.css
core/0.13.0/vendor/quill/
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

- `core/0.13.0`: adaptador Quill local entregue no nucleo.
- `forum/0.18.0`: primeiro consumo do adaptador iniciado no modulo de forum, com fallback nativo.

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

- Publicar o núcleo `0.13.0` e o módulo consumidor em pastas versionadas.
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

## Referências

- Quill API: https://quilljs.com/docs/api
- Quill Delta: https://quilljs.com/docs/delta/
- Licença Quill: https://github.com/slab/quill/blob/main/LICENSE
