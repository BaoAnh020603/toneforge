from __future__ import annotations

from pathlib import Path

from config import Settings, settings
from errors import invalid_audio


def get_audio_duration(path: str | Path, cfg: Settings = settings) -> float:
    try:
        import librosa

        return float(librosa.get_duration(path=str(path)))
    except Exception as exc:
        raise invalid_audio(str(exc)) from exc
