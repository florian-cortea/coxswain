import type { FileContents } from "@pierre/diffs";
import type { FileText } from "../../../core/git";

// Query results are immutable and structurally shared. Reuse the same Pierre identity across remounts;
// changed contents get a new key. Weak ownership follows the query cache rather than retaining every revision.
const contents = new WeakMap<FileText, Map<string, FileContents>>();
let nextId = 0;
export function fileContents(read: FileText, name: string): FileContents {
  let names = contents.get(read);
  if (!names) contents.set(read, (names = new Map()));
  let file = names.get(name);
  if (!file) {
    file = {
      name,
      contents: read.status === "ok" ? (read.text ?? "") : "",
      cacheKey: `coxswain:${++nextId}`,
    };
    names.set(name, file);
  }
  return file;
}
