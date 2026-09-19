# Plano de evolução do mse-platform para produto reutilizável

## 1. Objetivo

Transformar o `mse-platform` em um produto público, modular, configurável e
reutilizável em diferentes sites SharePoint, preservando o Modern Script Editor
(MSE) como único host implementado no primeiro ciclo.

O produto deverá permitir que proprietários e gestores de conteúdo instalem,
configurem e utilizem módulos sem editar JavaScript, CSS, JSON, GUIDs ou HTML.
Desenvolvedores externos deverão conseguir criar novos módulos e contribuir com
o projeto por contratos documentados e estáveis.

## 2. Decisões de escopo

### 2.1 Incluído neste plano

- Core compartilhado, independente de regras de negócio.
- Contrato público para módulos.
- Adaptador de host para Modern Script Editor.
- Centro de Administração comum.
- Instalação, atualização e diagnóstico de módulos.
- Configuração global, por módulo e por instância.
- Settings declarativos e formulários gerados.
- Summary opcional por módulo.
- Provisionamento e migração declarativa de listas SharePoint.
- Migração gradual de Fórum, Videoteca, Explore Mais e Home.
- Documentação pública, exemplos locais e kit para contribuidores.
- Versionamento independente de Core, UI e módulos.

### 2.2 Fora do primeiro ciclo

- Implementação de uma SPFx Web Part.
- Publicação em AppSource ou catálogo de aplicativos.
- Integrações com hosts diferentes do MSE.
- Editor visual irrestrito de CSS ou HTML.
- Armazenamento de segredos ou credenciais.
- Criação automática de páginas sem confirmação administrativa.

SPFx e outros hosts serão considerados somente como consumidores futuros dos
contratos públicos. Nenhum esforço do primeiro ciclo deverá depender deles.

## 3. Princípios obrigatórios

1. **MSE primeiro:** toda entrega funcional deverá operar por Modern Script
   Editor no ambiente inicial.
2. **Host desacoplado:** regras de negócio não poderão depender diretamente do
   MSE, de uma página `.aspx` ou de uma implementação futura em SPFx.
3. **Sem programação para o gestor:** configuração cotidiana ocorrerá por
   formulários, seletores, toggles e pré-visualização.
4. **Configuração segura:** não oferecer JavaScript, HTML, URLs arbitrárias ou
   CSS livre como parâmetros administrativos.
5. **Instalação separada da execução:** loaders de runtime não poderão criar ou
   alterar listas silenciosamente.
6. **Compatibilidade progressiva:** migrar módulos sem interromper os sites que
   já utilizam versões publicadas.
7. **Ativos imutáveis:** versões publicadas em `SiteAssets` nunca serão
   sobrescritas.
8. **Nomes internos estáveis:** listas e campos usarão identificadores ASCII;
   títulos amigáveis poderão ser localizados.
9. **Acessibilidade por padrão:** configurações inválidas de contraste,
   tipografia ou interação deverão ser rejeitadas.
10. **Projeto público e neutro:** código público não conterá URLs, GUIDs, dados,
    credenciais ou decisões específicas de um site consumidor.

## 4. Arquitetura-alvo

```text
mse-platform/
  core/
    runtime/
    configuration/
    sharepoint/
    provisioning/
    accessibility/
    diagnostics/
    host-adapters/
      modern-script-editor/

  admin/
    shell/
    catalog/
    settings-renderer/
    installer/
    preview/

  themes/
    base/
    examples/

  modules/
    forum/
      manifest.js
      module.js
      data.js
      view.js
      styles.css
      schema.js
      settings-schema.js
      summary/
      migrations/
      tests/

    videoteca/
    explore-mais/
    home/

  examples/
    local-host/
    sample-module/

  docs/
  dist/
```

Os diretórios poderão ser introduzidos progressivamente. A arquitetura lógica é
obrigatória mesmo enquanto alguns arquivos permanecerem na estrutura atual.

## 5. Contrato de módulo

### 5.1 Manifesto obrigatório

