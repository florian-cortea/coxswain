// One vector contour paints the canvas cutout and hairline together, avoiding gradient stop seams.
export function ReviewCorners({ bottom = false }: { bottom?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`review-file-corners ${bottom ? "review-file-corners-bottom" : "review-file-corners-top"}`}
    >
      {["left", "right"].map((side) => (
        <svg key={side} className={`review-file-corner-${side}`} viewBox="0 0 12 12">
          <path d="M0 12V0H12V0.25A11.75 11.75 0 0 0 0.25 12Z" fill="var(--review-canvas-bg)" />
          <path
            d="M0.25 12A11.75 11.75 0 0 1 12 0.25"
            fill="none"
            stroke="var(--review-file-border)"
            strokeWidth="0.5"
          />
        </svg>
      ))}
    </span>
  );
}
