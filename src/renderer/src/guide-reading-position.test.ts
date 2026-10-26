import assert from "node:assert/strict";
import { test } from "node:test";
import { createGuideReadingPosition } from "./guide-reading-position.ts";

test("reading-position changes notify only subscribers and keep equal snapshots stable", () => {
  const store = createGuideReadingPosition();
  let sidebarUpdates = 0;
  const unsubscribe = store.subscribe(() => sidebarUpdates++);
  store.set({ viewId: 7, section: 0 });
  const before = store.getSnapshot();
  store.set({ viewId: 7, section: 0 });
  assert.equal(store.getSnapshot(), before);
  assert.equal(sidebarUpdates, 1);
  store.set({ viewId: 7, section: 1, file: "a.ts" });
  assert.equal(sidebarUpdates, 2);
  store.set(undefined);
  assert.equal(sidebarUpdates, 3);
  unsubscribe();
  store.set({ viewId: 8, section: 0 });
  assert.equal(sidebarUpdates, 3);
});
