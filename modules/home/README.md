# Home

Apresentação inicial do portal com chamada, título, descrição, dois botões,
animação de constelação e indicadores. [Uso](USAGE.md) ·
[Versões](../../docs/COMPATIBILIDADE-E-VERSIONAMENTO.md).

## Configuração

`settings-schema.js` permite editar textos, destinos dos botões, dois trechos
de destaque do título e suas cores (tema ou personalizada), além dos ajustes
comuns de layout, título, tipografia e tema.

`config.home.stats` pode fornecer indicadores pela integração. Sem esses dados,
`resolveHomeStats` tenta consultar `services.metrics.itemCount` para vídeos e
tópicos. Sem serviço ou em caso de erro, utiliza os valores padrão.

Os padrões 17 encontros e 1×/mês são fixos. As métricas dinâmicas usam ItemCount
das listas, não medem pessoas, conclusão de vídeos ou todas as respostas do
Fórum. Confirme a adequação dos rótulos antes de apresentar os números.

## Dependências e limites

A Home não possui schema próprio de conteúdo nem visualização summary. O
snippet gerado habilita Fórum, Explore Mais e Videoteca para a integração;
por isso suas estruturas devem existir mesmo que o hero não as mostre.

O `mount` atual monta apenas o hero. Os helpers de seções/slots existentes não
transformam a Home em compositor automático: insira resumos como instâncias
separadas na página.

A animação respeita movimento reduzido. Execute
`npm --prefix modules/home test` a partir da raiz.
