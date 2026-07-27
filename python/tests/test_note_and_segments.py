import pytest

from config import Settings
from services.note_builder import (
    NoteEvent,
    hz_to_midi,
    midi_to_hz,
    notes_from_float32_bytes,
    notes_to_float32_bytes,
    pitch_frames_to_notes,
)
from services.pitch_extractor import PitchFrame
from services.segment_builder import build_segments


def test_hz_midi_conversion() -> None:
    assert hz_to_midi(440.0) == 69
    assert midi_to_hz(69) == pytest.approx(440.0)


def test_pitch_frames_group_into_notes() -> None:
    cfg = Settings(sample_rate=16000, hop_length=512, min_confidence=0.5)
    frames = [
        PitchFrame(0.000, 440.0, 0.9),
        PitchFrame(0.032, 441.0, 0.9),
        PitchFrame(0.064, None, 0.0),
        PitchFrame(0.096, 493.88, 0.9),
    ]

    notes = pitch_frames_to_notes(frames, cfg)

    assert [(note.midi, round(note.duration, 3)) for note in notes] == [(69, 0.064), (71, 0.032)]


def test_float32_notes_roundtrip() -> None:
    notes = [NoteEvent(1.25, 69, 0.5), NoteEvent(2.0, 71, 0.25)]
    payload = notes_to_float32_bytes(notes)

    decoded = notes_from_float32_bytes(payload)

    assert len(payload) == 24
    assert decoded[0].start == pytest.approx(1.25)
    assert decoded[0].midi == 69
    assert decoded[0].duration == pytest.approx(0.5)
    assert decoded[1].midi == 71


def test_segments_group_notes_by_gap() -> None:
    cfg = Settings(segment_gap_seconds=2.0)
    notes = [
        NoteEvent(1.0, 60, 1.0),
        NoteEvent(3.5, 62, 0.5),
        NoteEvent(7.0, 64, 1.0),
    ]

    segments = build_segments(notes, cfg)

    assert segments == [{"start": 1.0, "end": 4.0}, {"start": 7.0, "end": 8.0}]
