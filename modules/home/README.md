# mse-home

Hero da página "Tecnologias Digitais" — headline, ações de entrada (Fórum,
Videoteca) e uma faixa de indicadores. Sem dependência de lista do SharePoint
(V1 estática, conforme `TD/PLANO-IMPLEMENTACAO.md` §2.1); uma V2 futura pode
ler contagens reais via REST depois que Fórum/Videoteca estiverem em produção.

## Arquivos

- `home.js` — `mountHome()`, integra com o `core` (`mountModule`).
- `home-view.js` — renderização do hero + animação de constelação em canvas
  (respeita `prefers-reduced-motion`); exporta `normalizeStats` (testável) e
  `DEFAULT_STATS`.
- `home.css` — estilos com tokens próprios (`--home-*`), ambiente azul claro
  neutro conforme `PLANO-IMPLEMENTACAO.md` §3.
- `home-loader.js` — script autoexecutável para o Modern Script Editor.

## Uso

Veja [`USAGE.md`](USAGE.md) para o passo a passo de publicação e o snippet em
[`snippets/modern-script-editor.html`](snippets/modern-script-editor.html).

## Testes

```
npm test
```
