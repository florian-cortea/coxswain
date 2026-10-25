import { type ComponentProps, type ReactNode, useEffect, useRef } from "react";
import type { GitProblem } from "../../../core/git";
import type { GitHubProblem } from "../../../core/github";
import { useGlassOcclusion } from "./NativeToolbar";
import { Button } from "./button";
import { SearchIcon, XIcon } from "./icons";
import { cn, divider, muted, noDrag, titleBar } from "./styles";
import { ProblemMessage } from "./text";

// A full-window screen (Settings, Projects, New workspace): its title bar, then a centred column.
export function Screen(props: {
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col select-none text-sm">
      <ScreenHeader title={props.title} onClose={props.onClose} />
      <div
        className={cn(
          "mx-auto flex min-h-0 w-full flex-1 flex-col p-6 lg:p-8 [&>.ui-card]:shrink-0",
          props.className,
        )}
      >
        {props.children}
      </div>
    </div>
  );
}

// Title bar of a full-window screen; Esc or Done closes it.
function ScreenHeader({ title, onClose }: { title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={cn(titleBar, "justify-between border-b pr-3 pl-20", divider)}>
      <span className="font-medium">{title}</span>
      <Button className={noDrag} onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

// Shared modal surface. Esc, ✕ or a
// click outside closes it. The backdrop takes the window's drag regions, so a click on it over a title bar closes too.
export function Dialog(props: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  minimal?: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { onClose } = props;
  const panel = useRef<HTMLDivElement>(null);
  const previousFocus = useRef(document.activeElement);
  const close = useRef(onClose);
  close.current = onClose;
  useGlassOcclusion();
  useEffect(() => {
    const previous = previousFocus.current;
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key !== "Tab") return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const edge = e.shiftKey ? controls[0] : controls.at(-1);
      if (
        !controls.length ||
        document.activeElement === edge ||
        document.activeElement === panel.current
      ) {
        e.preventDefault();
        (e.shiftKey ? controls.at(-1) : controls[0])?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, [onClose]);
  return (
    <div
      className={cn(
        "ui-dialog-backdrop fixed inset-0 z-50 flex justify-center",
        props.wide
          ? "px-[var(--review-gutter)] pt-[calc(var(--ui-toolbar-height)+var(--ui-space-3))] pb-[var(--ui-space-4)]"
          : "items-center p-6",
        noDrag,
      )}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-label={props.title}
        className={cn(
          "ui-dialog relative flex w-full flex-col overflow-hidden border text-sm outline-none select-none",
          props.wide ? "h-full max-w-none" : "max-h-[min(82vh,900px)] max-w-xl",
          props.className,
        )}
      >
        <div
          className={
            props.minimal
              ? "absolute top-3 right-3 z-10"
              : "ui-dialog-header flex shrink-0 items-start gap-4"
          }
        >
          <div className={cn("flex min-w-0 flex-1 flex-col gap-1", props.minimal && "hidden")}>
            <span className="text-lg leading-6 font-semibold tracking-tight">{props.title}</span>
            {props.subtitle && (
              <span className={cn("mt-1 text-[13px] leading-5", muted)}>{props.subtitle}</span>
            )}
          </div>
          <Button
            variant="ghost"
            title="Close (Esc)"
            aria-label="Close"
            className="ui-dialog-close -mr-1 p-1 text-neutral-500"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

export function DialogBody({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("ui-dialog-body min-h-0 overflow-y-auto", className)} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "ui-dialog-footer flex shrink-0 flex-wrap items-center justify-end gap-2",
        className,
      )}
    />
  );
}

// A dialog's search field: a magnifier and a borderless input across the dialog, a line under it.
export function SearchField(props: ComponentProps<"input">) {
  return (
    <label className={cn("flex min-h-11 shrink-0 items-center gap-2 border-y px-5 py-3", divider)}>
      <span className={muted}>
        <SearchIcon />
      </span>
      <input
        {...props}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-neutral-500"
      />
    </label>
  );
}

// A section's small heading in a dialog's list.
export function ListHeading({ children }: { children: ReactNode }) {
  return (
    <div className={cn("px-2 pt-3 pb-1 text-[10.5px] font-semibold tracking-wide", muted)}>
      {children}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("ui-card rounded-xl border p-4", className)} />;
}

// A problem loading a list, and a button to load it again.
export function ProblemCard({
  problem,
  onRetry,
}: {
  problem: GitHubProblem | GitProblem;
  onRetry: () => void;
}) {
  return (
    <Card className="flex items-center gap-3">
      <ProblemMessage problem={problem} />
      <Button className="ml-auto shrink-0" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}

// A pickable row in a full-window list.
export function ListRow({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "ui-list-row block w-full rounded-md px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800",
        className,
      )}
    />
  );
}

// A short message in the middle of an empty pane: loading, nothing to show.
export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className={cn("flex flex-1 items-center justify-center p-6 text-xs", muted)}>
      {children}
    </div>
  );
}

