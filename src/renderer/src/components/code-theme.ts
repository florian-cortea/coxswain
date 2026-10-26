import { codeThemeDefinition } from "../../../shared/code-themes";
import { resolveTheme, type ThemesType } from "@pierre/diffs";
import { themeToTreeStyles } from "@pierre/trees";
import type { CodeTheme } from "../../../core/appearance";

export const codeThemes = (theme: CodeTheme): ThemesType => {
  const { light, dark } = codeThemeDefinition(theme);
  return { light, dark };
};

// Pierre trees accepts the same resolved Shiki themes as code. CSS pairs follow native light/dark changes.
export async function codeTreeStyles(theme: CodeTheme): Promise<Record<string, string>> {
  const names = codeThemes(theme);
  const [lightTheme, darkTheme] = await Promise.all([
    resolveTheme(names.light),
    resolveTheme(names.dark),
  ]);
  const light: Record<string, string> = {
    ...themeToTreeStyles(lightTheme),
    "--trees-theme-git-added-fg": "var(--sidebar-added-light)",
    "--trees-theme-git-modified-fg": "var(--sidebar-modified-light)",
    "--trees-theme-git-deleted-fg": "var(--sidebar-deleted-light)",
  };
  const dark: Record<string, string> = {
    "--trees-theme-git-added-fg": "#00cab1",
    "--trees-theme-git-modified-fg": "#08c0ef",
    "--trees-theme-git-deleted-fg": "#ff6762",
    ...themeToTreeStyles(darkTheme),
  };
  return Object.fromEntries(
    [...new Set([...Object.keys(light), ...Object.keys(dark)])].flatMap((key) => {
      if (!key.startsWith("--")) return [];
      const l = light[key] || dark[key];
      const d = dark[key] || light[key];
      return l && d ? [[key, `light-dark(${l}, ${d})`]] : [];
    }),
  );
}
