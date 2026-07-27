import base64
import hashlib
import json

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

from fastapi.testclient import TestClient

from cache.memory_store import store
from main import app
from services.note_builder import NoteEvent, notes_to_float32_bytes
from services.url_utils import song_id_from_url


def test_convert_rejects_non_youtube_url() -> None:
    client = TestClient(app)

    response = client.post("/convert", json={"url": "https://example.com/video"})

    assert response.status_code == 400
    assert response.json()["detail"] == "invalid_url"


def test_convert_rejects_binary_upload_on_json_endpoint() -> None:
    client = TestClient(app)

    response = client.post(
        "/convert",
        content=b"ID3\x04\x00\x00\x00\x00\xffbinary mp3 bytes",
        headers={"content-type": "audio/mpeg"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "invalid_audio"


def test_youtube_search_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(app)

    def fake_search(query: str, limit: int) -> list[dict[str, object]]:
        assert query == "nguoi la thoang qua toneforge"
        assert limit == 3
        return [
            {
                "title": "toneforge result",
                "url": "https://www.youtube.com/watch?v=abc123",
                "video_id": "abc123",
                "duration": 120.0,
                "thumbnail": None,
                "channel": "Demo",
                "view_count": 123456,
            }
        ]

    monkeypatch.setattr("routers.convert.search_youtube", fake_search)

    response = client.get("/convert/youtube/search", params={"q": "nguoi la thoang qua", "limit": 3})

    assert response.status_code == 200
    assert response.json()[0]["title"] == "toneforge result"
    assert response.json()[0]["view_count"] == 123456


def test_youtube_search_adds_thumbnail_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    from services import downloader

    class FakeYoutubeDL:
        def __init__(self, _: dict[str, object]):
            pass

        def __enter__(self) -> "FakeYoutubeDL":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def extract_info(self, _: str, download: bool = False) -> dict[str, object]:
            return {
                "entries": [
                    {
                        "id": "2NpHeQkulgQ",
                        "title": "toneforge result",
                        "duration": 281,
                        "channel": "ACV toneforge",
                        "view_count": 1000,
                    }
                ]
            }

    class FakeYtDlp:
        YoutubeDL = FakeYoutubeDL

        class utils:
            class DownloadError(Exception):
                pass

    monkeypatch.setitem(__import__("sys").modules, "yt_dlp", FakeYtDlp)

    results = downloader.search_youtube("toneforge", 1)

    assert results[0]["thumbnail"] == "https://i.ytimg.com/vi/2NpHeQkulgQ/hqdefault.jpg"
    assert results[0]["view_count"] == 1000


def test_convert_cache_hit_and_result() -> None:
    store.clear()
    client = TestClient(app)
    url = "https://youtu.be/abc123"
    song_id = song_id_from_url(url)
    notes = notes_to_float32_bytes([NoteEvent(1.0, 69, 0.5)])
    metadata = {"song_id": song_id, "duration": 2.0, "total_notes": 1, "segments": []}
    store.set_song(song_id, metadata, notes)

    response = client.post("/convert", json={"url": url})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["events_url"].endswith(f"/convert/{body['job_id']}/events")

    result = client.get(f"/convert/{body['job_id']}/result")
    assert result.status_code == 200
    assert result.headers["content-type"].startswith("application/json")
    result_body = result.json()
    assert result_body["metadata"] == metadata
    assert base64.b64decode(result_body["notes_base64"]) == notes

    events = client.get(f"/convert/{body['job_id']}/events")
    assert events.status_code == 200
    assert events.headers["content-type"].startswith("text/event-stream")
    assert "event: done" in events.text

    data_line = next(line for line in events.text.splitlines() if line.startswith("data: "))
    event_body = json.loads(data_line.removeprefix("data: "))
    assert event_body["metadata"] == metadata
    assert base64.b64decode(event_body["notes_base64"]) == notes


def test_convert_upload_cache_hit() -> None:
    store.clear()
    client = TestClient(app)
    payload = b"fake mp3 bytes"
    song_id = hashlib.md5(payload).hexdigest()
    notes = notes_to_float32_bytes([NoteEvent(0.25, 60, 0.75)])
    metadata = {"song_id": song_id, "duration": 1.0, "total_notes": 1, "segments": []}
    store.set_song(song_id, metadata, notes)

    response = client.post(
        "/convert/upload",
        files={
            "file": (
                "toneforge HD Từng Yêu - Phan Duy Anh _ Beat Gốc Chuẩn ( Có Bè ) [pENMETTGamA].mp3",
                payload,
                "audio/mpeg",
            )
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["song_id"] == song_id
    assert body["events_url"].endswith(f"/convert/{body['job_id']}/events")


def test_cache_reference_hydrates_song_for_scoring() -> None:
    store.clear()
    client = TestClient(app)
    song_id = "persisted-song"
    notes = notes_to_float32_bytes([NoteEvent(0.5, 64, 1.25), NoteEvent(2.0, 67, 0.75)])
    metadata = {"duration": 4.0, "segments": [{"start": 0.5, "end": 2.75}]}

    response = client.post(
        f"/cache/{song_id}/reference",
        json={
            "metadata": metadata,
            "notes_base64": base64.b64encode(notes).decode("ascii"),
        },
    )

    assert response.status_code == 200
    assert response.json() == {"song_id": song_id, "cached": True, "total_notes": 2}

    cached = store.get_song(song_id)
    assert cached is not None
    assert cached.metadata["song_id"] == song_id
    assert cached.metadata["total_notes"] == 2
    assert cached.notes_bytes == notes

