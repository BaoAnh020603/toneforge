from __future__ import annotations

import hashlib
from urllib.parse import parse_qs, urlparse


YOUTUBE_HOSTS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
}


def normalize_url(url: str) -> str:
    return url.strip()


def song_id_from_url(url: str) -> str:
    normalized = normalize_url(url)
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


def is_youtube_url(url: str) -> bool:
    parsed = urlparse(normalize_url(url))
    if parsed.scheme not in {"http", "https"}:
        return False
    host = parsed.netloc.lower()
    if host not in YOUTUBE_HOSTS:
        return False

    if host in {"youtu.be", "www.youtu.be"}:
        return parsed.path.strip("/") != ""

    if "youtube-nocookie.com" in host:
        return parsed.path.startswith("/embed/") and len(parsed.path.strip("/").split("/")) >= 2

    if parsed.path == "/watch":
        return bool(parse_qs(parsed.query).get("v", [""])[0])

    return parsed.path.startswith(("/shorts/", "/embed/", "/live/")) and parsed.path.strip("/") != ""
