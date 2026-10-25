import assert from "node:assert/strict";
import { test } from "node:test";
import { installDiagramGestures } from "./diagram-gestures.ts";

test("board pans beyond its bounds and pinch preserves the point under the pointer", () => {
  const handlers = new Map<string, (event: any) => void>();
  const viewport = {
    style: { cursor: "" },
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    addEventListener: (name: string, listener: (event: any) => void) =>
      handlers.set(name, listener),
    removeEventListener: (name: string) => handlers.delete(name),
    setPointerCapture: () => {},
  };
  const drawing = {
    style: {} as Record<string, string>,
    getBoundingClientRect: () => ({ height: 200 }),
  };
  const dispose = installDiagramGestures(
    viewport as unknown as HTMLElement,
    drawing as unknown as HTMLElement,
  );
  let prevented = false;
  const wheel = {
    ctrlKey: false,
    deltaX: 500,
    deltaY: -300,
    deltaMode: 0,
    clientX: 210,
    clientY: 120,
    preventDefault: () => {
      prevented = true;
    },
  };
  handlers.get("wheel")!(wheel);
  assert.equal(prevented, true);
  assert.equal(drawing.style.transform, "translate(-468px, 500px) scale(1)");
  handlers.get("wheel")!({ ...wheel, ctrlKey: true, deltaY: -Math.log(2) / 0.01 });
  assert.equal(drawing.style.transform, "translate(-1136px, 900px) scale(2)");
  handlers.get("pointerdown")!({
    button: 0,
    clientX: 10,
    clientY: 20,
    pointerId: 1,
    target: { closest: () => null },
  });
  handlers.get("pointermove")!({ clientX: 40, clientY: 70 });
  assert.equal(drawing.style.transform, "translate(-1106px, 950px) scale(2)");
  handlers.get("pointerup")!({});
  assert.equal(viewport.style.cursor, "grab");
  dispose();
  assert.equal(handlers.size, 0);
});
