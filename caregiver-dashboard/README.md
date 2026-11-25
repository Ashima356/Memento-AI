# Memento-AI caregiver dashboard

React 19, React Router, Vite, JavaScript, Lucide icons and responsive CSS. Based on `integration/localhost-demo` at `d87ee07045dc1a855d9353e3261c099c0b6d4ce7`. The existing dashboard directory contained only `.gitkeep`. The backend is an Express 5 application using Mongoose, bcrypt, JWT and Multer. Its README gives a project description only.

## Run on Windows

Use Node 22.12+ or Node 24 and a running MongoDB database. Extract the supplied `caregiver-dashboard/` folder into your checkout of the integration branch. Run these commands from the repository root in separate PowerShell terminals.

**Terminal 1 — backend**

```powershell
cd backend
npm ci
npm start
```

The existing backend reads `backend/.env` at startup. Set `MONGODB_URI` to your local demo database and `JWT_SECRET` to a private random signing secret. For a new disposable demo configuration, a MongoDB URI can be `mongodb://127.0.0.1:27017/memento_local_demo`. Generate a new secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Preserve any existing team configuration. Wait for the MongoDB connection message. Express listens on port 5000.

**Terminal 2 — frontend**

```powershell
cd caregiver-dashboard
npm ci
npm run dev
```

