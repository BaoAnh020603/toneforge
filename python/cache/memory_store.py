from __future__ import annotations

import time
from dataclasses import dataclass
from threading import RLock
from typing import Any

from config import Settings, settings


@dataclass(frozen=True)
class CachedSong:
    metadata: dict[str, Any]
    notes_bytes: bytes


@dataclass
class _StoredValue:
    value: Any
    expires_at: float | None


class InMemoryStore:
    def __init__(self, cfg: Settings = settings):
        self.cfg = cfg
        self._songs: dict[str, _StoredValue] = {}
        self._jobs: dict[str, _StoredValue] = {}
        self._lock = RLock()

    def get_song(self, song_id: str) -> CachedSong | None:
        with self._lock:
            item = self._get_live(self._songs, song_id)
            if item is None:
                return None
            cached = item.value
            return CachedSong(metadata=dict(cached.metadata), notes_bytes=bytes(cached.notes_bytes))

    def set_song(self, song_id: str, metadata: dict[str, Any], notes_bytes: bytes) -> None:
        with self._lock:
            self._songs[song_id] = _StoredValue(
                CachedSong(metadata=dict(metadata), notes_bytes=bytes(notes_bytes)),
                self._expires_at(),
            )

    def delete_song(self, song_id: str) -> bool:
        with self._lock:
            deleted = self._songs.pop(song_id, None) is not None
            jobs_to_delete = [
                job_id
                for job_id, item in self._jobs.items()
                if self._is_live(item) and item.value.get("song_id") == song_id
            ]
            for job_id in jobs_to_delete:
                self._jobs.pop(job_id, None)
            return deleted

    def delete_job(self, job_id: str) -> bool:
        with self._lock:
            return self._jobs.pop(job_id, None) is not None

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            item = self._get_live(self._jobs, job_id)
            if item is None:
                return None
            return dict(item.value)

    def set_job(self, job_id: str, payload: dict[str, Any]) -> None:
        with self._lock:
            self._jobs[job_id] = _StoredValue(dict(payload), self._expires_at())

    def clear(self) -> None:
        with self._lock:
            self._songs.clear()
            self._jobs.clear()

    def _expires_at(self) -> float | None:
        if self.cfg.cache_ttl_seconds <= 0:
            return None
        return time.time() + self.cfg.cache_ttl_seconds

    def _get_live(self, store: dict[str, _StoredValue], key: str) -> _StoredValue | None:
        item = store.get(key)
        if item is None:
            return None
        if not self._is_live(item):
            store.pop(key, None)
            return None
        return item

    @staticmethod
    def _is_live(item: _StoredValue) -> bool:
        return item.expires_at is None or item.expires_at > time.time()


store = InMemoryStore()
