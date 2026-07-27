from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from errors import transcription_failed
from services.midi_parser import parse_midi_to_notes
from services.note_builder import NoteEvent


@dataclass(frozen=True)
class BasicPitchTranscription:
    midi_path: Path
    notes: list[NoteEvent]


def transcribe_audio_to_midi_notes(audio_path: str | Path, output_dir: str | Path) -> BasicPitchTranscription:
    audio_path = Path(audio_path)
    output_dir = Path(output_dir)
    midi_path = output_dir / f"{audio_path.stem}_basic_pitch.mid"

    try:
        from basic_pitch.inference import predict
    except ImportError as exc:
        raise transcription_failed("basic-pitch is required for audio-to-MIDI transcription") from exc

    try:
        _, midi_data, _ = predict(audio_path)
        midi_data.write(str(midi_path))
    except Exception as exc:
        raise transcription_failed(f"Basic Pitch failed: {exc}") from exc
    finally:
        try:
            import tensorflow as tf
            tf.keras.backend.clear_session()
        except ImportError:
            pass
        import gc
        gc.collect()

    notes = parse_midi_to_notes(midi_path)
    return BasicPitchTranscription(midi_path=midi_path, notes=notes)
