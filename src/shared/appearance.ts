import { match } from "ts-pattern";

export type Appearance = "system" | "light" | "dark";
export function resolvedAppearance(
  mode: Appearance,
  softDark: boolean,
  systemDark: boolean,
): "light" | "dark" | "soft-dark" {
  const dark = mode === "dark" || (mode === "system" && systemDark);
  return match({ dark, softDark })
    .with({ dark: false }, () => "light" as const)
    .with({ softDark: true }, () => "soft-dark" as const)
    .otherwise(() => "dark" as const);
}
