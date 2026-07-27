from __future__ import annotations

from config import Settings, settings
from services.note_builder import NoteEvent


def build_segments(notes: list[NoteEvent], cfg: Settings = settings) -> list[dict[str, float]]:
    if not notes:
        return []

    sorted_notes = sorted(notes, key=lambda note: note.start)
    segments: list[dict[str, float]] = []
    current_start = sorted_notes[0].start
    current_end = sorted_notes[0].end

    for note in sorted_notes[1:]:
        if note.start - current_end < cfg.segment_gap_seconds:
            current_end = max(current_end, note.end)
            continue
        segments.append({"start": round(current_start, 3), "end": round(current_end, 3)})
        current_start = note.start
        current_end = note.end

    segments.append({"start": round(current_start, 3), "end": round(current_end, 3)})
    return segments
