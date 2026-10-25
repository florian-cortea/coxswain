import { File } from "@pierre/diffs/react";
import { codeThemes } from "./components/code-theme";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { CodeTheme, Appearance as AppearanceMode } from "../../core/appearance";
import type { CurrentUser } from "../../core/github";
import type { GuideSettings } from "../../core/guides";
import { Button, SegmentedControl } from "./components/button";
import { Card, Screen } from "./components/layout";
import { muted } from "./components/styles";
import { ErrorText, ProblemMessage } from "./components/text";
import { core } from "./queries";
import { GuideRunOptions } from "./components/GuideRunOptions";

// Ask the installed agent for models using the open workspace.
export function Settings({ onClose, workspaceId }: { onClose: () => void; workspaceId?: number }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const check = () => {
    setUser(null);
    window.coxswain.currentUser().then(setUser);
  };
  useEffect(check, []);

  return (
    <Screen title="Settings" onClose={onClose} className="max-w-xl overflow-auto">
      <h2 className="mb-2 font-medium">Appearance</h2>
      <Appearance />
      <h2 className="mt-6 mb-2 font-medium">Code Theme</h2>
      <CodeThemes />
      <h2 className="mt-6 mb-2 font-medium">GitHub account</h2>
      <Card className="flex min-h-16 items-center gap-3">
        {!user ? (
          <span className={muted}>Checking…</span>
        ) : user.status === "signed-in" ? (
          <>
            <img src={user.avatarUrl} alt="" className="size-10 rounded-full" />
            <div>
              <div className="font-medium">{user.name ?? user.login}</div>
              <div className={muted}>@{user.login} · signed in through the GitHub CLI</div>
            </div>
          </>
        ) : (
          <>
            <ProblemMessage problem={user} />
            <Button className="ml-auto shrink-0" onClick={check}>
              Check again
            </Button>
          </>
        )}
      </Card>
      <h2 className="mt-6 mb-2 font-medium">Guides</h2>
      <GuideModels workspaceId={workspaceId} />
      <h2 className="mt-6 mb-2 font-medium">About</h2>
      <Card className="select-text">
        coxswain {__VERSION__} <span className={muted}>· {__COMMIT__}</span>
      </Card>
    </Screen>
  );
}

function Appearance() {
  const query = useQuery(core("getAppearance"));
  const [error, setError] = useState<string | null>(null);
  const save = async (value: AppearanceMode) => {
    setError(null);
    try {
      await window.coxswain.setAppearance(value);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Card className="flex flex-col items-start gap-3">
      {query.data ? (
        <SegmentedControl<AppearanceMode>
          value={query.data}
          onChange={save}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "soft-dark", label: "Soft Dark" },
          ]}
        />
      ) : (
        <span className={muted}>Loading…</span>
      )}
      <p className={muted}>
        System follows your operating system’s appearance. Soft Dark uses lighter charcoal surfaces.
      </p>
      {query.isError && <ErrorText>Couldn't load appearance.</ErrorText>}
      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

// The installed agent supplies available models for the workspace.
function GuideModels({ workspaceId }: { workspaceId?: number }) {
  const settings = useQuery(core("getGuideSettings")).data;
  const [error, setError] = useState<string | null>(null);
  if (!settings) return <Card className={muted}>Loading…</Card>;
  const save = async (s: Partial<GuideSettings>) => {
    setError(null);
    try {
      await window.coxswain.setGuideSettings(s);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Card className="flex flex-col gap-3">
      <p className={muted}>
        Choose the agent, model and effort that generate and update Guides. Progress appears in the
        Guide sidebar. Use Update Guide in its dots menu to regenerate manually.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-24 shrink-0">Agent</span>
        <SegmentedControl
          value={settings.agent}
          // Each agent keeps its own model; the core reads it back.
          onChange={(agent) => save({ agent })}
          options={[
            { value: "claude", label: "Claude Code" },
            { value: "codex", label: "Codex" },
          ]}
        />
      </div>
      <GuideRunOptions
        workspaceId={workspaceId}
        settings={settings}
        value={settings}
        onChange={save}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

const themeSample = {
  name: "review.py",
  contents: `from dataclasses import dataclass
from enum import StrEnum

class ReviewStatus(StrEnum):
    READY = "ready"
    REVIEWED = "reviewed"

@dataclass(frozen=True)
class Change:
    path: str
    additions: int = 42

# Keep the review focused on what changed.
def summarize(change: Change) -> str:
    return f"{change.path}: +{change.additions} lines"
`,
};

function CodeThemes() {
  const theme = useQuery(core("getCodeTheme"));
  const [hovered, setHovered] = useState<CodeTheme | null>(null);
  const previewTheme = hovered ?? theme.data ?? "default";
  const previewOptions = useMemo(
    () => ({
      theme: codeThemes(previewTheme),
      disableFileHeader: true,
      overflow: "wrap" as const,
      unsafeCSS:
        ":host { --diffs-bg: var(--review-file-bg); --diffs-font-size: 12px; --diffs-line-height: 20px; }",
    }),
    [previewTheme],
  );
  const [error, setError] = useState<string | null>(null);
  const save = async (value: CodeTheme) => {
    setError(null);
    try {
      await window.coxswain.setCodeTheme(value);
    } catch (error) {
      setError((error as Error).message);
    }
  };
  return (
    <Card className="flex flex-col items-start gap-3">
      {theme.data && (
        <SegmentedControl<CodeTheme>
          value={theme.data}
          onChange={save}
          onPreview={setHovered}
          options={[
            { value: "default", label: "Default" },
            { value: "one-dark", label: "One Dark" },
            { value: "github", label: "GitHub" },
            { value: "catppuccin", label: "Catppuccin" },
          ]}
        />
      )}
      <div
        className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
        aria-label="Code theme preview"
      >
        {/* A tiny sample uses its own highlighter so hovering never changes the workspace's shared worker theme. */}
        <File file={themeSample} options={previewOptions} disableWorkerPool />
      </div>
      <p className={muted}>Hover or focus a theme to preview it. Click to save.</p>
      <p className={muted}>
        One Dark matches the reference’s purple, amber and cyan syntax. Code themes follow the app’s
        light or dark appearance.
      </p>
      {(error || theme.isError) && <ErrorText>{error ?? "Couldn't load code theme."}</ErrorText>}
    </Card>
  );
}
