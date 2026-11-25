import test from "node:test";
import assert from "node:assert/strict";
import {
  nextLevel,
  questions,
  board,
  matchingResult,
  pairs,
} from "../src/gameRules.js";
test("adaptive thresholds, hint limit, and available-pair ceiling", () => {
  assert.equal(nextLevel("easy", 80, 1), "medium");
  assert.equal(nextLevel("easy", 80, 2), "easy");
  assert.equal(nextLevel("medium", 49.99), "easy");
  assert.equal(nextLevel("medium", 50), "medium");
  assert.equal(nextLevel("medium", 80, 0, 7), "medium");
  assert.equal(nextLevel("hard", 100), "hard");
});
test("matching uses one photo and one linked memory per distinct person", () => {
  const people = Array.from({ length: 9 }, (_, i) => ({
    _id: String(i),
    src: String(i),
    memories: [{ description: "record " + i }],
  }));
  for (const level of Object.keys(pairs)) {
    const cards = board(people, level);
    assert.equal(cards.length, 2 * pairs[level]);
    for (const c of cards)
      assert.equal(
        cards.filter((x) => x.id === c.id && x.type !== c.type).length,
        1,
      );
  }
  assert.deepEqual(matchingResult("easy", 3, 5, 8), {
    gameType: "memory-matching",
    difficulty: "easy",
    finalDifficulty: "easy",
    score: 60,
    totalQuestions: 5,
    correctAnswers: 3,
    totalAttempts: 5,
    hintsUsed: 0,
    completionRate: 100,
  });
});
test("face-name requires distinct names and offers up to three distinct distractors", () => {
  assert.equal(questions([{ name: "A" }, { name: "A" }]).length, 0);
  for (const q of questions("AABCDE".split("").map((name) => ({ name })))) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.answer));
  }
});
