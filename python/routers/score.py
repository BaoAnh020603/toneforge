from __future__ import annotations

from fastapi import APIRouter, File, Form, UploadFile

from cache.memory_store import store
from config import settings
from errors import chunk_too_short, reference_not_found
from schemas import ScoreResponse
from services.audio_io import load_audio_bytes
from services.note_builder import notes_from_float32_bytes
from services.pitch_extractor import extract_pitch
from services.scorer import filter_reference_notes, score_performance


router = APIRouter(prefix="/score", tags=["score"])


@router.post("", response_model=ScoreResponse)
async def score_chunk(
    audio_chunk: UploadFile = File(...),
    song_id: str = Form(...),
    seg_index: int = Form(...),
    start_time: float = Form(...),
    min_midi: int | None = Form(default=None),
    max_midi: int | None = Form(default=None),
    min_note_duration: float | None = Form(default=None),
) -> ScoreResponse:
    cached = store.get_song(song_id)
    if cached is None:
        raise reference_not_found()

    payload = await audio_chunk.read()
    audio, sample_rate, duration = load_audio_bytes(payload, settings)
    if duration < settings.min_chunk_seconds:
        raise chunk_too_short()

    user_frames = extract_pitch(audio, sample_rate, settings)
    reference_notes = filter_reference_notes(
        notes_from_float32_bytes(cached.notes_bytes),
        min_midi=min_midi,
        max_midi=max_midi,
        min_note_duration=min_note_duration,
    )
    result = score_performance(
        user_frames,
        reference_notes,
        start_time=start_time,
        chunk_duration=duration,
        cfg=settings,
    )
    return ScoreResponse(
        seg_index=seg_index,
        score=result.score,
        breakdown=result.breakdown,
        frame_data=result.frame_data,
    )
