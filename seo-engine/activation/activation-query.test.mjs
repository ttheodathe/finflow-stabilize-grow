import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("./production-aggregate-readonly.sql", import.meta.url), "utf8");
const newline = String.fromCharCode(10);

test("activation cohort requires registration, onboarding, and accounting action in chronological order", () => {
  assert.ok(sql.includes("min(o.completed_at) as completed_at"));
  for (const cteName of ["activated", "returning_all_time", "new_activated", "new_returning"]) {
    const start = sql.indexOf(cteName + " as (");
    assert.notEqual(start, -1, cteName + " CTE must exist");
    let end = sql.indexOf("),", start);
    if (end === -1) end = sql.indexOf(")" + newline + "select", start);
    assert.notEqual(end, -1, cteName + " CTE must close");
    const cte = sql.slice(start, end);
    assert.ok(cte.includes("a.created_at >= o.completed_at"), cteName + " must require action after onboarding");
  }
  assert.ok(sql.includes("o.completed_at >= r.created_at"));
  assert.ok(sql.includes("a.created_at >= r.created_at"));
});

test("activation query excludes invalid invoice states and exposes aggregate-only output", () => {
  assert.ok(sql.includes("lower(coalesce(i.status,'')) not in ('void','voided','cancelled','canceled','reversed','deleted')"));
  const finalSelect = sql.slice(sql.lastIndexOf(newline + "select"));
  assert.equal(finalSelect.includes("select user_id"), false);
  assert.equal(finalSelect.includes("se¶»§q«^