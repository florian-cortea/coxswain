// Electron may report popup closure before delivering the selected item's click.
// Wait one event turn so a selection wins over the dismissal fallback.
export function menuResult<T>(resolve: (result: T) => void, dismissed: T) {
  let pending: ReturnType<typeof setImmediate> | undefined;
  let selected = false;
  return {
    pick(result: T) {
      selected = true;
      if (pending !== undefined) clearImmediate(pending);
      resolve(result);
    },
    close() {
      if (selected || pending !== undefined) return;
      pending = setImmediate(() => {
        if (!selected) resolve(dismissed);
      });
    },
  };
}
