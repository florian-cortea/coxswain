import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import type { ChangedFile } from "../../../core/git";
import { core } from "../queries";
import { codeTreeStyles } from "./code-theme";

// One cached palette for Pierre's tree and Guide's React file rows.
export function useFileTreeTheme() {
  const theme = useQuery(core("getCodeTheme")).data ?? "default";
  return useQuery({
    queryKey: ["file-tree-theme", theme],
    queryFn: () => codeTreeStyles(theme),
    staleTime: Infinity,
    placeholderData: (before) => before,
  }).data;
}

// Blend toward readable label gray rather than lowering opacity against the surface.
export const softenFileStatus = (color: string) =>
  `color-mix(in srgb, ${color} var(--guide-file-status-strength), light-dark(#404040, #d4d4d4))`;

export const fileStatusColor = (status: ChangedFile["status"] | undefined) =>
  match(status)
    .with("added", () =>
      softenFileStatus("var(--trees-theme-git-added-fg, light-dark(#16a994, #00cab1))"),
    )
    .with("modified", "renamed", () =>
      softenFileStatus("var(--trees-theme-git-modified-fg, light-dark(#1ca1c7, #08c0ef))"),
    )
    .with("deleted", () =>
      softenFileStatus("var(--trees-theme-git-deleted-fg, light-dark(#ff2e3f, #ff6762))"),
    )
    .with(undefined, () => undefined)
    .exhaustive();
