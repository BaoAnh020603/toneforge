from pathlib import Path
from types import SimpleNamespace

from cache.memory_store import store
from config import Settings
from services.convert_processor import _transcribe_and_store_song
from services.note_builder import NoteEvent, notes_from_float32_bytes


def test_transcribe_pipeline_uses_original_bandpass_and_caches_melody(
    monkeypatch,
    tmp_path: Path,
) -> None:
    store.clear()
    cfg = Settings(
        voice_bandpass=True,
        sample_rate=100,
        hop_length=5,
        melody_min_midi=48,
        melody_max_midi=84,
        melody_min_note_duration=0.05,
    )
    source = tmp_path / "song.wav"
    bandpassed = tmp_path / "song_voice_bandpass.wav"
    source.touch()
    bandpassed.touch()
    calls: list[tuple[str, Path]] = []

    def fake_bandpass(audio_path: Path, work_dir: Path, settings: Settings) -> Path:
        calls.append(("bandpass", audio_path))
        assert settings is cfg
        return bandpassed

    def fake_transcribe(audio_path: Path, work_dir: Path) -> SimpleNamespace:
        calls.append(("transcribe", audio_path))
        return SimpleNamespace(
            notes=[
                NoteEvent(0.0, 40, 0.5),
                NoteEvent(0.0, 60, 0.5),
                NoteEvent(0.1, 84, 0.3),
            ]
        )

    monkeypatch.setattr("services.convert_processor.settings", cfg)
    monkeypatch.setattr("services.convert_processor.apply_voice_bandpass", fake_bandpass)
    monkeypatch.setattr("services.convert_processor.transcribe_audio_to_midi_notes", fake_transcribe)

    _transcribe_and_store_song(
        song_id="song-1",
        audio_path=source,
        work_dir=tmp_path,
        duration=1.0,
        source_name="Demo",
    )

    cached = store.get_song("song-1")
    assert cached is not None
    assert calls == [
        ("bandpass", source),
        ("transcribe", bandpassed),
    ]
    assert notes_from_float32_bytes(cached.notes_bytes) == [NoteEvent(0.0, 60, 0.5)]
    assert cached.metadata["raw_total_notes"] == 3
    assert cached.metadata["total_notes"] == 1
    assert cached.metadata["segments"] == [{"start": 0.0, "end": 0.5}]
    assert cached.metadata["transcription_audio"] == "original"
    assert cached.metadata["melody_filter"]["mode"] == "voice_bandpass_basic_pitch_one_note_per_frame"
