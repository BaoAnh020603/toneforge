# Python ToneForge Voice Server — Requirements

## Tổng quan

Server Python đóng vai trò **audio processing core** trong hệ thống ToneForge, hoàn toàn độc lập với DB và business logic. Chỉ nhận audio/URL, trả về data thuần.

```
Frontend ──► Python Server (FastAPI)
                ├── POST /convert  → Float32Array + segments
                └── POST /score    → điểm số realtime

Frontend ──► NestJS Server
                └── lưu kết quả vào DB
```

---

## 1. Endpoint `POST /convert`

### Mục đích
Nhận YouTube URL, xử lý audio gốc của bài hát, trích xuất pitch theo từng note, trả về dữ liệu chuẩn để frontend hiển thị ToneForge và đồng bộ scoring.

### Request
```json
{
  "url": "https://www.youtube.com/watch?v=xxxx"
}
```

### Xử lý (theo thứ tự)

**Bước 1 — Download audio**
- Dùng `yt-dlp` tải audio từ YouTube, hoặc nhận file upload `.mp3/.wav/.flac/.m4a/.ogg`
- Convert audio YouTube sang WAV để đưa vào Basic Pitch
- Giới hạn thời lượng tối đa 10 phút (bảo vệ server)

**Bước 2 — Audio-to-MIDI transcription**
- Dùng Spotify Basic Pitch để chuyển audio thành MIDI
- Basic Pitch hỗ trợ multipitch, phù hợp hơn cho piano/chord/instrument so với F0 đơn âm

**Bước 3 — Parse MIDI và build NoteFrame array**
- Ghi kết quả Basic Pitch thành file `.mid`
- Parse `.mid` lấy các note event
- Mỗi note event → `[t, n, d]` (float32):
  - `t`: thời điểm bắt đầu (giây)
  - `n`: MIDI note number (0–127)
  - `d`: duration (giây)
- Serialize toàn bộ thành `Float32Array` binary (3 float32 × số note)

**Bước 4 — Build segments**
- Gom các note liên tiếp cách nhau < 2 giây thành 1 segment
- Mỗi segment: `{ start: float, end: float }`
- Dùng để frontend biết khi nào bật/tắt mic

**Bước 7 — Cache**
- Key: `md5(youtube_url)`
- Backend: in-memory store trong FastAPI process, TTL 24 giờ
- Nếu cache hit: bỏ qua toàn bộ bước 1–6, trả về ngay

### Response
`GET /convert/{job_id}/events` phát các SSE event trong lúc xử lý. Khi hoàn tất,
event `done` trả JSON với 2 field:

```text
event: done
data: {
  "metadata": {
    "song_id": "md5_hash",
    "duration": 214.5,
    "total_notes": 487,
    "segments": [
      { "start": 18.3, "end": 43.1 },
      { "start": 49.0, "end": 72.8 }
    ]
  },
  "notes_base64": "<base64 Float32Array: [t0,n0,d0, t1,n1,d1, ...]>"
}
```

`GET /convert/{job_id}/result` trả cùng JSON cho client dùng polling:

```json
{
  "metadata": {
    "song_id": "md5_hash",
    "duration": 214.5,
    "total_notes": 487,
    "segments": [
      { "start": 18.3, "end": 43.1 },
      { "start": 49.0, "end": 72.8 }
    ]
  },
  "notes_base64": "<base64 Float32Array: [t0,n0,d0, t1,n1,d1, ...]>"
}
```

> Frontend decode: `Uint8Array.from(atob(notes_base64), c => c.charCodeAt(0))`,
> rồi đọc buffer bằng `new Float32Array(bytes.buffer)`.

### Lỗi cần xử lý
| Trường hợp | HTTP | Message |
|---|---|---|
| URL không hợp lệ / không phải YouTube | 400 | `invalid_url` |
| Video không tồn tại hoặc private | 404 | `video_not_found` |
| Video quá dài (> 10 phút) | 422 | `video_too_long` |
| yt-dlp thất bại (geo-block, v.v.) | 502 | `download_failed` |
| Xử lý quá 120 giây (timeout) | 504 | `processing_timeout` |

