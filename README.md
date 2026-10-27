# Open Talk

AI-powered communication and public-speaking coach. Practice Studio captures a spoken or typed transcript, saves the session, and writes coaching notes from the text. Gemini is used when `GEMINI_API_KEY` is set; otherwise a local transcript review is stored. Acoustic scores such as pitch or pronunciation are not claimed.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Lucide
- Backend: Python, Flask, Flask-CORS, Flask-SQLAlchemy, SQLite

## Prerequisites (Windows)

- Node.js 20.19+ (this repo was built with Node 24)
- Python 3.13
- PowerShell

If `python` opens the Microsoft Store stub, use the full path after installing Python:

`C:\Users\<you>\AppData\Local\Programs\Python\Python313\python.exe`

Prefer `npm.cmd` in PowerShell if execution policy blocks `npm`.

## Backend setup

```powershell
cd C:\Users\vansh\Open_Talk2\backend
C:\Users\vansh\AppData\Local\Programs\Python\Python313\python.exe -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python run.py
```

Health check (leave the server running, use a second terminal):

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
```

Expected JSON:

```json
{
  "status": "ok",
  "service": "open-talk-api",
  "phase": 4,
  "version": "0.4.0"
}
```

Backend tests:

```powershell
cd C:\Users\vansh\Open_Talk2\backend
.\.venv\Scripts\Activate.ps1
python -m unittest tests.test_health tests.test_auth tests.test_sessions
```

## Frontend setup

```powershell
cd C:\Users\vansh\Open_Talk2\frontend
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to `http://127.0.0.1:5000`, so start the Flask app first if you want the footer status to show **API connected**.

Production frontend build:

```powershell
cd C:\Users\vansh\Open_Talk2\frontend
npm.cmd run build
```

Frontend tests:

```powershell
cd C:\Users\vansh\Open_Talk2\frontend
npm.cmd test
```

## Environment

Copy `backend/.env.example` to `backend/.env`. Keep real keys out of git.

Optional `GEMINI_API_KEY` enables model-written coaching. Leave it blank to store a local transcript review instead.

Optional frontend override (defaults to the Vite proxy):

```powershell
# frontend/.env.local
VITE_API_BASE_URL=
```

## What is included

- Landing page, authentication, protected dashboard
- Practice Studio for mock interviews, public speaking, and everyday conversation
- Session setup (mode and difficulty), start / stop / retry, live transcript editing
- Browser Web Speech API when supported, with typed fallback otherwise
- Saved session history and per-session coaching reports
- Gemini coaching when an API key is configured; local review otherwise

Not included:

- Real-time Gemini Live audio streaming
- Uploaded recordings or pronunciation scoring
