from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from cache.memory_store import store
from config import settings
from errors import ServiceError, video_too_long
from services.audio_metadata import get_audio_duration
from services.audio_filter import apply_voice_bandpass
from services.basic_pitch_transcriber import transcribe_audio_to_midi_notes
from services.downloader import download_youtube_audio
from services.melody_filter import extract_melody_notes, melody_filter_metadata
from services.note_builder import notes_to_float32_bytes
from services.segment_builder import build_segments


logger = logging.getLogger(__name__)


def job_payload(
    job_id: str,
    status: str,
    progress: int,
    step: str,
    *,
    song_id: str,
    result_url: str | None = None,
    error: str | None = None,
    error_detail: str | None = None,
) -> dict[str, object]:
    return {
        "job_id": job_id,
        "song_id": song_id,
        "status": status,
        "progress": progress,
        "step": step,
        "result_url": result_url,
        "error": error,
        "error_detail": error_detail,
    }


def process_convert_job(job_id: str, url: str, song_id: str) -> None:
    def update(
        status: str,
        progress: int,
        step: str,
        error: str | None = None,
        error_detail: str | None = None,
    ) -> None:
        store.set_job(
            job_id,
            job_payload(
                job_id,
                status,
                progress,
                step,
                song_id=song_id,
                result_url=f"/convert/{job_id}/result" if status == "done" else None,
                error=error,
                error_detail=error_detail,
            ),
        )

    try:
        cached = store.get_song(song_id)
        if cached is not None:
            update("done", 100, "cache_hit")
            return

        update("processing", 5, "download")
        with tempfile.TemporaryDirectory(prefix="voice_convert_") as tmp:
            work_dir = Path(tmp)
            downloaded = download_youtube_audio(url, work_dir, settings)

            update("processing", 60, "basic_pitch_transcription")
            _transcribe_and_store_song(
                song_id=song_id,
                audio_path=downloaded.wav_path,
                work_dir=work_dir,
                duration=downloaded.duration or get_audio_duration(downloaded.wav_path, settings),
                source_name=downloaded.title,
            )

        update("done", 100, "done")
    except ServiceError as exc:
        logger.exception("Convert job failed: job_id=%s song_id=%s code=%s", job_id, song_id, exc.code)
        update("error", 100, "error", exc.code, exc.message)
    except Exception as exc:
        logger.exception("Unexpected convert job failure: job_id=%s song_id=%s", job_id, song_id)
        update("error", 100, "error", "download_failed", f"{type(exc).__name__}: {exc}")


def process_convert_file_job(
    job_id: str,
    audio_path: str,
    song_id: str,
    original_filename: str | None = None,
) -> None:
    def update(
        status: str,
        progress: int,
        step: str,
        error: str | None = None,
        error_detail: str | None = None,
    ) -> None:
        store.set_job(
            job_id,
            job_payload(
                job_id,
                status,
                progress,
                step,
                song_id=song_id,
                result_url=f"/convert/{job_id}/result" if status == "done" else None,
                error=error,
                error_detail=error_detail,
            ),
        )

    source_path = Path(audio_path)
    try:
        cached = store.get_song(song_id)
        if cached is not None:
            update("done", 100, "cache_hit")
            return

        update("processing", 10, "audio_metadata")
        duration = get_audio_duration(source_path, settings)
        if duration > settings.max_video_duration:
            raise video_too_long()

        with tempfile.TemporaryDirectory(prefix="voice_upload_convert_") as tmp:
            work_dir = Path(tmp)
            update("processing", 60, "basic_pitch_transcription")
            _transcribe_and_store_song(
                song_id=song_id,
                audio_path=source_path,
                work_dir=work_dir,
                duration=duration,
                source_name=original_filename,
            )

        update("done", 100, "done")
    except ServiceError as exc:
        logger.exception("Convert upload job failed: job_id=%s song_id=%s code=%s", job_id, song_id, exc.code)
        update("error", 100, "error", exc.code, exc.message)
    except Exception as exc:
        logger.exception("Unexpected convert upload job failure: job_id=%s song_id=%s", job_id, song_id)
        update("error", 100, "error", "download_failed", f"{type(exc).__name__}: {exc}")
    finally:
        source_path.unlink(missing_ok=True)


def _transcribe_and_store_song(
    *,
    song_id: str,
    audio_path: Path,
    work_dir: Path,
    duration: float,
    source_name: str | None = None,
) -> None:
    filtered_audio_path = apply_voice_bandpass(audio_path, work_dir, settings)
    transcription = transcribe_audio_to_midi_notes(filtered_audio_path, work_dir)
    raw_notes = transcription.notes
    melody_notes = extract_melody_notes(raw_notes, settings)
    notes_bytes = notes_to_float32_bytes(melody_notes)
    segments = build_segments(melody_notes, settings)
    metadata: dict[str, object] = {
        "song_id": song_id,
        "duration": round(float(duration), 3),
        "raw_total_notes": len(raw_notes),
        "total_notes": len(melody_notes),
        "segments": segments,
        "transcription_engine": "basic_pitch",
        "transcription_audio": "original",
        "voice_bandpass": {
            "enabled": settings.voice_bandpass,
            "low_hz": settings.voice_bandpass_low_hz,
            "high_hz": settings.voice_bandpass_high_hz,
            "order": settings.voice_bandpass_order,
        },
        "melody_filter": melody_filter_metadata(settings),
    }
    if source_name:
        metadata["source_name"] = source_name
    store.set_song(song_id, metadata, notes_bytes)