Cada módulo deverá expor um manifesto declarativo, sem executar código durante
sua leitura:

```javascript
export default {
  id: "videoteca",
  displayName: "Videoteca",
  version: "1.0.0",
  coreCompatibility: ">=1.0.0 <2.0.0",
  capabilities: {
    full: true,
    summary: true,
    settings: true,
    provisioning: true
  },
  entrypoints: {
    full: "./module.js",
    summary: "./summary/module.js"
  }
};
```

O manifesto também deverá declarar:

- versão do schema de dados;
- permissões necessárias;
- listas e bibliotecas utilizadas;
- chaves de configuração aceitas;
- migrações disponíveis;
- recursos opcionais;
- dependências de componentes compartilhados;
- suporte a localização;
- estado de estabilidade: experimental, preview ou stable.

### 5.2 API mínima do módulo

O `module.js` deverá receber dependências, sem buscá-las em variáveis globais:

```javascript
mount({ root, config, services, context })
dispose()
```

O contexto poderá informar site, usuário, locale e capacidades do host. O
módulo não deverá conhecer detalhes do MSE.

### 5.3 Substituição do “Core do módulo”

Não será criado um segundo Core dentro de cada módulo. A responsabilidade será
dividida em:

- `module.js`: ciclo de vida e orquestração;
- `data.js`: consultas e comandos de negócio;
- `view.js`: construção da interface;
- `schema.js`: dados persistentes;
- `settings-schema.js`: contrato de configuração;
- `summary/`: apresentação resumida opcional.

### 5.4 Summary opcional

O summary deverá:

- reutilizar serviços de dados do módulo;
- possuir entrypoint e configuração próprios;
- nunca duplicar regras de negócio;
- funcionar sem que a visualização completa esteja na mesma página;
- declarar a página de destino por configuração;
- degradar adequadamente quando desativado ou sem dados.

Módulos sem summary declararão `summary: false` e não precisarão criar arquivos
ou placeholders artificiais.

## 6. Configuração e settings

### 6.1 Camadas de precedência

Preservar e formalizar a ordem:

1. defaults universais do Core;
2. configuração fornecida pelo host;
3. configuração global do site;
4. defaults do módulo;
5. configuração da instância;
6. estado temporário de pré-visualização, sem persistência.

O resultado deverá ser validado, clonado e congelado antes da montagem.

### 6.2 Settings schema obrigatório

Cada módulo fornecerá um schema declarativo. Exemplo:

```javascript
export default {
  version: 1,
  groups: [
    {
      id: "content",
      label: "Conteúdo",
      fields: [
        { id: "pageSize", type: "select", options: [20, 50, 100] },
        { id: "showCategories", type: "boolean", default: true }
      ]
    }
  ]
};
```

Tipos iniciais permitidos:

- texto curto com limite;
- número com mínimo, máximo e passo;
- seleção única;
- seleção múltipla;
- toggle;
- cor pertencente a uma paleta aprovada;
- URL restrita ao site ou a domínios autorizados;
- referência a página, lista ou biblioteca descoberta;
- referência a categoria ou tag;
- preset de layout, densidade ou tipografia.

### 6.3 O que não será configurável diretamente

- CSS livre;
- HTML livre;
- JavaScript;
- seletores CSS;
- expressões executáveis;
- tokens e credenciais;
- nomes internos de listas e campos;
- valores que violem acessibilidade ou identidade visual aprovada.

### 6.4 Temas e tokens

O Core público deverá possuir um tema-base neutro e acessível. Identidades de
consumidores deverão ser fornecidas por pacotes de tema ou integrações locais.

Um tema específico somente poderá integrar o repositório público quando sua
publicação e reutilização forem autorizadas. Caso contrário, permanecerá no
repositório do consumidor, sem contaminar o Core público.

Os settings deverão expor escolhas semânticas, como `compacto`, `padrão` e
`confortável`, e não dezenas de medidas em pixels.

## 7. Centro de Administração

### 7.1 Objetivo

Criar uma única experiência administrativa para todos os módulos, também
hospedada inicialmente em uma página com Modern Script Editor.

