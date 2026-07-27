from services.url_utils import is_youtube_url, song_id_from_url


def test_youtube_url_validation() -> None:
    assert is_youtube_url("https://www.youtube.com/watch?v=abc123")
    assert is_youtube_url("https://youtu.be/abc123")
    assert is_youtube_url("https://www.youtube.com/shorts/abc123")
    assert not is_youtube_url("https://example.com/watch?v=abc123")
    assert not is_youtube_url("ftp://www.youtube.com/watch?v=abc123")


def test_song_id_is_stable_md5() -> None:
    first = song_id_from_url("https://youtu.be/abc123")
    second = song_id_from_url("https://youtu.be/abc123")
    assert first == second
    assert len(first) == 32
