# Plano de implementação — editores ricos selecionáveis do Mini Joomla!

**Projeto:** `mse-platform`  
**Status:** plano aprovado para execução  
**Escopo:** núcleo reutilizável do Mini Joomla; sem acoplamento ao CAMAP-AGP ou ao projeto TD  
**Data:** 2026-10-25

## 1. Objetivo

Evoluir o seletor de editores ricos já existente para suportar, em runtime, os
editores nativos do `mse-platform` e os equivalentes conceituais do Joomla!:

- `Quill` — editor rico leve já integrado;
- `Summernote` — editor rico alternativo já integrado;
- `TinyMCE` — editor editorial equivalente ao plugin `plugins/editors/tinymce`
do Joomla;
- `CodeMirror` — editor técnico para HTML/CSS/JavaScript/JSON, equivalente ao
plugin `plugins/editors/codemirror`;
- `default` — fallback nativo, equivalente ao editor `none`.

A implementação deve manter a mesma ideia do Joomla: editores são extensões
selecionáveis, não uma dependência fixa do Publicador. A escolha ocorrerá na
ordem `instância → componente → configuração global → padrão`.

## 2. Estado comprovado antes da execução

Já existem no núcleo:

```text
core/editor.js
core/editor-quill.js
core/editor-quill.css
core/editor-summernote.js
core/editor-summernote.css
core/test/editor.test.js
core/test/editor-quill.test.js
core/test/editor-summernote.test.js
```

O seletor atual reconhece `Quill`, `Summernote` e `default`; as dependências são
publicadas localmente, sem CDN. A sanitização e o tratamento de imagens devem
continuar sendo responsabilidade do núcleo, antes da persistência SharePoint.

Referências atuais:

- [`EDITORES-RICOS.md`](EDITORES-RICOS.md): contrato e limitações vigentes;
- [`VALIDACAO-EDITOR-SHAREPOINT.md`](VALIDACAO-EDITOR-SHAREPOINT.md): validação
  autorizada por release;
- `JOOMLA/plugins/editors/tinymce`: referência estrutural do editor Joomla;
- `JOOMLA/plugins/editors/codemirror`: referência estrutural do editor técnico;
- `JOOMLA/plugins/editors/none`: referência do fallback sem editor.

## 3. Regras arquiteturais não negociáveis

1. **Um contrato comum:** componentes recebem um factory e não importam
   diretamente TinyMCE, Quill, Summernote ou CodeMirror.
2. **Plugins desacoplados:** cada editor possui manifesto, adaptador, estilos,
   licença/notice e testes próprios.
3. **Assets locais:** não depender de CDN em runtime. O empacotamento deve
   incluir JS, CSS, fontes e notices necessários.
4. **Segurança:** todo HTML passa por `sanitizeHtml` antes de salvar e antes de
   renderizar. `javascript:`, handlers inline, CSS perigoso e iframes não
   autorizados continuam proibidos.
5. **Imagens:** Base64 é temporário; imagens devem ser externalizadas para uma
   biblioteca SharePoint antes da gravação do artigo.
6. **Fallback:** falha ao carregar um editor não pode impedir a edição; usar
   `default` e exibir diagnóstico amigável.
7. **Compatibilidade:** preservar os contratos Quill/Summernote já usados pelo
   Fórum e não alterar o comportamento de módulos existentes sem teste de
   regressão.
8. **Sem ACL própria:** permissões continuam sendo as permissões nativas do
   SharePoint.
9. **Sem dependência do TD:** o núcleo deve permanecer genérico e reutilizável.

## 4. Organização de branches e workflows

As tarefas abaixo usam branches independentes. Nenhum workflow deve editar o
mesmo conjunto de arquivos de outro workflow.

```text
main
└── feature/multi-editor-foundation
    ├── feature/editor-contract-registry
    ├── feature/editor-tinymce
    ├── feature/editor-codemirror
    ├── feature/editor-runtime-selection
    ├── feature/editor-administrator-settings
    ├── feature/editor-rich-article-integration
    └── feature/editor-release-validation
```

### Workflows que deixam de fazer sentido

- encerrar o plano isolado de Quill como roteiro principal: ele permanece como
  histórico (`PLANO-EDITOR-QUILL.md`), mas o plano normativo passa a ser este;
- descartar workflows que criem um editor novo dentro de cada módulo;
- descartar workflows que copiem plugins PHP do Joomla para o JavaScript;
- descartar workflows que exijam alteração de listas ou publicação no tenant para
  testar o contrato local;
- não criar um workflow global de loader/registry antes da fundação do contrato.

