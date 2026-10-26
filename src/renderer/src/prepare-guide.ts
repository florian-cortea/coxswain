import type { CanvasSearch } from "./router";
import { core, queryClient } from "./queries.ts";

// Prepare the destination's pinned Guide before replacing the current canvas. No live-worktree/network wait:
// a workspace without a saved Guide still navigates normally to its first-load state.
export async function prepareGuide(workspaceId: number, destination: CanvasSearch) {
  if (
    destination.view === "diffs" ||
    destination.view === "files" ||
    destination.pr ||
    destination.commit ||
    destination.scope ||
    destination.viewId === null
  )
    return;
  const guide = (await queryClient.fetchQuery(core("listViews", workspaceId)))[0];
  if (!guide) return;
  const opened = queryClient.getQueryData(core("openWorktree", workspaceId).queryKey);
  const mergeBase = opened?.status === "ok" ? opened.mergeBase : guide.base;
  const [changed] = await Promise.all([
    queryClient.fetchQuery(core("listChangedFiles", workspaceId, guide.base, guide.head)),
    queryClient.fetchQuery(core("listEntries", workspaceId, mergeBase, guide.base, guide.head)),
    queryClient.fetchQuery(core("listReviewed", workspaceId, guide.base, guide.head)),
    queryClient.fetchQuery(core("listReviewed", workspaceId, guide.base, guide.head, "file")),
  ]);
  if (changed.status !== "ok") return;
  const files = new Map(changed.files.map((file) => [file.path, file]));
  const first = guide.sections
    .flatMap((section) => section.parts.filter((part) => part.kind !== "prose"))
    .slice(0, 2);
  await Promise.all(
    first.flatMap((part) => {
      const file = files.get(part.path);
      return [
        ...(part.kind === "diff" && file && file.status !== "added"
          ? [
              queryClient.fetchQuery(
                core("readFileAt", workspaceId, guide.base, file.previousPath ?? part.path),
              ),
            ]
          : []),
        ...(part.kind === "file" || file?.status !== "deleted"
          ? [queryClient.fetchQuery(core("readFileAt", workspaceId, guide.head, part.path))]
          : []),
      ];
    }),
  );
}
