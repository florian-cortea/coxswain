// Command-wheel and Chromium’s ctrl+wheel trackpad pinch zoom; ordinary two-axis wheel events pan the board.
// Self-contained so native glass and web previews share the same interaction without the app renderer.
export function installDiagramGestures(viewport: HTMLElement, drawing: HTMLElement) {
  let zoom = 1;
  let x = 32;
  let y = 32;
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;
  const paint = () => {
    drawing.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  };
  drawing.style.position = "absolute";
  drawing.style.left = "0";
  drawing.style.top = "0";
  drawing.style.width = "calc(100% - 64px)";
  drawing.style.transformOrigin = "0 0";
  y = (viewport.clientHeight - drawing.getBoundingClientRect().height) / 2;
  paint();
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const next = Math.min(8, Math.max(0.1, zoom * Math.exp(-event.deltaY * 0.01)));
      const bounds = viewport.getBoundingClientRect();
      const px = event.clientX - bounds.left;
      const py = event.clientY - bounds.top;
      const ratio = next / zoom;
      x = px - (px - x) * ratio;
      y = py - (py - y) * ratio;
      zoom = next;
    } else {
      const unit = event.deltaMode === 1 ? 16 : 1;
      x -= event.deltaX * unit;
      y -= event.deltaY * unit;
    }
    paint();
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("button")) return;
    dragging = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
    viewport.setPointerCapture(event.pointerId);
    viewport.style.cursor = "grabbing";
  };
  const move = (event: PointerEvent) => {
    if (!dragging) return;
    x += event.clientX - pointerX;
    y += event.clientY - pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;
    paint();
  };
  const up = () => {
    dragging = false;
    viewport.style.cursor = "grab";
  };
  viewport.style.cursor = "grab";
  viewport.addEventListener("wheel", wheel, { passive: false });
  viewport.addEventListener("pointerdown", down);
  viewport.addEventListener("pointermove", move);
  viewport.addEventListener("pointerup", up);
  viewport.addEventListener("pointercancel", up);
  return () => {
    viewport.removeEventListener("wheel", wheel);
    viewport.removeEventListener("pointerdown", down);
    viewport.removeEventListener("pointermove", move);
    viewport.removeEventListener("pointerup", up);
    viewport.removeEventListener("pointercancel", up);
  };
}
