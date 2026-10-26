import { type ReactNode, useEffect, useRef, useState } from "react";

// Keep scrollbar visibility local: scrolling descriptions must not rerender the canvas or its diffs.
export function GuideExplanation({ children }: { children: ReactNode }) {
  const [scrolling, setScrolling] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(idle.current), []);
  return (
    <div className="guide-section-explanation min-w-0">
      <div
        className="guide-section-content"
        data-scrolling={scrolling || undefined}
        onScroll={() => {
          setScrolling(true);
          clearTimeout(idle.current);
          idle.current = setTimeout(() => setScrolling(false), 700);
        }}
      >
        {children}
      </div>
    </div>
  );
}
