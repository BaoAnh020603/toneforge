import pytest

from config import Settings
from services.note_builder import NoteEvent, midi_to_hz
from services.pitch_extractor import PitchFrame
from services.scorer import (
    cents_off,
    compute_pitch_score,
    compute_timing_score,
    filter_reference_notes,
    reference_hz_at_time,
    score_performance,
)


def test_cents_off() -> None:
    assert cents_off(440.0, 440.0) == pytest.approx(0.0)
    assert cents_off(880.0, 440.0) == pytest.approx(1200.0)


def test_pitch_score_uses_cents_tolerance_window() -> None:
    cfg = Settings(pitch_tolerance_cents=50.0)
    frame_data = [
        {"t": 0.0, "user_hz": 452.9, "ref_hz": 440.0, "cents_off": 50.0},
        {"t": 0.1, "user_hz": 427.5, "ref_hz": 440.0, "cents_off": -50.0},
        {"t": 0.2, "user_hz": 453.2, "ref_hz": 440.0, "cents_off": 51.0},
    ]

    assert compute_pitch_score(frame_data, cfg) == pytest.approx(200.0 / 3.0)


def test_reference_pitch_uses_highest_active_note_for_polyphonic_reference() -> None:
    reference = [NoteEvent(1.0, 48, 1.0), NoteEvent(1.0, 72, 1.0)]

    assert reference_hz_at_time(reference, 1.25) == pytest.approx(midi_to_hz(72))


def test_timing_score_uses_melody_notes_for_polyphonic_reference() -> None:
    cfg = Settings(timing_tolerance_seconds=0.15)
    reference = [NoteEvent(10.0, 48, 0.5), NoteEvent(10.0, 72, 0.5)]
    user = [NoteEvent(0.05, 72, 0.5)]

    score = compute_timing_score(
        user,
        reference,
        start_time=10.0,
        chunk_duration=1.0,
        cfg=cfg,
    )

    assert score == pytest.approx(100.0)


def test_filter_reference_notes_keeps_voice_range_and_melody_line() -> None:
    reference = [
        NoteEvent(1.0, 40, 1.0),
        NoteEvent(1.0, 67, 0.03),
        NoteEvent(1.0, 72, 0.5),
        NoteEvent(2.0, 90, 0.5),
    ]

    filtered = filter_reference_notes(
        reference,
        min_midi=48,
        max_midi=84,
        min_note_duration=0.08,
    )

    assert filtered == [NoteEvent(1.0, 72, 0.5)]


def test_timing_score_counts_onsets_within_tolerance() -> None:
    cfg = Settings(timing_tolerance_seconds=0.15)
    reference = [NoteEvent(10.0, 69, 0.5), NoteEvent(11.0, 71, 0.5)]
    user = [NoteEvent(0.05, 69, 0.5), NoteEvent(1.4, 71, 0.5)]

    score = compute_timing_score(
        user,
        reference,
        start_time=10.0,
        chunk_duration=2.0,
        cfg=cfg,
    )

    assert score == pytest.approx(50.0)


def test_score_performance_weights_breakdown() -> None:
    cfg = Settings(
        sample_rate=16000,
        hop_length=512,
        min_confidence=0.5,
        score_pitch_weight=0.4,
        score_timing_weight=0.3,
        score_stability_weight=0.3,
    )
    reference = [NoteEvent(20.0, 69, 0.2)]
    user_frames = [
        PitchFrame(0.000, midi_to_hz(69), 0.9),
        PitchFrame(0.032, midi_to_hz(69), 0.9),
        PitchFrame(0.064, midi_to_hz(69), 0.9),
    ]

    result = score_performance(
        user_frames,
        reference,
        start_time=20.0,
        chunk_duration=0.2,
        cfg=cfg,
    )

    assert result.breakdown["pitch"] == pytest.approx(100.0)
    assert result.breakdown["timing"] == pytest.approx(100.0)
    assert result.score > 90.0
    assert result.frame_data[0]["t"] == pytest.approx(20.0)

