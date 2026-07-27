from __future__ import annotations

import base64
import binascii

from fastapi import APIRouter

from cache.memory_store import store
from errors import invalid_audio
from schemas import CacheDeleteResponse, CacheReferenceRequest, CacheReferenceResponse
from services.note_builder import notes_from_float32_bytes


router = APIRouter(prefix="/cache", tags=["cache"])


@router.post("/{song_id}/reference", response_model=CacheReferenceResponse)
async def hydrate_song_reference(song_id: str, payload: CacheReferenceRequest) -> CacheReferenceResponse:
    try:
        notes_bytes = base64.b64decode(payload.notes_base64, validate=True)
        notes = notes_from_float32_bytes(notes_bytes)
    except (binascii.Error, ValueError) as exc:
        raise invalid_audio("notes_base64 must contain float32 note triplets") from exc

    metadata = dict(payload.metadata)
    metadata["song_id"] = song_id
    metadata["total_notes"] = len(notes)
    store.set_song(song_id, metadata, notes_bytes)
    return CacheReferenceResponse(song_id=song_id, cached=True, total_notes=len(notes))


@router.delete("/{song_id}", response_model=CacheDeleteResponse)
async def delete_song_cache(song_id: str) -> CacheDeleteResponse:
    deleted = store.delete_song(song_id)
    return CacheDeleteResponse(song_id=song_id, deleted=deleted)
