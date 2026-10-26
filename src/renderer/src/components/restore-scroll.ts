export type Scroll = { top: number; anchor?: string; offset: number };
export const canvasElement = (canvas: HTMLElement, id: string) =>
  canvas.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
export const canvasScroller = (canvas: HTMLElement) =>
  canvas.querySelector<HTMLElement>(":scope > .overflow-auto:not(.hidden)");

// Restore before paint when ready, and retry as virtualized cards acquire their final heights.
// User input always wins. ponytail: wait up to two seconds; use the virtualizer's anchor API when available.
export function restoreScroll(canvas: HTMLElement, saved: Scroll) {
  let tries = 40;
  let timer: ReturnType<typeof setTimeout>;
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  const stop = () => {
    clearTimeout(timer);
    events.forEach((event) => canvas.removeEventListener(event, stop));
  };
  const go = () => {
    const scroller = canvasScroller(canvas);
    const anchor = saved.anchor ? canvasElement(canvas, saved.anchor) : null;
    const ready = saved.anchor
      ? anchor
      : scroller && scroller.scrollHeight - scroller.clientHeight >= saved.top;
    if (!ready && tries-- > 0) {
      timer = setTimeout(go, 50);
      return;
    }
    if (!scroller) return stop();
    const by = anchor
      ? anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + saved.offset
      : saved.top - scroller.scrollTop;
    if (Math.abs(by) < 2) return stop();
    scroller.scrollTop += by;
    if (tries-- > 0) timer = setTimeout(go, 50);
    else stop();
  };
  events.forEach((event) => canvas.addEventListener(event, stop, { passive: true }));
  go();
  return stop;
}
