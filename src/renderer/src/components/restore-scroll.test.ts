import assert from "node:assert/strict";
import { test } from "node:test";
import { restoreScroll } from "./restore-scroll.ts";

test("a restored pane never pulls the reader back after a manual scroll", async () => {
  const scroller = { scrollTop: 0, scrollHeight: 2000, clientHeight: 200 };
  const canvas = Object.assign(new EventTarget(), { querySelector: () => scroller });
  const stop = restoreScroll(canvas as unknown as HTMLElement, { top: 300, offset: 0 });
  assert.equal(scroller.scrollTop, 300, "cached position is applied synchronously before paint");
  scroller.scrollTop = 900;
  canvas.dispatchEvent(new Event("wheel"));
  await new Promise((done) => setTimeout(done, 80));
  assert.equal(scroller.scrollTop, 900, "virtualizer retries yield to user input");
  stop();
});

test("navigation cleanup cancels restoration while lazy content is still loading", async () => {
  const scroller = { scrollTop: 0, scrollHeight: 100, clientHeight: 100 };
  const canvas = Object.assign(new EventTarget(), { querySelector: () => scroller });
  const stop = restoreScroll(canvas as unknown as HTMLElement, { top: 600, offset: 0 });
  stop();
  scroller.scrollHeight = 2000;
  await new Promise((done) => setTimeout(done, 80));
  assert.equal(scroller.scrollTop, 0, "an old destination cannot move the newly mounted canvas");
});

test("anchor restoration searches only the destination canvas, never an inactive retained tab", async () => {
  const oldCSS = globalThis.CSS;
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: { escape: (id: string) => id },
  });
  const scroller = {
    scrollTop: 0,
    scrollHeight: 2000,
    clientHeight: 200,
    getBoundingClientRect: () => ({ top: 10 }),
  };
  const anchor = { getBoundingClientRect: () => ({ top: 210 }) };
  const selectors: string[] = [];
  const canvas = Object.assign(new EventTarget(), {
    querySelector: (selector: string) => {
      selectors.push(selector);
      return selector.startsWith("[id=") ? anchor : scroller;
    },
  });
  const stop = restoreScroll(canvas as unknown as HTMLElement, {
    top: 0,
    anchor: "diff:shared.ts",
    offset: 0,
  });
  assert.equal(scroller.scrollTop, 200);
  assert.ok(selectors.includes('[id="diff:shared.ts"]'));
  stop();
  if (oldCSS) Object.defineProperty(globalThis, "CSS", { configurable: true, value: oldCSS });
  else Reflect.deleteProperty(globalThis, "CSS");
});
