# Videoteca

Catálogo de gravações e treinamentos mantidos em biblioteca SharePoint.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Título, descrição, duração, data, apresentadores, evento e edição.
- Categorias e tags resolvidas pela taxonomia.
- Busca por título, apresentador, categoria e tags.
- Filtros e ordenação por recentes, visualizações ou menor duração.
- Trilhas/grade, grupos por categoria e paginação de 12 vídeos.
- Carrossel com seleção aleatória de até seis vídeos e seção de recentes.
- Miniaturas configuradas ou resolvidas pela biblioteca SharePoint.
- Abertura do arquivo em outra aba e contagem de aberturas.
- Resumo com vídeos ordenados por aberturas na seleção geral, amostra aleatória
  por categoria e acesso à página completa.

O carrossel pausa em hover/foco e respeita movimento reduzido. O carrossel prioriza o vídeo solicitado por link direto quando encontrado.
O catálogo de dados também disponibiliza itens marcados `Destaque`, ordenados por
`OrdemCarrossel`; não confundir essa seleção com a aleatória da página completa.

## Estruturas e configuração

O schema atual usa `VideotecaVideos` (biblioteca), `VideotecaTaxonomia` e
`VideotecaVideoTags`. Pastas são excluídas da consulta. A instalação é
administrativa: a abertura normal não provisiona listas ou campos.

Configure `videoteca.presenterSuffixes` para ocultar sufixos de nomes
(separados por ponto e vírgula) e `videotecaSummary.pageHref` para o resumo.
Os resumos levam à página da Videoteca, não diretamente à gravação.

## Limites

- Minha lista e Sugerir tema não têm ação implementada.
- Continuar assistindo usa `localStorage` (`mse-videoteca-recentes`) e registra
  aberturas; não mede posição, tempo assistido ou conclusão, nem sincroniza dispositivos.
- Visualizações contam aberturas e exigem permissão de escrita para atualização.
- Filtros, ordenação e visualização ficam em memória, sem link compartilhável.
- A manutenção de conteúdo ocorre nas listas/biblioteca, sem editor nesta página.

Execute `npm --prefix modules/videoteca test` a partir da raiz.
