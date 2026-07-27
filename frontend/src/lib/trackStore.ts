import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where,
    writeBatch,
    type DocumentData,
    type QueryDocumentSnapshot,
    type Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type { ConvertResult } from "./voiceApi"

const NOTE_CHUNK_SIZE = 600000
export const NOTE_FORMAT = "float32_triplets_base64_v1"

export interface SavedSong {
    id: string
    ownerId: string
    title: string
    artist: string
    sourceType: "youtube"
    sourceUrl: string
    youtubeVideoId: string | null
    thumbnail: string | null
    duration: number | null
    pythonSongId: string
    convertJobId: string
    metadata: Record<string, unknown>
    noteChunkCount: number
    noteFormat: string
    status: "ready"
    createdAt?: Timestamp
    updatedAt?: Timestamp
}

export interface SaveSongInput {
    userId: string
    title: string
    artist: string
    sourceUrl: string
    youtubeVideoId?: string | null
    thumbnail?: string | null
    duration?: number | null
    pythonSongId: string
    convertJobId: string
    result: ConvertResult
}

export interface SavedSongWithNotes {
    song: SavedSong
    notesBase64: string
}

export function songDocId(userId: string, pythonSongId: string) {
    return `${userId}_${pythonSongId}`
}

export async function saveConvertedSong(input: SaveSongInput) {
    const id = songDocId(input.userId, input.pythonSongId)
    const songRef = doc(db, "songs", id)
    const chunks = chunkString(input.result.notes_base64, NOTE_CHUNK_SIZE)

    const batch = writeBatch(db)
    batch.set(songRef, stripUndefined({
        ownerId: input.userId,
        title: input.title.trim() || String(input.result.metadata.source_name || "Chưa đặt tên"),
        artist: input.artist.trim() || "Chưa rõ ca sĩ",
        sourceType: "youtube",
        sourceUrl: input.sourceUrl,
        youtubeVideoId: input.youtubeVideoId || null,
        thumbnail: input.thumbnail || null,
        duration: input.duration ?? (typeof input.result.metadata.duration === "number" ? input.result.metadata.duration : null),
        pythonSongId: input.pythonSongId,
        convertJobId: input.convertJobId,
        metadata: input.result.metadata,
        noteChunkCount: chunks.length,
        noteFormat: NOTE_FORMAT,
        status: "ready",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    }))

    chunks.forEach((data, index) => {
        const chunkRef = doc(db, "songs", id, "noteChunks", String(index).padStart(4, "0"))
        batch.set(chunkRef, {
            ownerId: input.userId,
            songId: id,
            index,
            data,
        })
    })

    await batch.commit()
    return id
}

export async function listUserSongs(userId: string) {
    const songsQuery = query(collection(db, "songs"), where("ownerId", "==", userId))
    const snapshot = await getDocs(songsQuery)
    return snapshot.docs
        .map(songFromSnapshot)
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
}

export async function getSavedSongWithNotes(songId: string, userId: string): Promise<SavedSongWithNotes | null> {
    const songRef = doc(db, "songs", songId)
    const songSnapshot = await getDoc(songRef)
    if (!songSnapshot.exists()) return null

    const song = songFromSnapshot(songSnapshot)
    if (song.ownerId !== userId) return null

    const chunksQuery = query(collection(db, "songs", songId, "noteChunks"), where("ownerId", "==", userId))
    const chunksSnapshot = await getDocs(chunksQuery)
    const notesBase64 = chunksSnapshot.docs
        .map((item) => ({ index: Number(item.data().index || 0), data: String(item.data().data || "") }))
        .sort((a, b) => a.index - b.index)
        .map((item) => item.data)
        .join("")
    return { song, notesBase64 }
}

function songFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData }): SavedSong {
    const data = snapshot.data()
    return {
        id: snapshot.id,
        ownerId: String(data.ownerId || ""),
        title: String(data.title || "Chưa đặt tên"),
        artist: String(data.artist || "Chưa rõ ca sĩ"),
        sourceType: "youtube",
        sourceUrl: String(data.sourceUrl || ""),
        youtubeVideoId: data.youtubeVideoId || null,
        thumbnail: data.thumbnail || null,
        duration: typeof data.duration === "number" ? data.duration : null,
        pythonSongId: String(data.pythonSongId || ""),
        convertJobId: String(data.convertJobId || ""),
        metadata: (data.metadata || {}) as Record<string, unknown>,
        noteChunkCount: Number(data.noteChunkCount || 0),
        noteFormat: String(data.noteFormat || NOTE_FORMAT),
        status: "ready",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    }
}

async function deleteExistingNoteChunks(songId: string, userId: string) {
    const chunksSnapshot = await getDocs(query(collection(db, "songs", songId, "noteChunks"), where("ownerId", "==", userId)))
    if (chunksSnapshot.empty) return

    const batch = writeBatch(db)
    chunksSnapshot.docs.forEach((chunk) => batch.delete(chunk.ref))
    await batch.commit()
}

function chunkString(value: string, size: number) {
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += size) {
        chunks.push(value.slice(i, i + size))
    }
    return chunks.length > 0 ? chunks : [""]
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}

export async function deleteSong(songId: string, userId: string) {
    await deleteExistingNoteChunks(songId, userId)
    await deleteDoc(doc(db, "songs", songId))
}
