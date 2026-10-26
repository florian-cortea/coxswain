import { match } from "ts-pattern";
import { FileTree } from "@pierre/trees";
import { changeGroup, changeGroups } from "./change-groups.ts";

// Both surfaces use the same Pierre row identities, including disambiguated flat filenames.
export function changesRowPaths(paths: string[], layout: "tree" | "list") {
  const names = new Map<string, number>();
  const name = (path: string) => path.slice(path.lastIndexOf("/") + 1);
  for (const path of paths) names.set(name(path), (names.get(name(path)) ?? 0) + 1);
  return new Map(
    paths.map((path) => [
      match(layout)
        .with("tree", () => path)
        .with("list", () =>
          (names.get(name(path)) ?? 0) > 1 ? path.replaceAll("/", "∕") : name(path),
        )
        .exhaustive(),
      path,
    ]),
  );
}

export function orderChanges<T extends { path: string }>(
  files: T[],
  layout: "tree" | "list",
  grouped: boolean,
): T[] {
  const groups = grouped
    ? changeGroups.map(({ id }) => files.filter((file) => changeGroup(file.path) === id))
    : [files];
  return groups.flatMap((group) => {
    const paths = changesRowPaths(
      group.map((file) => file.path),
      layout,
    );
    const byPath = new Map(group.map((file) => [file.path, file]));
    const tree = new FileTree({
      paths: [...paths.keys()],
      initialExpansion: "open",
      flattenEmptyDirectories: true,
    });
    try {
      return tree.getVisibleRows(0, tree.getVisibleCount()).flatMap((row) => {
        const file = row.kind === "file" ? byPath.get(paths.get(row.path) ?? row.path) : undefined;
        return file ? [file] : [];
      });
    } finally {
      tree.cleanUp();
    }
  });
}
