from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import tempfile
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import APIRouter, File, Query, Request, UploadFile
from fastapi.responses import StreamingResponse

from cache.memory_store import store
from errors import invalid_audio, invalid_url, job_not_found, reference_not_found, result_not_ready
from schemas import ConvertRequest, ConvertResponse, ConvertResultResponse, JobStatusResponse, YouTubeSearchResult
from services.convert_processor import job_payload, process_convert_file_job, process_convert_job
from services.downloader import search_youtube
from services.job_queue import convert_queue
from services.url_utils import is_youtube_url, song_id_from_url


router = APIRouter(prefix="/convert", tags=["convert"])
SUPPORTED_UPLOAD_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg"}


def _result_url(request: Request, job_id: str) -> str:
    return str(request.url_for("get_convert_result", job_id=job_id))


def _status_url(request: Request, job_id: str) -> str:
    return str(request.url_for("get_convert_status", job_id=job_id))


def _events_url(request: Request, job_id: str) -> str:
    return str(request.url_for("get_convert_events", job_id=job_id))


@router.get("/youtube/search", response_model=list[YouTubeSearchResult])
async def search_youtube_videos(
    q: str = Query(min_length=1),
    limit: int = Query(default=5, ge=1, le=10),
) -> list[YouTubeSearchResult]:
    query = q if "voice" in q.lower() else f"{q} voice"
    return [YouTubeSearchResult(**item) for item in search_youtube(query, limit)]


@router.post("", response_model=ConvertResponse)
async def create_convert_job(
    payload: ConvertRequest,
    request: Request,
) -> ConvertResponse:
    if not is_youtube_url(payload.url):
        raise invalid_url()

    song_id = song_id_from_url(payload.url)
    job_id = uuid.uuid4().hex
    cached = store.get_song(song_id)
    if cached is not None:
        store.set_job(
            job_id,
            job_payload(
                job_id,
                "done",
                100,
                "cache_hit",
                song_id=song_id,
                result_url=_result_url(request, job_id),
            ),
        )
        return ConvertResponse(
            job_id=job_id,
            song_id=song_id,
            status="done",
            status_url=_status_url(request, job_id),
            events_url=_events_url(request, job_id),
            result_url=_result_url(request, job_id),
        )

    queue_pos = convert_queue.queue_size
    step_val = f"queued:{queue_pos}" if queue_pos > 0 else "queued"
    store.set_job(
        job_id,
        job_payload(job_id, "pending", 0, step_val, song_id=song_id),
    )
    try:
        convert_queue.submit(process_convert_job, job_id, payload.url, song_id)
    except Exception:
        store.delete_job(job_id)
        raise
    return ConvertResponse(
        job_id=job_id,
        song_id=song_id,
        status="pending",
        status_url=_status_url(request, job_id),
        events_url=_events_url(request, job_id),
        result_url=None,
    )


@router.post("/upload", response_model=ConvertResponse)
async def create_upload_convert_job(
    request: Request,
    file: UploadFile = File(...),
) -> ConvertResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_UPLOAD_EXTENSIONS:
        raise invalid_audio("unsupported audio file type")

    saved_path, song_id = await _save_upload_for_background_job(file, suffix)
    job_id = uuid.uuid4().hex
    cached = store.get_song(song_id)
    if cached is not None:
        saved_path.unlink(missing_ok=True)
        store.set_job(
            job_id,
            job_payload(
                job_id,
                "done",
                100,
                "cache_hit",
                song_id=song_id,
                result_url=_result_url(request, job_id),
            ),
        )
        return ConvertResponse(
            job_id=job_id,
            song_id=song_id,
            status="done",
            status_url=_status_url(request, job_id),
            events_url=_events_url(request, job_id),
            result_url=_result_url(request, job_id),
        )

    queue_pos = convert_queue.queue_size
    step_val = f"queued:{queue_pos}" if queue_pos > 0 else "queued"
    store.set_job(
        job_id,
        job_payload(job_id, "pending", 0, step_val, song_id=song_id),
    )
    try:
        convert_queue.submit(process_convert_file_job, job_id, str(saved_path), song_id, file.filename)
    except Exception:
        saved_path.unlink(missing_ok=True)
        store.delete_job(job_id)
        raise
    return ConvertResponse(
        job_id=job_id,
        song_id=song_id,
        status="pending",
        status_url=_status_url(request, job_id),
        events_url=_events_url(request, job_id),
        result_url=None,
    )


