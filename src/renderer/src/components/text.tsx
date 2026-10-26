import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { installDiagramGestures } from "../../../shared/diagram-gestures";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { ExpandIcon } from "./icons";
import { Dialog } from "./layout";
import Markdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { match } from "ts-pattern";
import type { GitProblem } from "../../../core/git";
import type { GitHubProblem } from "../../../core/github";
import { cn } from "./styles";
import { MarkdownImage } from "./MarkdownImage";
import { diagramConfig, diagramPresentation } from "./diagram-theme";

const code =
  "rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs select-text dark:bg-neutral-800";

// These are component types, not callbacks: defining them inside Prose would remount every diagram
// whenever its parent renders (opening the command palette, scrolling between sections, …).
const components: Components = {
  img: ({ node: _node, ...props }) => <MarkdownImage {...props} />,
  a: (p) => <a {...p} target="_blank" />,
  pre: ({ node, ...p }) => {
    const code = node?.children[0];
    const classes = code?.type === "element" ? code.properties.className : undefined;
    const language =
      (["mermaid", "diff"] as const).find(
        (l) => Array.isArray(classes) && classes.includes(`language-${l}`),
      ) ?? null;
    const text =
      code?.type === "element" && code.children[0]?.type === "text" ? code.children[0].value : "";
    return match(language)
      .with("mermaid", () => <Mermaid code={text} />)
      .with("diff", () => <DiffSketch text={text} />)
      .with(null, () => <pre {...p} />)
      .exhaustive();
  },
};

// A diff in prose, e.g. a view's sketch of how a call tree changed (the pr skill's shaped diff): lines added green,
// removed red, hunk headers muted, as a file diff shows them.
function DiffSketch({ text }: { text: string }) {
  return (
    <pre>
      {/* As wide as the longest line, so a line's colour runs on when the block scrolls sideways. */}
      <code className="inline-block min-w-full">
        {text
          .replace(/\n$/, "")
          .split("\n")
          .map((line, i) => (
            <span
              key={i}
              className={cn(
                "-mx-2 block px-2",
                match(line[0])
                  .with("+", () => "bg-green-500/15 text-green-800 dark:text-green-300")
                  .with("-", () => "bg-red-500/15 text-red-800 dark:text-red-300")
                  .with("@", () => "text-neutral-500")
                  .otherwise(() => ""),
              )}
            >
              {line || " "}
            </span>
          ))}
      </code>
    </pre>
  );
}
const inlineComponents: Components = { ...components, p: (p) => <>{p.children}</> };

// ADR 0036: with blockEnd, each top-level block (a paragraph, a list, a table, a diagram) is marked data-block with
// its index, and blockEnd's node for it renders right after it: a view's threads on prose.
type Hast = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children: Hast[];
};
const markBlocks = () => (tree: Hast) => {
  let i = 0;
  tree.children = tree.children.map((el) =>
    el.type !== "element"
      ? el
      : {
          type: "element",
          tagName: "prose-block",
          properties: { block: i },
          children: [{ ...el, properties: { ...el.properties, dataBlock: i++ } }],
        },
  );
};
// HTML in markdown (GitHub's <details>, links, comments from bots) is read as HTML, then cut down to what GitHub itself
// allows in a comment, so it shows as it does there and nothing else gets in.
const html = [rehypeRaw, rehypeSanitize];
const BlockEnd = createContext<((block: number) => ReactNode) | undefined>(undefined);
const blockComponents = {
  ...components,
  "prose-block": ({ block, children }: { block: number; children: ReactNode }) => (
    <>
      {children}
      {useContext(BlockEnd)?.(Number(block))}
    </>
  ),
} as Components;

// Markdown from GitHub or an agent, with the HTML GitHub allows, selectable. Links get target=_blank so the main process opens them in the browser.
// A mermaid code block is drawn as its diagram (ADR 0026). inline: no paragraphs and no wrapper, for a title.
export function Prose({
  children,
  inline,
  className,
  blockEnd,
}: {
  children: string;
  inline?: boolean;
  className?: string;
  blockEnd?: (block: number) => ReactNode;
}) {
  const md = (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={blockEnd ? [...html, markBlocks] : html}
      components={inline ? inlineComponents : blockEnd ? blockComponents : components}
    >
      {children}
    </Markdown>
  );
  return inline ? (
    md
  ) : (
    <div className={cn("markdown select-text [overflow-wrap:anywhere]", className)}>
      <BlockEnd.Provider value={blockEnd}>{md}</BlockEnd.Provider>
    </div>
  );
}

// The system theme, followed live: diagrams are drawn again when it changes.
const dark = matchMedia("(prefers-color-scheme: dark)");
const subscribeDark = (onChange: () => void) => {
  dark.addEventListener("change", onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-appearance"],
  });
  return () => {
    dark.removeEventListener("change", onChange);
    observer.disconnect();
  };
};

