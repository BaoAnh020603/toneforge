from __future__ import annotations

import json
import os
import shutil
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from config import Settings, settings
from errors import download_failed, video_not_found, video_too_long


YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


@dataclass(frozen=True)
class DownloadedAudio:
    wav_path: Path
    duration: float
    title: str | None = None


def search_youtube(query: str, limit: int = 5) -> list[dict[str, Any]]:
    cleaned = query.strip()
    if not cleaned:
        return []

    direct_video_id = _extract_video_id(cleaned)
    api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    if api_key:
        try:
            if direct_video_id:
                return _search_youtube_video_by_id(direct_video_id, api_key)
            return _search_youtube_data_api(cleaned, limit, api_key)
        except download_failed:
            raise
        except Exception as exc:
            raise download_failed(f"YouTube Data API search failed: {exc}") from exc

    if direct_video_id:
        return _search_youtube_legacy_video(cleaned)

    return _search_youtube_legacy(cleaned, limit)


def _search_youtube_data_api(query: str, limit: int, api_key: str) -> list[dict[str, Any]]:
    search_params = {
        "part": "snippet",
        "type": "video",
        "q": query,
        "maxResults": str(limit),
        "key": api_key,
    }
    search_payload = _http_get_json(f"{YOUTUBE_SEARCH_URL}?{urllib.parse.urlencode(search_params)}")
    items = search_payload.get("items") or []

    video_ids = [
        item.get("id", {}).get("videoId")
        for item in items
        if item.get("id", {}).get("videoId")
    ]
    video_details = _fetch_video_details(video_ids, api_key) if video_ids else {}

    results: list[dict[str, Any]] = []
    for item in items:
        video_id = item.get("id", {}).get("videoId")
        if not video_id:
            continue

        snippet = item.get("snippet") or {}
        details = video_details.get(video_id, {})
        title = snippet.get("title") or "Untitled"
        thumbnail = _pick_thumbnail(snippet.get("thumbnails") or {}, video_id)
        duration = _parse_iso8601_duration(
            details.get("contentDetails", {}).get("duration", "")
        )
        view_count = _safe_int(details.get("statistics", {}).get("viewCount"))

        results.append(
            {
                "title": title,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "video_id": video_id,
                "duration": duration,
                "thumbnail": thumbnail,
                "channel": snippet.get("channelTitle"),
                "view_count": view_count,
            }
        )

    return results


def _search_youtube_video_by_id(video_id: str, api_key: str) -> list[dict[str, Any]]:
    details = _fetch_video_details([video_id], api_key).get(video_id)
    if not details:
        return []

    snippet = details.get("snippet") or {}
    title = snippet.get("title") or "Untitled"
    thumbnail = _pick_thumbnail(snippet.get("thumbnails") or {}, video_id)
    duration = _parse_iso8601_duration(details.get("contentDetails", {}).get("duration", ""))
    view_count = _safe_int(details.get("statistics", {}).get("viewCount"))
    return [
        {
            "title": title,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "video_id": video_id,
            "duration": duration,
            "thumbnail": thumbnail,
            "channel": snippet.get("channelTitle"),
            "view_count": view_count,
        }
    ]


def _fetch_video_details(video_ids: list[str], api_key: str) -> dict[str, dict[str, Any]]:
    if not video_ids:
        return {}

    params = {
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids),
        "key": api_key,
        "maxResults": str(min(len(video_ids), 50)),
    }
    payload = _http_get_json(f"{YOUTUBE_VIDEOS_URL}?{urllib.parse.urlencode(params)}")
    details: dict[str, dict[str, Any]] = {}
    for item in payload.get("items") or []:
        video_id = item.get("id")
        if video_id:
            details[str(video_id)] = item
    return details


def _search_youtube_legacy(query: str, limit: int) -> list[dict[str, Any]]:
    try:
        import yt_dlp
    except ImportError as exc:
        raise download_failed("yt-dlp is required for legacy YouTube search fallback") from exc

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "extract_flat": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
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


