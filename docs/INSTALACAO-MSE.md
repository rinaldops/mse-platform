# Instalação pelo Modern Script Editor

## Pré-requisitos

Confirme o site e o ambiente DEV/homologação antes de publicar. São necessários
MSE com execução de scripts habilitada, permissão administrativa nas listas e
SiteAssets e uma release validada. Não incorpore credenciais aos arquivos.

## Gerar e publicar

Na raiz do repositório, com Node.js e npm disponíveis:

```powershell
npm test
npm --prefix modules/home test
npm --prefix modules/forum test
npm --prefix modules/recursos test
npm --prefix modules/videoteca test
$releaseVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
$releaseOutput = Join-Path $env:TEMP ("mse-release-" + [guid]::NewGuid().ToString())
node tools/build-release.js $releaseVersion $releaseOutput
node tools/verify-release.js $releaseOutput
```

Pare se qualquer comando falhar. O destino deve ser inédito. Envie a árvore
completa para `__SITE_ASSETS__/mse-platform/releases/<versão>/`, substituindo
`__SITE_ASSETS__` pelo caminho server-relative da biblioteca do site.
Leia as [divergências de metadados](COMPATIBILIDADE-E-VERSIONAMENTO.md) antes
de aprovar uma combinação para publicação.

## Primeira abertura administrativa

Para gerar o snippet inicial, execute localmente e copie a saída. Substitua o
placeholder `/__SITE_ASSETS__` pelo caminho server-relative completo de
SiteAssets (sem duplicar a barra inicial) somente no ambiente de destino:

```powershell
node --input-type=module -e 'import { generateMseSnippet } from "./admin/snippet-generator.js"; import { readFileSync } from "node:fs"; const v = JSON.parse(readFileSync("package.json", "utf8")).version; console.log(generateMseSnippet({ moduleId: "mse-admin", instanceId: "mse-admin", releaseBase: "/__SITE_ASSETS__/mse-platform/releases/" + v }));'
```

Insira o HTML gerado numa página administrativa com MSE. O snippet usa
`runner.js` externo para ambientes onde scripts inline não executam de forma
confiável. A raiz e o script precisam manter o mesmo ID de instância.

1. Selecione Preparar configuração e confirme o plano de MSEConfiguracoes.
2. Escolha o módulo e Instalar/atualizar estruturas, quando disponível.
3. Revise o plano, confirme a operação e aguarde a verificação.
4. Corrija falta de permissão ou incompatibilidade de campos antes de continuar.

Instalação segue inspect (leitura), apply (confirmação) e verify (releitura).
O runtime atual não cria listas ou campos.

## Configurar e usar

1. Crie uma instância com identificador simples, como `videoteca-principal`.
2. Escolha Full ou Summary quando suportado.
3. Ajuste o formulário e salve como rascunho.
4. Publique a configuração e gere o snippet.
5. Insira o snippet na página e valide a apresentação publicada.

O runtime lê configurações publicadas. Desativação preserva dados e settings.
A prévia do formulário depende de um callback `services.preview`; a integração
padrão não o fornece. Valide em página piloto, sem pressupor prévia visual no Admin.

Importação aceita JSON até 64 KB, filtra campos não declarados e permanece
como edição não salva. Exportação não inclui autoria nem conteúdo das listas.
O histórico mostra até vinte versões nativas, sujeito às permissões do usuário.
A gravação usa ETag para recusar sobrescrita de edição concorrente.

## Conteúdo, dependências e validação

Siga os guias de [Fórum](../modules/forum/USAGE.md),
[Videoteca](../modules/videoteca/USAGE.md), [Explore Mais](../modules/recursos/USAGE.md)
e [Home](../modules/home/USAGE.md). A Home gerada habilita os três módulos de
conteúdo para métricas: prepare suas estruturas antes de abri-la.

Valide MIME, CSP, imports, permissões, teclado, zoom e múltiplas instâncias.
Em ambiente corporativo, a automação de navegador deve seguir a ferramenta
obrigatória do workspace. Registre evidências do ambiente em local privado.

## Diagnóstico e rollback

- Falha ao carregar: confira caminho da release, scripts habilitados e console.
- Lista ausente: execute o instalador com permissão administrativa.
- Configuração sem efeito: confirme módulo, ID, visualização e publicação.
- Conflito de edição: recarregue o registro antes de salvar novamente.
- Falha de editor: confira os assets vendor e use explicitamente default para
  testar o editor nativo; não remova arquivos de uma release publicada.

Para rollback, restaure o snippet anterior e, se necessário, a versão anterior
de MSEConfiguracoes. Não exclua conteúdo nem substitua assets em cache.

## Limite da desativação atual

O store exclui configurações inativas da leitura, mas o bootstrap pode montar
uma instância sem configuração usando defaults. Desativar no Admin não deve
ser tratado como garantia de ocultar a webpart: remova o snippet da página
quando precisar retirar o componente. Se o item estiver em rascunho, o store
busca a última configuração publicada entre até cinquenta versões anteriores.
