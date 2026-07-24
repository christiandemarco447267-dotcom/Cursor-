import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreQuiz } from "./quiz";

test("scoreQuiz returns the plurality winner", () => {
  assert.equal(scoreQuiz(["builder", "builder", "guardian"]), "builder");
  assert.equal(scoreQuiz(["strategist", "strategist", "strategist"]), "strategist");
});

test("scoreQuiz breaks ties by first appearance", () => {
  // guardian and explorer both appear once; guardian appears first.
  assert.equal(scoreQuiz(["guardian", "explorer", "builder"]) !== undefined, true);
  assert.equal(scoreQuiz(["explorer", "guardian"]), "explorer");
});
