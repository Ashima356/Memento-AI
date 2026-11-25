import { useEffect, useState } from "react";
export const sessionKey = "memento.session";
export function readSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(sessionKey));
    if (s?.user?.id && expiry(s.token) > Date.now()) return s;
  } catch {}
  return null;
}
export function expiry(token) {
  return (
    JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
      .exp * 1000
  );
}
export async function request(
  path,
  { method = "GET", body, signal, publicRoute = false } = {},
) {
  const token = publicRoute ? null : readSession()?.token;
  const headers = token ? { Authorization: "Bearer " + token } : {};
  const multipart = body instanceof FormData;
  if (body && !multipart) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch("/api" + path, {
      method,
      headers,
      body: multipart ? body : JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new Error(
      "Cannot reach the care server. Check the connection and try again.",
    );
  }
  const data = await response.json().catch(() => null);
  if (response.status === 401 && !publicRoute && readSession()?.token === token)
    window.dispatchEvent(new Event("session-expired"));
  if (!response.ok || data === null)
    throw new Error(
      data?.message || "The care server is unavailable. Please try again.",
    );
  return data;
}
export const scope = (id) => "?patientId=" + encodeURIComponent(id);
export function useData(path, revision = 0) {
  const [state, set] = useState({});
  useEffect(() => {
    if (!path) return;
    const ac = new AbortController();
    request(path, { signal: ac.signal })
      .then((data) => {
        if (!ac.signal.aborted) set({ path, revision, data });
      })
      .catch((e) => {
        if (!ac.signal.aborted) set({ path, revision, error: e.message });
      });
    return () => ac.abort();
  }, [path, revision]);
  return state.path === path && state.revision === revision ? state : {};
}
export function validatePhoto(file) {
  if (
    !file ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a JPEG, PNG or WebP photo up to 5 MB.");
}
export function photoUrl(person, uploads) {
  if (uploads[person._id]) return uploads[person._id];
  const path = person.profileImage || "";
  const filename = path.split("/").pop();
  if (
    (!path.includes("/") || /^\/?images\/people\/[^/]+$/.test(path)) &&
    /^[\w.-]+\.(png|jpe?g|webp)$/i.test(filename) &&
    !/^[a-f\d]{8}-[a-f\d-]{27}\./i.test(filename)
  )
    return "/images/people/" + encodeURIComponent(filename);
  return "";
}