Open [the dashboard](http://localhost:5173). Register, sign in, and add a patient. Vite forwards `/api` and `/images/people` to Express. To change its origin, copy `.env.example` to `.env.local`, set `BACKEND_ORIGIN` and restart Vite. This setting is read by the Vite server. Production static hosting requires an equivalent same-origin reverse proxy and SPA fallback to `index.html`.

**Model services** — use your team's Python environments with their model weights and dependencies installed. From the repository root, in separate terminals:

```powershell
cd ai/face-recognition
python -m uvicorn api:app --host 127.0.0.1 --port 8000
```

```powershell
cd ai/rag-llm
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Check `http://127.0.0.1:8000/health` and `http://127.0.0.1:8001/health`. The face service imports InsightFace, OpenCV, NumPy, FastAPI and the CPU ONNX runtime, and needs the buffalo_l model and multipart support. The text service loads all-MiniLM-L6-v2. Its existing startup imports the Gemini provider, which requires the team's server-side `GEMINI_API_KEY` even for the embedding route. The branch supplies no Python dependency lockfile. Keep all service credentials outside the frontend.

## API audit and feature status

All paths below start with `/api`. Only registration and login are public. Protected requests carry a Bearer JWT. The UI takes identifiers from records returned by the server.

| Area | Verified contract | Frontend behavior |
|---|---|---|
| Authentication | POST auth/register takes name, email, password (8+ characters) and returns user only. POST auth/login takes email and password and returns token and user with id, name, email. | Register, sign in, password visibility, protected routing, expiry and logout. |
| Patients | GET patients returns count and patients. GET patients/:id and POST patients return a patient document. Create accepts name, dateOfBirth and notes. | Create, list, inspect and switch. Update and delete have no routes. |
| Familiar people | GET persons?patientId returns an array. POST persons requires patientId, name, relationship and accepts notes. GET/PUT/DELETE persons/:id check ownership. | List, inspect, create, edit and confirm removal. The delete controller does not cascade to memories or clean up the private image. |
| Profile photo | POST persons/:id/image takes one multipart profileImage, JPEG/PNG/WebP up to 5 MB. Calls Python /embeddings with field file, then stores a private filename. | Upload/replace, validation and failure reporting. A successful upload has an in-memory preview usable by games. Legacy public images are resolved only from associated person records. |
| Memories | GET memories?patientId returns documents with populated personId. POST memories takes patientId, personId, title, description and optional date/tags. GET/PUT/DELETE memories/:id are available. Text creation and changes require the embedding service on 8001. POST memories/search accepts patientId, query and optional limit (1–20). | Create, edit, delete and link records. Directory filtering uses loaded titles, descriptions, tags and person names, so it also works when semantic search is offline. |
| Identification | POST faces/identify accepts JPEG/PNG in multipart field image, up to 5 MB. Express calls Python /embed and /match and returns matched, person and sometimes similarity. Its database query uses caregiver userId only. | Live, consent-based webcam recognition across the signed-in caregiver’s registered people. Captures JPEG frames with a 2.5-second timer and skips ticks during a pending request. The interface displays the returned similarity as a raw score. |
| Games | GET games/data?patientId returns patientId, count, people and persons with nested memories. POST games/sessions accepts patientId, gameType, score, totalQuestions, correctAnswers and performance fields. | Two browser games with real patient data, retries, results and explicit session saving. The UI acknowledges a save after the server confirms it. |
| Progress | GET games/progress?patientId returns totalSessions, averageScore, accuracy, response-time and attempt/hint aggregates, and timestamped sessions newest first. | Overview totals, session scores, dates, difficulty and history. Overall accuracy weights by questions/turns. |
| Activity | Persons, memories and game sessions expose timestamps. Identification has no persistent event history. | The progress view shows genuine dated game sessions. The overview omits a combined activity feed and recognition count. |

**Photo access limitation.** New image uploads are under `backend/private/uploads/people`. The branch has no authenticated retrieval endpoint. A browser object URL lets the caregiver use a successfully uploaded photograph while the current patient workspace stays mounted. Refreshing, logging out, or switching patients releases it. The server retains its private file. A protected, ownership-checked image read route would enable persistent previews. Keep the private directory outside static hosting.

**Game rules.** Face–Name asks one shuffled question per eligible person and offers up to three distinct distractors. Two distinct names with decodable photos are required. The same question repeats until correct, with a first-letter hint after the second mistake. After each question, cumulative first-attempt accuracy of at least 80% and at most one hint increases difficulty one level; below 50% decreases it. As in Python, choice count depends on the available names. Matching selects 3/6/8 distinct people and one non-empty personal memory per person. One turn is two card flips. Accuracy is matches divided by turns. After a round, 80% or above advances a level only when enough people are eligible, and below 50% reduces the level. The Continue button lets the player inspect the two cards without a timer. Matching carries its next difficulty into a new round in the same game view. Completed sessions persist through Express.

**Session and isolation.** The one-day JWT and caregiver identity live in tab-scoped sessionStorage. JavaScript in the same origin can read that token. Use HTTPS outside localhost. Logout clears the local token. The backend has no refresh or revocation endpoint, so a previously copied token remains valid until expiry. Express enforces ownership. Patient switching remounts the workspace, cancels reads, discards game state and releases temporary photos. A write already submitted uses the original record or patient ID. The session endpoint has no idempotency key. If the connection drops after submission, inspect progress before saving again.

## Local verification

```powershell
cd caregiver-dashboard
npm test
npm run build
npm run preview
```

The preview uses the same backend proxy. For a complete demo rehearsal, use consented demo records in a dedicated database.

1. Open /games while signed out. Register, test a wrong password, then sign in. Refresh and confirm the session remains available.
2. Create two patients. Add a familiar person and a personal memory for one. Switch patients and inspect the directory, memories, game data and progress.
3. Upload a JPEG/PNG/WebP containing one face. Inspect the preview, then try an invalid file. Stop port 8000 and verify a failed upload never appears as saved. Restart the service.
4. Save and edit a personal memory with port 8001 running. Filter by person or tag. Stop the service and confirm a text write produces an error. Restart it.
5. Give at least three distinctly named people photos and one memory each in the same patient workspace. Play Face–Name, answer incorrectly twice and inspect the hint. Finish, save and open progress.
6. Complete matching, compare correct pairs with turns, save, and confirm the new history row. Six eligible people enable a promotion from easy to medium. Eight enable hard.
7. Open Face recognition, obtain participant consent and select Start Camera. Confirm a known and an unknown face, then stop the camera and check its indicator. Try mobile navigation, keyboard-only form entry, password visibility, game choices and logout. Refresh a protected URL after logout.

## Prepare the college demonstration on Windows

1. Start MongoDB and point the backend at a dedicated local demo database. Confirm Express reports a successful database connection. Start both Python services and Vite using the commands above. In PowerShell, run `Invoke-RestMethod http://127.0.0.1:8000/health` and `Invoke-RestMethod http://127.0.0.1:8001/health`. Health checks confirm startup. The first real upload and memory save verify inference and persistence.
2. Register a separate demo caregiver through the welcome screen and sign in. In **Patient profiles**, create the consented demo patient's profile and check the **Selected patient** control. Record only the fields required for the demonstration.
3. Arrange consent from each participant for their photo, its use for facial embedding generation, their chosen name/relationship, and the memory you plan to show the panel. Keep the source photos on your laptop outside the Git checkout. Choose a JPEG, PNG or WebP of one clearly visible face, at most 5 MB.
4. Rehearse with **one person first**. In **Familiar people**, enter their name and relationship and save. On the saved record choose **Upload or replace photo**, select their photo, submit, and wait for confirmation and the thumbnail. In **Manage memories**, choose that same person, enter a title and a genuine, consented memory, and save. Check that the collection shows the correct name and text.
5. Repeat step 4 for the other participants. If one write fails, inspect the relevant server terminal and retry the failed step on the existing person. Recheck the directory or collection first if a response was interrupted. One usable photo and one linked memory per distinct person are required for matching. Six eligible people support easy and medium; eight are required for hard. Face–Name needs two distinct names with usable photos.
6. Stay signed in on the same patient and browser tab. Navigation between **Familiar people**, **Patient profiles**, **Manage memories** and **Memory games** preserves successful upload previews for that patient. Refresh, logout or a switch of patient releases previews. For another visit, use **Upload or replace photo** on the existing people to restore the temporary previews. Their saved person records and memories remain in MongoDB.
7. In **Memory games**, compare the displayed eligible counts with the records you prepared. Play Face–Name and matching, complete each round and select **Save session** once. Confirm the dated rows in **Game progress**. For matching, use **Return to games** to carry the next difficulty into the next round. A score of at least 80% advances when enough pairs exist. Keep the original consented photo files available for the presentation.

### Follow-up integration audit

The remote integration branch still pointed to `d87ee07`. Both Vite dev and production preview forwarded requests to the existing Express backend. Each passed 17 non-writing HTTP checks using an isolated, empty MongoDB 7 database, including route protection, empty form validation, multipart handling, the authenticated empty patient response and missing-patient game requests. The database contained zero documents afterward. A short-lived test JWT exercised authenticated empty-state routes. This run did not exercise a successful login or write. The previous Chromium results below cover successful authentication, patient/person creation and session saving. Real consented image processing and memory text creation still need the Windows rehearsal above.

## Files

| File | Purpose |
|---|---|
| src/main.jsx | Session lifecycle, route protection, dashboard shell, patient selection and photo lifecycle |
| src/Auth.jsx | Registration and sign-in |
| src/Dashboard.jsx | Overview, progress and session history |
| src/Recognition.jsx | Consent, webcam capture, authenticated identification and stream cleanup |
| src/Records.jsx | Patient, familiar-person, memory and image forms |
| src/Games.jsx | Playable rounds, results and session saving |
| src/gameRules.js | Scoring, shuffling, eligibility and difficulty logic |
| src/api.js | JWT requests, cancellation, scoped reads and image validation |
| src/ui.jsx | Shared form, feedback, identity and layout components |
| src/style.css | Sage theme, responsive layouts and focus styles |
| tests/gameRules.test.js | Rule regression tests |
| index.html, vite.config.js | Browser entry point and development/preview proxy |
| package.json, package-lock.json | Scripts and pinned dependency tree |
| .env.example, .gitignore | Local configuration and ignored generated/private files |
| README.md | Audit, setup, limitations and verification |

## Verification results for this delivery

- Installed dependencies, built the production bundle and passed all three Node game-rule test groups.
- Ran the branch's Express app against a disposable, real MongoDB 7.0 database. Chromium exercised registration, incorrect and correct passwords, protected deep links, logout, and a rejected Bearer token returning the app to sign-in.
- Created and selected two patients, created/edited/deleted a familiar person, filtered memories, updated memory tags and deleted memories, and checked empty lists and progress after switching patients. Checked invalid images, valid image submission with the face service offline, and memory text write errors with the text service unavailable.
- Completed both browser games using temporary QA records associated with existing legacy images. The two saved sessions appeared in the first patient's history and were absent from the second patient's history. Temporary fixtures were confined to the test database and are excluded from the delivery.
- Checked desktop, 768px tablet and 375px mobile layouts. Mobile navigation worked, and the tested overview fit without horizontal overflow. Automated WCAG A/AA checks on the sign-in and desktop overview screens reported zero violations. The browser run reported no uncaught JavaScript errors. Expected HTTP errors were exercised deliberately. Full assistive-technology testing remains a local task.
- Live model-backed upload success, memory text creation/update success and a complete run in the team's Windows configuration remain unverified. Patient-scoped identification and retrieval of saved private images require backend work. The source audit and the local rehearsal steps above describe those dependencies.

## Apply the webcam and typography update on Windows

Open PowerShell in the repository root containing your existing caregiver-dashboard. This overlay includes the previous integration fixes so it can also be applied to the original dashboard ZIP. Check for local edits before replacing the listed files.

```powershell
git branch --show-current
git status --short -- caregiver-dashboard
Expand-Archive -LiteralPath "$env:USERPROFILE/Downloads/memento-webcam-update.zip" -DestinationPath . -Force
cd caregiver-dashboard
npm ci
npm test
npm run build
npm run dev
```

Use your frontend feature branch based on integration/localhost-demo. If you have local edits to the affected files, extract into a temporary directory and compare first. The overlay contains README.md, src/Recognition.jsx, src/Dashboard.jsx and src/style.css, plus src/main.jsx and src/Records.jsx from the previous integration update. It uses the existing dependency lockfile.

Start MongoDB, Express on port 5000 and the face API on port 8000 as described above. Port 8001 supports memory writes. Open http://localhost:5173 in Edge or Chrome. The dashboard needs an existing patient workspace; the identification candidate set is all people with registered embeddings owned by the caregiver. Obtain consent, check the box, click Start Camera and allow camera access. Present one consenting participant at a time. Compare a familiar participant with a consenting unregistered participant. Unknown Person indicates a successful no-match response. Camera/API errors appear separately. Stop Camera, withdrawing consent, navigation and logout release the camera. Refresh requires fresh activation. The browser does not save frames; canceling a request cannot recall a frame already received by Express. Use localhost or HTTPS for camera access.

**Webcam update verification.** The production build and all three existing game-rule test groups passed. A Chromium test used a generated video stream and simulated API responses to check explicit consent, JPEG multipart submission with the session JWT, matched and unknown results, similarity, permission denial, service errors, and prevention of overlapping requests. Stop, navigation and logout aborted pending browser requests and released tracks. A permission grant arriving after Stop also released its tracks. Eight routes were checked at 320, 375, 768 and 1280 CSS pixels for horizontal overflow. Physical webcam access and genuine face inference remain to be tested on your Windows machine with the services running.
