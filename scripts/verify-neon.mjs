import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key === "DATABASE_URL" && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = val;
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url || url.trim() === "") {
  console.error(
    "DATABASE_URL is missing. Add your Neon connection string to .env.local (see .env.example)."
  );
  process.exit(1);
}

const sql = neon(url.trim());
const rows = await sql`SELECT current_database() AS db, now() AS server_time`;
console.log("Neon connection OK:", rows[0]);
