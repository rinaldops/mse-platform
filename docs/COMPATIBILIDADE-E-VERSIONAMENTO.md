# Compatibilidade e versionamento

Core, UI, adaptador MSE, administração e módulos possuem versões independentes.
Uma release da plataforma registra a combinação validada desses pacotes, mas
não obriga que todos avancem juntos.

## Matriz da release 0.8.1

| Pacote | Versão | Compatibilidade com Core |
|---|---:|---|
| Core | 0.8.0 | — |
| UI | 0.7.7 | Core 0.x |
| Fórum | 0.5.0 | `>=0.8.0 <1.0.0` |
| Explore Mais | 0.5.0 | `>=0.8.0 <1.0.0` |
| Videoteca | 0.8.0 | `>=0.8.0 <1.0.0` |
| Home | 0.5.0 | `>=0.8.0 <1.0.0` |
| Administração | 0.1.0 | Core 0.8.x |
| Adaptador MSE | 0.1.0 | Core 0.8.x |

## Regras

- Pastas publicadas são imutáveis.
- Cada combinação validada é publicada sob
  `SiteAssets/mse-platform/releases/<versão-da-plataforma>/`, preservando os
  imports relativos do pacote.
- Uma correção de módulo não altera a versão do Core quando seu contrato não
  mudou.
- O bootstrap recusa módulos fora da faixa `coreCompatibility`.
- A versão publicada de uma configuração fica registrada em
  `MSEConfiguracoes` junto com a versão de seu settings schema.
- Rollback troca apenas a referência da instância para uma combinação anterior
  já publicada; arquivos existentes nunca são sobrescritos.

## Upgrade a partir dos loaders legados

1. Manter o snippet atual disponível para rollback.
2. Publicar a release nova em uma pasta inédita.
3. Executar `inspect`, revisar o plano e somente então executar `apply`.
4. Criar uma configuração em rascunho e validar a pré-visualização.
5. Publicar a configuração.
6. Trocar uma única página piloto para o bootstrap MSE 0.1.0.
7. Executar `verify` e testes funcionais.
8. Migrar as páginas restantes gradualmente.

Os arquivos `forum.js`, `recursos.js`, `videoteca.js`, `home.js` e loaders
antigos são adaptadores de compatibilidade. Eles não integram o novo contrato
e só devem ser removidos em uma versão major posterior.
