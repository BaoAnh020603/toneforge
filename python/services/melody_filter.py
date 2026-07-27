from __future__ import annotations

from collections.abc import Sequence

from config import Settings, settings
from services.note_builder import NoteEvent


def extract_melody_notes(notes: Sequence[NoteEvent], cfg: Settings = settings) -> list[NoteEvent]:
    candidates = _prefilter_notes(notes, cfg)
    if not candidates:
        return []

    frame_duration = cfg.hop_length / cfg.sample_rate
    start_time = min(note.start for note in candidates)
    end_time = max(note.end for note in candidates)
    frames = _active_candidates_by_frame(candidates, start_time, end_time, frame_duration)
    selected = _select_continuous_melody(frames, cfg)
    return _frames_to_notes(selected, start_time, frame_duration, cfg)


def melody_filter_metadata(cfg: Settings = settings) -> dict[str, object]:
    return {
        "min_midi": cfg.melody_min_midi,
        "max_midi": cfg.melody_max_midi,
        "min_note_duration": cfg.melody_min_note_duration,
        "max_jump_semitones": cfg.melody_max_jump_semitones,
        "merge_gap_seconds": cfg.melody_merge_gap_seconds,
        "frame_seconds": round(cfg.hop_length / cfg.sample_rate, 6),
        "mode": "voice_bandpass_basic_pitch_one_note_per_frame",
    }


def _prefilter_notes(notes: Sequence[NoteEvent], cfg: Settings) -> list[NoteEvent]:
    return sorted(
        (
            note
            for note in notes
            if cfg.melody_min_midi <= note.midi <= cfg.melody_max_midi
            and note.duration >= cfg.melody_min_note_duration
        ),
        key=lambda note: (note.start, note.midi, note.duration),
    )


def _active_candidates_by_frame(
    notes: Sequence[NoteEvent],
    start_time: float,
    end_time: float,
    frame_duration: float,
) -> list[list[NoteEvent]]:
    frame_count = max(1, int((end_time - start_time) / frame_duration) + 1)
    frames: list[list[NoteEvent]] = []
    for index in range(frame_count):
        t = start_time + index * frame_duration
        active_by_midi: dict[int, NoteEvent] = {}
        for note in notes:
            if note.start <= t < note.end:
                current = active_by_midi.get(note.midi)
                if current is None or note.duration > current.duration:
                    active_by_midi[note.midi] = note
        frames.append(sorted(active_by_midi.values(), key=lambda note: note.midi))
    return frames


def _select_continuous_melody(frames: Sequence[Sequence[NoteEvent]], cfg: Settings) -> list[int | None]:
    selected: list[int | None] = []
    segment: list[list[NoteEvent]] = []
    segment_start = 0

    def flush() -> None:
        nonlocal segment, segment_start
        if not segment:
            return
        selected.extend([None] * (segment_start - len(selected)))
        selected.extend(_select_segment(segment, cfg))
        segment = []

    for frame_index, candidates in enumerate(frames):
        if not candidates:
            flush()
            selected.append(None)
            segment_start = frame_index + 1
            continue
        if not segment:
            segment_start = frame_index
        segment.append(list(candidates))

    flush()
    if len(selected) < len(frames):
        selected.extend([None] * (len(frames) - len(selected)))
    return selected


def _select_segment(frames: Sequence[Sequence[NoteEvent]], cfg: Settings) -> list[int]:
    scores: list[dict[int, float]] = []
    paths: list[dict[int, list[int]]] = []

    for frame_index, candidates in enumerate(frames):
        frame_scores: dict[int, float] = {}
        frame_paths: dict[int, list[int]] = {}
        for candidate in candidates:
            local = min(candidate.duration, 2.0) * 10.0
            midi = candidate.midi
            if frame_index == 0:
                frame_scores[midi] = local
                frame_paths[midi] = [midi]
                continue

            best_score: float | None = None
            best_path: list[int] | None = None
            for previous_midi, previous_score in scores[-1].items():
                jump = abs(midi - previous_midi)
                if jump <= cfg.melody_max_jump_semitones:
                    transition = -float(jump) * 2.0
                else:
                    transition = -100.0 - float(jump - cfg.melody_max_jump_semitones) * 6.0
                score = previous_score + local + transition
                if best_score is None or score > best_score:
                    best_score = score
                    best_path = paths[-1][previous_midi] + [midi]

            frame_scores[midi] = best_score if best_score is not None else local
            frame_paths[midi] = best_path if best_path is not None else [midi]
        scores.append(frame_scores)
        paths.append(frame_paths)

    best_final = max(scores[-1], key=lambda midi: scores[-1][midi])
    return paths[-1][best_final]


def _frames_to_notes(
    selected: Sequence[int | None],
    start_time: float,
    frame_duration: float,
    cfg: Settings,
) -> list[NoteEvent]:
    notes: list[NoteEvent] = []
    current_midi: int | None = None
    current_start_index: int | None = None
    last_index: int | None = None

    def close_current() -> None:
        nonlocal current_midi, current_start_index, last_index
        if current_midi is None or current_start_index is None or last_index is None:
            return
        start = start_time + current_start_index * frame_duration
        end = start_time + (last_index + 1) * frame_duration
        duration = end - start
        if duration >= cfg.melody_min_note_duration:
            notes.append(NoteEvent(round(start, 6), current_midi, round(duration, 6)))
        current_midi = None
        current_start_index = None
        last_index = None

    for index, midi in enumerate(selected):
        if midi is None:
            close_current()
            continue
        if current_midi is None:
            current_midi = midi
            current_start_index = index
            last_index = index
            continue
        if midi == current_midi:
            last_index = index
            continue
        close_current()
        current_midi = midi
        current_start_index = index
        last_index = index

    close_current()
    return _merge_close_notes(notes, cfg)


def _merge_close_notes(notes: Sequence[NoteEvent], cfg: Settings) -> list[NoteEvent]:
    if not notes:
        return []

    merged: list[NoteEvent] = [notes[0]]
    for note in notes[1:]:
        previous = merged[-1]
        gap = note.start - previous.end
        if note.midi == previous.midi and 0 <= gap <= cfg.melody_merge_gap_seconds:
            merged[-1] = NoteEvent(
                start=previous.start,
                midi=previous.midi,
                duration=round(note.end - previous.start, 6),
            )
            continue
        merged.append(note)
    return merged
