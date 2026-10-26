export type GuideReadingPosition = {
  viewId: number;
  section: number;
  file?: string;
};

// Transient per-window reading markers are consumed by the sidebar alone. Updating one
// must not rerender the review canvas and all of its retained file cards.
export function createGuideReadingPosition() {
  let position: GuideReadingPosition | undefined;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => position,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: GuideReadingPosition | undefined) {
      if (
        position?.viewId === next?.viewId &&
        position?.section === next?.section &&
        position?.file === next?.file
      )
        return;
      position = next;
      listeners.forEach((listener) => listener());
    },
  };
}
export type GuideReadingStore = ReturnType<typeof createGuideReadingPosition>;
