import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ScanFace, Layers, Flower2, Check } from "lucide-react";
import { DataState, Heading, Notice, Feedback, useAction } from "./ui";
import { photoUrl, request, useData, scope } from "./api";
import {
  pairs,
  questions,
  board,
  percent,
  nextLevel,
  matchingResult,
} from "./gameRules";

function FaceRound({ people, finish }) {
  const [deck] = useState(() => questions(people)),
    [i, move] = useState(0),
    [tries, attempt] = useState(0),
    [level, change] = useState("easy");
  const [stats, setStats] = useState({
    correct: 0,
    hints: 0,
    total: 0,
    seconds: 0,
  });
  const start = useRef(performance.now()),
    q = deck[i];
  function pick(choice) {
    const count = tries + 1;
    if (choice !== q.answer) {
      attempt(count);
      return;
    }
    const s = {
      correct: stats.correct + Number(count === 1),
      hints: stats.hints + Number(count > 2),
      total: stats.total + count,
      seconds: stats.seconds + (performance.now() - start.current) / 1000,
    };
    const raw = (100 * s.correct) / (i + 1),
      finalDifficulty = nextLevel(level, raw, s.hints);
    if (i + 1 === deck.length) {
      finish({
        gameType: "face-name",
        difficulty: "easy",
        finalDifficulty,
        score: percent(s.correct, i + 1),
        totalQuestions: i + 1,
        correctAnswers: s.correct,
        totalAttempts: s.total,
        hintsUsed: s.hints,
        averageResponseTime: Number((s.seconds / (i + 1)).toFixed(2)),
        completionRate: 100,
      });
      return;
    }
    start.current = performance.now();
    setStats(s);
    change(finalDifficulty);
    attempt(0);
    move(i + 1);
  }
  return (
    <section className="panel play">
      <small>
        Face–Name · {level} · Question {i + 1} of {deck.length}
      </small>
      <h2>Who is this person?</h2>
      <img
        className="question-photo"
        src={q.src}
        alt="Familiar person to identify"
      />
      <div className="choices">
        {q.options.map((name) => (
          <button className="secondary" key={name} onClick={() => pick(name)}>
            {name}
          </button>
        ))}
      </div>
      <Notice>
        {tries >= 2
          ? "Hint: Their name starts with “" + q.answer[0] + "”."
          : tries
            ? "Try another name."
            : null}
      </Notice>
    </section>
  );
}
function MatchingRound({ people, level, finish }) {
  const [cards] = useState(() => board(people, level)),
    [flipped, flip] = useState([]),
    [matched, match] = useState([]),
    [turns, turn] = useState(0);
  function choose(index) {
    if (
      flipped.length === 2 ||
      flipped.includes(index) ||
      matched.includes(cards[index].id)
    )
      return;
    const next = [...flipped, index];
    flip(next);
    if (next.length < 2) return;
    const [a, b] = next.map((n) => cards[n]);
    turn(turns + 1);
    if (a.id === b.id && a.type !== b.type) {
      const ids = [...matched, a.id];
      match(ids);
      if (ids.length === pairs[level])
        finish(matchingResult(level, ids.length, turns + 1, people.length));
    }
  }
  return (
    <section className="panel">
      <small>Family Memory Matching · {level}</small>
      <h2>Match each photo to a memory</h2>
      <p>Choose two cards. Take as long as you need.</p>
      <p>
        {matched.length} of {pairs[level]} pairs · {turns} turns
      </p>
      <div className="board">
        {cards.map((c, i) => {
          const done = matched.includes(c.id),
            open = done || flipped.includes(i);
          return (
            <button
              key={i}
              className={open ? "card opened" : "card"}
              disabled={done || flipped.includes(i) || flipped.length === 2}
              aria-label={
                open
                  ? c.type === "memory"
                    ? c.value
                    : "Revealed photo"
                  : "Turn over card " + (i + 1)
              }
              onClick={() => choose(i)}
            >
              {open ? (
                c.type === "memory" ? (
                  c.value
                ) : (
                  <img src={c.value} alt="Family photograph" />
                )
              ) : (
                <>
                  <Flower2 />
                  {i + 1}
                </>
              )}
              {done && <Check size={16} />}
            </button>
          );
        })}
      </div>
      {flipped.length === 2 && (
        <div role="status">
          <p>
            {cards[flipped[0]].id === cards[flipped[1]].id
              ? "A match!"
              : "Different people. Take a moment to remember these cards."}
          </p>
          <button className="primary" onClick={() => flip([])}>
            Continue
          </button>
        </div>
      )}
    </section>
  );
}
function GameRoom({ data, id, uploads, onSaved }) {
  const [eligible, setEligible] = useState(null),
    [mode, setMode] = useState(""),
    [level, setLevel] = useState("easy"),
    [result, finish] = useState(null),
    [saved, setSaved] = useState(false),
    save = useAction();
  useEffect(() => {
    let live = true;
    setEligible(null);
    Promise.all(
      data.persons.map(async (p) => {
        const src = photoUrl(p, uploads);
        if (!src) return null;
        const image = new Image();
        image.src = src;
        try {
          await image.decode();
          return {
            ...p,
            src,
            memories: p.memories.filter((m) => m.description?.trim()),
          };
        } catch {
          return null;
        }
      }),
    ).then((list) => {
      if (live) setEligible(list.filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, [data, uploads]);
  if (!eligible) return <p role="status">Checking available family photos…</p>;
  const withMemory = eligible.filter((p) => p.memories.length),
    hasNames = new Set(eligible.map((p) => p.name.trim())).size >= 2;
  if (result)
    return (
      <section className="panel">
        <Check className="iconbox" />
        <h2>Round complete</h2>
        <p className="big">{result.score}%</p>
        <p>
          {result.gameType === "face-name"
            ? "First-attempt answers"
            : "Successful matches"}{" "}
          · {result.correctAnswers} of {result.totalQuestions}
        </p>
        <p>
          {result.totalAttempts} attempts · {result.hintsUsed} hints · Next
          difficulty: {result.finalDifficulty}
        </p>
        {result.averageResponseTime !== undefined && (
          <p>Average response time: {result.averageResponseTime} seconds</p>
        )}
        <Feedback action={save} />
        <div className="row">
          {!saved && (
            <button
              className="primary"
              disabled={save.busy}
              onClick={() =>
                save.run(async () => {
                  await request("/games/sessions", {
                    method: "POST",
                    body: { patientId: id, ...result },
                  });
                  setSaved(true);
                  onSaved();
                  return "Session saved to game progress.";
                })
              }
            >
              {save.busy ? "Saving…" : "Save session"}
            </button>
          )}
          <button
            disabled={save.busy}
            className="secondary"
            onClick={() => {
              if (!saved && !confirm("Leave without saving this round?"))
                return;
              if (result.gameType === "memory-matching")
                setLevel(result.finalDifficulty);
              save.clear();
              setSaved(false);
              finish(null);
              setMode("");
            }}
          >
            Return to games
          </button>
        </div>
      </section>
    );
  if (mode === "face") return <FaceRound people={eligible} finish={finish} />;
  if (mode === "matching")
    return <MatchingRound people={withMemory} level={level} finish={finish} />;
  return (
    <div className="columns">
      <section className="panel game">
        <ScanFace className="iconbox" />
        <h2>Face–Name Recognition</h2>
        <p>Look at a familiar photograph and choose the person’s name.</p>
        <small>
          {eligible.length} available photos · Two distinct names required
        </small>
        <button
          className="primary"
          disabled={!hasNames}
          onClick={() => setMode("face")}
        >
          Start Face–Name
        </button>
      </section>
      <section className="panel game">
        <Layers className="iconbox" />
        <h2>Family Memory Matching</h2>
        <p>Turn over cards to pair each photograph with a personal memory.</p>
        <small>
          {withMemory.length} eligible people · {pairs[level]} needed for{" "}
          {level}
        </small>
        <button
          className="primary"
          disabled={withMemory.length < pairs[level]}
          onClick={() => setMode("matching")}
        >
          Start matching
        </button>
      </section>
      <p>
        Need more pairs? <Link to="/people">Upload family photos</Link> and{" "}
        <Link to="/memories">add personal memories</Link>. Newly uploaded photos
        are available until you leave this patient workspace.
      </p>
    </div>
  );
}
export default function Games({ id, uploads, onSaved }) {
  const [revision, bump] = useState(0),
    state = useData("/games/data" + scope(id), revision);
  return (
    <>
      <Heading title="Memory games">
        Practice recognition with familiar faces and stories.
      </Heading>
      <DataState state={state} retry={() => bump(revision + 1)}>
        {(data) =>
          data.patientId === id ? (
            <GameRoom {...{ data, id, uploads, onSaved }} />
          ) : (
            <Notice error>
              Game data could not be verified for this patient.
            </Notice>
          )
        }
      </DataState>
    </>
  );
}
