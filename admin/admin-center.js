import { settingsDefaults } from "../core/module-contract.js";
import { expandSettings, getSettingValue, renderSettingsForm, setSettingValue } from "./settings-renderer.js";
import { exportConfiguration, importConfiguration } from "./config-transfer.js";

export function mountAdminCenter({ root, catalog, configurationStore, diagnose, provisionConfiguration,
  installer, generateSnippet, load, save, preview } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento HTML.");
  if (!catalog?.list) throw new TypeError("catalog é obrigatório.");
  const document = root.ownerDocument;
  const shell = document.createElement("div");
  shell.className = "mse-admin";
  const heading = document.createElement("h1");
  heading.textContent = "Administração de módulos";
  const prepareButton = document.createElement("button");
  prepareButton.type = "button";
  prepareButton.textContent = "Preparar configuração";
  const installButton = document.createElement("button");
  installButton.type = "button";
  installButton.textContent = "Instalar/atualizar estruturas";
  installButton.disabled = true;
  const label = document.createElement("label");
  label.textContent = "Módulo";
  const selector = document.createElement("select");
  label.append(selector);
  const instanceLabel = document.createElement("label");
  instanceLabel.textContent = "Instância";
  const instanceSelector = document.createElement("select");
  instanceLabel.append(instanceSelector);
  const newInstance = document.createElement("div");
  newInstance.className = "mse-admin__new-instance";
  const instanceName = document.createElement("input");
  instanceName.placeholder = "nova-instancia";
  instanceName.setAttribute("aria-label", "Nome da nova instância");
  const instanceType = document.createElement("select");
  instanceType.setAttribute("aria-label", "Tipo da nova instância");
  [["Full", "Módulo completo"], ["Summary", "Resumo"]].forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    instanceType.append(option);
  });
  const createButton = document.createElement("button");
  createButton.type = "button";
  createButton.textContent = "Criar instância";
  newInstance.append(instanceName, instanceType, createButton);
  const editor = document.createElement("div");
  const publishButton = document.createElement("button");
  publishButton.type = "button";
  publishButton.textContent = "Publicar configuração";
  publishButton.disabled = true;
  const activationButton = document.createElement("button");
  activationButton.type = "button";
  activationButton.textContent = "Desativar instância";
  activationButton.disabled = true;
  const snippetButton = document.createElement("button");
  snippetButton.type = "button";
  snippetButton.textContent = "Gerar snippet MSE";
  snippetButton.disabled = true;
  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.textContent = "Exportar configuração";
  exportButton.disabled = true;
  const historyButton = document.createElement("button");
  historyButton.type = "button";
  historyButton.textContent = "Ver histórico";
  historyButton.disabled = true;
  const historyOutput = document.createElement("div");
  historyOutput.hidden = true;
  historyOutput.setAttribute("aria-live", "polite");
  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.textContent = "Importar configuração";
  importButton.disabled = true;
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.hidden = true;
  const snippetOutput = document.createElement("textarea");
  snippetOutput.readOnly = true;
  snippetOutput.hidden = true;
  snippetOutput.setAttribute("aria-label", "Snippet Modern Script Editor");
  const diagnostic = document.createElement("p");
  diagnostic.className = "mse-admin__diagnostic";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const instanceActions = document.createElement("div");
  instanceActions.className = "mse-admin__actions";
  instanceActions.append(publishButton, activationButton, historyButton, exportButton, importButton, snippetButton);
  shell.append(heading, prepareButton, label, installButton, diagnostic, instanceLabel, newInstance, editor, instanceActions, historyOutput, importInput, snippetOutput, status);
  root.replaceChildren(shell);

  catalog.list().forEach(({ manifest }) => {
    const option = document.createElement("option");
    option.value = manifest.id;
    option.textContent = `${manifest.displayName} (${manifest.version})`;
    selector.append(option);
  });

  let currentEntry = null;
  let currentRecord = null;
  let currentForm = null;

  async function edit(record) {
    currentRecord = record;
    currentForm = renderSettingsForm({
      root: editor,
      schema: currentEntry.settingsSchema,
      value: record.configuration,
      onPreview: (configuration) => preview?.(currentEntry.manifest, configuration),
      onSubmit: async (configuration) => {
        status.textContent = "Salvando...";
        try {
          currentRecord = configurationStore
            ? await configurationStore.save(currentRecord, configuration, { state: "Rascunho" })
            : await save?.(currentEntry.manifest, configuration);
          status.textContent = "Configuração salva.";
          publishButton.disabled = !configurationStore;
        } catch (error) {
          status.textContent = error?.code === "concurrency-conflict"
            ? "A configuração foi alterada por outra pessoa. Recarregue antes de salvar."
            : "Não foi possível salvar a configuração.";
        }
      },
      onReset: (configuration) => preview?.(currentEntry.manifest, configuration)
    });
    publishButton.disabled = !configurationStore;
    activationButton.disabled = !configurationStore;
    activationButton.textContent = record.active === false ? "Ativar instância" : "Desativar instância";
    exportButton.disabled = false;
    importButton.disabled = false;
    historyButton.disabled = typeof configurationStore?.history !== "function";
    historyOutput.hidden = true;
    snippetButton.disabled = typeof generateSnippet !== "function";
  }

  async function openInstance(itemId) {
    if (!itemId) {
      editor.replaceChildren();
      currentRecord = null;
      activationButton.disabled = true;
      exportButton.disabled = true;
      importButton.disabled = true;
      historyButton.disabled = true;
      historyOutput.hidden = true;
      return;
    }
    status.textContent = "Carregando configuração...";
    try {
      const record = configurationStore
        ? await configurationStore.loadForEdit(Number(itemId))
        : { configuration: await load?.(currentEntry.manifest) ?? {} };
      await edit(record);
      status.textContent = "";
    } catch {
      status.textContent = "Não foi possível carregar a configuração.";
    }
  }

  async function open(moduleId) {
    const entry = catalog.get(moduleId);
    if (!entry) return;
    currentEntry = entry;
    installButton.disabled = !installer?.has?.(entry.manifest.id);
    const summaryOption = [...instanceType.options].find((option) => option.value === "Summary");
    summaryOption.disabled = !entry.manifest.capabilities.summary;
    if (summaryOption.disabled && instanceType.value === "Summary") instanceType.value = "Full";
    status.textContent = "Carregando configuração...";
    try {
      if (diagnose) {
        const result = await diagnose(entry.manifest);
        diagnostic.textContent = result.status === "ready"
          ? "Instalação verificada."
          : result.status === "conflict"
            ? "A instalação possui estruturas incompatíveis. Execute o diagnóstico detalhado."
            : "A instalação precisa ser concluída antes de usar este módulo.";
        diagnostic.dataset.status = result.status;
      }
      const instances = configurationStore ? await configurationStore.list(entry.manifest.id) : [];
      instanceSelector.replaceChildren();
      instances.forEach((instance) => {
        const option = document.createElement("option");
        option.value = String(instance.id);
        option.textContent = instance.key;
        instanceSelector.append(option);
      });
      if (instances.length) await openInstance(instances[0].id);
      else if (!configurationStore) {
        await edit({ configuration: await load?.(entry.manifest) ?? {} });
        status.textContent = "";
      }
      else {
        editor.replaceChildren();
        status.textContent = "Crie a primeira instância deste módulo.";
      }
    } catch {
      status.textContent = "Não foi possível carregar a configuração.";
    }
  }

  selector.addEventListener("change", () => open(selector.value));
  installButton.addEventListener("click", async () => {
    if (!currentEntry || !installer?.has?.(currentEntry.manifest.id)) return;
    status.textContent = "Inspecionando estruturas...";
    try {
      const result = await installer.apply(currentEntry.manifest.id, (plan) => {
        const lists = plan.lists.filter((item) => item.createList).length;
        const fields = plan.lists.reduce((total, item) => total + item.fieldsToCreate.length, 0);
        const details = plan.lists.map((item) => {
          const action = item.createList ? "criar lista" : item.fieldsToCreate.length ? `criar ${item.fieldsToCreate.length} campo(s)` : "ajustar configuração";
          return `- ${item.displayName}: ${action}`;
        }).join("\n");
        return document.defaultView?.confirm?.(
          `A operação criará ${lists} lista(s) e ${fields} campo(s).\n\n${details}\n\nContinuar?`
        ) === true;
      });
      status.textContent = result.status === "cancelled"
        ? "Instalação cancelada."
        : result.status === "unchanged" ? "As estruturas já estão atualizadas." : "Estruturas instaladas e verificadas.";
      await open(currentEntry.manifest.id);
    } catch {
      status.textContent = "Não foi possível instalar ou atualizar as estruturas.";
    }
  });
  prepareButton.addEventListener("click", async () => {
    if (typeof provisionConfiguration !== "function") return;
    status.textContent = "Inspecionando a configuração...";
    try {
      const result = await provisionConfiguration((plan) => {
        const fields = plan.fieldsToCreate?.length ?? 0;
        const message = plan.createList
          ? `Será criada a lista de configuração com ${fields} campos. Continuar?`
          : `Serão adicionados ${fields} campos à lista de configuração. Continuar?`;
        return root.ownerDocument.defaultView?.confirm?.(message) === true;
      });
      status.textContent = result.status === "cancelled"
        ? "Preparação cancelada."
        : result.status === "unchanged" ? "A configuração já está preparada." : "Configuração preparada.";
      if (result.status !== "cancelled" && selector.value) await open(selector.value);
    } catch {
      status.textContent = "Não foi possível preparar a lista de configuração.";
    }
  });
  instanceSelector.addEventListener("change", () => openInstance(instanceSelector.value));
  createButton.addEventListener("click", async () => {
    if (!configurationStore || !currentEntry) return;
    status.textContent = "Criando instância...";
    try {
      const record = await configurationStore.create({
        moduleId: currentEntry.manifest.id,
        instanceId: instanceName.value,
        view: instanceType.value,
        configuration: expandSettings(settingsDefaults(currentEntry.settingsSchema)),
        settingsVersion: currentEntry.settingsSchema.version,
        moduleVersion: currentEntry.manifest.version,
        state: "Rascunho"
      });
      instanceName.value = "";
      await open(currentEntry.manifest.id);
      instanceSelector.value = String(record.id);
      await openInstance(record.id);
    } catch (error) {
      status.textContent = error?.code === "request-failed"
        ? "Já existe uma configuração com esse nome ou o usuário não pode criá-la."
        : "Não foi possível criar a instância.";
    }
  });
  publishButton.addEventListener("click", async () => {
    if (!configurationStore || !currentEntry || !currentRecord || !currentForm) return;
    status.textContent = "Publicando...";
    try {
      currentRecord = await configurationStore.save(currentRecord, currentForm.getValue(), {
        state: "Publicado",
        settingsVersion: currentEntry.settingsSchema.version,
        moduleVersion: currentEntry.manifest.version
      });
      status.textContent = "Configuração publicada.";
    } catch (error) {
      status.textContent = error?.code === "concurrency-conflict"
        ? "A configuração foi alterada por outra pessoa. Recarregue antes de publicar."
        : "Não foi possível publicar a configuração.";
    }
  });
  activationButton.addEventListener("click", async () => {
    if (!configurationStore || !currentRecord || !currentForm) return;
    const active = currentRecord.active === false;
    status.textContent = active ? "Ativando..." : "Desativando...";
    try {
      currentRecord = await configurationStore.save(currentRecord, currentForm.getValue(), { active });
      activationButton.textContent = active ? "Desativar instância" : "Ativar instância";
      status.textContent = active ? "Instância ativada." : "Instância desativada.";
    } catch (error) {
      status.textContent = error?.code === "concurrency-conflict"
        ? "A configuração foi alterada por outra pessoa. Recarregue antes de continuar."
        : "Não foi possível alterar a ativação da instância.";
    }
  });
  exportButton.addEventListener("click", () => {
    if (!currentEntry || !currentRecord || !currentForm) return;
    try {
      const content = exportConfiguration({
        moduleId: currentEntry.manifest.id,
        instanceId: currentRecord.key,
        view: currentRecord.view,
        configuration: currentForm.getValue()
      });
      const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentEntry.manifest.id}-${currentRecord.key}.json`;
      link.click();
      URL.revokeObjectURL(url);
      status.textContent = "Configuração exportada.";
    } catch {
      status.textContent = "Não foi possível exportar a configuração.";
    }
  });
  historyButton.addEventListener("click", async () => {
    if (!currentRecord || typeof configurationStore?.history !== "function") return;
    status.textContent = "Carregando histórico...";
    try {
      const versions = await configurationStore.history(currentRecord.id);
      const list = document.createElement("ol");
      versions.forEach((version) => {
        const item = document.createElement("li");
        const date = version.created ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(version.created)) : "data indisponível";
        item.textContent = `${version.label} - ${date}${version.author ? ` - ${version.author}` : ""}`;
        list.append(item);
      });
      historyOutput.replaceChildren(versions.length ? list : document.createTextNode("Nenhuma versão encontrada."));
      historyOutput.hidden = false;
      status.textContent = "";
    } catch {
      status.textContent = "Não foi possível carregar o histórico da configuração.";
    }
  });
  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (!file || !currentEntry || !currentRecord) return;
    try {
      const allowedPaths = currentEntry.settingsSchema.groups.flatMap((group) => group.fields.map((field) => field.id));
      const configuration = importConfiguration(await file.text(), {
        moduleId: currentEntry.manifest.id,
        allowedPaths,
        getValue: getSettingValue,
        setValue: setSettingValue
      });
      await edit({ ...currentRecord, configuration });
      status.textContent = "Configuração importada como edição não salva.";
    } catch {
      status.textContent = "O arquivo não contém uma configuração compatível com este módulo.";
    }
  });
  snippetButton.addEventListener("click", () => {
    if (!currentEntry || !currentRecord || typeof generateSnippet !== "function") return;
    try {
      snippetOutput.value = generateSnippet({
        moduleId: currentEntry.manifest.id,
        instanceId: currentRecord.key,
        view: String(currentRecord.view || "Full").toLowerCase()
      });
      snippetOutput.hidden = false;
      snippetOutput.focus?.();
      snippetOutput.select?.();
      status.textContent = "Snippet gerado para a instância selecionada.";
    } catch {
      status.textContent = "Não foi possível gerar o snippet desta instância.";
    }
  });
  if (selector.value) open(selector.value);
  return Object.freeze({ open, dispose: () => root.replaceChildren() });
}
