import { match } from "ts-pattern";
import type { Db } from "./db";
import { emit } from "./events.ts";

import type { Appearance } from "../shared/appearance.ts";
export type { Appearance } from "../shared/appearance.ts";

function appearance(value: unknown): Appearance {
  return match(value)
    .with("light", () => "light" as const)
    .with("dark", () => "dark" as const)
    .with("soft-dark", () => "dark" as const)
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
  // Preserve the old Soft Dark selection when its user first switches to System/Light/Dark.
  const softDark = await getSoftDark(db);
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto("settings")
      .values({ key: "appearance", value: saved })
      .onConflict((oc) => oc.column("key").doUpdateSet({ value: saved }))
      .execute();
    await tx
      .insertInto("settings")
      .values({ key: "soft-dark", value: String(softDark) })
      .orIgnore()
      .execute();
  });
  emit({ what: "settings" });
  return saved;
}

// Legacy Soft Dark selections remain visually unchanged without a database migration.
export async function getSoftDark(db: Db): Promise<boolean> {
  const rows = await db
    .selectFrom("settings")
    .select(["key", "value"])
    .where("key", "in", ["soft-dark", "appearance"])
    .execute();
  const explicit = rows.find((row) => row.key === "soft-dark");
  return explicit
    ? explicit.value === "true"
    : rows.find((row) => row.key === "appearance")?.value === "soft-dark";
}
export async function setSoftDark(db: Db, enabled: boolean): Promise<void> {
  const value = String(enabled === true);
  await db
    .insertInto("settings")
    .values({ key: "soft-dark", value })
    .onConflict((oc) => oc.column("key").doUpdateSet({ value }))
    .execute();
  emit({ what: "settings" });
}

export type { CodeTheme } from "../shared/code-themes.ts";
import { codeThemeDefinition, type CodeTheme } from "../shared/code-themes.ts";
const codeTheme = (value: unknown): CodeTheme => codeThemeDefinition(value).id;

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