### 7.2 Funcionalidades

- listar módulos disponíveis, instalados e desatualizados;
- instalar, atualizar, ativar e desativar;
- criar e configurar instâncias;
- configurar o módulo completo e seu summary separadamente;
- selecionar páginas de destino;
- gerenciar temas e presets autorizados;
- mostrar dependências e permissões necessárias;
- pré-visualizar desktop, tablet e celular;
- salvar rascunho e publicar configuração;
- restaurar defaults;
- consultar histórico e autoria;
- exportar e importar configuração sem dados pessoais;
- executar diagnóstico de listas, campos, ativos e compatibilidade;
- apresentar mensagens acionáveis, sem códigos REST como mensagem principal.

### 7.3 Formulários gerados

O renderer comum deverá transformar `settings-schema.js` em controles de UI.
Somente módulos com necessidades realmente específicas poderão fornecer um
editor complementar, mantendo validação e persistência sob responsabilidade do
Centro de Administração.

### 7.4 Separação entre configuração e conteúdo

O gestor deverá distinguir claramente:

- **Configurar módulo:** aparência e comportamento;
- **Gerenciar conteúdo:** tópicos, vídeos, links, categorias e tags;
- **Administrar instalação:** schemas, migrações e versões.

O Centro de Administração deverá oferecer atalhos para as telas de conteúdo,
mas não misturar operações técnicas com edição cotidiana.

## 8. Persistência da configuração

### 8.1 Evolução de `MSEConfiguracoes`

Manter uma lista por site e evoluir seu schema para representar:

- configuração global;
- módulo;
- instância;
- summary;
- versão do settings schema;
- estado de rascunho/publicado;
- versão do módulo que validou a configuração;
- timestamps e autoria nativos;
- ETag para concorrência.

O JSON continuará sendo o formato técnico de armazenamento, mas nunca será a
interface primária do gestor.

### 8.2 Migração de configurações

Cada módulo deverá fornecer migrações puras entre versões de settings:

```text
settings v1 -> v2 -> v3
```

As migrações deverão:

- preservar valores reconhecidos;
- aplicar defaults novos;
- rejeitar perdas ambíguas;
- produzir relatório antes da gravação;
- manter rollback por versionamento da lista;
- ser testadas com configurações reais anonimizadas.

## 9. Listas e bibliotecas SharePoint

### 9.1 Convenção de nomes

Título amigável:

```text
<Módulo> - <Função>
```

Exemplos:

- `Videoteca - Taxonomia`;
- `Videoteca - Vídeos`;
- `Fórum - Reações`;
- `Fórum - Respostas`;
- `Fórum - Taxonomia`;
- `Explore Mais - Links`.

Nome interno estável:

```text
VideotecaTaxonomia
VideotecaVideos
ForumReacoes
ForumRespostas
ForumTaxonomia
RecursosLinks
```

O nome público de um módulo poderá mudar sem renomear seu namespace técnico.

### 9.2 Múltiplas instâncias

Antes da implementação, decidir por módulo se ele admite:

- uma instalação por site; ou
- várias instâncias compartilhando dados; ou
- várias instâncias com dados isolados.

Quando houver isolamento, o instalador deverá gerar um identificador de
instância estável. O usuário não informará nomes internos manualmente.

### 9.3 Provisionamento

Remover o provisionamento automático dos loaders. Criar três operações:

1. `inspect`: somente leitura e geração do plano;
2. `apply`: execução após confirmação explícita;
3. `verify`: releitura e validação integral.

O plano deverá mostrar listas, campos, índices, permissões e migrações. Nenhuma
operação destrutiva será executada implicitamente.

### 9.4 Migrações de schema

Cada migração deverá possuir:

- versão de origem e destino;
- pré-condições;
- execução idempotente;
- contagem de itens afetados;
- validação posterior;
- procedimento de rollback ou recuperação;
- registro administrativo da execução.

Remoções de campos serão realizadas somente depois de migração, validação e
período de compatibilidade.

## 10. Adaptador Modern Script Editor