Não remover arquivos históricos automaticamente. A exclusão física de workflow
só deve ocorrer quando ele existir como arquivo/scripts separado e não houver
referência válida. Documentos históricos devem permanecer marcados como tais.

## 5. Etapa 0 — congelamento e baseline

**Responsável:** coordenador/integrador. **Sequencial.**

1. Confirmar branch limpa e registrar commit-base.
2. Executar `npm test`.
3. Executar `git diff --check`.
4. Inventariar consumidores de `selectRichTextEditor` e atributos
   `data-editor`.
5. Congelar o contrato atual de Quill/Summernote/default.
6. Atualizar `EDITORES-RICOS.md` somente com fatos comprovados.

**Aceite:** baseline verde, consumidores listados e nenhum contrato existente
removido.

## 6. Etapa 1 — fundação do contrato e registry

**Branch:** `feature/editor-contract-registry`  
**Pode ocorrer em paralelo com as Etapas 2 e 3; não publicar antes de integrar.**

Implementar:

- normalização de nomes case-insensitive;
- registro de metadados do editor;
- factory assíncrono comum;
- capacidades declaradas (`richText`, `source`, `images`, `toolbar`);
- `getHtml`, `setHtml`, `focus`, `dispose`/`destroy`;
- propagação de `onChange`;
- fallback seguro;
- mensagens de erro sem expor dados sensíveis.

Arquivos previstos:

```text
core/editor.js
core/editor-registry.js
core/test/editor.test.js
core/test/editor-registry.test.js
```

**Aceite:** Quill, Summernote e `default` continuam passando nos testes atuais;
registro de um editor ausente degrada para fallback.

## 7. Etapa 2 — adaptador TinyMCE

**Branch:** `feature/editor-tinymce`  
**Paralelo com Etapa 3.**

1. Escolher e congelar uma versão compatível/licenciada.
2. Publicar o runtime local e notices da licença.
3. Criar `plugins/editors/tinymce/manifest.json`.
4. Criar adaptador sem dependência do Publicador.
5. Implementar toolbar configurável, placeholder, conteúdo inicial, foco e
   destruição.
6. Integrar upload de imagens somente por callback do host, sem persistir
   Base64.
7. Encaminhar o HTML ao sanitizador do core.
8. Cobrir carregamento, erro, `define.amd`, remount e fallback.

Arquivos previstos:

```text
plugins/editors/tinymce/
├── manifest.json
├── editor-tinymce.js
├── editor-tinymce.css
├── NOTICE.md
└── test/editor-tinymce.test.js
```

**Aceite:** TinyMCE funciona sem CDN, com toolbar editorial, sem quebrar a
página quando o asset falha e sem permitir HTML inseguro.

## 8. Etapa 3 — adaptador CodeMirror

**Branch:** `feature/editor-codemirror`  
**Paralelo com Etapa 2.**

1. Escolher versão e licença.
2. Criar plugin de editor técnico.
3. Implementar texto fonte, linguagem, tema, `getValue`/`setValue`, foco e
   destruição.
4. Não tratar CodeMirror como editor WYSIWYG.
5. Restringir seu uso a campos técnicos/configuração/template.
6. Validar que conteúdo técnico não é interpretado como HTML no preview sem
   passagem explícita pelo sanitizador.

**Aceite:** edição de código funcional, fallback disponível e separação clara
entre `source` e `richText`.

## 9. Etapa 4 — seleção em runtime

**Branch:** `feature/editor-runtime-selection`  
**Depende da Etapa 1; integra Etapas 2 e 3.**

Implementar a resolução:

```text
instance.Editor
  ↓
component.Editor
  ↓
global.Editor
  ↓
DEFAULT_EDITOR
```

Adicionar:

- `resolveEditorName()`;
- troca sem recarregar a página;
- preservação do HTML e do estado `dirty`;
- desmontagem segura do editor anterior;
- prevenção de perda de conteúdo;
- indicador do editor ativo;
- fallback quando o adaptador não carregar.

**Aceite:** trocar Quill ↔ Summernote ↔ TinyMCE no mesmo formulário preserva o
conteúdo e não duplica listeners, DOM ou assets.

## 10. Etapa 5 — configurações administrativas

**Branch:** `feature/editor-administrator-settings`  
**Pode iniciar após definição do contrato; integração sequencial com Etapa 4.**

Adicionar ao modelo de configuração:

```json
{
  "Editor": "TinyMCE",
  "EditorToolbar": "article",
  "EditorAllowImages": true,
  "EditorFallback": "Quill"
}
```

Expor no painel apenas editores registrados e compatíveis com o campo. A tela
de configurações deve mostrar:

- editor global;
- editor do componente;
- editor da instância;
- capacidades;
- aviso de fallback;
- diagnóstico de asset/licença.

