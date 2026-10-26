import { match } from "ts-pattern";
import type { PullRequestTitle } from "../../core/github";

export function workspacePrColor(pull: PullRequestTitle | undefined): string {
  return match(pull)
    .with({ state: "merged" }, () => "#c084fc")
    .with({ state: "closed" }, () => "#f87171")
    .with({ conflicting: true }, { failing: true }, () => "#fb923c")
    .with({ approved: true }, () => "#22c55e")
    .otherwise(() => "#22c55e");
}

export function workspacePrSymbol(pull: PullRequestTitle | undefined): string {
  return match(pull)
    .with({ state: "merged" }, () => "arrow.triangle.merge")
    .with({ state: "closed" }, () => "arrow.triangle.branch")
    .with({ conflicting: true }, () => "exclamationmark.square.fill")
    .with({ failing: true }, () => "arrow.triangle.branch")
    .with({ approved: true }, () => "checkmark.square.fill")
    .otherwise(() => "arrow.triangle.branch");
}
