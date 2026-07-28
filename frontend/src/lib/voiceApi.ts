export type ConvertStatus = "pending" | "processing" | "done" | "error"

export interface YouTubeSearchResult {
    title: string
    url: string
    video_id?: string | null
    duration?: number | null
    thumbnail?: string | null
    channel?: string | null
    view_count?: number | null
}

export interface ConvertJob {
    job_id: string
    song_id: string
    status: ConvertStatus
    status_url: string
    events_url: string
    result_url: string | null
}

export interface ConvertJobStatus {
    job_id: string
    status: ConvertStatus
    progress: number
    step: string
    result_url: string | null
    error?: string | null
    error_detail?: string | null
}

export interface ConvertResult {
    metadata: Record<string, unknown>
    notes_base64: string
}

export interface VoiceNote {
    start: number
    midi: number
    duration: number
    end: number
}

export interface ScoreBreakdown {
    pitch: number
    timing: number
    stability: number
}

export interface ScoreFrame {
    t: number
    user_hz: number | null
    ref_hz: number | null
    cents_off: number | null
}

export interface ScoreResponse {
    seg_index: number
    score: number
    breakdown: ScoreBreakdown
    frame_data: ScoreFrame[]
}

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
export const PYTHON_API_BASE = (viteEnv?.VITE_PYTHON_API_BASE || "http://localhost:8000").replace(/\/$/, "")

function absoluteApiUrl(url: string) {
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `${PYTHON_API_BASE}${url.startsWith("/") ? url : `/${url}`}`
}

export function apiUrl(url: string) {
    return absoluteApiUrl(url)
}

export async function fetchApiJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(absoluteApiUrl(url), init)
    if (!response.ok) {
        let message = response.statusText
        try {
            const body = await response.json()
            message = body.message || body.detail || JSON.stringify(body)
        } catch {
            message = await response.text()
        }
        throw new Error(message || `Request failed with status ${response.status}`)
    }
    return response.json() as Promise<T>
}

export function searchYouTubeVideos(query: string, limit = 6) {
    return fetchApiJson<YouTubeSearchResult[]>(`/convert/youtube/search?q=${encodeURIComponent(query)}&limit=${limit}`)
}

export function createConvertJob(url: string) {
    return fetchApiJson<ConvertJob>("/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    })
}

export function createUploadConvertJob(file: File) {
    const form = new FormData()
    form.append("file", file)

    return fetchApiJson<ConvertJob>("/convert/upload", {
        method: "POST",
        body: form,
    })
}

export function getConvertResult(url: string) {
    return fetchApiJson<ConvertResult>(url)
}

export function getConvertStatus(url: string) {
    return fetchApiJson<ConvertJobStatus>(url)
}

export function hydrateReference(songId: string, result: ConvertResult) {
    return fetchApiJson<{ song_id: string; cached: boolean; total_notes: number }>(`/cache/${songId}/reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            metadata: result.metadata,
            notes_base64: result.notes_base64,
        }),
    })
}

export async function scoreAudioChunk(params: {
    audioBlob: Blob
    songId: string
    segmentIndex: number
    startTime: number
    minMidi: number
    maxMidi: number
    minNoteDuration: number
}) {
    const form = new FormData()
    form.append("audio_chunk", params.audioBlob, "chunk.wav")
    form.append("song_id", params.songId)
    form.append("seg_index", String(params.segmentIndex))
    form.append("start_time", String(params.startTime))
    form.append("min_midi", String(params.minMidi))
    form.append("max_midi", String(params.maxMidi))
    form.append("min_note_duration", String(params.minNoteDuration))

    return fetchApiJson<ScoreResponse>("/score", {
        method: "POST",
        body: form,
    })
}

export function decodeNotes(notesBase64: string): VoiceNote[] {
    const bytes = Uint8Array.from(atob(notesBase64), (char) => char.charCodeAt(0))
    const raw = new Float32Array(bytes.buffer)
    const notes: VoiceNote[] = []

    for (let i = 0; i + 2 < raw.length; i += 3) {
        const start = raw[i]
        const midi = raw[i + 1]
        const duration = raw[i + 2]
        notes.push({ start, midi, duration, end: start + duration })
    }

    return notes
}

export function extractYouTubeVideoId(input: string) {
    try {
        const url = new URL(input)
        if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || null
        if (url.pathname === "/watch") return url.searchParams.get("v")
        const parts = url.pathname.split("/").filter(Boolean)
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null
    } catch {
        return input.trim() || null
    }
    return null
}

export function formatDuration(seconds?: number | null) {
    if (seconds == null || Number.isNaN(Number(seconds))) return "--:--"
    const total = Math.max(0, Math.round(Number(seconds)))
    const minutes = Math.floor(total / 60)
    return `${minutes}:${String(total % 60).padStart(2, "0")}`
}

export function formatViewCount(value?: number | null) {
    if (value == null || Number.isNaN(Number(value))) return "--"
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))
}