**Aceite:** configuração inválida não quebra o Administrator; valor inválido é
normalizado ou substituído por fallback documentado.

## 11. Etapa 6 — integração editorial

**Branch:** `feature/editor-rich-article-integration`  
**Depende das Etapas 4 e 5.**

Aplicar primeiro ao `com_content`/Publicador:

- corpo do artigo com editor selecionável;
- resumo com editor apropriado;
- título e metadados fora do editor;
- abas de conteúdo e publicação preservadas;
- salvar usando ETag;
- sanitizar antes da persistência;
- externalizar imagens antes da gravação;
- recuperar editor após erro de validação;
- manter filtro/lista ao retornar.

Depois validar o Fórum sem alterar seu comportamento atual.

**Aceite:** listar → filtrar → abrir título → editar → trocar editor → salvar →
retornar à lista funciona para artigo novo e existente.

## 12. Etapa 7 — UI administrativa

**Branch:** `feature/editor-administrator-ui`  
**Pode ocorrer em paralelo com Etapa 6, desde que não edite os mesmos arquivos.**

Construir:

- toolbar editorial;
- abas do formulário;
- painel lateral de publicação;
- estados de carregamento/salvamento;
- mensagens de sucesso/erro;
- confirmação de saída com alterações;
- acessibilidade por teclado;
- layout Petrobras sem copiar cores proibidas do Joomla.

A UI deve consumir o contrato de editor, não conhecer fornecedores diretamente.

## 13. Etapa 8 — empacotamento e release

**Branch:** `feature/editor-release-validation`  
**Sequencial após integração.**

1. Atualizar `dist` somente com a ferramenta oficial de release.
2. Verificar manifestos, hashes, caminhos relativos e licenças.
3. Garantir que os assets não dependem de CDN.
4. Atualizar documentação de instalação e rollback.
5. Executar testes unitários e de integração.
6. Validar tamanho e carregamento em host local.
7. Validar no SharePoint apenas depois do pacote local verde, usando FIORI-AUTO.

**Aceite:** release reproduzível, manifestos íntegros, rollback documentado e
nenhum segredo versionado.

## 14. Matriz de paralelismo

| Trabalho | Paralelo | Dependência | Arquivos exclusivos principais |
|---|---:|---|---|
| Registry/contrato | sim | baseline | `core/editor*`, testes |
| TinyMCE | sim | contrato mínimo | `plugins/editors/tinymce/**` |
| CodeMirror | sim | contrato mínimo | `plugins/editors/codemirror/**` |
| Configuração admin | parcial | registry | telas/config schema |
| UI do editor | sim | contrato visual | `libraries/editor/**`, CSS |
| Publicador | não | seleção + config | `components/com_content/**` |
| Release | não | todas as integrações | `dist/**`, docs de release |

Regra: não permitir dois agentes escreverem no mesmo arquivo. O coordenador
integra branches, resolve conflitos e executa a suíte completa; agentes de
revisão somente leem e reportam.

## 15. Testes obrigatórios

### Unitários

```powershell
node core/test/editor.test.js
node core/test/editor-quill.test.js
node core/test/editor-summernote.test.js
node plugins/editors/tinymce/test/editor-tinymce.test.js
node plugins/editors/codemirror/test/editor-codemirror.test.js
```

### Integração

```powershell
npm test
npm run release:build
npm run release:verify
```

### Segurança e UX

- HTML malicioso removido;
- URLs perigosas rejeitadas;
- imagens externalizadas;
- sem listeners duplicados após troca;
- remount e dispose idempotentes;
- teclado e foco visível;
- fallback após falha de asset;
- nenhum CDN obrigatório;
- licenças e notices presentes.

## 16. Critérios de conclusão

O plano estará concluído quando:

- os cinco editores forem registrados e selecionáveis;
- Quill/Summernote não tiverem regressão;
- TinyMCE cobrir edição editorial;
- CodeMirror cobrir edição técnica;
- `default` funcionar como fallback;
- a escolha global/componente/instância funcionar;
- Publicador e Fórum usarem o mesmo contrato;
- sanitização e upload permanecerem centralizados;
- painel administrativo expuser as configurações;
- testes locais e release passarem;
- validação visual autorizada no SharePoint for registrada;
- documentação, rollback e notices estiverem atualizados.

## 17. Itens explicitamente fora deste plano

- ACL própria;
- Templates do Joomla em PHP;
- copiar o backend PHP do Joomla;
- dependência com o projeto TD;
- publicação automática em tenant;
- colaboração em tempo real;
- autosave obrigatório;
- migração destrutiva de conteúdo.
