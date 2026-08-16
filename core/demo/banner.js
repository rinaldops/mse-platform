import { mountModule } from "../core.js";

export function mountBanner({ globalConfig = {}, instances = {} } = {}) {
  return mountModule({
    name: "demo-banner",
    selector: '[data-mse-module="demo-banner"]',
    globalConfig,
    instances,
    moduleDefaults: {
      title: "Experiência expandida"
    },
    render({ root, config }) {
      root.dataset.renderCount = String(Number(root.dataset.renderCount || 0) + 1);

      const banner = document.createElement("div");
      banner.className = "mse-banner";

      const title = document.createElement("h3");
      title.className = "mse-banner__title";
      title.textContent = config.title;

      const text = document.createElement("p");
      text.className = "mse-banner__text";

      const updateWidth = () => {
        text.textContent = `Root isolado ocupando ${Math.round(root.getBoundingClientRect().width)} px.`;
      };
      window.addEventListener("resize", updateWidth);

      banner.append(title, text);
      root.replaceChildren(banner);
      updateWidth();

      return () => window.removeEventListener("resize", updateWidth);
    }
  });
}
