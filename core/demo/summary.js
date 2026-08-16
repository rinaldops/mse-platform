import { mountModule } from "../core.js";

export function mountSummary({ globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "demo-summary",
    selector: '[data-mse-module="demo-summary"]',
    globalConfig,
    instances,
    moduleDefaults: {
      layout: { mode: "contained" },
      title: "Resumo do módulo"
    },
    render({ root, config }) {
      const renderCount = Number(root.dataset.renderCount || 0) + 1;
      root.dataset.renderCount = String(renderCount);

      const card = document.createElement("article");
      card.className = "mse-summary";

      const label = document.createElement("p");
      label.className = "mse-summary__label";
      label.textContent = "Contained";

      const title = document.createElement("h3");
      title.className = "mse-summary__title";
      title.textContent = config.title;

      const count = document.createElement("p");
      count.className = "mse-summary__count";
      count.textContent = "Interações: 0";

      const button = document.createElement("button");
      button.className = "mse-summary__button";
      button.type = "button";
      button.textContent = "Testar interação";

      let interactions = 0;
      const handleClick = () => {
        interactions += 1;
        count.textContent = `Interações: ${interactions}`;
      };
      button.addEventListener("click", handleClick);

      card.append(label, title, count, button);
      root.replaceChildren(card);

      return () => button.removeEventListener("click", handleClick);
    }
  });
}
