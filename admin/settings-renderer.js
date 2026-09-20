import { defineSettingsSchema, settingsDefaults } from "../core/module-contract.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function getSettingValue(config, path) {
  return path.split(".").reduce((value, key) => value?.[key], config);
}

export function setSettingValue(config, path, value) {
  const result = clone(config);
  const keys = path.split(".");
  let target = result;
  keys.slice(0, -1).forEach((key) => {
    if (!target[key] || Array.isArray(target[key]) || typeof target[key] !== "object") target[key] = {};
    target = target[key];
  });
  target[keys.at(-1)] = value;
  return result;
}

export function expandSettings(flatSettings) {
  return Object.entries(flatSettings).reduce(
    (config, [path, value]) => setSettingValue(config, path, value),
    {}
  );
}

function initialConfiguration(schema, value) {
  return Object.entries(settingsDefaults(schema)).reduce(
    (config, [path, defaultValue]) => getSettingValue(config, path) === undefined
      ? setSettingValue(config, path, defaultValue)
      : config,
    clone(value)
  );
}

function inputFor(document, field, value) {
  if (field.type === "boolean") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    return input;
  }

  if (field.type === "select" || field.type === "multiselect" || (field.type === "color" && field.options)) {
    const select = document.createElement("select");
    select.multiple = field.type === "multiselect";
    const selected = new Set(Array.isArray(value) ? value.map(String) : [String(value ?? "")]);
    field.options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = field.optionLabels?.[optionValue] || optionValue;
      option.selected = selected.has(optionValue);
      select.append(option);
    });
    return select;
  }

  const input = document.createElement("input");
  input.type = field.type === "number" ? "number" : field.type === "url" ? "url" : field.type === "color" ? "color" : "text";
  if (field.min !== undefined) input.min = String(field.min);
  if (field.max !== undefined) input.max = String(field.max);
  input.value = value ?? "";
  return input;
}

function readInput(input, field) {
  if (field.type === "boolean") return input.checked;
  if (field.type === "number") return input.value === "" ? null : Number(input.value);
  if (field.type === "multiselect") return [...input.selectedOptions].map((option) => option.value);
  return input.value;
}

export function renderSettingsForm({ root, schema, value = {}, onPreview, onSubmit, onReset } = {}) {
  if (!root?.ownerDocument) throw new TypeError("root deve ser um elemento HTML.");
  const normalized = defineSettingsSchema(schema);
  const document = root.ownerDocument;
  let current = initialConfiguration(normalized, value);
  const form = document.createElement("form");
  form.className = "mse-admin-settings";

  normalized.groups.forEach((group) => {
    const section = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = group.label;
    section.append(legend);

    group.fields.forEach((field) => {
      const row = document.createElement("div");
      row.className = "mse-admin-settings__field";
      const label = document.createElement("label");
      const input = inputFor(document, field, getSettingValue(current, field.id));
      input.id = `mse-setting-${field.id.replaceAll(".", "-")}`;
      input.name = field.id;
      label.htmlFor = input.id;
      label.textContent = field.label;
      row.append(label, input);
      if (field.help) {
        const help = document.createElement("small");
        help.textContent = field.help;
        row.append(help);
      }
      input.addEventListener("change", () => {
        current = setSettingValue(current, field.id, readInput(input, field));
        onPreview?.(clone(current));
      });
      section.append(row);
    });
    form.append(section);
  });

  const actions = document.createElement("div");
  actions.className = "mse-admin-settings__actions";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Restaurar padrões";
  reset.addEventListener("click", () => {
    current = expandSettings(settingsDefaults(normalized));
    onReset?.(clone(current));
    renderSettingsForm({ root, schema: normalized, value: current, onPreview, onSubmit, onReset });
  });
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Salvar";
  actions.append(reset, submit);
  form.append(actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.(clone(current));
  });

  root.replaceChildren(form);
  return Object.freeze({ form, getValue: () => clone(current) });
}
