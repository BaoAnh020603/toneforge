from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from config import Settings, settings
from errors import download_failed, video_not_found, video_too_long


@dataclass(frozen=True)
class DownloadedAudio:
    wav_path: Path
    duration: float
    title: str | None = None


def search_youtube(query: str, limit: int = 5) -> list[dict[str, Any]]:
    try:
        import yt_dlp
    except ImportError as exc:
        raise download_failed("yt-dlp is required") from exc

    cleaned = query.strip()
    if not cleaned:
        return []

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "extract_flat": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(f"ytsearch{limit}:{cleaned}", download=False)
    except yt_dlp.utils.DownloadError as exc:
        raise download_failed(str(exc)) from exc

    entries = info.get("entries") or []
    results: list[dict[str, Any]] = []
    for entry in entries[:limit]:
        video_id = entry.get("id")
        url = entry.get("url") or entry.get("webpage_url")
        if video_id and (not url or not str(url).startswith("http")):
            url = f"https://www.youtube.com/watch?v={video_id}"
        if not url:
            continue
        thumbnail = entry.get("thumbnail")
        if thumbnail is None and video_id:
            thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        results.append(
            {
                "title": entry.get("title") or "Untitled",
                "url": url,
                "video_id": video_id,
                "duration": float(entry["duration"]) if entry.get("duration") is not None else None,
                "thumbnail": thumbnail,
                "channel": entry.get("channel") or entry.get("uploader"),
                "view_count": int(entry["view_count"]) if entry.get("view_count") is not None else None,
            }
        )
    return results


def download_youtube_audio(url: str, work_dir: Path, cfg: Settings = settings) -> DownloadedAudio:
    if shutil.which("ffmpeg") is None:
        raise download_failed("ffmpeg is required and was not found on PATH")

    try:
        import yt_dlp
    except ImportError as exc:
        raise download_failed("yt-dlp is required") from exc

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        if _looks_not_found(str(exc)):
            raise video_not_found() from exc
        raise download_failed(str(exc)) from exc

    duration = float(info.get("duration") or 0.0)
    if duration > cfg.max_video_duration:
        raise video_too_long()

    source_template = work_dir / "source.%(ext)s"
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": str(source_template),
        "quiet": True,
        "noplaylist": True,
        "retries": 2,
    }
    try:
        before = {path.resolve() for path in work_dir.glob("source.*")}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(url, download=True)
        candidates = [
            path
            for path in work_dir.glob("source.*")
            if path.resolve() not in before and not path.name.endswith((".part", ".ytdl"))
        ]
        if not candidates:
            candidates = [
                path
                for path in work_dir.glob("source.*")
                if not path.name.endswith((".part", ".ytdl"))
            ]
        if not candidates:
            raise FileNotFoundError("yt-dlp did not create an audio file")
        source_path = max(candidates, key=lambda path: path.stat().st_mtime)
    except yt_dlp.utils.DownloadError as exc:
        if _looks_not_found(str(exc)):
            raise video_not_found() from exc
        raise download_failed(str(exc)) from exc
    except Exception as exc:
        raise download_failed(str(exc)) from exc

    wav_path = work_dir / "audio_16k_mono.wav"
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(source_path),
                "-vn",
                "-ac",
                "1",
                "-ar",
                str(cfg.sample_rate),
                "-sample_fmt",
                "s16",
                str(wav_path),
            ],
            check=True,
            capture_output=True,
            text=True,
            timeout=cfg.processing_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise download_failed("ffmpeg conversion timed out") from exc
    except subprocess.CalledProcessError as exc:
        raise download_failed(exc.stderr or exc.stdout or "ffmpeg conversion failed") from exc

    return DownloadedAudio(
        wav_path=wav_path,
        duration=duration,
        title=info.get("title"),
    )


def _looks_not_found(message: str) -> bool:
    lowered = message.lower()
    markers = ["private", "unavailable", "does not exist", "removed", "not found"]
    return any(marker in lowered for marker in markers)
