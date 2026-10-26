import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";

// Keep the two review surfaces laid out so Pierre retains rendered rows and measured heights.
// Visibility/inert hides inactive content without the zero-size/reset cycle of display:none.
// The parent keys this by workspace: at most Guide + Changes + Files live at once.
export function RetainedCanvas({
  surface,
  ready,
  canvasRef,
  children,
}: {
  surface: "guide" | "changes" | "files";
  ready: boolean;
  canvasRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [presented, setPresented] = useState(surface);
  const painted = useRef(new Set<string>());
  const visible = painted.current.has(surface) ? surface : presented;
  const surfaces = useRef(new Map<string, ReactNode>());
  if (ready || !surfaces.current.has(surface)) surfaces.current.set(surface, children);
  useLayoutEffect(() => {
    canvasRef.current =
      root.current?.querySelector<HTMLDivElement>(
        `[data-retained-canvas="${surface}"] .review-canvas`,
      ) ?? null;
  });
  useLayoutEffect(() => {
    if (!ready) return;
    if (painted.current.has(surface)) {
      setPresented(surface);
      return;
    }
    let frame = 0;
    let attempts = 0;
    const wait = () => {
      const target = canvasRef.current;
      const viewport = target?.getBoundingClientRect();
      const pending = target?.querySelectorAll<HTMLElement>("[data-diff-pending]");
      const waiting =
        viewport &&
        [...(pending ?? [])].some((node) => {
          const box = node.getBoundingClientRect();
          return box.top < viewport.bottom && box.bottom >= viewport.top;
        });
      // A newly visited tab gets its first measured code rows before it replaces the old surface.
      if (++attempts < 30 && (attempts < 2 || waiting)) {
        frame = requestAnimationFrame(wait);
        return;
      }
      painted.current.add(surface);
      setPresented(surface);
    };
    frame = requestAnimationFrame(wait);
    return () => cancelAnimationFrame(frame);
  }, [surface, ready, canvasRef]);
  return (
    <div ref={root} className="relative flex min-h-0 min-w-0 flex-1">
      {[...surfaces.current].map(([key, content]) => (
        <div
          key={key}
          data-retained-canvas={key}
          aria-hidden={key !== surface}
          inert={key !== surface}
          className="flex min-h-0 min-w-0 flex-1"
          style={
            key === visible
              ? { position: "relative" }
              : { position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none" }
          }
          onScrollCapture={(event) => {
            if (key !== surface) event.stopPropagation();
          }}
        >
          {content}
        </div>
      ))}
    </div>
  );
}