### 10.1 Responsabilidade

O adaptador MSE deverá:

- descobrir a raiz do componente;
- identificar site, instância e configuração;
- carregar versões compatíveis de Core, UI e módulo;
- criar os serviços SharePoint;
- montar e desmontar o módulo;
- mostrar erros de bootstrap de forma compreensível;
- evitar carregamento duplicado de CSS e JavaScript;
- nunca conter regras de negócio.

### 10.2 Snippet mínimo

O conteúdo colado no MSE deverá ser reduzido a um bootstrap versionado:

```html
<div
  data-mse-module="videoteca"
  data-mse-instance="videoteca-principal">
</div>
<script src="__SITE_ASSETS__/mse-platform/host/mse/1.0.0/bootstrap.js"></script>
```

O gestor não deverá editar esse conteúdo. O Centro de Administração deverá
gerar o snippet ou orientar sua inserção com cópia controlada.

### 10.3 Preparação para hosts futuros

Criar interfaces documentadas para `HostContext`, `ModuleContext` e
`ConfigurationStore`. Não implementar adaptador SPFx agora. A prova de
desacoplamento será o host local de demonstração, não uma segunda tecnologia de
produção.

## 11. Versionamento independente

### 11.1 Pacotes

Versionar separadamente:

- `@mse-platform/core`;
- `@mse-platform/ui`;
- adaptador MSE;
- cada módulo;
- schemas de dados;
- schemas de settings.

Uma correção visual da Videoteca não deverá exigir nova versão do Core quando
o Core não mudou.

### 11.2 Compatibilidade

O manifesto declarará faixas SemVer. O bootstrap deverá recusar combinações
incompatíveis e informar a correção necessária.

### 11.3 Publicação

- gerar artefatos reproduzíveis;
- produzir checksums e manifesto da release;
- publicar pastas imutáveis;
- manter release anterior para rollback;
- validar imports e MIME após upload;
- registrar quais páginas e instâncias consomem cada versão.

## 12. Neutralização do produto público

Executar auditoria para remover do código público:

- URLs e GUIDs de sites consumidores;
- nomes de ambientes internos;
- dados pessoais ou exemplos reais;
- categorias e textos específicos de um consumidor;
- dependência obrigatória de uma marca;
- caminhos privados de publicação;
- scripts operacionais que pressuponham sessão corporativa.

Integrações específicas deverão permanecer nos repositórios dos consumidores.
Exemplos públicos usarão placeholders e dados fictícios.

## 13. Migração dos módulos existentes

### 13.1 Fase preparatória

1. Congelar e documentar o comportamento atual.
2. Mapear APIs, listas, snippets, configurações e dependências.
3. Criar testes de caracterização para full view e summary.
4. Registrar versões instaladas nos sites atuais.
5. Definir rollback para cada página.

### 13.2 Core

1. Separar runtime, configuração, SharePoint e provisionamento.
2. Remover regras de identidade específica do Core.
3. Introduzir contratos de host e módulo.
4. Deduplicar carregamento de ativos.
5. Preservar adaptadores de compatibilidade para módulos legados.

### 13.3 Videoteca

1. Criar manifesto e settings schema.
2. Mover montagem para a API pública do módulo.
3. Isolar full view e summary em entrypoints.
4. Separar runtime de provisionamento.
5. Criar administração amigável de categoria e tags.
6. Eliminar edição manual de IDs das relações.
7. Migrar configurações e validar os vídeos existentes.

### 13.4 Fórum

1. Criar manifesto e settings schema.
2. Declarar recursos opcionais: editor, notificações, reações e summary.
3. Manter permissões e autoria sob responsabilidade do serviço de dados.
4. Separar administração de taxonomia do uso cotidiano.
5. Preservar deep links e dados legados.

### 13.5 Explore Mais

1. Adotar namespace público `explore-mais`, preservando `recursos` como alias
   técnico de compatibilidade durante a transição.
2. Criar manifesto e settings schema.
3. Parametrizar agrupamento, quantidade e summary.
4. Preservar links e categorias existentes.

