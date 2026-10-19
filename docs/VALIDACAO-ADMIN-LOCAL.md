# Validação local do Centro de Administração (sem tenant)

Este guia cobre **apenas validação local**, sem acesso ao SharePoint/tenant.

## Execução (host local)

Sirva a raiz do projeto por HTTP e abra:

```text
http://127.0.0.1:4173/examples/admin-host/
```

O host usa o Centro de Administração real com **armazenamento em memória**. Ele:

- **não** faz chamadas ao SharePoint;
- **não** persiste dados após recarregar a página;
- serve para validar **fluxos de navegação, layout base e componentes de UI**.

### Checklist visual mínimo (admin-host)

- abrir o **Painel** (Control Panel);
- confirmar que existe entrada/atalho para **Publicador**;
- navegar até o Publicador (quando disponível no menu/rota) e verificar que a tela renderiza (título, toolbar, tabela/form).

> Observação: no ambiente **sem tenant**, o Publicador pode não conseguir executar
> operações reais de CRUD (por ausência de `adminClient`/listas). Os fluxos de
> criação/edição são validados por testes unitários (abaixo).

## Testes locais (unitários)

### Rodar tudo

```powershell
npm test
```

### Rodar somente os testes do Publicador

```powershell
node administrator/test/publisher.test.js
```

### Outras suítes relacionadas (opcional)

```powershell
node kernel/test/admin-data.test.js
node kernel/test/admin-form.test.js
node administrator/test/administrator-css.test.js
node host-adapters/modern-script-editor/test/site-boot.test.js
```

## Publicador — estado atual (integrado)

O Publicador (screen) está integrado ao Centro de Administração e pode ser
endereçado por rota equivalente a Joomla:

- `#/administrator?option=com_content`
- `#/administrator?option=com_publisher`

Funcionalidades cobertas por testes locais (DOM fake + client fake):

- renderização inicial (tabela/form);
- criação de item;
- edição/atualização de item;
- atualização com **ETag** (o fluxo busca o item antes de gravar);
- validação de **EstadoEditorial** (Publicado/Despublicado/Arquivado/Lixeira);
- preenchimento e validação de **DataPublicacao** e **DataExpiracao**;
- sanitização de `CorpoHtmlSeguroV1` (via `core/rich-text.js`);
- mensagens amigáveis para erros HTTP típicos:
  - **403** (sem permissão)
  - **412** (conflito/ETag)

## Validação no tenant (evidência consolidada — FIORI-AUTO/RPC 47175)

A branch também foi exercitada no site SharePoint autorizado do CAMAP-AGP, sem
alterar o layout da equipe 2. O pacote foi carregado em
`SiteAssets/mse-platform/current` e a rota canônica
`Default.aspx#/administrator?option=com_content` renderizou o Publicador com
itens reais de `CAMAPPublicacoes`, incluindo tabela, `Novo artigo`, `Recarregar`
e `Editar`.

Foram comprovados no tenant:

- criação temporária do item `Teste Codex MVP`;
- remoção de `<script>` do campo `CorpoHtmlSeguroV1` antes do armazenamento;
- atualização com ETag (`HTTP 204`);
- conflito de ETag obsoleto (`HTTP 412`), tratado pelo Publicador;
- atualização do item de teste para `Publicado` para sondagem do BLOG.

O item temporário foi retornado a `Lixeira` no tenant após a validação
(`Id 27`, `HTTP 204`), sem permanecer como conteúdo publicável. A rota BLOG foi sondada no ambiente autorizado. A sessão FIORI-AUTO retornou
`data-mse-component` vazio tanto na tentativa por `#/blog` quanto ao abrir
`Destaques.aspx` diretamente; essa página carregou apenas o shell nativo do
SharePoint. O diagnóstico passa a ser de **canvas/publicação da página**, não
mais apenas de alias: é necessário conferir o `CanvasContent1` de `Destaques.aspx`
e garantir que o MSE correto esteja publicado antes de validar o detalhe editorial.

A tentativa de leitura REST automatizada do `CanvasContent1` nesta rodada não
produziu retorno utilizável pelo FIORI-AUTO (a sessão respondeu sem valor CDP),
portanto não houve escrita nem alteração na página. A tela canônica `Default.aspx`
continua carregando normalmente; o diagnóstico da página interna permanece aberto
para uma sessão SharePoint estável dedicada à leitura/publicação do canvas.

## Limites (importante)

Esta validação **não** cobre:

- autenticação / cookies / digest do SharePoint;
- permissões reais de lista (Admin/Owner vs. visitante);
- existência/nomes/GUIDs de listas no tenant;
- publicação real de conteúdo em páginas (renderização do site consumidor);
- comportamento sob latência, cache, throttling e políticas corporativas;
- qualquer ACL própria (o projeto depende do controle do SharePoint).

Para validação completa, é necessário executar em tenant (MSE host real) com as
listas provisionadas e permissões configuradas. A validação administrativa real foi executada conforme a seção anterior; a
renderização final do BLOG/detalhe e a limpeza do item temporário continuam
sendo etapas específicas da validação de conteúdo.
