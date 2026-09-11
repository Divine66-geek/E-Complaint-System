# E-Complaint System

AI-powered municipal e-complaint system. Matches the architecture:

```
Channel UI:      Complaint portal  +  Admin/official dashboard
                          \              /
                        API gateway (Express)
                    /            |            \
      Classification    Duplication      Reporting &
        service          detection       analytics /
      (Python/AI)          service       Notification
                    \            |            /
                     Complaints database (Firebase)
```

Three services run side by side:

| Folder        | What it is                                   | Tech                          |
|---------------|-----------------------------------------------|--------------------------------|
| `ai-service/` | Classification + duplication detection        | Python, Flask, spaCy, TensorFlow |
| `backend/`    | API gateway, Firestore access, notifications  | Node.js, Express, Firebase Admin |
| `frontend/`   | Complaint portal + officer dashboard          | React (Vite), Tailwind CSS     |

---

## 0. Prerequisites (install once)

- **VS Code** — https://code.visualstudio.com
- **Node.js 18+** — https://nodejs.org (check with `node -v`)
- **Python 3.10–3.11** — https://python.org (check with `python3 --version`). Avoid 3.12+ for now; TensorFlow support lags behind.
- A **Firebase** account (free) — https://console.firebase.google.com
- **Git** (optional but recommended)

Open the whole `civicfix/` folder in VS Code (`File → Open Folder`). You'll run three terminals side by side (`Terminal → New Terminal`, then use the `+`/split icon) — one per service.

---

## 1. Set up Firebase (the database)

