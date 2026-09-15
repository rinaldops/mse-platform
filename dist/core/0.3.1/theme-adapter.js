const FONT_FALLBACK = "\"Petrobras Sans\", Arial, sans-serif";
const APPROVED_COLORS = new Set([
  "#008542", "#FDC82F", "#FFFFFF", "#00B2A9", "#C4D600",
  "#EBFF00", "#ED8B00", "#006298", "#3DDAFF", "#75787B", "#000000"
]);

function readTheme(source = globalThis.__themeState__?.theme) {
  return source && typeof source === "object" ? source : {};
}

function firstText(theme, names, fallback) {
  for (const name of names) {
    const value = theme[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function firstApprovedColor(theme, names, fallback) {
  const candidate = firstText(theme, names, fallback).toUpperCase();
  return APPROVED_COLORS.has(candidate) ? candidate : fallback;
}

export function createSharePointThemeConfig(source) {
  const theme = readTheme(source);
  return {
    theme: {
      tokens: {
        fontFamily: FONT_FALLBACK,
        fontSizeBody: firstText(theme, ["mediumFontSize"], "14px"),
        colorPrimary: firstApprovedColor(theme, ["themePrimary", "themeAccent", "accent", "link"], "#008542"),
        colorPrimaryHover: firstApprovedColor(theme, ["themeDarkAlt", "primaryButtonBackgroundHovered"], "#006298"),
        colorPrimarySoft: "#FFFFFF",
        colorAccent: firstApprovedColor(theme, ["themeAccent", "accent", "themePrimary"], "#00B2A9"),
        colorWarning: firstApprovedColor(theme, ["warningText", "yellowDark", "orange"], "#FDC82F"),
        colorOnPrimary: "#FFFFFF",
        colorSurface: "#FFFFFF",
        colorSurfaceDark: "#006298",
        colorSubtleBackground: "#FFFFFF",
        colorText: "#000000",
        colorMuted: "#006298",
        colorBorder: "#75787B",
        colorInputBackground: "#FFFFFF",
        colorDanger: "#ED8B00",
        colorDangerBackground: "#FFFFFF",
        colorSuccess: "#008542",
        colorSuccessBackground: "#FFFFFF",
        sectionRadius: "0",
        radius: "0",
        shadow: "none"
      }
    }
  };
}