### Thời gian xử lý ước tính
| Bước | Thời gian |
|---|---|
| Download (bài 4 phút) | 5–15 giây |
| Basic Pitch transcription | tuỳ độ dài bài và runtime model |
| Parse MIDI + serialize notes | < 1 giây |
| Tổng (lần đầu) | phụ thuộc Basic Pitch và máy chạy |
| Tổng (cache hit) | < 100ms |

→ **Bắt buộc xử lý bất đồng bộ**: trả về `job_id` ngay, xử lý bằng FastAPI background task, frontend poll `GET /convert/{job_id}/status`.

---

## 2. Endpoint `POST /score`

### Mục đích
Nhận audio chunk người dùng hát, so sánh với reference notes tương ứng, trả về điểm số realtime cho từng câu hát.

### Request
```
Content-Type: multipart/form-data

audio_chunk: <binary WAV, ~2–5 giây>
song_id:     "md5_hash"          (để load reference từ cache)
seg_index:   2                   (đang hát segment thứ mấy)
start_time:  49.0                (thời điểm bắt đầu segment trong bài)
```

### Xử lý

**Bước 1 — Extract pitch từ giọng user**
- Mic input vẫn dùng pipeline realtime nhẹ: WAV 16kHz → pYIN/YIN → F0 array
- Không chạy Basic Pitch cho từng audio chunk vì quá nặng cho realtime scoring

**Bước 2 — Align theo thời gian**
- Dùng `start_time` để xác định subset notes trong reference tương ứng với chunk này
- Lấy reference notes trong khoảng `[start_time, start_time + chunk_duration]`

**Bước 3 — Tính điểm**

**Pitch accuracy (40%)**
- So sánh F0 user với F0 reference từng frame
- Tính % frame trong ngưỡng ±50 cent (nửa semitone)
- Công thức: `score = count(|f_user - f_ref| < 50cent) / total_frames * 100`

**Timing accuracy (30%)**
- So sánh onset time của từng note user vs reference
- Chấp nhận lệch ±150ms là "đúng"
- Công thức: `score = count(|onset_user - onset_ref| < 0.15s) / total_notes * 100`

**Stability (30%)**
- Đo độ rung/ổn định của pitch trong mỗi note (std deviation của F0)
- Stability tốt: std < 20 cent
- Vibrato có chủ ý (rung đều, tần số 4–7Hz) không bị trừ điểm

**Tổng điểm**: `0–100`, làm tròn 1 chữ số thập phân

### Response
```json
{
  "seg_index": 2,
  "score": 82.5,
  "breakdown": {
    "pitch":    85.0,
    "timing":   78.0,
    "stability": 84.0
  },
  "frame_data": [
    { "t": 49.0, "user_hz": 440.2, "ref_hz": 440.0, "cents_off": 0.8 },
    { "t": 49.032, "user_hz": 438.1, "ref_hz": 440.0, "cents_off": -7.5 }
  ]
}
```

> `frame_data` dùng để frontend vẽ pitch curve realtime (đường user vs đường reference).

### Lỗi cần xử lý
| Trường hợp | HTTP | Message |
|---|---|---|
| `song_id` không có trong cache | 404 | `reference_not_found` |
| Audio chunk không đọc được | 400 | `invalid_audio` |
| Chunk quá ngắn (< 0.5 giây) | 422 | `chunk_too_short` |

---

## 3. Endpoint phụ

### `GET /convert/{job_id}/status`
Dùng khi /convert xử lý bất đồng bộ.

```json
{
  "job_id": "abc123",
  "status": "processing",   // pending | processing | done | error
  "progress": 45,           // % (0–100)
  "step": "basic_pitch_transcription",
  "result_url": null        // điền khi status = done
}
```

### `GET /convert/{job_id}/events`
Stream SSE cho frontend. Event `status` trả tiến độ, event `done` trả kết quả:

```json
{
  "metadata": {},
  "notes_base64": "..."
}
```

### `DELETE /cache/{song_id}`
Xoá cache thủ công (dùng cho admin hoặc khi cần re-process).

---

## 4. Tech stack

