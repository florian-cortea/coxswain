// Bundled by Pierre/Shiki; light and dark variants follow the app appearance.
export const codeThemeOptions = [
  { id: "default", label: "Default", light: "pierre-light", dark: "pierre-dark" },
  { id: "one-dark", label: "One Dark", light: "one-light", dark: "one-dark-pro" },
  { id: "github", label: "GitHub", light: "github-light", dark: "github-dark" },
  { id: "catppuccin", label: "Catppuccin", light: "catppuccin-latte", dark: "catppuccin-mocha" },
  { id: "ayu", label: "Ayu", light: "ayu-light", dark: "ayu-dark" },
  { id: "everforest", label: "Everforest", light: "everforest-light", dark: "everforest-dark" },
  { id: "gruvbox", label: "Gruvbox", light: "gruvbox-light-medium", dark: "gruvbox-dark-medium" },
  { id: "kanagawa", label: "Kanagawa", light: "kanagawa-lotus", dark: "kanagawa-wave" },
  { id: "night-owl", label: "Night Owl", light: "night-owl-light", dark: "night-owl" },
  { id: "rose-pine", label: "Rosé Pine", light: "rose-pine-dawn", dark: "rose-pine" },
  { id: "solarized", label: "Solarized", light: "solarized-light", dark: "solarized-dark" },
  { id: "vitesse", label: "Vitesse", light: "vitesse-light", dark: "vitesse-dark" },
] as const;

export type CodeTheme = (typeof codeThemeOptions)[number]["id"];

export const codeThemeDefinition = (value: unknown) =>
  codeThemeOptions.find((theme) => theme.id === value) ?? codeThemeOptions[0];
