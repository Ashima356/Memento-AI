import React, { useState } from "react";
import { Sprout, UserRound, Leaf, Flower2 } from "lucide-react";
export function Brand() {
  return (
    <div className="brand">
      <span className="mark">
        <Sprout />
      </span>
      Memento-AI
    </div>
  );
}
export function Botanical() {
  return (
    <div className="botanical" aria-hidden="true">
      <div className="orb" />
      <div className="print back">
        <Leaf />
      </div>
      <div className="print front">
        <Flower2 />
        <i />
      </div>
      <span className="sprig">
        <Sprout />
      </span>
    </div>
  );
}
export function Heading({ title, children }) {
  return (
    <header className="heading">
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function Notice({ error, children }) {
  return children ? (
    <p
      className={error ? "notice error" : "notice"}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  ) : null;
}
export function DataState({ state, retry, children }) {
  if (state.error)
    return (
      <div>
        <Notice error>{state.error}</Notice>
        <button className="secondary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!state.data) return <p role="status">Loading…</p>;
  return children(state.data);
}
export function Avatar({ src, name = "" }) {
  const [broken, set] = useState("");
  return src && broken !== src ? (
    <img className="avatar" src={src} alt="" onError={() => set(src)} />
  ) : (
    <span className="avatar">{name.trim()[0] || <UserRound />}</span>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function useAction() {
  const [status, set] = useState({});
  const lock = React.useRef(false);
  async function run(fn) {
    if (lock.current) return;
    lock.current = true;
    set({ busy: true });
    try {
      set({ ok: await fn() });
    } catch (e) {
      set({ error: e.message });
    } finally {
      lock.current = false;
    }
  }
  return { run, clear: () => set({}), ...status };
}
export function Feedback({ action }) {
  return <Notice error={!!action.error}>{action.error || action.ok}</Notice>;
}
