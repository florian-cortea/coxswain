import { cn, muted } from "./components/styles";
import { Prose } from "./components/text";
import { count } from "./format";
import { useBlockEnd } from "./ProseThreads";

// A view's prose: text at a line length that's easy to follow; diagrams and tables take the column's width, a diagram
// on a card like the file diffs.
const viewProse = cn(
  "review-prose text-[15px] leading-[1.65] text-neutral-700 dark:text-neutral-300",
  "[&>*:not(.mermaid,table)]:max-w-[72ch] [&_strong]:text-neutral-900 dark:[&_strong]:text-neutral-100",
  "[&_.mermaid]:my-6 [&_.mermaid]:bg-white [&_.mermaid]:p-6 xl:[&_.mermaid]:p-8 dark:[&_.mermaid]:bg-neutral-900",
);

// The heading of a guide's files in no section; while it's being written they may be in one yet.
export const notInGuide = (writing: boolean) =>
  writing ? "Not yet in the guide" : "Not in the guide";

// Above a view section: its title, how many file diffs it embeds and a Reviewed checkbox for them all, ticked once all
// are. title null: the files in no section of a guide.
export function ViewSectionHeader(props: {
  title: string | null;
  position?: { index: number; total: number };
  files: number;
  reviewed: number;
  writing: boolean;
  onReviewedChange: (on: boolean) => void;
}) {
  const partial = props.reviewed > 0 && props.reviewed < props.files;
  return (
    <div className="flex flex-col gap-2 pb-4 select-text">
      <h2 className="text-xl font-semibold tracking-tight">
        {props.title !== null ? <Prose inline>{props.title}</Prose> : notInGuide(props.writing)}
      </h2>
      {(props.position || props.files > 0) && (
        <div className={cn("flex items-center gap-3 text-xs", muted)}>
          {props.position && (
            <span
              className="font-mono tabular-nums"
              aria-label={`Section ${props.position.index} of ${props.position.total}`}
            >
              {String(props.position.index).padStart(2, "0")}/
              {String(props.position.total).padStart(2, "0")}
            </span>
          )}
          {props.files > 0 && (
            <>
              <span>
                {count(props.files, "file")}
                {props.reviewed > 0 && ` · ${props.reviewed} reviewed`}
              </span>
              <label className="flex items-center gap-1 select-none">
                <input
                  type="checkbox"
                  ref={(input) => {
                    if (input) input.indeterminate = partial;
                  }}
                  aria-checked={partial ? "mixed" : props.reviewed === props.files}
                  style={partial ? { accentColor: "var(--color-neutral-500)" } : undefined}
                  checked={props.reviewed === props.files}
                  onChange={(e) => props.onReviewedChange(e.target.checked)}
                />
                Reviewed
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// A section's prose in its explanation column. Keep the original part index for quote threads (ADR 0036).
export function ViewProse(props: { children: string; part: number }) {
  const blockEnd = useBlockEnd(props.part);
  return (
    <div data-part={props.part}>
      <Prose className={cn("pb-5", viewProse)} blockEnd={blockEnd}>
        {props.children}
      </Prose>
    </div>
  );
}
