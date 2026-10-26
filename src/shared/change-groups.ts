import { match } from "ts-pattern";

export const changeGroups = [
  { id: "implementation", label: "Implementation" },
  { id: "tests", label: "Tests" },
  { id: "generated", label: "Generated" },
] as const;
export type ChangeGroup = (typeof changeGroups)[number]["id"];

// Shared path classification for Changes categories and Guide ordering.
// Generated artifacts take precedence even when they live under a test directory.
export function changeGroup(sourcePath: string): ChangeGroup {
  return match(sourcePath.toLowerCase())
    .when(
      (path) =>
        /(^|\/)(generated|__generated__|gen|dist)\//.test(path) ||
        /\.(generated|gen|g|pb)\./.test(path) ||
        /\.(snap|tsbuildinfo|map)$/.test(path) ||
        /\.min\.(js|css)$/.test(path) ||
        /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|cargo\.lock|poetry\.lock|uv\.lock|go\.sum|composer\.lock|gemfile\.lock)$/.test(
          path,
        ),
      () => "generated" as const,
    )
    .when(
      (path) =>
        /(^|\/)(__tests__|tests?|specs?|fixtures|__fixtures__|testdata|e2e)\//.test(path) ||
        /(^|\/)(test_|spec_)[^/]+$/.test(path) ||
        /[._-](test|tests|spec|specs)([._-]|$)/.test(path.split("/").at(-1) ?? "") ||
        /(Test|Tests)\.(java|kt|cs|swift)$/.test(sourcePath),
      () => "tests" as const,
    )
    .otherwise(() => "implementation");
}
