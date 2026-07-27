from __future__ import annotations

from pathlib import Path

from errors import transcription_failed
from services.note_builder import NoteEvent


def parse_midi_to_notes(midi_path: str | Path) -> list[NoteEvent]:
    try:
        import pretty_midi
    except ImportError as exc:
        raise transcription_failed("pretty_midi is required to parse Basic Pitch MIDI output") from exc

    try:
        midi = pretty_midi.PrettyMIDI(str(midi_path))
    except Exception as exc:
        raise transcription_failed(f"failed to parse MIDI output: {exc}") from exc

    notes: list[NoteEvent] = []
    for instrument in midi.instruments:
        if getattr(instrument, "is_drum", False):
            continue

        for midi_note in instrument.notes:
            duration = float(midi_note.end) - float(midi_note.start)
            if duration <= 0:
                continue

            notes.append(
                NoteEvent(
                    start=round(float(midi_note.start), 6),
                    midi=max(0, min(127, int(midi_note.pitch))),
                    duration=round(duration, 6),
                )
            )

    return sorted(notes, key=lambda note: (note.start, note.midi, note.duration))
