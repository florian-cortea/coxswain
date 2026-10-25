import { prepareFileTreeInput } from "@pierre/trees";

// Use Pierre's own ordering, including folder-first and natural filename comparison.
// Only the public sorted path list crosses the worker boundary; its private symbols do not.
export const orderTreePaths = (paths: string[]) =>
  prepareFileTreeInput(paths, { flattenEmptyDirectories: true }).paths;
