// Keep a disclosure's header in place while Pierre updates virtualized heights.
// Wheel, key or pointer input immediately gives scrolling back to the user.
export function holdScrollPosition(header: HTMLElement) {
  const scroller = header.closest<HTMLElement>(".overflow-auto");
  if (!scroller) return;
  const top = header.getBoundingClientRect().top;
  const previousAnchor = scroller.style.overflowAnchor;
  scroller.style.overflowAnchor = "none";
  let frame = 0;
  const deadline = performance.now() + 750;
  const events = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  const stop = () => {
    cancelAnimationFrame(frame);
    scroller.style.overflowAnchor = previousAnchor;
    for (const event of events) scroller.removeEventListener(event, stop);
  };
  const restore = () => {
    if (!header.isConnected) return stop();
    const delta = header.getBoundingClientRect().top - top;
    if (Math.abs(delta) > 0.5) scroller.scrollTop += delta;
  };
  const settle = () => {
    restore();
    if (performance.now() < deadline) frame = requestAnimationFrame(settle);
    else stop();
  };
  for (const event of events) scroller.addEventListener(event, stop, { passive: true });
  frame = requestAnimationFrame(settle);
  return { restore, stop };
}
