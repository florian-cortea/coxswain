import { useId, useRef } from "react";
import { match } from "ts-pattern";
import { Button } from "./button";
import { ChevronDownIcon } from "./icons";
import { cn, selectable } from "./styles";

// A dropdown for choices that need a local live preview; native menus don't expose hover.
export function PreviewSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  onPreview,
  disabled,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
  onPreview?: (value: T | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const anchor = `--preview-select-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div className="relative min-w-0">
      <Button
        className="w-full gap-2"
        aria-label={`${label}: ${options.find((option) => option.id === value)?.label}`}
        aria-haspopup="listbox"
        disabled={disabled}
        popoverTarget={id}
        style={{ anchorName: anchor }}
        onClick={() =>
          requestAnimationFrame(() => {
            menu.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
          })
        }
      >
        <span className="flex-1 text-left">
          {options.find((option) => option.id === value)?.label}
        </span>
        <ChevronDownIcon />
      </Button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        style={{ positionAnchor: anchor }}
        role="listbox"
        aria-label={label}
        className="preview-select-menu rounded-xl p-1 text-xs shadow-lg"
        onToggle={(event) => {
          if (event.newState === "closed") onPreview?.(null);
        }}
        onPointerLeave={() => onPreview?.(null)}
        onKeyDown={(event) => {
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = match(event.key)
            .with("ArrowDown", () => (current + 1) % buttons.length)
            .with("ArrowUp", () => (current - 1 + buttons.length) % buttons.length)
            .with("Home", () => 0)
            .with("End", () => buttons.length - 1)
            .otherwise(() => null);
          if (next === null) return;
          event.preventDefault();
          buttons[next]?.focus();
        }}
      >
        {options.map((option) => (
          <button
            key={option.id}
            role="option"
            aria-selected={option.id === value}
            className={cn(
              "block w-full rounded-lg px-3 py-1.5 text-left outline-none hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700",
              selectable(option.id === value),
            )}
            onPointerEnter={() => onPreview?.(option.id)}
            onFocus={() => onPreview?.(option.id)}
            onClick={() => {
              onChange(option.id);
              menu.current?.hidePopover();
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
