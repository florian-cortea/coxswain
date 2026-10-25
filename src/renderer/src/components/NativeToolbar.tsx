import { match, P } from "ts-pattern";
import { GlassIsland, ui, useGlassCapabilities, type GlassNode } from "electron-glasskit/react";
import { type ReactNode, useLayoutEffect, useSyncExternalStore } from "react";
import { uiMetrics } from "./styles";

// Native bars remain visible but inactive while a dialog or popover is open.
let occlusions = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-window-material"],
  });
  return () => {
    listeners.delete(listener);
    observer.disconnect();
  };
};
export function useGlassOcclusion(active = true) {
  useLayoutEffect(() => {
    if (!active) return;
    occlusions++;
    changed();
    return () => {
      occlusions--;
      changed();
    };
  }, [active]);
}

// Dialog visibility never changes which platform controls are rendered.
export function useNativeControls() {
  const capabilities = useGlassCapabilities();
  const available = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.windowMaterial === "glass",
  );
  return available && !!capabilities?.glass && !!capabilities.islands;
}

// Keep native glass in place while HTML overlays are open; only disable its controls.
export function useNativeOcclusion() {
  return useSyncExternalStore(subscribe, () => occlusions > 0);
}

export type NativeControl =
  | {
      id: string;
      label: string;
      symbol?: string;
      disabled?: boolean;
      selected?: boolean;
      onPress: () => void;
    }
  | {
      id: string;
      label: string;
      symbol?: string;
      items: {
        id: string;
        label: string;
        onPress: () => void;
        disabled?: boolean;
        destructive?: boolean;
      }[];
    }
  | { text: string }
  | { spacer: true };

export function NativeToolbar({
  controls,
  children,
  enabled = true,
  compact = false,
}: {
  controls: NativeControl[];
  children: ReactNode;
  enabled?: boolean;
  compact?: boolean;
}) {
  const available = useNativeControls();
  const occluded = useNativeOcclusion();
  if (!available) return children;
  const nodes = controls.map((control): GlassNode =>
    match(control)
      .with({ spacer: true }, () => ui.spacer({ minLength: uiMetrics["space-2"] }))
      .with({ text: P.string }, ({ text }) => ui.text(text, { lineLimit: 1 }))
      .with({ items: P.array() }, (menu) =>
        ui.menu({
          label: menu.symbol ? ui.symbol(menu.symbol, { size: 14 }) : menu.label,
          items: menu.items.map((item) => ({
            id: item.id,
            title: item.label,
            disabled: item.disabled,
            destructive: item.destructive,
          })),
          frame: { minWidth: uiMetrics["control-height"], minHeight: uiMetrics["control-height"] },
        }),
      )
      .with({ onPress: P.any }, (button) =>
        ui.button({
          id: button.id,
          label: button.symbol
            ? ui.symbol(button.symbol, { size: 14 })
            : ui.text(button.label, { lineLimit: 1 }),
          help: button.label,
          accessibilityLabel: button.label,
          disabled: button.disabled,
          padding: { horizontal: uiMetrics["space-2"], vertical: uiMetrics["space-1"] },
          frame: { minWidth: uiMetrics["control-height"], minHeight: uiMetrics["control-height"] },
          background: button.selected
            ? { color: "#80808044", shape: { type: "rect", cornerRadius: 7 } }
            : undefined,
        }),
      )
      .exhaustive(),
  );
  return (
    <GlassIsland
      className={compact ? "h-8 w-full" : "h-[var(--ui-toolbar-height)] w-full"}
      content={ui.hstack(
        {
          spacing: uiMetrics["space-2"],
          disabled: occluded || !enabled,
          padding: compact
            ? { horizontal: 4, vertical: 2 }
            : { horizontal: uiMetrics["space-3"], vertical: uiMetrics["space-1"] },
          frame: { maxWidth: "infinity", maxHeight: "infinity" },
          font: { size: compact ? 12 : 13 },
          glass: { shape: { type: "rect", cornerRadius: 14 } },
        },
        nodes,
      )}
      onPress={({ node }) => {
        const actions = [
          ...controls.flatMap((c) => ("onPress" in c ? [c] : [])),
          ...controls.flatMap((c) => ("items" in c ? c.items : [])),
        ];
        const control = actions.find((c) => c.id === node);
        if (control && "onPress" in control && !control.disabled) control.onPress();
      }}
    >
      {children}
    </GlassIsland>
  );
}