1. Go to the [Firebase console](https://console.firebase.google.com) → **Add project** → name it `civicfix-ai` (or anything) → finish the wizard.
2. In the left menu, click **Build → Firestore Database → Create database** → start in **test mode** (fine for a hackathon; lock it down later) → pick a region close to you.
3. Click the gear icon (⚙) → **Project settings → Service accounts → Generate new private key**. This downloads a JSON file.
4. Rename it `serviceAccountKey.json` and put it in `civicfix/backend/`. **Never commit this file** — it's already in `.gitignore`.

That's the only manual cloud step. Everything else runs locally.

---

## 2. Run the AI service (Python)

```bash
cd civicfix/ai-service
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_md
cp .env.example .env
python app.py
```

You should see `AI service running on http://localhost:5001`. On first run it trains a small
TensorFlow classifier on the bundled sample data (a few seconds) and keeps it in memory.

Leave this terminal running.

---

## 3. Run the backend (API gateway)

Open a **second terminal**:

```bash
cd civicfix/backend
npm install
cp .env.example .env
```

Edit `.env` and set:
```
AI_SERVICE_URL=http://localhost:5001
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
PORT=5000
```

For a local demo without a configured Firestore API, use the built-in in-memory store instead:
```
CIVICFIX_STORAGE=memory
```
Reports persist only while the backend is running. Remove that setting when connecting to Firebase in production.

### Operations security

The Operations view is protected server-side. Configure Firebase Authentication with Email/Password enabled, create an officer user, then assign its custom claim using the Firebase Admin SDK:

```js
await admin.auth().setCustomUserClaims("USER_UID", { role: "officer" });
```

Copy the Firebase Web App configuration into `frontend/.env` using the keys in `frontend/.env.example`. The backend verifies every bearer token and accepts only `officer` or `admin` roles for the queue, analytics, and status-update routes. Never rely on hiding the Operations tab as access control.

### Email confirmations with PHPMailer

Authenticated residents receive confirmation emails through the standalone PHPMailer service:

```powershell
cd mailer
composer install
Copy-Item .env.example .env
php -S localhost:8080 router.php
```

Configure SMTP credentials, `no-reply@civicfix.app`, and a shared secret in `mailer/.env`. Set the same secret and `PHP_MAILER_URL=http://localhost:8080/send.php` in `backend/.env`. The Node backend sends the recipient address from the verified Firebase account and authenticates its PHP request with `X-Mailer-Secret`.

Anonymous reports are saved and tracked in E-Complaint System but cannot receive email until the resident signs in. The API response and resident confirmation card indicate whether the email was sent.

Then:
```bash
npm run dev
```

You should see `API gateway running on http://localhost:5000`.

---

## 4. Run the frontend (React)

Open a **third terminal**:

```bash
cd civicfix/frontend
npm install
cp .env.example .env
```

`.env` should contain:
```
VITE_API_URL=http://localhost:5000/api
```

Then:
```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). You'll see the resident portal;
switch to the officer dashboard with the tab at the top.

---

## 5. Try it end to end

1. In the resident portal, submit: *"There has been no water in Kanyamazane since yesterday morning and elderly residents are struggling."*
2. Watch the AI analysis panel return category, department, priority and reasoning — this round-tripped through the AI service and got saved to Firestore.
3. Submit a similarly worded second report — it should come back flagged as a possible duplicate.
4. Switch to the officer dashboard: see both reports queued by priority, with live stats and a community-pulse breakdown by category.
5. Move a report through **Start investigating → Mark resolved**, then check the resident portal's tracker — it will ask the resident to confirm the fix.

---

## 6. How the AI actually works (`ai-service/`)

- **`nlp/preprocessing.py`** — cleans text with spaCy, extracts a location guess (named entities) and flags urgency keywords ("burst", "sewage", "no water for days", "school", "elderly", etc.).
- **`nlp/classifier.py`** — a small TensorFlow (Keras) neural net trained at startup on the bundled examples in `training_data.py`, on top of TF-IDF features. Swap in a bigger, hand-labelled dataset from real complaint logs before a real deployment — accuracy scales directly with training data.
- **`nlp/departments.py`** — static category → department mapping (edit this to match your municipality's actual department names).
- **`nlp/duplication.py`** — compares a new report's spaCy vector against open reports in the same category using cosine similarity; anything above the threshold (default 0.85) is flagged as a likely duplicate.

Priority is computed by combining the category with urgency-keyword hits and any duration/impact language ("for three days", "children", "elderly") — see `classifier.py: assign_priority()`.

---

## 7. Deploying (when you're ready)

- **AI service + backend → Render**: create two "Web Services" pointing at `ai-service/` and `backend/` respectively (Render auto-detects `requirements.txt` / `package.json`). Set the same env vars as locally, plus upload the service account JSON as a **Secret File** on Render (mount at `./serviceAccountKey.json`) instead of committing it.
- **Frontend → Render Static Site or Google Cloud (Firebase Hosting is easiest since you're already on Firebase)**: `npm run build` in `frontend/`, then `firebase deploy` (after `firebase init hosting`, pointing at `dist/`). Set `VITE_API_URL` to your deployed backend URL before building.
- **Backend/AI service → Google Cloud Run** is the alternative to Render: `gcloud run deploy` from each folder (both include everything Cloud Run needs; add a `Dockerfile` if you want reproducible builds — ask and I'll add one).

---

## 8. Project layout

```
civicfix/
├── ai-service/
│   ├── app.py                  Flask app: /classify, /check-duplicate
│   ├── nlp/
│   │   ├── preprocessing.py
│   │   ├── classifier.py
│   │   ├── duplication.py
│   │   ├── departments.py
│   │   └── training_data.py
│   ├── requirements.txt
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config/firebase.js
│   │   ├── services/aiServiceClient.js
│   │   ├── services/notificationService.js
│   │   ├── routes/complaints.js
│   │   ├── routes/analytics.js
│   │   └── middleware/errorHandler.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.jsx, App.jsx, index.css, api.js
    │   ├── pages/ResidentPortal.jsx, OfficerDashboard.jsx
    │   └── components/ComplaintForm.jsx, AnalysisCard.jsx, Tracker.jsx,
    │                   StatsBar.jsx, QueueList.jsx, PulsePanel.jsx
    ├── package.json, vite.config.js, tailwind.config.js
    └── .env.example
```
