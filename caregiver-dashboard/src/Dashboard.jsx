import React from "react";
import { Link } from "react-router-dom";
import {
  UsersRound,
  BookHeart,
  Gamepad2,
  ArrowUpRight,
  ScanFace,
  TrendingUp,
  UserRound,
  ArrowRight,
} from "lucide-react";
import { Heading, DataState, Avatar, Botanical } from "./ui";
import { photoUrl } from "./api";
export function Overview({
  user,
  patient,
  people,
  memories,
  progress,
  uploads,
  refresh,
}) {
  const stats = [
    [UsersRound, "Familiar people", people, (items) => items.length, "/people"],
    [
      BookHeart,
      "Memories saved",
      memories,
      (items) => items.length,
      "/memories",
    ],
    [Gamepad2, "Games played", progress, (p) => p.totalSessions, "/progress"],
  ];
  return (
    <>
      <section className="welcome">
        <div>
          <div className="eyebrow">Caregiver dashboard</div>
          <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
          <p>Your care overview for {patient.name}.</p>
        </div>
        <Botanical />
      </section>
      <div className="stats">
        {stats.map(([Icon, label, state, value, url]) => (
          <section className="panel stat" key={label}>
            <div className="spread">
              <Icon className="iconbox" />
              <Link aria-label={"View " + label} to={url}>
                <ArrowUpRight size={19} />
              </Link>
            </div>
            <DataState state={state} retry={refresh}>
              {(data) => <strong>{value(data)}</strong>}
            </DataState>
            <span>{label}</span>
          </section>
        ))}
      </div>
      <div className="columns">
        <section className="panel">
          <div className="spread">
            <h2>Familiar people</h2>
            <Link to="/people">View all</Link>
          </div>
          <DataState state={people} retry={refresh}>
            {(items) =>
              items.length ? (
                items.slice(0, 4).map((p) => (
                  <div className="person row" key={p._id}>
                    <Avatar name={p.name} src={photoUrl(p, uploads)} />
                    <div>
                      <h3>{p.name}</h3>
                      <small>{p.relationship}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p>
                  Add the people {patient.name} knows to start a family
                  collection.
                </p>
              )
            }
          </DataState>
          <Link className="secondary" to="/people">
            Manage familiar people <ArrowRight size={16} />
          </Link>
        </section>
        <section className="panel">
          <h2>Quick actions</h2>
          <div className="tiles">
            {[
              [BookHeart, "Manage memories", "/memories"],
              [Gamepad2, "Play a game", "/games"],
              [ScanFace, "Face recognition", "/recognition"],
              [TrendingUp, "Game progress", "/progress"],
            ].map(([Icon, label, path]) => (
              <Link key={path} to={path}>
                <Icon />
                {label}
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <UserRound className="iconbox" />
          <h2>{patient.name}</h2>
          <p>{patient.notes || "Selected patient profile"}</p>
          {patient.dateOfBirth && (
            <p>Born {patient.dateOfBirth.slice(0, 10)}</p>
          )}
          <Link to="/patients">Manage patient profiles</Link>
        </section>
        <section className="panel">
          <h2>Game progress</h2>
          <DataState state={progress} retry={refresh}>
            {(p) =>
              p.totalSessions ? (
                <>
                  <strong className="big">{p.averageScore}%</strong>
                  <p>Average score across {p.totalSessions} saved sessions</p>
                  <Link to="/progress">See session history</Link>
                </>
              ) : (
                <p>Completed, saved rounds will appear here.</p>
              )
            }
          </DataState>
        </section>
      </div>
    </>
  );
}
export function Progress({ progress, refresh }) {
  return (
    <>
      <Heading title="Game progress">
        Review the selected patient’s saved game sessions.
      </Heading>
      <section className="panel">
        <DataState state={progress} retry={refresh}>
          {(p) =>
            p.totalSessions ? (
              <>
                <div className="summary">
                  {[
                    [p.totalSessions, "Games played"],
                    [p.averageScore + "%", "Average score"],
                    [p.accuracy + "%", "Overall accuracy"],
                  ].map(([n, l]) => (
                    <div key={l}>
                      <strong>{n}</strong>
                      {l}
                    </div>
                  ))}
                </div>
                <h2>Session history</h2>
                {p.sessions.map((s) => (
                  <article className="entry" key={s._id}>
                    <div className="spread">
                      <h3>{s.gameType.replaceAll("-", " ")}</h3>
                      <b>{s.score}%</b>
                    </div>
                    <progress
                      aria-label="Session score"
                      value={s.score}
                      max="100"
                    />
                    <small>
                      {new Date(s.createdAt).toLocaleString()} ·{" "}
                      {s.correctAnswers}/{s.totalQuestions} correct ·{" "}
                      {s.difficulty}
                      {s.finalDifficulty ? " → " + s.finalDifficulty : ""}
                    </small>
                  </article>
                ))}
              </>
            ) : (
              <p>
                No sessions saved yet.{" "}
                <Link to="/games">Open memory games</Link> to play a round.
              </p>
            )
          }
        </DataState>
      </section>
    </>
  );
}
export { default as Recognition } from "./Recognition";
