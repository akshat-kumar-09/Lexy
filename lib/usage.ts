import { getSql } from "@/lib/db";

/**
 * Daily Claude allowance, counted in Postgres so it holds across every server instance:
 * one row per person per UTC day, plus one row ("*all*") for everyone together — a ceiling on
 * what Lexy can spend in a day, whoever is calling.
 */

type Sql = NonNullable<ReturnType<typeof getSql>>;

const EVERYONE = "*all*";

function envLimit(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function dailyLimits() {
  return {
    perUser: envLimit("LEXY_DAILY_CALLS_PER_USER", 300),
    total: envLimit("LEXY_DAILY_CALLS_TOTAL", 6000),
  };
}

let tableReady: Promise<void> | null = null;
function ensureTable(sql: Sql): Promise<void> {
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS lexy_usage (
        subject TEXT NOT NULL,
        day DATE NOT NULL,
        calls INT NOT NULL DEFAULT 0,
        PRIMARY KEY (subject, day)
      )
    `;
  })().catch((e: unknown) => {
    tableReady = null;
    throw e;
  });
  return tableReady;
}

/** Count one call for `subject` today, unless that would pass `limit`. True when it was counted. */
async function take(sql: Sql, subject: string, day: string, limit: number): Promise<boolean> {
  const rows = await sql`
    INSERT INTO lexy_usage (subject, day, calls)
    VALUES (${subject}, ${day}::date, 1)
    ON CONFLICT (subject, day) DO UPDATE SET calls = lexy_usage.calls + EXCLUDED.calls
    WHERE lexy_usage.calls + EXCLUDED.calls <= ${limit}
    RETURNING calls
  `;
  return rows.length > 0;
}

export type Allowance = "ok" | "user" | "everyone";

/**
 * Spend one Claude call from today's allowance. "user" = this person is out for today;
 * "everyone" = Lexy's daily ceiling is reached. If the database can't be reached this lets the
 * call through (and logs it) rather than taking Lexy down — the Anthropic spend limit is the backstop.
 */
export async function spendAllowance(userId: string): Promise<Allowance> {
  const sql = getSql();
  if (!sql) {
    console.error("lexy_usage: DATABASE_URL is not set — daily limits are not enforced");
    return "ok";
  }
  const day = new Date().toISOString().slice(0, 10);
  const { perUser, total } = dailyLimits();
  try {
    await ensureTable(sql);
    if (!(await take(sql, `user:${userId}`, day, perUser))) return "user";
    if (!(await take(sql, EVERYONE, day, total))) return "everyone";
    return "ok";
  } catch (e) {
    console.error("lexy_usage: could not check the daily allowance", e);
    return "ok";
  }
}
