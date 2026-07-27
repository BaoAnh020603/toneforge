from __future__ import annotations

from io import BytesIO
from pathlib import Path

import numpy as np

from config import Settings, settings
from errors import invalid_audio


def _to_mono(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        return data.astype(np.float32, copy=False)
    return data.mean(axis=1).astype(np.float32, copy=False)


def _resample(data: np.ndarray, source_rate: int, target_rate: int) -> np.ndarray:
    if source_rate == target_rate:
        return data.astype(np.float32, copy=False)
    try:
        import librosa
    except ImportError as exc:
        raise invalid_audio("librosa is required to resample audio") from exc
    return librosa.resample(data.astype(np.float32), orig_sr=source_rate, target_sr=target_rate)


def load_audio_file(path: str | Path, cfg: Settings = settings) -> tuple[np.ndarray, int, float]:
    try:
        import soundfile as sf

        data, sample_rate = sf.read(str(path), always_2d=False, dtype="float32")
    except Exception as exc:
        raise invalid_audio(str(exc)) from exc

    mono = _to_mono(np.asarray(data))
    resampled = _resample(mono, sample_rate, cfg.sample_rate)
    duration = float(len(resampled) / cfg.sample_rate)
    return resampled, cfg.sample_rate, duration


def load_audio_bytes(payload: bytes, cfg: Settings = settings) -> tuple[np.ndarray, int, float]:
    try:
        import soundfile as sf

        data, sample_rate = sf.read(BytesIO(payload), always_2d=False, dtype="float32")
    except Exception as exc:
        raise invalid_audio(str(exc)) from exc

    mono = _to_mono(np.asarray(data))
    resampled = _resample(mono, sample_rate, cfg.sample_rate)
    duration = float(len(resampled) / cfg.sample_rate)
    return resampled, cfg.sample_rate, duration
