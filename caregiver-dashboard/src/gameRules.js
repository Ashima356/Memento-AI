export const levels = ["easy", "medium", "hard"];
export const pairs = { easy: 3, medium: 6, hard: 8 };
export function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function nextLevel(level, accuracy, hints = 0, capacity = Infinity) {
  const n = levels.indexOf(level);
  if (accuracy < 50) return levels[Math.max(0, n - 1)];
  const next = levels[Math.min(2, n + 1)];
  return accuracy >= 80 && hints <= 1 && capacity >= pairs[next] ? next : level;
}
export function questions(people) {
  return shuffle(
    people
      .map((p) => {
        const names = [...new Set(people.map((x) => x.name.trim()))].filter(
          (n) => n !== p.name.trim(),
        );
        return {
          ...p,
          answer: p.name.trim(),
          options: shuffle([p.name.trim(), ...shuffle(names).slice(0, 3)]),
        };
      })
      .filter((q) => q.options.length >= 2),
  );
}
export function board(people, level) {
  return shuffle(
    shuffle(people)
      .slice(0, pairs[level])
      .flatMap((p) => [
        { id: p._id, type: "photo", value: p.src },
        {
          id: p._id,
          type: "memory",
          value: shuffle(p.memories)[0].description,
        },
      ]),
  );
}
export const percent = (n, total) => Number(((100 * n) / total).toFixed(2));
export function matchingResult(level, matches, turns, capacity) {
  const score = percent(matches, turns);
  return {
    gameType: "memory-matching",
    difficulty: level,
    finalDifficulty: nextLevel(level, score, 0, capacity),
    score,
    totalQuestions: turns,
    correctAnswers: matches,
    totalAttempts: turns,
    hintsUsed: 0,
    completionRate: 100,
  };
}
