import React, { useEffect, useRef, useState } from "react";
import { Heading, Notice } from "./ui";
import { request } from "./api";

function cameraError(error) {
  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera access in your browser, then start again.";
    case "NotFoundError":
      return "No camera was found. Connect a webcam and start again.";
    case "NotReadableError":
      return "The camera is busy or unavailable. Close other camera apps and try again.";
    default:
      return error.message || "The camera could not start.";
  }
}

async function capture(video) {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight)
    return null;
  const canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    960 / Math.max(video.videoWidth, video.videoHeight),
  );
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  try {
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("Could not capture a camera frame.");
    return blob;
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export default function Recognition() {
  const preview = useRef(null);
  const cleanup = useRef(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState("off");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => () => cleanup.current?.(), []);

  function stop(message = "") {
    cleanup.current?.();
    setPhase("off");
    setConsent(false);
    setResult(null);
    setError(message);
  }

  async function start() {
    if (!consent || cleanup.current) return;
    const video = preview.current;
    const controller = new AbortController();
    let stream,
      interval,
      busy = false;
    function disconnected() {
      stop("Camera disconnected. Reconnect it and start again.");
    }
    function release() {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("pagehide", leaveDocument);
      for (const track of stream?.getTracks() ?? []) {
        track.removeEventListener("ended", disconnected);
        track.stop();
      }
      video.srcObject = null;
      cleanup.current = null;
    }
    function leaveDocument() {
      stop();
    }
    window.addEventListener("pagehide", leaveDocument);
    cleanup.current = release;
    setPhase("starting");
    setResult(null);
    setError("");

    async function identify() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      try {
        const blob = await capture(video);
        if (!blob || controller.signal.aborted) return;
        const body = new FormData();
        body.append("image", blob, "frame.jpg");
        const data = await request("/faces/identify", {
          method: "POST",
          body,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (
          data.matched !== false &&
          !(data.matched === true && data.person?.name)
        )
          throw new Error(
            "The recognition service returned an incomplete result.",
          );
        setResult(data);
        setError("");
      } catch (err) {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(
            err.message === "Face identification failed"
              ? "Face identification failed. Check the face service on port 8000. The camera will try again."
              : err.message + " The camera will try again.",
          );
        }
      } finally {
        busy = false;
      }
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access requires a supported browser on localhost or HTTPS.",
        );
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });
      if (controller.signal.aborted) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream
        .getVideoTracks()
        .forEach((track) => track.addEventListener("ended", disconnected));
      video.srcObject = stream;
      await video.play();
      if (controller.signal.aborted) return;
      setPhase("active");
      interval = setInterval(identify, 2500);
      void identify();
    } catch (err) {
      if (!controller.signal.aborted) stop(cameraError(err));
    }
  }

  return (
    <>
      <Heading title="Face recognition">
        Compare a live camera image with familiar faces registered across your
        caregiver account.
      </Heading>
      <section className="panel narrow">
        <h2>Live webcam</h2>
        <p>
          With the participant’s permission, a frame is sent for recognition
          about every 2.5 seconds while the camera is on. Webcam frames are
          processed in memory.
        </p>
        <label className="camera-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              if (!e.target.checked) stop();
              else setConsent(true);
            }}
          />{" "}
          The participant agrees to live face recognition.
        </label>
        <div className="row camera-actions">
          <button
            className="primary"
            disabled={!consent || phase !== "off"}
            onClick={start}
          >
            Start Camera
          </button>
          <button
            className="secondary"
            disabled={phase === "off"}
            onClick={() => stop()}
          >
            Stop Camera
          </button>
        </div>
        <video
          className="camera-preview"
          ref={preview}
          hidden={phase === "off"}
          playsInline
          muted
          aria-label="Live webcam preview"
        />
        <Notice error>{error}</Notice>
        <div role="status" aria-live="polite" aria-atomic="true">
          {result ? (
            <>
              <h3 className="recognition-name">
                {result.matched ? result.person.name : "Unknown Person"}
              </h3>
              {result.matched && <p>{result.person.relationship}</p>}
              {result.message && <p>{result.message}</p>}
              {Number.isFinite(result.similarity) && (
                <p>Similarity score: {result.similarity.toFixed(3)}</p>
              )}
            </>
          ) : (
            !error && (
              <p>
                {phase === "starting"
                  ? "Waiting for camera access…"
                  : phase === "active"
                    ? "Looking for a familiar face…"
                    : "Camera off."}
              </p>
            )
          )}
        </div>
      </section>
    </>
  );
}
