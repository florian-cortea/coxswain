import { match } from "ts-pattern";
import type { Db } from "./db";
import { emit } from "./events.ts";

export type Appearance = "system" | "light" | "dark" | "soft-dark";

function appearance(value: unknown): Appearance {
  return match(value)
    .with("light", () => "light" as const)
    .with("dark", () => "dark" as const)
    .with("soft-dark", () => "soft-dark" as const)
    .otherwise(() => "system" as const);
}

export async function getAppearance(db: Db): Promise<Appearance> {
  const row = await db
    .selectFrom("settings")
    .select("value")
    .where("key", "=", "appearance")
    .executeTakeFirst();
  return appearance(row?.value);
}

export async function setAppearance(db: Db, value: Appearance): Promise<Appearance> {
  const saved = appearance(value);
  await db
    .insertInto("settings")
    .values({ key: "appearance", value: saved })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: saved }))
    .execute();
  emit({ what: "settings" });
  return saved;
}

export type CodeTheme = "default" | "one-dark" | "github" | "catppuccin";
const codeTheme = (value: unknown): CodeTheme =>
  match(value)
    .with("one-dark", () => "one-dark" as const)
    .with("github", () => "github" as const)
    .with("catppuccin", () => "catppuccin" as const)
    .otherwise(() => "default" as const);

export async function getCodeTheme(db: Db): Promise<CodeTheme> {
  const row = await db
    .selectFrom("settings")
    .select("value")
    .where("key", "=", "code-theme")
    .executeTakeFirst();
  return codeTheme(row?.value);
}
export async function setCodeTheme(db: Db, value: CodeTheme): Promise<CodeTheme> {
  const saved = codeTheme(value);
  await db
    .insertInto("settings")
    .values({ key: "code-theme", value: saved })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value: saved }))
    .execute();
  emit({ what: "settings" });
  return saved;
}
