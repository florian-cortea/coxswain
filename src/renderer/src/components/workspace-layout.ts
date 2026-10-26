// Fixed chrome targets prevent native intrinsic text sizes from moving the toolbar around.
export const workspaceChrome = {
  height: 44,
  leading: 96,
  trailing: 12,
  sidebar: 32,
  project: 112,
  newWorkspace: 32,
  actions: 168,
  gap: 8,
  stripHeight: 32,
  tabMin: 96,
} as const;

export function workspaceStripLayout(width: number, count: number, selected: number) {
  const m = workspaceChrome;
  const stripWidth = Math.max(
    180,
    width - m.leading - m.trailing - m.sidebar - m.project - m.actions - m.newWorkspace - m.gap * 4,
  );
  const capacity = Math.max(1, Math.floor((stripWidth - 4.5) / (m.tabMin + 0.5)));
  const shown = Math.min(count, capacity);
  const current = Math.max(0, Math.min(count - 1, selected));
  const start = Math.max(0, Math.min(current - Math.floor(shown / 2), count - shown));
  const indices = Array.from({ length: shown }, (_, i) => start + i);
  // Reserve every separator slot, including the hidden ones beside the active tab.
  const separators = Math.max(0, shown - 1);
  const unit = (stripWidth - 4 - separators * 0.5) / Math.max(1, shown);
  return { width: stripWidth, indices, tabWidth: unit };
}