// failed: it won't get further; shown full, in red.
export function ProgressBar({
  value,
  max,
  failed,
  className,
}: {
  value: number;
  max: number;
  failed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800",
        className,
      )}
    >
      <div
        className={cn("h-full", failed ? "bg-red-500" : "bg-green-600")}
        style={{ width: `${failed ? 100 : max ? (value / max) * 100 : 0}%` }}
      />
    </div>
  );
}

// Drag handle between two panes. Resizes the preceding pane, or the following one with fromEnd.
// Horizontal layouts protect the canvas's width; vertical layouts can set a smaller remaining minimum.
export const viewerMin = 320;
export function Splitter(props: {
  min: number;
  max: number;
  fromEnd?: boolean;
  axis?: "x" | "y";
  remainingMin?: number;
  label?: string;
  onResize: (size: number) => void;
}) {
  const vertical = props.axis === "y";
  const start = useRef<{ at: number; size: number; max: number } | null>(null);
  const measure = (el: HTMLElement) => {
    const [pane, other] = props.fromEnd
      ? [el.nextElementSibling, el.previousElementSibling]
      : [el.previousElementSibling, el.nextElementSibling];
    if (!pane || !other) return null;
    const size = vertical ? pane.clientHeight : pane.clientWidth;
    const available = vertical ? other.clientHeight : other.clientWidth;
    return {
      size,
      max: Math.max(
        props.min,
        Math.min(props.max, size + available - (props.remainingMin ?? viewerMin)),
      ),
    };
  };
  const resize = (size: number, max: number) =>
    props.onResize(Math.max(props.min, Math.min(max, size)));
  return (
    <div
      role="separator"
      aria-label={props.label ?? "Resize pane"}
      aria-orientation={vertical ? "horizontal" : "vertical"}
      tabIndex={0}
      className={cn(
        "relative z-10 shrink-0 focus-visible:bg-blue-500 focus-visible:outline-none",
        vertical ? "-my-0.5 h-1 cursor-row-resize" : "-mx-0.5 w-1 cursor-col-resize",
        noDrag,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const el = e.currentTarget;
        const measured = measure(el);
        if (!measured) return;
        el.setPointerCapture(e.pointerId);
        start.current = { at: vertical ? e.clientY : e.clientX, ...measured };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const delta = ((vertical ? e.clientY : e.clientX) - s.at) * (props.fromEnd ? -1 : 1);
        resize(s.size + delta, s.max);
      }}
      onLostPointerCapture={() => (start.current = null)}
      onKeyDown={(e) => {
        const keys: Record<string, number> = vertical
          ? { ArrowUp: -1, ArrowDown: 1 }
          : { ArrowLeft: -1, ArrowRight: 1 };
        const direction = keys[e.key];
        const measured = measure(e.currentTarget);
        if (!direction || !measured) return;
        e.preventDefault();
        resize(
          measured.size + direction * (e.shiftKey ? 50 : 10) * (props.fromEnd ? -1 : 1),
          measured.max,
        );
      }}
    />
  );
}
