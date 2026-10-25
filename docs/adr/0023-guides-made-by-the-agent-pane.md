# 23. One Guide per workspace

## Status

Accepted

## Context

The Guide explains changes beside their code. Multiple saved documents with repeated Guide titles make updates ambiguous and add navigation that the reading workflow does not need.

## Decision

Each workspace has one Guide with a stable identity. Opening it starts a Guide job; worktree and GitHub events refresh it through the existing background runner (ADR 0038). A complete validated replacement updates the existing record in one transaction. The previous content remains readable during generation; failed or superseded jobs leave it intact. Guide agent/model/effort defaults are configurable in Settings and remembered per agent. Without an explicit Guide choice, use Claude Code with the adapter’s Opus choice (currently Opus 5.5); retired summary preferences no longer supply Guide defaults.

Update Guide opens a dialog for optional focus/style instructions. They are stored in core SQLite settings per workspace, used for manual and automatic updates, and cleared by submitting empty text. The dialog also offers agent, model and effort overrides for this update only. Switching agent reads its saved model/effort defaults without changing the configured Guide agent. Undefined selections inherit App Settings; empty strings explicitly use agent defaults. Overrides travel on the core guide event to the existing job runner, survive coalescing and retries, and are not persisted as defaults. Model-specific effort choices are discovered in a temporary agent session without changing Chat choices; unsupported explicit effort fails clearly. Discovery results deduplicate and cache for five minutes; session teardown runs after returning options, and the model catalog stays usable while effort choices load. Manual requests force a run even at the same range and supersede an active generation. Activity and the Guide sidebar show progress, failure and retry.

The canvas offers Guide, Changes, Files and the PR overview. There is no saved View library, New View action, repeated Guide titles, View removal or saved View prompt library. Legacy rows remain inert in SQLite without a destructive migration; the latest existing Guide is adopted and subsequent updates reuse it. Internal `views`/`view_id` names remain storage details for compatibility with entries and history.

Agent tools `start_guide`, `write_section`, `remove_section`, `read_guide`, `list_changed_files`, `add_explanation` and `add_finding` write to the same workspace Guide. `start_guide` resets it for interactive writing; the automatic runner publishes atomically. Findings remain opt-in. Source/diff embedding uses ADR 0026; immutable snapshots preserve code and review marks (ADR 0028, ADR 0014).

## Alternatives considered

- Keep numbered Guide versions in the navigation: obscures which document is current.
- Delete old records through a migration: unnecessarily removes historic entry anchors.
- Generate manual updates through chat: couples Guide customization to a conversation and leaves automatic refresh without the requested style.

## Consequences

A Guide update changes its content and pinned range while preserving its identity. File review marks remain keyed to contents. Legacy documents and saved prompts are no longer exposed in the UI. Custom focus applies to later automatic updates until changed. The bounded diff-evidence limit for very large changes remains documented in the generator.

The default Guide prompt groups implementation thematically, followed by a dedicated Tests section and a dedicated Generated section, omitting empty groups. File group metadata uses the same shared path classifier as Changes.
