import test from "node:test";
import assert from "node:assert/strict";
import { addTask, completeTask, getTask, listTasks, resetStore } from "../src/store.js";
import { formatTask, formatList } from "../src/format.js";
import { completionRate, doneCount, totalCount } from "../src/stats.js";
import { parseAddCommand } from "../src/parse.js";

test("store: add, complete, list", () => {
  resetStore();
  const a = addTask("write docs");
  const b = addTask("ship it");
  assert.equal(a.id, 1);
  assert.equal(a.title, "write docs");
  assert.equal(a.done, false);
  assert.equal(listTasks().length, 2);
  completeTask(b.id);
  assert.equal(getTask(b.id).done, true);
  assert.equal(listTasks().filter((t) => t.done).length, 1);
  assert.equal(completeTask(999), null);
});

test("format: tasks and lists", () => {
  assert.equal(formatTask({ id: 3, title: "hello", done: false }), "#3 hello");
  assert.equal(formatTask({ id: 4, title: "done thing", done: true }), "#4 done thing ✓");
  assert.equal(formatList([]), "(no tasks)");
  assert.equal(
    formatList([{ id: 1, title: "a", done: false }, { id: 2, title: "b", done: true }]),
    "#1 a\n#2 b ✓"
  );
});

test("stats: counts and rate", () => {
  const ts = [{ done: true }, { done: false }];
  assert.equal(totalCount(ts), 2);
  assert.equal(doneCount(ts), 1);
  assert.equal(completionRate(ts), 0.5);
});

test("parse: add command", () => {
  assert.equal(parseAddCommand("add fix the bug").title, "fix the bug");
  assert.equal(parseAddCommand("nonsense"), null);
  assert.equal(parseAddCommand(42), null);
});