| Thành phần | Thư viện | Ghi chú |
|---|---|---|
| Framework | `FastAPI` | async native, tốt cho I/O heavy |
| Audio download | `yt-dlp` | cập nhật thường xuyên, stable nhất |
| Audio-to-MIDI | `basic-pitch` (Spotify) | tạo MIDI từ audio |
| MIDI parsing | `pretty_midi` | đọc `.mid` ra note event |
| Audio processing | `numpy`, `soundfile` | convert sample rate, buffer handling |
| Cache | in-memory store | TTL 24h, mất dữ liệu khi restart |
| Job queue | In-process bounded queue | giới hạn số job /convert chạy đồng thời và từ chối khi queue đầy |
| Python version | 3.11+ | |

---

## 5. Cấu trúc thư mục

```
python-server/
├── main.py                  # FastAPI app, khai báo routes
├── config.py                # env vars (MAX_DURATION, scoring weights, v.v.)
│
├── routers/
│   ├── convert.py           # POST /convert, GET /convert/{id}/status
│   └── score.py             # POST /score
│
├── services/
│   ├── downloader.py        # yt-dlp wrapper
│   ├── basic_pitch_transcriber.py # Basic Pitch wrapper
│   ├── midi_parser.py       # parse .mid → note events
│   ├── pitch_extractor.py   # pYIN/YIN for realtime scoring
│   ├── note_builder.py      # NoteEvent and Float32Array serialization
│   ├── segment_builder.py   # gom notes → singing segments
│   └── scorer.py            # pitch/timing/stability scoring
│
├── cache/
│   └── memory_store.py      # cache/job status trong RAM
│
└── requirements.txt
```

---

## 6. Biến môi trường

```env
CACHE_TTL_SECONDS=86400
MAX_VIDEO_DURATION=600
PITCH_METHOD=pyin              # pyin | yin, for realtime scoring
SCORE_PITCH_WEIGHT=0.4
SCORE_TIMING_WEIGHT=0.3
SCORE_STABILITY_WEIGHT=0.3
```

---

## 7. Những điểm kỹ thuật quan trọng

**Bật mic sớm 300ms (frontend responsibility)**
Backend trả `seg.start` chính xác. Frontend tự bật mic trước `PREP = 0.3s` để bù latency khởi động Web Audio API. Scoring chỉ tính từ `seg.start` thực.

**Realtime scoring UI**
- Embed YouTube bằng YouTube IFrame API.
- Dùng `player.getCurrentTime()` làm đồng hồ chuẩn để xác định note/segment hiện tại.
- Khi `currentTime >= seg.start - PREP`, mic chuyển sang pre-roll.
- Khi `currentTime >= seg.start`, frontend gom mic PCM thành WAV chunk 0.5–1.0s rồi gọi `POST /score`.
- UI nên hiển thị: current note, current segment, score tổng, pitch/timing/stability, và meter cent lệch nốt. `cents_off > 0` nghĩa là hát cao, `< 0` nghĩa là hát thấp.
- Không cần lyrics riêng trong app nếu video ToneForge đã có chữ sẵn.
- Frontend cần có `latency offset` để bù lệch mic/video trước khi gửi `start_time` lên `/score`.
- Vì Basic Pitch trả nhiều nốt từ nhạc nền, UI/backend cần filter melody theo quãng giọng, ví dụ C3-C6, và bỏ nốt quá ngắn trước khi chấm điểm.

**Float32Array encoding**
Notes array serialize dưới dạng raw binary `float32 little-endian`, 12 bytes/note (3 × 4 bytes). Không dùng JSON để tránh parse overhead trên bài dài.
```python
import numpy as np
data = np.array(notes, dtype=np.float32)  # shape: (N, 3)
return data.tobytes()
```

**Basic Pitch là bottleneck**
Audio-to-MIDI transcription là bước tốn thời gian nhất. Cache kết quả theo URL hoặc hash file upload để tránh chạy lại.

**Cache nên được bật**
Mỗi lần convert tốn 1–2 phút. Cùng 1 bài nhiều user hát → nên cache kết quả. Key = `md5(youtube_url)`, không cache theo user. Bản hiện tại dùng in-memory cache nên cache sẽ mất khi restart server và không chia sẻ giữa nhiều process.

**Cents vs Hz cho pitch comparison**
So sánh pitch nên dùng **cent** (logarithmic), không dùng Hz (linear). 10Hz chênh lệch ở note thấp (110Hz) nghe rất lệch, nhưng ở note cao (880Hz) gần như không nghe thấy. Công thức: `cents = 1200 * log2(f_user / f_ref)`.

