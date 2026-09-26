# mse-platform

Plataforma JavaScript para portais de conteúdo e colaboração no SharePoint,
hospedada pelo Modern Script Editor (MSE). Os arquivos ficam em SiteAssets;
listas e bibliotecas SharePoint armazenam conteúdo e configurações, usando as
permissões da sessão do usuário.

## Funcionalidades

| Módulo | Finalidade | Visualizações |
| --- | --- | --- |
| [Fórum](modules/forum/README.md) | Tópicos, respostas, reações, soluções e notificações | Completa e resumo |
| [Videoteca](modules/videoteca/README.md) | Catálogo de gravações com categorias, tags e busca | Completa e resumo |
| [Explore Mais](modules/recursos/README.md) | Links e materiais organizados por categoria | Completa e resumo |
| [Home](modules/home/README.md) | Apresentação do portal, ações e indicadores | Completa |
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
- `admin/`: catálogo, formulários, instalação e geração de snippets.
- `host-adapters/`: integração com o Modern Script Editor.
- `modules/`: módulos e componentes UI reutilizáveis.
- `themes/`: tema-base.
- `examples/`: módulo de exemplo e hosts locais.
- `tools/`: empacotamento e verificação de releases.
- `dist/`: cópias históricas de pacotes; sua documentação corresponde à versão arquivada.

Consulte os [contratos](docs/CONTRATOS-DE-MODULO.md), o [Core](core/README.md),
a [UI](modules/ui/README.md) e os [editores](docs/EDITORES-RICOS.md).

```powershell
npm test
npm --prefix modules/home test
npm --prefix modules/forum test
npm --prefix modules/recursos test
npm --prefix modules/videoteca test
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
