# mse-platform

Plataforma JavaScript para portais de conteúdo e colaboração no SharePoint,
hospedada pelo Modern Script Editor (MSE). Os arquivos ficam em SiteAssets;
listas e bibliotecas SharePoint armazenam conteúdo e configurações, usando as
permissões da sessão do usuário.

> **Em planejamento:** [Site Kernel](docs/PLANO-SITE-KERNEL-MSE.md) — um único MSE renderiza o site inteiro (Componentes, Módulos, menu e posições, no modelo do Joomla!). O funcionamento atual descrito aqui permanece suportado.

> **Convenções Joomla!:** a auditoria estrutural e o plano de migração estão em [JOOMLA-CONVENCOES-E-MIGRACAO.md](docs/JOOMLA-CONVENCOES-E-MIGRACAO.md); a tabela de equivalência definitiva, pós-normalização, está em [CONVENCAO-JOOMLA.md](docs/CONVENCAO-JOOMLA.md).

## Funcionalidades

| Módulo | Finalidade | Visualizações |
| --- | --- | --- |
| [Fórum](modules/mod_forum/README.md) | Tópicos, respostas, reações, soluções e notificações | Completa e resumo |
| [Videoteca](modules/mod_videoteca/README.md) | Catálogo de gravações com categorias, tags e busca | Completa e resumo |
| [Explore Mais](modules/mod_recursos/README.md) | Links e materiais organizados por categoria | Completa e resumo |
| [Home](modules/mod_home/README.md) | Apresentação do portal, ações e indicadores | Completa |
| Administração | Instalação de estruturas e gestão de instâncias | Completa |

O Centro de Administração cria instâncias, edita formulários, salva rascunhos,
publica configurações, ativa/desativa componentes, gera snippets, importa/exporta
configurações e consulta histórico. Uma instância é uma apresentação configurada;
ela não cria automaticamente uma base de conteúdo exclusiva.

## Instalação e operação

Comece por [Instalação MSE](docs/INSTALACAO-MSE.md). A versão da plataforma está
no [package.json](package.json); diferenças entre versões de pacotes e manifestos
estão na [matriz de versões](docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

Publique a árvore completa em `SiteAssets/mse-platform/releases/<versão>/`.
Pastas publicadas são imutáveis. O runtime atual não cria listas ou campos;
a instalação ocorre por ação administrativa confirmada. Snippets e loaders
antigos permanecem para compatibilidade, não como guia de novas instalações.

## Estrutura e desenvolvimento

- `core/`: REST, configuração, contratos, provisionamento e texto rico.
- `admin/`: catálogo, formulários, instalação e geração de snippets. **Painel administrativo histórico (pré-Site-Kernel, "um MSE por módulo"), congelado deliberadamente desde a normalização Joomla! — não é movido nem renomeado** (ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`); não confundir com o Administrator do Site Kernel, em `components/com_cpanel/` e demais `components/com_xxx/`.
- `components/`: Administrator do Site Kernel, um componente físico por `option=com_xxx` (convenção Joomla!, ver `docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`) — `com_cpanel` (painel inicial + roteador comum), `com_content` (Publicador), `com_extensions`, `com_menus`, `com_modules`, `com_diagnostics`, e as pastas reservadas/fora de escopo `com_config`, `com_installer`, `com_categories`, `com_tags`, `com_media`. `components/_shared/` não é um componente Joomla! — é infraestrutura interna comum.
- `host-adapters/`: integração com o Modern Script Editor.
- `modules/`: módulos `mod_<nome>` (convenção Joomla!, ex. `modules/mod_forum/`, `modules/mod_home/`, `modules/mod_recursos/`, `modules/mod_videoteca/`).
- `libraries/`: infraestrutura visual compartilhada entre módulos, não é um módulo Joomla! (`libraries/ui/`: accordion/carousel).
- `plugins/`: reservada, convenção `plugins/<grupo>/<nome>/` para uso futuro — nenhum plugin real ainda.
- `themes/`: tema-base.
- `examples/`: módulo de exemplo e hosts locais.
- `tools/`: empacotamento e verificação de releases.
- `dist/`: cópias históricas de pacotes; sua documentação corresponde à versão arquivada.

Consulte os [contratos](docs/CONTRATOS-DE-MODULO.md), o [Core](core/README.md),
a [UI](libraries/ui/README.md) e os [editores](docs/EDITORES-RICOS.md).

```powershell
npm test
npm --prefix modules/mod_home test
npm --prefix modules/mod_forum test
npm --prefix modules/mod_recursos test
npm --prefix modules/mod_videoteca test
```

Sirva a raiz por HTTP para usar `examples/local-host/` e `examples/admin-host/`.
O host administrativo local usa memória e perde os dados ao recarregar. Em
ambiente corporativo, use o fluxo de navegador autorizado pelo workspace.

## Limites conhecidos

- Manifestos de módulos e administração ainda declaram `preview`.
- Favoritos e sugestões da Videoteca/Explore Mais são botões sem fluxo implementado.
- Vídeos recentes são histórico local de abertura, não progresso de reprodução.
- Atalhos mais usados do Explore Mais seguem curadoria, não cliques medidos.
- A Home não monta summaries automaticamente e possui indicadores fixos no padrão.
- A prévia administrativa depende de `services.preview`, ausente na integração padrão.
- Testes locais não comprovam homologação, permissões, e-mail ou acessibilidade em produção.

Exemplos públicos usam placeholders. URLs, identificadores e evidências de sites
consumidores pertencem à documentação privada do ambiente.
