// Missing review data means unknown, not that every file is unreviewed.
export function remainingFiles(
  files: readonly { path: string }[] | null | undefined,
  reviewed: readonly string[] | undefined,
) {
  if (!files || !reviewed) return undefined;
  const done = new Set(reviewed);
  return files.filter((file) => !done.has(file.path)).length;
}

export function reviewCountLabel(total: number, reviewed: number, showReviewed: boolean): string {
  return showReviewed ? `${reviewed}/${total}` : String(total - reviewed);
}

export function fileCountLabel(
  files: readonly { path: string }[] | null | undefined,
  reviewed: readonly string[] | undefined,
  showReviewed: boolean,
): string | undefined {
  const remaining = remainingFiles(files, reviewed);
  if (remaining === undefined || !files) return undefined;
  return reviewCountLabel(files.length, files.length - remaining, showReviewed);
}
