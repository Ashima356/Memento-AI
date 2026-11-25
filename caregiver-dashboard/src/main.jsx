import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  UsersRound,
  ScanFace,
  Gamepad2,
  UserRound,
  BookHeart,
  ChartNoAxesColumn,
  LogOut,
  Menu,
  X,
  PanelLeft,
} from "lucide-react";
import { Brand, DataState, Heading } from "./ui";
import { sessionKey, expiry, readSession, scope, useData } from "./api";
import Auth from "./Auth";
import Games from "./Games";
import { Patients, Records } from "./Records";
import { Overview, Progress, Recognition } from "./Dashboard";
import "./style.css";
const navigation = [
  ["/", "Overview", LayoutDashboard],
  ["/patients", "Patient profiles", UserRound],
  ["/people", "Familiar people", UsersRound],
  ["/memories", "Manage memories", BookHeart],
  ["/recognition", "Face recognition", ScanFace],
  ["/games", "Memory games", Gamepad2],
  ["/progress", "Game progress", ChartNoAxesColumn],
];
function Workspace({ id, patient, user, patientProfiles }) {
  const [revision, bump] = useState(0),
    [gameRev, gameBump] = useState(0);
  const refresh = () => bump((n) => n + 1),
    [uploads, setUploads] = useState({}),
    urls = useRef({}),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      Object.values(urls.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  function remember(id, file) {
    if (!mounted.current) return;
    if (urls.current[id]) URL.revokeObjectURL(urls.current[id]);
    urls.current[id] = URL.createObjectURL(file);
    setUploads({ ...urls.current });
  }
  const people = useData("/persons" + scope(id), revision),
    memories = useData("/memories" + scope(id), revision),
    progress = useData("/games/progress" + scope(id), revision + gameRev);
  const props = {
    id,
    patient,
    user,
    people,
    memories,
    progress,
    refresh,
    uploads,
    remember,
  };
  return (
    <Routes>
      <Route index element={<Overview {...props} />} />
      <Route path="patients" element={patientProfiles} />
      {[
        ["people", "persons"],
        ["memories", "memories"],
      ].map(([path, kind]) => (
        <Route
          key={path}
          path={path}
          element={<Records key={kind} kind={kind} {...props} />}
        />
      ))}
      <Route path="recognition" element={<Recognition />} />
      <Route
        path="games"
        element={<Games {...props} onSaved={() => gameBump((n) => n + 1)} />}
      />
      <Route path="progress" element={<Progress {...props} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
function Shell({ session, logout }) {
  const [revision, bump] = useState(0),
    patients = useData("/patients", revision),
    [active, setActive] = useState(
      () => sessionStorage.getItem("memento.patient." + session.user.id) || "",
    ),
    [open, toggle] = useState(false);
  function select(id) {
    sessionStorage.setItem("memento.patient." + session.user.id, id);
    setActive(id);
  }
  const location = useLocation(),
    all = patients.data?.patients || [],
    patient = all.find((p) => p._id === active) || all[0];
  const patientProfiles = (
    <Patients
      patients={all}
      active={patient?._id}
      select={select}
      refresh={() => bump((n) => n + 1)}
    />
  );
  const navigationRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    navigationRef.current?.querySelector("a.active, a")?.focus();
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        toggle(false);
        menuRef.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const page =
    navigation.find(([path]) => path === location.pathname)?.[1] || "Overview";
  useEffect(() => {
    toggle(false);
    document.title = page + " · Memento-AI";
  }, [location.pathname, page]);
  return (
    <div className="shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <aside className={open ? "sidebar expanded" : "sidebar"}>
        <Brand />
        <small className="side-label">Care workspace</small>
        <nav
          id="care-navigation"
          ref={navigationRef}
          aria-label="Care workspace"
        >
          {navigation.map(([url, label, Icon]) => (
            <NavLink key={url} to={url} onClick={() => toggle(false)} end>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          Log out
        </button>
      </aside>
      <div className="canvas">
        <header className="top">
          <div className="row">
            <button
              className="menubtn"
              ref={menuRef}
              aria-controls="care-navigation"
              onClick={() => toggle(!open)}
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </button>
            <PanelLeft className="desktopicon" size={17} />
            <span>Workspace</span>
            <span>/</span>
            <b>{page}</b>
          </div>
          <div className="row">
            <span className="account">{session.user.name}</span>
            <span className="avatar small">{session.user.name[0]}</span>
          </div>
        </header>
        <main className="content" id="content" tabIndex="-1">
          <DataState state={patients} retry={() => bump(revision + 1)}>
            {() => (
              <>
                {patient && (
                  <label className="patient-select">
                    Selected patient{" "}
                    <select
                      aria-label="Selected patient"
                      value={patient._id}
                      onChange={(e) => select(e.target.value)}
                    >
                      {all.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {patient ? (
                  <Workspace
                    key={patient._id}
                    id={patient._id}
                    patient={patient}
                    user={session.user}
                    patientProfiles={patientProfiles}
                  />
                ) : location.pathname === "/patients" ? (
                  patientProfiles
                ) : (
                  <section className="panel narrow">
                    <Heading title="Add your first patient">
                      Create a patient profile to open a care workspace.
                    </Heading>
                    <Link className="primary" to="/patients">
                      Add a patient
                    </Link>
                  </section>
                )}
              </>
            )}
          </DataState>
        </main>
      </div>
    </div>
  );
}
function App() {
  const [session, set] = useState(readSession),
    [expired, setExpired] = useState(false);
  function logout() {
    sessionStorage.removeItem("memento.patient." + session?.user.id);
    sessionStorage.removeItem(sessionKey);
    set(null);
    setExpired(false);
  }
  useEffect(() => {
    if (!session) return;
    function end() {
      logout();
      setExpired(true);
    }
    const timer = setTimeout(
      end,
      Math.max(0, expiry(session.token) - Date.now()),
    );
    window.addEventListener("session-expired", end);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("session-expired", end);
    };
  }, [session]);
  function login({ token, user }) {
    if (!user?.id || !(expiry(token) > Date.now()))
      throw new Error("The server returned an invalid session.");
    const s = { token, user };
    sessionStorage.setItem(sessionKey, JSON.stringify(s));
    setExpired(false);
    set(s);
  }
  return (
    <Routes>
      <Route
        path="/login"
        element={
          session ? (
            <Navigate to="/" replace />
          ) : (
            <Auth {...{ login, expired }} />
          )
        }
      />
      <Route
        path="*"
        element={
          session ? (
            <Shell key={session.user.id} {...{ session, logout }} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
