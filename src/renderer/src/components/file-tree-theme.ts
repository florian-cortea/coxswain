import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import type { ChangedFile } from "../../../core/git";
import { core } from "../queries";
import { codeTreeStyles } from "./code-theme";

// One cached palette for Pierre's tree and Guide's React file rows.
export function useFileTreeTheme() {
  const theme = useQuery(core("getCodeTheme")).data ?? "default";
  return useQuery({
    queryKey: ["file-tree-theme", theme, "linear-inspired-text-colors"],
    queryFn: () => codeTreeStyles(theme),
    staleTime: Infinity,
    placeholderData: (before) => before,
  }).data;
}

// Light status colors match the Guide counters; dark mode keeps its theme blend.
export const softenFileStatus = (color: string) =>
  `light-dark(${color}, color-mix(in srgb, ${color} var(--guide-file-status-strength), #d4d4d4))`;

export const fileStatusColor = (status: ChangedFile["status"] | undefined) =>
  match(status)
    .with("added", () =>
      softenFileStatus(
        "var(--trees-theme-git-added-fg, light-dark(var(--sidebar-added-light), #00cab1))",
      ),
    )
    .with("modified", "renamed", () =>
      softenFileStatus(
        "var(--trees-theme-git-modified-fg, light-dark(var(--sidebar-modified-light), #08c0ef))",
      ),
    )
    .with("deleted", () =>
      softenFileStatus(
        "var(--trees-theme-git-deleted-fg, light-dark(var(--sidebar-deleted-light), #ff6762))",
      ),
    )
    .with(undefined, () => undefined)
    .exhaustive();
