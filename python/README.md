# ToneForge Voice Server

FastAPI backend for ToneForge. This service handles:

- YouTube Data API search for practice tracks and video metadata
- conversion of uploaded audio into note data
- realtime scoring of voice performance
- in-memory caching for converted references and job state

## Requirements

- Python 3.11
- `ffmpeg` available on `PATH`
- `YOUTUBE_API_KEY` for YouTube search results

## Setup

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

## Run

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or use PM2:

```powershell
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name "toneforge-voice" --watch
```

## Tests

```powershell
.\.venv\Scripts\Activate.ps1
pytest
```

## API Overview

### `GET /convert/youtube/search`

Search YouTube tracks or fetch metadata for a YouTube URL/video id.

Query parameters:

- `q` required: search query
- `limit` optional: number of results, default `5`

### `POST /convert`

Create a conversion job from a YouTube URL. Direct YouTube audio download may be blocked by YouTube; use `POST /convert/upload` for reliable analysis.

### `POST /convert/upload`

Create a conversion job from an uploaded audio file.

### `GET /convert/{job_id}/status`

Get conversion progress.

### `GET /convert/{job_id}/events`

Stream progress updates over Server-Sent Events.

### `GET /convert/{job_id}/result`

Fetch the converted reference notes and metadata.

### `POST /score`

Score a recorded audio chunk against the converted reference.

### `DELETE /cache/{song_id}`

Remove a cached reference from memory.

## Notes

- Job and reference cache live in memory inside the running process.
- Restarting the server clears cache and queued work.
- For small servers, set `CONVERT_CONCURRENCY=1`.
