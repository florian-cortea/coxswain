import type { Db } from "./db";
import { emit } from "./events.ts";
import { defaultReviewPrompt } from "./thread-context.ts";

export const defaultGuidePrompt = `Write a concise reading guide. Group implementation changes into thematic sections, core behavior first.
End with a separate Tests section containing all test files, then a separate Generated section containing all generated files.
Omit an ending section when its group is empty. Use each file's supplied group when available; generated artifacts take precedence over tests.
Use short descriptive headings and one or two short sentences per section explaining
intent, behavior and connections that help the reader understand the change. The code is visible in adjacent cards:
keep code snippets, pseudocode and line-by-line restatements out of the prose. A plain guide describes; it adds no review
findings, checklists, merge-risk report or chat recap. Embed every changed file exactly once.`;

const defaults = { guide: defaultGuidePrompt, review: defaultReviewPrompt };
export type DefaultPromptName = keyof typeof defaults;
export type DefaultPrompts = Record<DefaultPromptName, { value: string; defaultValue: string }>;

export async function getDefaultPrompts(db: Db): Promise<DefaultPrompts> {
  const rows = await db
    .selectFrom("settings")
    .select(["key", "value"])
    .where("key", "in", ["prompts.guide", "prompts.review"])
    .execute();
  const get = (name: DefaultPromptName) => ({
    value: rows.find((row) => row.key === `prompts.${name}`)?.value ?? defaults[name],
    defaultValue: defaults[name],
  });
  return { guide: get("guide"), review: get("review") };
}

// Null restores the built-in prompt rather than saving a copy that would mask future updates.
export async function setDefaultPrompt(db: Db, name: DefaultPromptName, value: string | null) {
  if (!Object.hasOwn(defaults, name)) throw new Error("Unknown default prompt");
  const key = `prompts.${name}`;
  if (value === null) {
    await db.deleteFrom("settings").where("key", "=", key).execute();
  } else {
    if (!value.trim()) throw new Error("Prompt must not be empty; use Restore Default instead.");
    await db
      .insertInto("settings")
      .values({ key, value: value.trim() })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: value.trim() }))
      .execute();
  }
  emit({ what: "settings" });
}
