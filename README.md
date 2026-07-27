# ToneForge

ToneForge is a voice practice and analysis platform with a React frontend and a FastAPI backend.

## What it does

- analyses voice range in realtime
- scores voice performance against reference notes
- converts YouTube tracks or uploaded audio into practice references
- stores practice history and progress in Firebase

## Project Layout

- `frontend/` React + Vite app
- `python/` FastAPI audio and scoring backend

## Quick Start

```powershell
cd frontend
npm install
npm run dev
```

```powershell
cd python
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- The backend expects `ffmpeg` on `PATH`.
- The frontend defaults to `http://localhost:8000` for the backend API.
- Some test and data field names still preserve backward compatibility with older saved records, but the UI and project branding are now ToneForge.
