import { match } from "ts-pattern";
import { resolveTheme, type ThemesType } from "@pierre/diffs";
import { themeToTreeStyles } from "@pierre/trees";
import type { CodeTheme } from "../../../core/appearance";

export const codeThemes = (theme: CodeTheme): ThemesType =>
  match(theme)
    .with("default", () => ({ light: "pierre-light", dark: "pierre-dark" }))
    .with("one-dark", () => ({ light: "one-light", dark: "one-dark-pro" }))
    .with("github", () => ({ light: "github-light", dark: "github-dark" }))
    .with("catppuccin", () => ({ light: "catppuccin-latte", dark: "catppuccin-mocha" }))
    .exhaustive();

// Pierre trees accepts the same resolved Shiki themes as code. CSS pairs follow native light/dark changes.
export async function codeTreeStyles(theme: CodeTheme): Promise<Record<string, string>> {
  const names = codeThemes(theme);
  const [lightTheme, darkTheme] = await Promise.all([
    resolveTheme(names.light),
    resolveTheme(names.dark),
  ]);
  const light = themeToTreeStyles(lightTheme);
  const dark = themeToTreeStyles(darkTheme);
  return Object.fromEntries(
    [...new Set([...Object.keys(light), ...Object.keys(dark)])].flatMap((key) => {
      if (!key.startsWith("--")) return [];
      const l = light[key] || dark[key];
      const d = dark[key] || light[key];
      return l && d ? [[key, `light-dark(${l}, ${d})`]] : [];
    }),
  );
}
