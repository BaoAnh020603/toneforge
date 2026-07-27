from __future__ import annotations

from typing import Any
from typing import Literal

from pydantic import BaseModel, Field


class ConvertRequest(BaseModel):
    url: str = Field(min_length=1)


class ConvertResponse(BaseModel):
    job_id: str
    song_id: str
    status: Literal["pending", "processing", "done", "error"]
    status_url: str
    events_url: str
    result_url: str | None


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "done", "error"]
    progress: int = Field(ge=0, le=100)
    step: str
    result_url: str | None = None
    error: str | None = None
    error_detail: str | None = None


class ConvertResultResponse(BaseModel):
    metadata: dict[str, Any]
    notes_base64: str


class CacheReferenceRequest(BaseModel):
    metadata: dict[str, Any]
    notes_base64: str = Field(min_length=1)


class CacheReferenceResponse(BaseModel):
    song_id: str
    cached: bool
    total_notes: int


class YouTubeSearchResult(BaseModel):
    title: str
    url: str
    video_id: str | None = None
    duration: float | None = None
    thumbnail: str | None = None
    channel: str | None = None
    view_count: int | None = None


class SegmentResponse(BaseModel):
    start: float
    end: float


class ScoreBreakdown(BaseModel):
    pitch: float
    timing: float
    stability: float


class FrameData(BaseModel):
    t: float
    user_hz: float | None
    ref_hz: float | None
    cents_off: float | None


class ScoreResponse(BaseModel):
    seg_index: int
    score: float
    breakdown: ScoreBreakdown
    frame_data: list[FrameData]


class CacheDeleteResponse(BaseModel):
    song_id: str
    deleted: bool
