# 14. Reviewed belongs to the contents reviewed

Date: 2026-09-25

## Status

Accepted

## Context

The canvas shows file diffs from different ranges: the live diff (merge base → worktree), a guide pinned to the
PR head it was made at ([ADR 0023](0023-guides-made-by-the-agent-pane.md)), and a commit diff. An agent's turn can
change dozens of files in the worktree. A file diff the user marked _Reviewed_ should stay reviewed exactly as long
as what they reviewed is unchanged, in whichever range it shows up.

## Decision

1. **Reviewed belongs to a file diff's contents**: a fingerprint of the file’s old and new contents, independent of the commits that contain them. For a pinned range the contents are read at its head (`git cat-file --batch`); for the live
   diff, from the worktree. A file with no local changes has the same fingerprint in both, so they agree.
2. **`reviewed_files` keeps one row per fingerprint**, so a pinned ✓ and a live one don't replace each other.
3. **A file diff that changes is no longer reviewed.** A new guide, or the live diff after a push, shows ✓ for
   every file diff that didn't change: same old and new file contents, same fingerprint. Guide regeneration, reordered sections and unrelated base-branch commits do not clear marks.

4. **Whole files have independent Reviewed marks** (#31). A source file embedded in a view is fingerprinted by
   its contents alone, with a `file:` prefix separating it from diff fingerprints in the same table. The base and
   snapshot commit identity do not affect that mark. An edit invalidates it in a new snapshot; old pinned views keep
   it. Reviewing a whole file never marks its diff reviewed, or vice versa. Whole-file fingerprints retain their original format.

5. **Changed-since-review dots retain a per-file baseline.** The settings record `review.change-baselines.<workspace>` stores each file’s canonical diff fingerprint from the first Guide snapshot or the last explicit Reviewed action. Before replacing a Guide, initialize missing paths from the prior range so added/changed files are detectable. Baselines persist until Reviewed acknowledges newer contents; changing only prose or unchecking Reviewed does not invent an update. Guide/Changes compare the displayed diff against these baselines, with prior saved review marks as a compatibility fallback. These are private app-owned review metadata, with no schema migration.

## Alternatives considered

- **Reviewed per guide**: a new guide would start with nothing reviewed, even for file diffs that didn't change.
- **Reviewed per path, marked "changed since reviewed"**: the mark survives changes the user never saw.

## Consequences

- A pinned guide and the live diff can disagree on a file with local changes: reviewed in one, not in the other.
- Rows for fingerprints no longer in use stay in `reviewed_files`.
- After a rebase, marks carry over for files whose old and new contents are unchanged. Only files whose contents differ lose their marks.
- Diff fingerprints use a `diff:` namespace and content digests for both sides. Existing commit-based marks remain readable through current and historical Guide/job bases, accepted only when that base’s file contents match the current base. Unchecking clears compatible legacy marks too. Historical references that are no longer available cannot prove compatibility and remain unreviewed; saved rows are never discarded.