### 13.6 Home

Avaliar Home como compositor, não apenas como módulo de conteúdo. Ela deverá:

- descobrir summaries habilitados;
- ordenar seções por configuração;
- não conhecer internamente Fórum, Videoteca ou Explore Mais;
- renderizar ausência ou falha de um summary sem bloquear os demais.

## 14. Estratégia de compatibilidade

Durante a transição:

- manter loaders e snippets antigos funcionando;
- introduzir adaptadores para o novo contrato;
- não migrar todos os módulos em uma única publicação;
- usar feature flags por instância;
- homologar módulo por módulo;
- permitir rollback apenas trocando a versão no snippet;
- remover compatibilidade somente em uma versão major documentada.

## 15. Testes obrigatórios

### 15.1 Unitários

- resolução e validação de configuração;
- settings schemas;
- migrações de configuração e dados;
- serviços de dados;
- montagem e descarte;
- full view e summary;
- compatibilidade SemVer.

### 15.2 Integração

- provisionamento idempotente;
- permissões insuficientes;
- lista ausente ou incompatível;
- ETag e conflito de edição;
- múltiplos módulos na mesma página;
- múltiplas instâncias do mesmo módulo;
- coexistência entre versões durante migração.

### 15.3 Interface

- desktop, tablet, celular e zoom;
- temas claro e escuro;
- navegação por teclado;
- leitores de tela;
- contraste;
- textos longos e localização;
- estados vazio, carregando, erro e sem permissão;
- pré-visualização fiel ao resultado publicado.

### 15.4 Publicação MSE

- snippet mínimo válido;
- CSP e MIME;
- cache busting por versão;
- deduplicação de ativos;
- carregamento independente da ordem das webparts;
- página com full module e página com vários summaries.

## 16. Documentação pública

Produzir:

- visão arquitetural;
- guia de instalação pelo MSE;
- guia do gestor de site;
- guia para criar módulos;
- referência do manifesto;
- referência de settings schema;
- referência de temas e tokens;
- convenção de listas e campos;
- política de versões e compatibilidade;
- guia de migrações;
- modelo de segurança;
- troubleshooting;
- política de contribuição e revisão;
- módulo de exemplo completo, sem dados corporativos.

## 17. Segurança e governança

- separar permissões de visitante, editor de conteúdo, gestor e mantenedor;
- usar privilégios da sessão atual, sem elevação;
- validar URLs, texto, rich text e arquivos;
- nunca persistir segredos em listas ou configuração;
- registrar alterações administrativas por autoria e versionamento;
- exigir confirmação para provisionamento e migração;
- oferecer diagnóstico sem expor dados sensíveis;
- documentar responsabilidade e suporte de cada módulo.

## 18. Fases de implementação

### Fase 0 — Baseline e contratos

Entregas:

- inventário do comportamento atual;
- ADRs das decisões arquiteturais;
- manifesto v1;
- settings schema v1;
- contratos de host e módulo;
- matriz de compatibilidade inicial.

Critério de aceite: módulo de exemplo monta no host local e no MSE usando a
mesma API pública.

### Fase 1 — Core modular e adaptador MSE

Entregas:

- reorganização interna do Core;
- adaptador MSE;
- loader compartilhado com deduplicação;
- compatibilidade com snippets legados;
- tema-base neutro.

Critério de aceite: dois módulos e dois summaries coexistem sem colisão ou
dependência de ordem.

### Fase 2 — Centro de Administração MVP

Entregas:

- catálogo de módulos;
- renderer de settings;
- edição global e por instância;
- rascunho, publicação, reset e preview;
- diagnóstico somente leitura.

Critério de aceite: gestor configura um módulo sem visualizar ou editar JSON.

### Fase 3 — Instalador e migrações

Entregas:

- inspect/apply/verify;
- planos legíveis;
- registro de execução;
- migrations de schema e settings;
- remoção do provisionamento dos loaders.

Critério de aceite: runtime funciona com permissão de leitura e instalação só
ocorre por ação administrativa explícita.

