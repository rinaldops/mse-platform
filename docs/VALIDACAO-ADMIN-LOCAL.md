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

## Validação em tenant

Evidências, identificadores e resultados de ambientes reais devem permanecer
em armazenamento privado do consumidor, não neste repositório público.
Use o checklist de `ROADMAP-MVP-MINI-JOOMLA.md` para planejar a validação
autorizada. Testes locais não comprovam publicação ou aceite em produção.

## Limites (importante)

Esta validação **não** cobre:

- autenticação / cookies / digest do SharePoint;
- permissões reais de lista (Admin/Owner vs. visitante);
- existência/nomes/GUIDs de listas no tenant;
- publicação real de conteúdo em páginas (renderização do site consumidor);
- comportamento sob latência, cache, throttling e políticas corporativas;
- qualquer ACL própria (o projeto depende do controle do SharePoint).

Para validação completa, é necessário executar em tenant (MSE host real) com as
listas provisionadas e permissões configuradas. Registre os resultados e a
limpeza dos itens temporários somente no registro privado do consumidor.
