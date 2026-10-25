import assert from "node:assert/strict";
import { test } from "node:test";
import { workspaceChrome, workspaceStripLayout } from "./workspace-layout.ts";

test("native chrome fits the window and keeps the selected workspace visible under overflow", () => {
  for (const width of [800, 1024, 1400, 2200]) {
    for (const count of [0, 1, 4, 12, 50]) {
      for (const selected of [0, Math.floor(count / 2), count - 1]) {
        const layout = workspaceStripLayout(width, count, selected);
        const m = workspaceChrome;
        assert.equal(
          layout.width +
            m.leading +
            m.trailing +
            m.sidebar +
            m.project +
            m.actions +
            m.newWorkspace +
            m.gap * 4,
          width,
        );
        assert.ok(layout.indices.every((index) => index >= 0 && index < count));
        assert.equal(new Set(layout.indices).size, layout.indices.length);
        if (!count) continue;
        assert.ok(layout.indices.includes(selected));
        if (layout.indices.length > 1) assert.ok(layout.tabWidth >= 96);
        const total = layout.tabWidth * layout.indices.length;
        assert.equal(layout.tabWidth, workspaceStripLayout(width, count, 0).tabWidth);
        assert.ok(total <= layout.width);
      }
    }
  }
});
