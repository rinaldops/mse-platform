# plugins/extension

Grupo de plugins para validação e ciclo de vida das extensões do Mini Joomla.

## Plugin disponível

- `manifest-validator/`: valida manifestos declarativos de extensões sem fazer
  instalação, persistência ou alteração de permissões.

A instalação e a persistência continuam sob responsabilidade do Installer e do
SharePoint. O carregamento automático pelo Site Kernel será integrado em etapa
posterior pelo plugin registry/loader.
