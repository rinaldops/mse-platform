# com_cpanel — Painel inicial do Administrator

Componente administrativo enxuto, alinhado ao vocabulário do Joomla! e às listas `MSE*` do Site Kernel. O SharePoint continua sendo a autoridade de permissões; o componente não implementa ACL própria.

Esta pasta concentra o **painel inicial** (`control-panel.js`, rota
`com_cpanel`) e, por não haver hoje um lugar mais natural do Joomla! para
eles morarem, também o **roteador comum do Administrator**
(`router.js#parseAdministratorRoute`/`resolveAdministratorScreen`) e o
**shell de montagem** (`component.js#mount`) que despacha cada `option`
para o componente físico correspondente em `components/com_xxx/`
(decisão registrada na Fase 1 da normalização Joomla!, ver
`docs/JOOMLA-CONVENCOES-E-MIGRACAO.md`). O roteamento em si não é "do
painel" — é infraestrutura comum do Administrator — mas fica aqui por
falta de um nome Joomla! mais específico para esse papel.

Rotas:

- `#/administrator?option=com_cpanel`
- `#/administrator?option=com_config` → `components/com_config/`
- `#/administrator?option=com_diagnostics` → `components/com_diagnostics/` — diagnóstico estrutural e permissões nativas
- `#/administrator?option=com_content` → `components/com_content/` — Publicador
- `#/administrator?option=com_extensions` → `components/com_extensions/`
- `#/administrator?option=com_menus` → `components/com_menus/`
- `#/administrator?option=com_modules` → `components/com_modules/`
- `#/administrator?option=com_installer` → `components/com_installer/`

## Publicador

A tela `com_content`/`com_publisher` (`components/com_content/publisher.js`) lê e grava artigos em `CAMAPPublicacoes` (apresentada no SharePoint como `MSE Publicacoes`). A listagem e o formulário são deliberadamente mínimos para o MVP: título, slug, resumo, corpo seguro, estado editorial, vigência, destaque, ordem e categoria. Criação usa `createAdminItem`; edição usa `updateAdminItem`, que busca a ETag atual antes de gravar e propaga conflitos de concorrência.

Categorias, tags, mídia avançada, histórico visual e workflow editorial permanecem extensões futuras — ver as pastas reservadas `components/com_categories/`, `components/com_tags/`, `components/com_media/`. O corpo é armazenado como texto HTML seguro e passa pela política de `core/rich-text.js` antes da gravação.

As telas de Extensões (`components/com_extensions/`), Menus (`components/com_menus/`) e Módulos (`components/com_modules/`) já têm editor CRUD completo. Configuração global (`components/com_config/`) e Instalador (`components/com_installer/`) ainda são telas estruturais/placeholder — ver `README.md` de cada uma.