@router.get("/{job_id}/status", response_model=JobStatusResponse, name="get_convert_status")
async def get_convert_status(job_id: str, request: Request) -> JobStatusResponse:
    job = store.get_job(job_id)
    if job is None:
        raise job_not_found()

    status = str(job.get("status", "pending"))
    result_url = _result_url(request, job_id) if status == "done" else None
    return JobStatusResponse(
        job_id=job_id,
        status=status,
        progress=int(job.get("progress", 0)),
        step=str(job.get("step", "unknown")),
        result_url=result_url,
        error=job.get("error"),
        error_detail=job.get("error_detail"),
    )


@router.get("/{job_id}/events", name="get_convert_events")
async def get_convert_events(job_id: str, request: Request) -> StreamingResponse:
    if store.get_job(job_id) is None:
        raise job_not_found()

    return StreamingResponse(
        _job_event_stream(job_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{job_id}/result", name="get_convert_result")
async def get_convert_result(job_id: str) -> ConvertResultResponse:
    job = store.get_job(job_id)
    if job is None:
        raise job_not_found()
    if job.get("status") != "done":
        raise result_not_ready()

    song_id = str(job.get("song_id", ""))
    cached = store.get_song(song_id)
    if cached is None:
        raise reference_not_found()

    return ConvertResultResponse(**_build_convert_result_payload(cached.metadata, cached.notes_bytes))


async def _job_event_stream(job_id: str, request: Request) -> AsyncIterator[str]:
    last_status_payload: str | None = None

    while True:
        if await request.is_disconnected():
            break

        job = store.get_job(job_id)
        if job is None:
            yield _sse_event("error", {"error": "job_not_found"})
            break

        status = str(job.get("status", "pending"))
        if status == "done":
            song_id = str(job.get("song_id", ""))
            cached = store.get_song(song_id)
            if cached is None:
                yield _sse_event("error", {"error": "reference_not_found", "song_id": song_id})
            else:
                yield _sse_event("done", _build_convert_result_payload(cached.metadata, cached.notes_bytes))
            break

        status_payload = _job_status_payload(job, request, job_id)
        if status == "error":
            yield _sse_event("error", status_payload)
            break

        encoded_status = json.dumps(status_payload, separators=(",", ":"), sort_keys=True)
        if encoded_status != last_status_payload:
            yield _sse_event("status", status_payload)
            last_status_payload = encoded_status

        await asyncio.sleep(0.5)


def _job_status_payload(job: dict[str, object], request: Request, job_id: str) -> dict[str, object]:
    status = str(job.get("status", "pending"))
    return {
        "job_id": job_id,
        "song_id": str(job.get("song_id", "")),
        "status": status,
        "progress": int(job.get("progress", 0)),
        "step": str(job.get("step", "unknown")),
        "result_url": _result_url(request, job_id) if status == "done" else None,
        "error": job.get("error"),
        "error_detail": job.get("error_detail"),
    }


def _build_convert_result_payload(metadata: dict[str, object], notes_bytes: bytes) -> dict[str, object]:
    return {
        "metadata": metadata,
        "notes_base64": base64.b64encode(notes_bytes).decode("ascii"),
    }


async def _save_upload_for_background_job(file: UploadFile, suffix: str) -> tuple[Path, str]:
    hasher = hashlib.md5()
    size = 0
    handle = tempfile.NamedTemporaryFile(delete=False, prefix="ToneForge_upload_", suffix=suffix)
    path = Path(handle.name)

    try:
        with handle:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                hasher.update(chunk)
                handle.write(chunk)
    except Exception:
        path.unlink(missing_ok=True)
        raise

    if size == 0:
        path.unlink(missing_ok=True)
        raise invalid_audio("empty audio file")

    return path, hasher.hexdigest()


def _sse_event(event: str, data: dict[str, object]) -> str:
    data_json = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    return f"event: {event}\ndata: {data_json}\n\n"


