from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from config import Settings, settings
from services.pitch_extractor import PitchFrame


@dataclass(frozen=True)
class NoteEvent:
    start: float
    midi: int
    duration: float

    @property
    def end(self) -> float:
        return self.start + self.duration


def hz_to_midi(hz: float) -> int:
    if hz <= 0:
        raise ValueError("hz must be positive")
    midi = round(69 + 12 * math.log2(hz / 440.0))
    return max(0, min(127, int(midi)))


def midi_to_hz(midi: int | float) -> float:
    return float(440.0 * (2 ** ((float(midi) - 69.0) / 12.0)))


def pitch_frames_to_notes(
    frames: list[PitchFrame],
    cfg: Settings = settings,
    *,
    min_note_duration: float | None = None,
) -> list[NoteEvent]:
    if not frames:
        return []

    frame_duration = cfg.hop_length / cfg.sample_rate
    minimum = min_note_duration if min_note_duration is not None else frame_duration
    notes: list[NoteEvent] = []
    current_midi: int | None = None
    current_start: float | None = None
    last_time: float | None = None

    def close_current() -> None:
        nonlocal current_midi, current_start, last_time
        if current_midi is None or current_start is None or last_time is None:
            return
        duration = max(frame_duration, last_time + frame_duration - current_start)
        if duration >= minimum:
            notes.append(NoteEvent(round(current_start, 6), current_midi, round(duration, 6)))
        current_midi = None
        current_start = None
        last_time = None

    for frame in frames:
        if frame.hz is None or frame.confidence < cfg.min_confidence:
            close_current()
            continue

        midi = hz_to_midi(frame.hz)
        if current_midi is None:
            current_midi = midi
            current_start = frame.t
            last_time = frame.t
            continue

        contiguous = last_time is not None and frame.t - last_time <= frame_duration * 1.5
        if midi == current_midi and contiguous:
            last_time = frame.t
            continue

        close_current()
        current_midi = midi
        current_start = frame.t
        last_time = frame.t

    close_current()
    return notes


def notes_to_float32_bytes(notes: list[NoteEvent]) -> bytes:
    if not notes:
        return np.empty((0, 3), dtype="<f4").tobytes()
    data = np.array([[note.start, float(note.midi), note.duration] for note in notes], dtype="<f4")
    return data.tobytes()


def notes_from_float32_bytes(payload: bytes) -> list[NoteEvent]:
    if len(payload) % 12 != 0:
        raise ValueError("notes payload must contain 3 float32 values per note")
    data = np.frombuffer(payload, dtype="<f4").reshape((-1, 3))
    return [
        NoteEvent(start=float(row[0]), midi=int(round(float(row[1]))), duration=float(row[2]))
        for row in data
    ]
