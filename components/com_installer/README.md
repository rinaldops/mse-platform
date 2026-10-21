# com_installer — Instalador do kernel

Componente `com_installer` do Administrator, seguindo a convenção de
diretórios do Joomla! (`components/com_xxx/`).

Conecta a tela a `services.kernelInstaller`
(`kernel/installer.js#createKernelInstaller`, injetado por
`host-adapters/modern-script-editor/site-boot.js#buildAdministratorServices`):
inspeção e verificação são sempre somente leitura; aplicar o provisionamento
exige confirmação explícita (diálogo inicial + confirmação do plano
detalhado antes de qualquer escrita real no SharePoint).

Não suporta o contrato legado "instalador modular por `moduleId`"
(`admin/installer.js`) — esse é o modelo antigo de 1 MSE por módulo, fora do
escopo do Site Kernel/Administrator.

Ver `test/` para a cobertura.
