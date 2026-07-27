from __future__ import annotations


class ServiceError(Exception):
    def __init__(self, code: str, status_code: int, message: str | None = None):
        self.code = code
        self.status_code = status_code
        self.message = message or code
        super().__init__(self.message)


def invalid_url() -> ServiceError:
    return ServiceError("invalid_url", 400)


def video_not_found() -> ServiceError:
    return ServiceError("video_not_found", 404)


def video_too_long() -> ServiceError:
    return ServiceError("video_too_long", 422)


def download_failed(message: str | None = None) -> ServiceError:
    return ServiceError("download_failed", 502, message)


def transcription_failed(message: str | None = None) -> ServiceError:
    return ServiceError("transcription_failed", 500, message)


def processing_timeout() -> ServiceError:
    return ServiceError("processing_timeout", 504)


def reference_not_found() -> ServiceError:
    return ServiceError("reference_not_found", 404)


def invalid_audio(message: str | None = None) -> ServiceError:
    return ServiceError("invalid_audio", 400, message)


def chunk_too_short() -> ServiceError:
    return ServiceError("chunk_too_short", 422)


def job_not_found() -> ServiceError:
    return ServiceError("job_not_found", 404)


def result_not_ready() -> ServiceError:
    return ServiceError("result_not_ready", 409)
