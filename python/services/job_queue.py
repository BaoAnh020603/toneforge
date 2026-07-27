from __future__ import annotations

import logging
from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from threading import Lock
from typing import Any

from config import Settings, settings
from errors import ServiceError


logger = logging.getLogger(__name__)


class ConvertQueue:
    def __init__(self, cfg: Settings = settings):
        max_workers = max(1, int(cfg.convert_concurrency))
        self.max_size = max(0, int(cfg.max_convert_queue_size))
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="convert")
        self._lock = Lock()
        self._submitted = 0

    def submit(self, func: Callable[..., Any], *args: Any) -> None:
        with self._lock:
            if self._submitted >= self.max_size:
                raise ServiceError(
                    "convert_queue_full",
                    503,
                    "too many conversion jobs are queued; please try again later",
                )
            self._submitted += 1

    @property
    def queue_size(self) -> int:
        with self._lock:
            return max(0, self._submitted - 1)

        future = self._executor.submit(func, *args)
        future.add_done_callback(self._on_done)

    def _on_done(self, future: Future[Any]) -> None:
        with self._lock:
            self._submitted = max(0, self._submitted - 1)

        try:
            future.result()
        except Exception:
            logger.exception("Unhandled conversion worker failure")


convert_queue = ConvertQueue()
