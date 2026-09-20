/** Pull a JSON object out of a model reply that may include fences or stray prose. */

export function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function extractJsonObject(raw: string): string {
  const stripped = stripCodeFence(raw);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) return stripped.slice(start, end + 1);
  return stripped;
}

export function removeTrailingCommas(json: string): string {
  return json.replace(/,\s*([\]}])/g, "$1");
}

/** Index of the matching `}` for the `{` at `start`, skipping strings. `-1` if truncated. */
export function matchingBrace(src: string, start: number): number {
  if (src[start] !== "{") return -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Complete objects from a (possibly truncated) JSON array body. */
export function salvageJsonObjects(arrayBody: string): unknown[] {
  const objects: unknown[] = [];
  let i = 0;
  while (i < arrayBody.length) {
    const start = arrayBody.indexOf("{", i);
    if (start < 0) break;
    const end = matchingBrace(arrayBody, start);
    if (end < 0) break;
    try {
      objects.push(JSON.parse(arrayBody.slice(start, end + 1)));
    } catch {
      /* skip a malformed object and keep looking */
    }
    i = end + 1;
  }
  return objects;
}

const UNREADABLE = "Claude sent a page we couldn't read. Try New batch.";

/**
 * Parse JSON a language model returned. Tolerates fences, trailing commas,
 * and a truncated `suggestions` array (keeps every complete object).
 */
export function parseModelJson<T>(raw: string): T {
  const extracted = extractJsonObject(raw);
  const attempts = [extracted, removeTrailingCommas(extracted)];
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* try the next repair */
    }
  }

  const match = extracted.match(/"suggestions"\s*:\s*\[([\s\S]*)/);
  if (match) {
    const items = salvageJsonObjects(match[1]);
    if (items.length) return { suggestions: items } as T;
  }

  throw new Error(UNREADABLE);
}
