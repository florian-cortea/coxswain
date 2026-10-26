import { useSyncExternalStore } from "react";

// AppearanceSync resolves System and Soft Dark once for the whole app.
const subscribe = (listener: () => void) => {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-appearance"],
  });
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", listener);
  };
};
const snapshot = (): "light" | "dark" => {
  const appearance = document.documentElement.dataset.appearance;
  if (appearance) return appearance === "light" ? "light" : "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
export const useCodeThemeType = () => useSyncExternalStore(subscribe, snapshot);