def _search_youtube_legacy_video(url_or_id: str) -> list[dict[str, Any]]:
    try:
        import yt_dlp
    except ImportError as exc:
        raise download_failed("yt-dlp is required for legacy YouTube metadata fallback") from exc

    url = url_or_id
    if "://" not in url_or_id and _looks_like_video_id(url_or_id):
        url = f"https://www.youtube.com/watch?v={url_or_id}"

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        raise download_failed(str(exc)) from exc

    video_id = info.get("id")
    if not video_id:
        video_id = _extract_video_id(url) or None

    return [
        {
            "title": info.get("title") or "Untitled",
            "url": info.get("webpage_url") or url,
            "video_id": video_id,
            "duration": float(info["duration"]) if info.get("duration") is not None else None,
            "thumbnail": info.get("thumbnail")
            or (f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" if video_id else None),
            "channel": info.get("channel") or info.get("uploader"),
            "view_count": int(info["view_count"]) if info.get("view_count") is not None else None,
        }
    ]


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
        message = str(exc)
        if _looks_bot_check(message):
            raise download_failed(
                "YouTube is blocking direct audio download for this video. "
                "Use Upload File for analysis, or try another public source."
            ) from exc
        if _looks_not_found(message):
            raise video_not_found() from exc
        raise download_failed(message) from exc

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
        message = str(exc)
        if _looks_bot_check(message):
            raise download_failed(
                "YouTube is blocking direct audio download for this video. "
                "Use Upload File for analysis, or try another public source."
            ) from exc
        if _looks_not_found(message):
            raise video_not_found() from exc
        raise download_failed(message) from exc
    except Exception as exc:
        message = str(exc)
        if _looks_bot_check(message):
            raise download_failed(
                "YouTube is blocking direct audio download for this video. "
                "Use Upload File for analysis, or try another public source."
            ) from exc
        raise download_failed(message) from exc

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


def _http_get_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "ToneForge/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")
        except Exception:
            body = exc.reason or str(exc)
        raise download_failed(f"YouTube API error: {body}") from exc
    except Exception as exc:
        raise download_failed(f"YouTube API request failed: {exc}") from exc

    try:
        return json.loads(data)
    except json.JSONDecodeError as exc:
        raise download_failed("Invalid JSON returned by YouTube API") from exc


def _pick_thumbnail(thumbnails: dict[str, Any], video_id: str) -> str:
    for key in ("maxres", "standard", "high", "medium", "default"):
        thumb = thumbnails.get(key) or {}
        url = thumb.get("url")
        if url:
            return str(url)
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def _parse_iso8601_duration(value: str) -> float | None:
    if not value:
        return None

    import re

    match = re.fullmatch(
        r"PT"
        r"(?:(?P<hours>\d+)H)?"
        r"(?:(?P<minutes>\d+)M)?"
        r"(?:(?P<seconds>\d+(?:\.\d+)?)S)?",
        value,
    )
    if not match:
        return None

    hours = float(match.group("hours") or 0)
    minutes = float(match.group("minutes") or 0)
    seconds = float(match.group("seconds") or 0)
    return hours * 3600 + minutes * 60 + seconds


def _safe_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_video_id(value: str) -> str | None:
    cleaned = value.strip()
    if not cleaned:
        return None

    if "://" not in cleaned and _looks_like_video_id(cleaned):
        return cleaned

    parsed = urllib.parse.urlparse(cleaned)
    if parsed.scheme not in {"http", "https"}:
        return None

    host = parsed.netloc.lower()
    if "youtu.be" in host:
        candidate = parsed.path.strip("/").split("/")[0]
        return candidate or None

    if parsed.path == "/watch":
        candidate = urllib.parse.parse_qs(parsed.query).get("v", [""])[0]
        return candidate or None

    parts = parsed.path.split("/")
    if len(parts) >= 3 and parts[1] in {"embed", "shorts", "live"}:
        return parts[2] or None
    return None


def _looks_like_video_id(value: str) -> bool:
    return len(value) == 11 and all(ch.isalnum() or ch in {"-", "_"} for ch in value)


def _looks_not_found(message: str) -> bool:
    lowered = message.lower()
    markers = ["private", "unavailable", "does not exist", "removed", "not found"]
    return any(marker in lowered for marker in markers)


def _looks_bot_check(message: str) -> bool:
    lowered = message.lower()
    markers = [
        "sign in to confirm you're not a bot",
        "sign in to confirm youre not a bot",
        "not a bot",
        "cookies-from-browser",
        "cookies for the authentication",
        "exporting youtube cookies",
    ]
    return any(marker in lowered for marker in markers)
