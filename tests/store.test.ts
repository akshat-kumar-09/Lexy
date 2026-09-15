import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { todayISODate } from "../lib/dates";

describe("todayISODate", () => {
  it("returns YYYY-MM-DD in local time", () => {
    const iso = todayISODate();
    assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);

    const [y, m, d] = iso.split("-").map(Number);
    const now = new Date();
    assert.equal(y, now.getFullYear());
    assert.equal(m, now.getMonth() + 1);
    assert.equal(d, now.getDate());
  });
});
