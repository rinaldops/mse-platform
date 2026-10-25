# Imagem aleatória

Módulo de posição que exibe 1 imagem escolhida aleatoriamente entre os
arquivos da biblioteca de mídia (`MSEMedia`, `components/com_media`).
Equivalente ao `mod_random_image` do Joomla!.
[Uso](USAGE.md) · [Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Funcionalidades

- Lê os arquivos de `MSEMedia` via `services.adminClient` +
  `services.listIds.MSEMedia` (mesmo par já usado por
  `components/com_media/media-editor.js`) — nome de lista FIXO, sem lista
  de fallback (diferente de `MSEPublicacoes`, usada por
  `mod_tags_popular`/`mod_tags_similar`/`mod_related_items`).
- Filtra por extensão de arquivo (`extensions`, lista separada por vírgula,
  comparação case-insensitive contra o sufixo de `FileLeafRef`).
- Escolhe 1 item aleatoriamente entre os filtrados.
- Exibe a imagem (`FileRef` como `src`, `AltText`/`FileLeafRef` como `alt`),
  limitada a `maxWidth` pixels de largura de exibição.
- Envolve a imagem em um link para `link` quando configurado.
- Mostra `noImageText` quando não há nenhuma imagem (biblioteca vazia ou
  nenhum arquivo com extensão aceita).
- Posição padrão: `lateral` (ver `templates/mse-default/template.json`).

## Limites (MVP)

- `folder` (Joomla! real: pasta do sistema de arquivos a varrer) fica fora:
  `MSEMedia` é uma biblioteca única e plana (mesmo princípio de
  `components/com_media`), sem subpastas.
- `width`/`height` (Joomla! real: calculados com base nas dimensões REAIS
  do arquivo via `getimagesize`, preservando proporção) ficam fora:
  `MSEMedia` não declara campos de dimensão da imagem — este módulo só
  limita a largura de EXIBIÇÃO (`maxWidth`, via CSS), sem calcular
  proporção real.
- `layout`/`moduleclass_sfx` do Joomla! real ficam fora — sem layout
  alternativo hoje.

Execute `npm --prefix modules/mod_random_image test` a partir da raiz.
