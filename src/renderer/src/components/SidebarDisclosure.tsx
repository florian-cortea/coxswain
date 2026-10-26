// The chevron tip shares the parent's tree-line axis in either state.
export function SidebarDisclosure({ expanded }: { expanded: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={expanded ? "m4 6 4 4 4-4" : "m4 4 4 4-4 4"} />
      </svg>
    </span>
  );
}
