const FONT_FALLBACK = "\"Segoe UI\", Arial, sans-serif";

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

export function createSharePointThemeConfig(source) {
  const theme = readTheme(source);
  return {
    theme: {
      tokens: {
        fontFamily: firstText(theme, ["mediumFontFamily", "fontFamily"], FONT_FALLBACK),
        fontSizeBody: firstText(theme, ["mediumFontSize"], "14px"),
        colorPrimary: firstText(theme, ["themePrimary", "themeAccent", "accent", "link"], "#0f6cbd"),
        colorPrimaryHover: firstText(theme, ["themeDarkAlt", "primaryButtonBackgroundHovered"], "#115ea3"),
        colorPrimarySoft: firstText(theme, ["themeLighterAlt", "HoverBackground"], "#eef6fc"),
        colorOnPrimary: firstText(theme, ["primaryButtonText", "EmphasisText", "white"], "#ffffff"),
        colorSurface: firstText(theme, ["bodyBackground", "primaryBackground", "PageBackground", "white"], "#ffffff"),
        colorSubtleBackground: firstText(theme, ["neutralLighter", "bodyBackgroundHovered"], "#f3f2f1"),
        colorText: firstText(theme, ["bodyText", "BodyText", "neutralPrimary"], "#242424"),
        colorMuted: firstText(theme, ["bodySubtext", "neutralSecondary"], "#616161"),
        colorBorder: firstText(theme, ["neutralQuaternary", "variantBorder", "Lines"], "#d1d1d1"),
        colorInputBackground: firstText(theme, ["inputBackground", "white"], "#ffffff"),
        colorDanger: firstText(theme, ["errorText", "redDark", "red"], "#a4262c"),
        colorDangerBackground: firstText(theme, ["errorBackground", "blockingBackground"], "#fde7e9"),
        colorSuccess: firstText(theme, ["successText", "green"], "#107c10"),
        colorSuccessBackground: firstText(theme, ["successBackground"], "#dff6dd"),
        radius: firstText(theme, ["roundedCorner6", "roundedCorner4"], "0.5rem"),
        shadow: firstText(theme, ["elevation4", "cardShadow"], "0 0.25rem 1rem rgb(0 0 0 / 12%)")
      }
    }
  };
}
