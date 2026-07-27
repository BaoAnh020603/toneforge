from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from config import Settings, settings


@dataclass(frozen=True)
class PitchFrame:
    t: float
    hz: float | None
    confidence: float


def extract_pitch(
    audio: np.ndarray,
    sample_rate: int,
    cfg: Settings = settings,
    *,
    method: str | None = None,
) -> list[PitchFrame]:
    selected = (method or cfg.pitch_method).lower()
    if selected == "pyin":
        return _extract_with_pyin(audio, sample_rate, cfg)
    if selected == "yin":
        return _extract_with_yin(audio, sample_rate, cfg)
    raise ValueError(f"Unsupported pitch method: {selected}")


def _extract_with_pyin(audio: np.ndarray, sample_rate: int, cfg: Settings) -> list[PitchFrame]:
    try:
        import librosa
    except ImportError as exc:
        raise RuntimeError("librosa is required for PITCH_METHOD=pyin") from exc

    f0, voiced_flag, voiced_prob = librosa.pyin(
        audio.astype(np.float32),
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sample_rate,
        frame_length=cfg.frame_length,
        hop_length=cfg.hop_length,
    )
    times = librosa.frames_to_time(
        np.arange(len(f0)),
        sr=sample_rate,
        hop_length=cfg.hop_length,
    )

    frames: list[PitchFrame] = []
    for t, hz, voiced, probability in zip(times, f0, voiced_flag, voiced_prob, strict=False):
        is_voiced = bool(voiced) and np.isfinite(hz)
        frames.append(
            PitchFrame(
                t=float(t),
                hz=float(hz) if is_voiced else None,
                confidence=float(probability) if np.isfinite(probability) else 0.0,
            )
        )
    return frames


def _extract_with_yin(audio: np.ndarray, sample_rate: int, cfg: Settings) -> list[PitchFrame]:
    try:
        import librosa
    except ImportError as exc:
        raise RuntimeError("librosa is required for PITCH_METHOD=yin") from exc

    f0 = librosa.yin(
        audio.astype(np.float32),
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sample_rate,
        frame_length=cfg.frame_length,
        hop_length=cfg.hop_length,
    )
    times = librosa.frames_to_time(
        np.arange(len(f0)),
        sr=sample_rate,
        hop_length=cfg.hop_length,
    )
    return [
        PitchFrame(
            t=float(t),
            hz=float(hz) if np.isfinite(hz) else None,
            confidence=1.0 if np.isfinite(hz) else 0.0,
        )
        for t, hz in zip(times, f0, strict=False)
    ]
