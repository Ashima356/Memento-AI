import React, { useState } from "react";
import { Plus, ImagePlus, BookOpen } from "lucide-react";
import {
  Field,
  Feedback,
  useAction,
  Heading,
  DataState,
  Avatar,
  Notice,
} from "./ui";
import { photoUrl, request, validatePhoto } from "./api";

export function Patients({ patients, active, select, refresh }) {
  const action = useAction();
  function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      body = Object.fromEntries(new FormData(form));
    action.run(async () => {
      const patient = await request("/patients", { method: "POST", body });
      form.reset();
      refresh();
      select(patient._id);
      return "Patient profile created.";
    });
  }
  return (
    <>
      <Heading title="Patient profiles">
        Choose the patient whose care workspace you want to open.
      </Heading>
      <div className="columns">
        <section className="panel">
          <h2>Your patients</h2>
          {patients.length === 0 && (
            <p>Add a patient to start your workspace.</p>
          )}
          {patients.map((p) => (
            <article key={p._id} className="entry">
              <div className="row">
                <Avatar name={p.name} />
                <div>
                  <h3>{p.name}</h3>
                  {p.dateOfBirth && (
                    <small>Born {p.dateOfBirth.slice(0, 10)}</small>
                  )}
                </div>
              </div>
              {p.notes && <p>{p.notes}</p>}
              <button
                className="secondary"
                disabled={active === p._id}
                onClick={() => select(p._id)}
              >
                {active === p._id ? "Selected patient" : "Select patient"}
              </button>
            </article>
          ))}
        </section>
        <form className="panel" onSubmit={submit}>
          <h2>Add a patient</h2>
          <Field label="Patient name" name="name" required pattern=".*\S.*" />
          <Field
            label="Date of birth (optional)"
            type="date"
            name="dateOfBirth"
          />
          <Field label="Caregiver notes (optional)">
            <textarea name="notes" />
          </Field>
          <Feedback action={action} />
          <button className="primary" disabled={action.busy}>
            <Plus />
            {action.busy ? "Adding…" : "Add patient"}
          </button>
        </form>
      </div>
    </>
  );
}

