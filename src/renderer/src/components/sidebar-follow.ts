// Critical damping preserves velocity when the active file changes mid-reveal.
// Exact elapsed-time integration keeps the same motion on 60 Hz and 120 Hz displays.
export function createSidebarFollower(
  request: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancel: (id: number) => void = cancelAnimationFrame,
) {
  let list: HTMLElement | undefined;
  let frame: number | undefined;
  let position = 0;
  let velocity = 0;
  let destination = 0;
  let previousTime: number | undefined;
  const stop = () => {
    if (frame !== undefined) cancel(frame);
    frame = undefined;
    list = undefined;
    velocity = 0;
    previousTime = undefined;
  };
  const step = (time: number) => {
    frame = undefined;
    if (!list?.isConnected) return stop();
    const elapsed = previousTime === undefined ? 0 : Math.max(0, time - previousTime) / 1000;
    previousTime = time;
    const displacement = position - destination;
    const omega = 12;
    const decay = Math.exp(-omega * elapsed);
    const coefficient = velocity + omega * displacement;
    position = destination + (displacement + coefficient * elapsed) * decay;
    velocity = (velocity - omega * coefficient * elapsed) * decay;
    if (Math.abs(position - destination) < 0.25 && Math.abs(velocity) < 2) {
      list.scrollTo({ top: destination, behavior: "instant" });
      return stop();
    }
    // Do not read layout or rounded scrollTop during animation frames.
    list.scrollTo({ top: position, behavior: "instant" });
    frame = request(step);
  };
  return {
    stop,
    reveal(scroller: HTMLElement, row: HTMLElement, reducedMotion: boolean) {
      const viewport = scroller.getBoundingClientRect();
      const item = row.getBoundingClientRect();
      let top = scroller.scrollTop;
      if (item.top < viewport.top + 8) top += item.top - viewport.top - 8;
      else if (item.bottom > viewport.bottom - 8) top += item.bottom - viewport.bottom + 8;
      top = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, top));
      if (Math.abs(top - scroller.scrollTop) < 1) return;
      if (reducedMotion) {
        stop();
        scroller.scrollTo({ top, behavior: "instant" });
        return;
      }
      if (list !== scroller || frame === undefined) {
        stop();
        position = scroller.scrollTop;
      }
      list = scroller;
      destination = top;
      if (frame === undefined) frame = request(step);
    },
  };
}
