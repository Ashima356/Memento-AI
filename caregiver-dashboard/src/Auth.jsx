import React, { useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Brand, Botanical, Field, useAction, Feedback } from "./ui";
import { request } from "./api";
export default function Auth({ login, expired }) {
  const [register, mode] = useState(false),
    [show, toggle] = useState(false),
    [email, setEmail] = useState("");
  const [registered, confirm] = useState(false),
    [reset, change] = useState(0);
  const action = useAction();
  function switchMode(value) {
    action.clear();
    mode(value);
    confirm(false);
    toggle(false);
    change(reset + 1);
  }
  async function submit(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.target));
    await action.run(async () => {
      if (register) {
        await request("/auth/register", {
          publicRoute: true,
          method: "POST",
          body: fields,
        });
        switchMode(false);
        confirm(true);
      } else {
        const data = await request("/auth/login", {
          publicRoute: true,
          method: "POST",
          body: fields,
        });
        login(data);
      }
    });
  }
  return (
    <main className="auth">
      <section className="story">
        <Brand />
        <Botanical />
        <div>
          <h1>
            Preserving Memories,
            <br />
            <em>Strengthening Connections.</em>
          </h1>
          <p>
            A caregiver workspace for familiar faces, personal memories, and
            moments of recognition.
          </p>
        </div>
      </section>
      <section className="authside">
        <div className="authform">
          <ShieldCheck className="iconbox" />
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <p>
            {register
              ? "Register to set up your caregiver workspace."
              : "Sign in to your caregiver workspace."}
          </p>
          <div className="segments">
            {["Sign in", "Register"].map((v, i) => (
              <button
                disabled={action.busy}
                key={v}
                aria-pressed={register === !!i}
                onClick={() => switchMode(!!i)}
              >
                {v}
              </button>
            ))}
          </div>
          {expired && (
            <p role="status">Your session expired. Please sign in again.</p>
          )}
          {registered && (
            <p className="notice" role="status">
              Account created. Sign in with your password.
            </p>
          )}
          <form key={reset} onSubmit={submit}>
            {register && (
              <Field
                label="Full name"
                name="name"
                required
                pattern=".*\S.*"
                autoComplete="name"
              />
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="field">
              <label htmlFor="auth-password">Password</label>
              <span className="password">
                <input
                  id="auth-password"
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  minLength={register ? 8 : 1}
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder={register ? "At least 8 characters" : undefined}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => toggle(!show)}
                >
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </div>
            <Feedback action={action} />
            <button className="primary wide" disabled={action.busy}>
              {action.busy
                ? "Please wait…"
                : register
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
