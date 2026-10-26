// Missing review data means unknown, not that every file is unreviewed.
export function remainingFiles(
  files: readonly { path: string }[] | null | undefined,
  reviewed: readonly string[] | undefined,
) {
  if (!files || !reviewed) return undefined;
  const done = new Set(reviewed);
  return files.filter((file) => !done.has(file.path)).length;
}