// Draws a mermaid diagram as SVG, loading mermaid first (it's big, so only when one shows). Throws mermaid's error for a
// diagram that doesn't parse or draw. Parsed first: a failed render leaves mermaid's error graphic in the page.
let drawn = 0;
async function drawDiagram(code: string, isDark: boolean, softDark = false): Promise<string> {
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize(diagramConfig(isDark, softDark));
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(code);
  return (await mermaid.render(`mermaid-${++drawn}`, diagramPresentation(code, diagram))).svg;
}

// ADR 0026: the view tools check the agent's diagrams by drawing them here before they're saved, so the agent hears
// of one that doesn't draw.
window.coxswain.onCheckDiagrams(async (codes) => {
  const errors: (string | null)[] = [];
  for (const code of codes)
    errors.push(
      await drawDiagram(
        code,
        dark.matches,
        document.documentElement.dataset.appearance === "soft-dark",
      ).then(
        () => null,
        (e: Error) => e.message,
      ),
    );
  return errors;
});

// A mermaid diagram, drawn as SVG in the system theme. One that doesn't draw shows its code and the error.
function Mermaid({ code }: { code: string }) {
  const appearance = useSyncExternalStore(subscribeDark, () =>
    match({ dark: dark.matches, appearance: document.documentElement.dataset.appearance })
      .with({ appearance: "soft-dark" }, () => "soft-dark" as const)
      .with({ dark: true }, () => "dark" as const)
      .otherwise(() => "light" as const),
  );
  const expandButton = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (expanded) return () => expandButton.current?.focus({ preventScroll: true });
  }, [expanded]);
  const [result, setResult] = useState<{ svg?: string; error?: string }>({});
  useEffect(() => {
    let live = true;
    drawDiagram(code, appearance !== "light", appearance === "soft-dark").then(
      (svg) => live && setResult({ svg }),
      (e: Error) => live && setResult({ error: e.message }),
    );
    return () => void (live = false);
  }, [code, appearance]);
  if (result.error)
    return (
      <div className="mermaid">
        <pre>
          <code>{code}</code>
        </pre>
        <ErrorText>Diagram: {result.error}</ErrorText>
      </div>
    );
  return result.svg ? (
    <div className="mermaid relative my-2">
      <div className="absolute top-2 right-2 z-10 leading-none">
        <Button
          ref={expandButton}
          variant="ghost"
          aria-label="Expand diagram"
          title="Expand diagram"
          className="p-1 text-neutral-500 dark:text-neutral-400"
          onClick={() => {
            void drawDiagram(code, appearance !== "light", appearance === "soft-dark")
              .then(async (svg) => {
                if (!(await window.coxswain.showDiagram(svg))) setExpanded(svg);
                expandButton.current?.focus({ preventScroll: true });
              })
              .catch((e: Error) => setResult({ error: e.message }));
          }}
        >
          <ExpandIcon />
        </Button>
      </div>
      <div
        className="flex justify-center [&_svg]:h-auto [&_svg]:max-h-[min(560px,65vh)] [&_svg]:w-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
      {expanded &&
        createPortal(
          <DiagramPreview svg={expanded} onClose={() => setExpanded(null)} />,
          document.body,
        )}
    </div>
  ) : (
    <div className="mermaid text-xs text-neutral-500">Drawing the diagram…</div>
  );
}

function DiagramPreview({ svg, onClose }: { svg: string; onClose: () => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (viewport.current && drawing.current)
      return installDiagramGestures(viewport.current, drawing.current);
  }, []);
  return (
    <Dialog title="Diagram" wide minimal onClose={onClose}>
      <div
        ref={viewport}
        className="relative min-h-0 flex-1 overflow-hidden touch-none select-none"
      >
        <div
          ref={drawing}
          className="w-full [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-none!"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </Dialog>
  );
}

export function ErrorText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-xs text-red-600 select-text dark:text-red-400", className)}>
      {children}
    </div>
  );
}

export function ProblemMessage({ problem }: { problem: GitHubProblem | GitProblem }) {
  switch (problem.status) {
    case "git-error":
      return <span className="select-text">Git: {problem.message}</span>;
    case "signed-out":
      return (
        <span>
          Not signed in. Run <code className={code}>gh auth login</code> in a terminal.
        </span>
      );
    case "gh-missing":
      return (
        <span>
          The GitHub CLI isn't installed. Run <code className={code}>brew install gh</code>, then{" "}
          <code className={code}>gh auth login</code>.
        </span>
      );
    case "error":
      return <span>Couldn't reach GitHub: {problem.message}</span>;
  }
}
