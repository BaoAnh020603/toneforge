from config import Settings
from services.melody_filter import extract_melody_notes
from services.note_builder import NoteEvent


def test_melody_filter_removes_out_of_range_and_short_notes() -> None:
    cfg = Settings(
        sample_rate=100,
        hop_length=5,
        melody_min_midi=48,
        melody_max_midi=84,
        melody_min_note_duration=0.08,
    )
    notes = [
        NoteEvent(0.0, 40, 0.5),
        NoteEvent(0.0, 67, 0.03),
        NoteEvent(0.0, 72, 0.2),
        NoteEvent(0.0, 90, 0.2),
    ]

    melody = extract_melody_notes(notes, cfg)

    assert [(note.midi, round(note.duration, 2)) for note in melody] == [(72, 0.2)]


def test_melody_filter_prefers_continuous_line_over_highest_note() -> None:
    cfg = Settings(
        sample_rate=100,
        hop_length=5,
        melody_min_midi=48,
        melody_max_midi=90,
        melody_min_note_duration=0.05,
        melody_max_jump_semitones=12,
    )
    notes = [
        NoteEvent(0.00, 60, 0.50),
        NoteEvent(0.10, 84, 0.35),
    ]

    melody = extract_melody_notes(notes, cfg)

    assert melody == [NoteEvent(0.0, 60, 0.5)]


def test_melody_filter_outputs_one_note_per_frame() -> None:
    cfg = Settings(
        sample_rate=100,
        hop_length=5,
        melody_min_midi=48,
        melody_max_midi=84,
        melody_min_note_duration=0.05,
    )
    notes = [
        NoteEvent(0.0, 60, 0.3),
        NoteEvent(0.0, 64, 0.3),
        NoteEvent(0.0, 67, 0.3),
    ]

    melody = extract_melody_notes(notes, cfg)

    assert len(melody) == 1
    assert melody[0].midi in {60, 64, 67}


def test_melody_filter_merges_same_pitch_with_short_gap() -> None:
    cfg = Settings(
        sample_rate=100,
        hop_length=5,
        melody_min_midi=48,
        melody_max_midi=84,
        melody_min_note_duration=0.05,
        melody_merge_gap_seconds=0.08,
    )
    notes = [
        NoteEvent(0.00, 60, 0.20),
        NoteEvent(0.25, 60, 0.20),
    ]

    melody = extract_melody_notes(notes, cfg)

    assert melody == [NoteEvent(0.0, 60, 0.45)]