function Editor({ kind, record, people, id, done, cancel }) {
  const memory = kind === "memories",
    action = useAction();
  function submit(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    if (memory) {
      body.tags = body.tags
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      body.date = body.date || null;
      if (record?.title === body.title.trim()) delete body.title;
      if (record?.description === body.description.trim())
        delete body.description;
    }
    if (!record) body.patientId = id;
    action.run(async () => {
      if (memory && (body.title !== undefined || body.description !== undefined)) {
        const title = (body.title ?? record?.title ?? "").trim();
        const description = (body.description ?? record?.description ?? "").trim();
        if (!title || !description)
          throw new Error("Enter a title and a personal memory.");
        // Express sends these two fields to the text service as one input.
        if (Array.from(title + "\n" + description).length > 10000)
          throw new Error("The title and memory together must fit within 10,000 characters, including a line break.");
      }
      await request("/" + kind + (record ? "/" + record._id : ""), {
        method: record ? "PUT" : "POST",
        body,
      });
      done(
        record
          ? "Changes saved."
          : memory
            ? "Memory saved."
            : "Person added. You can now upload their photo.",
      );
    });
  }
  return (
    <form className="panel" onSubmit={submit}>
      <h2>
        {record ? "Edit" : memory ? "Save a" : "Add a familiar"}{" "}
        {memory ? "memory" : "person"}
      </h2>
      {memory ? (
        <>
          <Field label="Familiar person">
            <select
              aria-label="Familiar person"
              name="personId"
              defaultValue={record?.personId?._id || ""}
              required
            >
              <option value="">Choose a person</option>
              {people.map((p) => (
                <option value={p._id} key={p._id}>
                  {p.name} · {p.relationship}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Memory title"
            name="title"
            defaultValue={record?.title}
            required
            pattern=".*\S.*"
          />
          <Field label="Personal memory">
            <textarea
              name="description"
              defaultValue={record?.description}
              required
            />
          </Field>
          <Field
            label="Memory date (optional)"
            type="date"
            name="date"
            defaultValue={record?.date?.slice(0, 10)}
          />
          <Field
            label="Tags (comma-separated, optional)"
            name="tags"
            defaultValue={record?.tags?.join(", ")}
          />
        </>
      ) : (
        <>
          <Field
            label="Full name"
            name="name"
            defaultValue={record?.name}
            required
            pattern=".*\S.*"
          />
          <Field
            label="Relationship"
            name="relationship"
            defaultValue={record?.relationship}
            required
            pattern=".*\S.*"
          />
          <Field label="Personal notes (optional)">
            <textarea name="notes" defaultValue={record?.notes} />
          </Field>
        </>
      )}
      <Feedback action={action} />
      <div className="row">
        <button className="primary" disabled={action.busy}>
          {action.busy ? "Saving…" : "Save " + (memory ? "memory" : "person")}
        </button>
        {record && (
          <button type="button" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function PhotoUpload({ record, remember, refresh }) {
  const action = useAction();
  function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      body = new FormData(form),
      file = body.get("profileImage");
    action.run(async () => {
      validatePhoto(file);
      await request("/persons/" + record._id + "/image", {
        method: "POST",
        body,
      });
      remember(record._id, file);
      form.reset();
      refresh();
      return "Photo saved.";
    });
  }
  return (
    <details>
      <summary>
        <ImagePlus size={16} /> Upload or replace photo
      </summary>
      <form onSubmit={submit}>
        <Field label="One face photo · JPEG, PNG or WebP · 5 MB">
          <input
            name="profileImage"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </Field>
        <Feedback action={action} />
        <button className="secondary" disabled={action.busy}>
          {action.busy ? "Processing photo…" : "Upload photo"}
        </button>
      </form>
    </details>
  );
}

export function Records({
  kind,
  id,
  people,
  memories,
  uploads,
  remember,
  refresh,
}) {
  const memory = kind === "memories",
    [editing, edit] = useState(null),
    [filter, search] = useState(""),
    [message, setMessage] = useState(""),
    [serial, bump] = useState(0);
  const action = useAction();
  function done(text) {
    setMessage(text);
    edit(null);
    bump((n) => n + 1);
    refresh();
  }
  function remove(record) {
    if (
      !window.confirm(
        "Delete " +
          (record.title || record.name) +
          "? " +
          (memory
            ? "This memory will be permanently removed."
            : "Saved memories may retain a reference to this person."),
      )
    )
      return;
    action.run(async () => {
      await request("/" + kind + "/" + record._id, { method: "DELETE" });
      done("Record deleted.");
    });
  }
  return (
    <>
      <Heading title={memory ? "Manage memories" : "Familiar people"}>
        {memory
          ? "Keep the stories behind familiar faces together."
          : "Manage the people your patient knows and their photographs."}
      </Heading>
      <Notice>{message}</Notice>
      <Feedback action={action} />
      <div className="columns">
        <section className="panel">
          <h2>{memory ? "Memory collection" : "People directory"}</h2>
          <Field
            label={
              memory
                ? "Filter by title, story, person or tag"
                : "Filter by name or relationship"
            }
            type="search"
            value={filter}
            onChange={(e) => search(e.target.value)}
          />
          <DataState state={memory ? memories : people} retry={refresh}>
            {(items) => {
              const filtered = items.filter((r) =>
                [
                  r.name,
                  r.relationship,
                  r.title,
                  r.description,
                  r.personId?.name,
                  ...(r.tags || []),
                ]
                  .join(" ")
                  .toLowerCase()
                  .includes(filter.trim().toLowerCase()),
              );
              return filtered.length ? (
                filtered.map((r) => (
                  <article className="entry" key={r._id}>
                    <div className="row">
                      {memory ? (
                        <BookOpen className="iconbox" />
                      ) : (
                        <Avatar src={photoUrl(r, uploads)} name={r.name} />
                      )}
                      <div>
                        <h3>{r.title || r.name}</h3>
                        <small>
                          {memory
                            ? r.personId?.name || "Person removed"
                            : r.relationship}
                        </small>
                      </div>
                    </div>
                    <p>{r.description || r.notes}</p>
                    {memory && (
                      <small>
                        {[r.date?.slice(0, 10), ...(r.tags || [])]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    )}
                    {!memory && (
                      <>
                        {r.profileImage && !photoUrl(r, uploads) && (
                          <small>
                            Private photo on file. Upload again to use it in
                            this visit.
                          </small>
                        )}
                        <PhotoUpload
                          record={r}
                          remember={remember}
                          refresh={() => {
                            setMessage("Photo saved.");
                            refresh();
                          }}
                        />
                      </>
                    )}
                    <div className="actions">
                      <button
                        onClick={() => {
                          edit(r);
                          setMessage("");
                          document
                            .getElementById("record-editor")
                            ?.scrollIntoView({ block: "start" });
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => remove(r)} disabled={action.busy}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p>
                  {items.length
                    ? "No matching records."
                    : memory
                      ? "No memories saved for this patient yet."
                      : "No familiar people registered yet."}
                </p>
              );
            }}
          </DataState>
        </section>
        <div id="record-editor">
          {memory && !people.data?.length ? (
            <section className="panel">
              <DataState state={people} retry={refresh}>
                {() => <p>Add a familiar person before saving a memory.</p>}
              </DataState>
            </section>
          ) : (
            <Editor
              key={(editing?._id || "new") + serial}
              kind={kind}
              id={id}
              record={editing}
              people={people.data || []}
              done={done}
              cancel={() => edit(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
