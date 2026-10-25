// Shared styling (ADR 0004): the tokens every screen uses, so a colour or a desktop convention changes in one place.

// ponytail: joins classes, no conflict resolution; add tailwind-merge (shadcn's cn) once callers override base classes.
export const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

// App metrics, in CSS pixels / native points. main.tsx exposes these as --ui-* for every screen.
// These are our Mac desktop defaults, not universal numeric requirements from Apple's HIG.
export const uiMetrics = {
  "space-1": 4,
  "space-2": 8,
  "space-3": 12,
  "space-4": 16,
  "space-6": 24,
  "space-8": 32,
  "control-height": 28,
  "field-height": 32,
  "toolbar-height": 44,
  "overlay-offset": 12,
  "overlay-clearance": 44 + 12 + 12,
} as const;

export const muted = "text-neutral-500 dark:text-neutral-400";
// The lines between panes and around cards.
export const divider = "border-neutral-200 dark:border-neutral-800";
// A row or toggle that can be the current one: filled while it is, a wash on hover while not.
export const selectable = (on: boolean) =>
  on ? "bg-neutral-200 dark:bg-neutral-700" : "hover:bg-neutral-100 dark:hover:bg-neutral-800";
// The bar at the top of a pane or screen. It drags the window, so controls on it take noDrag.
export const titleBar =
  "window-chrome flex h-[var(--ui-toolbar-height)] shrink-0 items-center [-webkit-app-region:drag]";
export const noDrag = "[-webkit-app-region:no-drag]";

// Header and body own their edges; an outer border would remain visible above a sticky header.
export const reviewCard = "rounded-xl";
export const reviewGutter = "mx-[var(--review-gutter)]";
