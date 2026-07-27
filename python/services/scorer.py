from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from config import Settings, settings
from services.note_builder import NoteEvent, midi_to_hz, pitch_frames_to_notes
from services.pitch_extractor import PitchFrame


@dataclass(frozen=True)
class ScoreResult:
    score: float
    breakdown: dict[str, float]
    frame_data: list[dict[str, float | None]]


def cents_off(user_hz: float, ref_hz: float) -> float:
    if user_hz <= 0 or ref_hz <= 0:
        raise ValueError("frequencies must be positive")
    return float(1200.0 * math.log2(user_hz / ref_hz))


def reference_hz_at_time(reference_notes: list[NoteEvent], absolute_time: float) -> float | None:
    active_notes = [note for note in reference_notes if note.start <= absolute_time < note.end]
    if not active_notes:
        return None
    target_note = max(active_notes, key=lambda note: note.midi)
    return midi_to_hz(target_note.midi)


def reference_notes_in_range(
    reference_notes: list[NoteEvent],
    start_time: float,
    end_time: float,
) -> list[NoteEvent]:
    return [note for note in reference_notes if note.end > start_time and note.start < end_time]


def filter_reference_notes(
    reference_notes: list[NoteEvent],
    *,
    min_midi: int | None = None,
    max_midi: int | None = None,
    min_note_duration: float | None = None,
) -> list[NoteEvent]:
    filtered = [
        note
        for note in reference_notes
        if (min_midi is None or note.midi >= min_midi)
        and (max_midi is None or note.midi <= max_midi)
        and (min_note_duration is None or note.duration >= min_note_duration)
    ]
    return [note for note in filtered if _is_highest_active_note(filtered, note)]


def melody_reference_notes_in_range(
    reference_notes: list[NoteEvent],
    start_time: float,
    end_time: float,
) -> list[NoteEvent]:
    candidates = reference_notes_in_range(reference_notes, start_time, end_time)
    return [note for note in candidates if _is_highest_active_note(reference_notes, note)]


def score_performance(
    user_frames: list[PitchFrame],
    reference_notes: list[NoteEvent],
    *,
    start_time: float,
    chunk_duration: float,
    cfg: Settings = settings,
) -> ScoreResult:
    frame_data = build_frame_data(user_frames, reference_notes, start_time)
    pitch_score = compute_pitch_score(frame_data, cfg)
    user_notes = pitch_frames_to_notes(user_frames, cfg)
    timing_score = compute_timing_score(
        user_notes,
        reference_notes,
        start_time=start_time,
        chunk_duration=chunk_duration,
        cfg=cfg,
    )
    stability_score = compute_stability_score(user_frames, user_notes)

    total_weight = cfg.score_pitch_weight + cfg.score_timing_weight + cfg.score_stability_weight
    if total_weight <= 0:
        total_weight = 1.0
    score = (
        pitch_score * cfg.score_pitch_weight
        + timing_score * cfg.score_timing_weight
        + stability_score * cfg.score_stability_weight
    ) / total_weight

    breakdown = {
        "pitch": round(pitch_score, 1),
        "timing": round(timing_score, 1),
        "stability": round(stability_score, 1),
    }
    return ScoreResult(score=round(score, 1), breakdown=breakdown, frame_data=frame_data)


def build_frame_data(
    user_frames: list[PitchFrame],
    reference_notes: list[NoteEvent],
    start_time: float,
) -> list[dict[str, float | None]]:
    data: list[dict[str, float | None]] = []
    for frame in user_frames:
        absolute_t = start_time + frame.t
        ref_hz = reference_hz_at_time(reference_notes, absolute_t)
        cents = None
        if frame.hz is not None and ref_hz is not None:
            cents = cents_off(frame.hz, ref_hz)
        data.append(
            {
                "t": round(absolute_t, 3),
                "user_hz": round(frame.hz, 3) if frame.hz is not None else None,
                "ref_hz": round(ref_hz, 3) if ref_hz is not None else None,
                "cents_off": round(cents, 3) if cents is not None else None,
            }
        )
    return data


def compute_pitch_score(frame_data: list[dict[str, float | None]], cfg: Settings = settings) -> float:
    comparable = [frame for frame in frame_data if frame["ref_hz"] is not None]
    if not comparable:
        return 100.0
    correct = 0
    for frame in comparable:
        cents = frame["cents_off"]
        if cents is not None and abs(float(cents)) <= cfg.pitch_tolerance_cents:
            correct += 1
    return correct / len(comparable) * 100.0


def compute_timing_score(
    user_notes: list[NoteEvent],
    reference_notes: list[NoteEvent],
    *,
    start_time: float,
    chunk_duration: float,
    cfg: Settings = settings,
) -> float:
    relevant = melody_reference_notes_in_range(reference_notes, start_time, start_time + chunk_duration)
    if not relevant:
        return 100.0

    unmatched_user_starts = [start_time + note.start for note in user_notes]
    correct = 0
    for ref in relevant:
        if not unmatched_user_starts:
            break
        distances = [abs(user_start - ref.start) for user_start in unmatched_user_starts]
        best_index = int(np.argmin(distances))
        if distances[best_index] <= cfg.timing_tolerance_seconds:
            correct += 1
            unmatched_user_starts.pop(best_index)
    return correct / len(relevant) * 100.0


def compute_stability_score(user_frames: list[PitchFrame], user_notes: list[NoteEvent]) -> float:
    if not user_notes:
        return 0.0

    note_scores: list[float] = []
    for note in user_notes:
        values = [
            frame.hz
            for frame in user_frames
            if frame.hz is not None and note.start <= frame.t < note.end
        ]
        if len(values) < 2:
            continue
        cents = np.array([1200.0 * math.log2(value / np.median(values)) for value in values])
        std = float(np.std(cents))
        if _looks_like_regular_vibrato(cents, note.duration):
            note_scores.append(100.0)
        elif std <= 20.0:
            note_scores.append(100.0)
        else:
            note_scores.append(max(0.0, 100.0 - (std - 20.0) * 1.25))

    if not note_scores:
        return 0.0
    return float(np.mean(note_scores))


def _looks_like_regular_vibrato(cents: np.ndarray, duration: float) -> bool:
    if duration < 0.5 or len(cents) < 8:
        return False
    centered = cents - float(np.mean(cents))
    signs = np.sign(centered)
    signs[signs == 0] = 1
    zero_crossings = int(np.sum(signs[1:] != signs[:-1]))
    estimated_hz = zero_crossings / (2.0 * duration)
    amplitude = float(np.std(centered))
    return 4.0 <= estimated_hz <= 7.0 and 20.0 < amplitude <= 100.0


def _is_highest_active_note(reference_notes: list[NoteEvent], note: NoteEvent) -> bool:
    active_notes = [other for other in reference_notes if other.start <= note.start < other.end]
    if not active_notes:
        return True
    target_note = max(active_notes, key=lambda active: (active.midi, -active.start))
    return note == target_note