### Fase 4 — Migração da Videoteca

Escolhida primeiro por já possuir biblioteca, taxonomia, tags, full view e
summary. Validará o contrato mais abrangente.

Critério de aceite: paridade funcional, administração amigável da taxonomia e
rollback para a versão anterior.

### Fase 5 — Migração do Explore Mais

Validará um módulo simples, somente leitura e gerenciado por lista.

Critério de aceite: instalação em site limpo sem referências ao projeto TD.

### Fase 6 — Migração do Fórum

Será migrado depois da estabilização dos contratos por possuir maior risco,
permissões, escrita, rich text, notificações e dados relacionados.

Critério de aceite: todos os fluxos atuais preservados, inclusive deep links e
dados legados.

### Fase 7 — Home como compositor

Entregas:

- descoberta dos summaries habilitados;
- ordenação configurável;
- isolamento de falhas;
- configuração de seções pelo gestor.

Critério de aceite: adicionar ou remover um summary sem editar o código da Home.

### Fase 8 — Publicação pública estável

Entregas:

- release `1.0.0`;
- documentação completa;
- exemplo local;
- templates de issue e pull request;
- política de suporte e segurança;
- changelog e guia de upgrade.

## 19. Critérios globais de conclusão

O trabalho será considerado concluído quando:

1. os três módulos estiverem instaláveis em um site limpo;
2. nenhum módulo provisionar estruturas durante o runtime;
3. o gestor não precisar editar código ou JSON;
4. full views e summaries forem configuráveis independentemente;
5. Core, UI e módulos tiverem versões independentes;
6. listas seguirem convenção pública e nomes internos estáveis;
7. módulos existentes forem migrados sem perda de dados;
8. o MSE for o único host produtivo exigido e estiver coberto por testes;
9. a lógica dos módulos não depender diretamente do MSE;
10. exemplos públicos não contiverem dados ou referências privadas;
11. houver instalação, diagnóstico, atualização e rollback documentados;
12. um desenvolvedor externo conseguir criar um módulo seguindo apenas a
    documentação pública.

## 20. Ordem recomendada para início

1. Aprovar este plano e registrar as decisões como ADRs.
2. Criar manifesto e settings schema v1.
3. Implementar o módulo de exemplo e o host local de teste.
4. Extrair o adaptador MSE compartilhado.
5. Implementar o Centro de Administração MVP.
6. Separar provisionamento de runtime.
7. Migrar a Videoteca como piloto.
8. Validar a experiência com gestores de conteúdo.
9. Migrar Explore Mais e Fórum.
10. Converter Home em compositor de summaries.
11. remover compatibilidade legada somente após uma release major e janela de
    transição documentada.

## 21. Rastreabilidade das oito recomendações

| Recomendação | Tratamento obrigatório no plano |
|---|---|
| 1. Evitar um segundo Core por módulo | Seções 4 e 5 substituem o “Core do módulo” por manifesto, orquestração, dados, view e schema. |
| 2. Não transformar settings em CSS livre | Seção 6 limita parâmetros a campos tipados, presets e tokens validados. |
| 3. Evitar uma UI de settings reimplementada por módulo | Seção 7 cria um Centro de Administração e um renderer comum dirigido por schema. |
| 4. Separar provisionamento e runtime | Seções 9.3, 9.4 e Fase 3 proíbem provisionamento automático nos loaders. |
| 5. Não acoplar arquitetura ao MSE | Seções 5 e 10 isolam o MSE em um adaptador, mantendo-o como único host implementado. |
| 6. Preparar hosts futuros sem implementar SPFx agora | Seções 2.2 e 10.3 restringem a entrega ao MSE e usam o host local apenas como prova de desacoplamento. |
| 7. Desacoplar versões de Core, UI e módulos | Seção 11 estabelece SemVer independente, faixas de compatibilidade e publicação imutável. |
| 8. Não expor JSON ao gestor | Seções 6, 7 e 8 mantêm JSON somente como persistência técnica e exigem formulários amigáveis. |
