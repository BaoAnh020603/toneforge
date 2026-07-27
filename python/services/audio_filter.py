from __future__ import annotations

from pathlib import Path

import numpy as np

from config import Settings, settings
from errors import transcription_failed


def apply_voice_bandpass(input_wav: Path, work_dir: Path, cfg: Settings = settings) -> Path:
    if not cfg.voice_bandpass:
        return input_wav

    try:
        import soundfile as sf
        from scipy.signal import butter, sosfiltfilt
    except ImportError as exc:
        raise transcription_failed("soundfile and scipy are required for voice bandpass filtering") from exc

    try:
        data, sample_rate = sf.read(str(input_wav), always_2d=False, dtype="float32")
    except Exception as exc:
        raise transcription_failed(f"failed to read audio for bandpass filtering: {exc}") from exc

    low_hz = max(1.0, float(cfg.voice_bandpass_low_hz))
    nyquist = float(sample_rate) / 2.0
    high_hz = min(float(cfg.voice_bandpass_high_hz), nyquist - 1.0)
    if low_hz >= high_hz:
        raise transcription_failed("invalid voice bandpass range")

    try:
        sos = butter(
            max(1, int(cfg.voice_bandpass_order)),
            [low_hz, high_hz],
            btype="bandpass",
            fs=sample_rate,
            output="sos",
        )
        filtered = sosfiltfilt(sos, np.asarray(data, dtype=np.float32), axis=0)
    except Exception as exc:
        raise transcription_failed(f"voice bandpass filtering failed: {exc}") from exc

    output_path = work_dir / f"{input_wav.stem}_voice_bandpass.wav"
    sf.write(str(output_path), np.clip(filtered, -1.0, 1.0), sample_rate)
    return output_path
