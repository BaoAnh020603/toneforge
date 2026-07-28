import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileMusic,
  ArrowRight,
  Save,
  Music,
  Play,
  Youtube,
  Link as LinkIcon,
  Crown,
  Search,
  Loader2,
  Music2,
  Activity,
  Eye,
  Clock,
  ShoppingCart,
  Trash,
  CheckCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { UpgradeModal } from "../../components/UpgradeModal";
import { useAlert } from "../../contexts/AlertContext";
import { createUploadConvertJob } from "../../lib/voiceApi";

const API_BASE = (import.meta as any).env.VITE_PYTHON_API_BASE || "http://localhost:8000";

export default function DashboardUpload() {
  const { showAlert } = useAlert();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get("q") || "";

  const [activeTab, setActiveTab] = useState<"youtube" | "link" | "upload">(
    "youtube",
  );
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState(qParam);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasInitSearch, setHasInitSearch] = useState(false);

  // Convert state
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const [convertStep, setConvertStep] = useState("");
  const [convertError, setConvertError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [existingSongId, setExistingSongId] = useState<string | null>(null);
  const [processingSong, setProcessingSong] = useState<any>(null);

  const [profile, setProfile] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Cart state for "đi chợ"
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("toneforge_cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("toneforge_cart", JSON.stringify(cart));
  }, [cart]);
  const [isHoveredCart, setIsHoveredCart] = useState(false);
  const [flyAnimations, setFlyAnimations] = useState<any[]>([]);
  const cartButtonRef = useRef<HTMLButtonElement>(null);

  // Bulk processing states
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<any[]>([]);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  useEffect(() => {
    if (auth.currentUser) {
      const unsubscribe = onSnapshot(
        doc(db, "users", auth.currentUser.uid),
        (doc) => {
          if (doc.exists()) {
            setProfile(doc.data());
          }
        },
      );
      return () => unsubscribe();
    }
  }, []);

  const checkUploadLimit = async () => {
    if (!auth.currentUser) {
      showAlert("Bạn cần đăng nhập để thao tác");
      return false;
    }

    if (profile?.isVip) return true;

    try {
      const q = query(
        collection(db, "songs"),
        where("ownerId", "==", auth.currentUser.uid),
      );
      const snap = await getDocs(q);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let monthCount = 0;
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt && data.createdAt.toDate) {
          const date = data.createdAt.toDate();
          if (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
          ) {
            monthCount++;
          }
        }
      });

      if (monthCount >= 10) {
        setShowUpgradeModal(true);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Lỗi đếm số bài hát", e);
      return false;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatViews = (views?: number) => {
    if (!views) return "0 view";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const handleSearch = async (queryToSearch?: string) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `${API_BASE}/convert/youtube/search?q=${encodeURIComponent(q)}&limit=5`,
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const isYouTubeLink = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return (
      normalized.includes("youtube.com/watch") ||
      normalized.includes("youtu.be/") ||
      normalized.includes("youtube.com/shorts/") ||
      normalized.includes("youtube.com/embed/") ||
      normalized.includes("music.youtube.com/")
    );
  };

  useEffect(() => {
    if (qParam && !hasInitSearch) {
      setHasInitSearch(true);
      handleSearch(qParam);
    }
  }, [qParam, hasInitSearch]);

  const checkSongExists = async (result: any) => {
    let videoId = result.id || result.video_id;
    if (!videoId && result.url) {
      try {
        const urlObj = new URL(result.url);
        videoId = urlObj.searchParams.get("v");
      } catch (e) {}
    }

    if (videoId) {
      const qByVideoId = query(
        collection(db, "songs"),
        where("status", "==", "public"),
        where("youtubeVideoId", "==", videoId),
      );
      const snap = await getDocs(qByVideoId);
      if (!snap.empty) return snap.docs[0].id;
    } else {
      const qByText = query(
        collection(db, "songs"),
        where("status", "==", "public"),
        where("title", "==", result.title),
        where("artist", "==", result.channel || result.artist),
      );
      const snap = await getDocs(qByText);
      if (!snap.empty) return snap.docs[0].id;
    }
    return null;
  };

  const handleSelectSong = async (result: any, event?: React.MouseEvent) => {
    try {
      setIsSearching(true);
      const existingId = await checkSongExists(result);
      if (existingId) {
        showAlert(
          `Bài hát "${result.title}" đã tồn tại trên hệ thống rồi!\nKhông cần thêm vào giỏ đi chợ nữa.`,
        );
        return;
      }

      // Check if already in cart
      const isInCart = cart.some(
        (item) => (item.id || item.video_id) === (result.id || result.video_id),
      );
      if (isInCart) {
        showAlert(`Bài hát "${result.title}" đã có sẵn trong giỏ hàng rồi!`);
        return;
      }

      setCart((prev) => [...prev, result]);

      if (event && cartButtonRef.current) {
        const rect = (
          event.currentTarget as HTMLElement
        ).getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        const cartRect = cartButtonRef.current.getBoundingClientRect();
        const endX = cartRect.left + cartRect.width / 2;
        const endY = cartRect.top + cartRect.height / 2;

        const newAnim = {
          id: Date.now(),
          startX,
          startY,
          endX,
          endY,
          thumbnail: result.thumbnail,
        };
        setFlyAnimations((prev) => [...prev, newAnim]);

        setTimeout(() => {
          setFlyAnimations((prev) =>
            prev.filter((anim) => anim.id !== newAnim.id),
          );
        }, 700);
      }
    } catch (err) {
      console.error("Lỗi kiểm tra giỏ hàng", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartBulkProcessing = async () => {
    if (cart.length === 0) return;
    if (!auth.currentUser) {
      showAlert("Bạn cần đăng nhập để thao tác");
      return;
    }

    if (!(await checkUploadLimit())) return;

    setIsSearching(true);
    const existingSongsFound: string[] = [];
    const songsToProcess: any[] = [];

    for (const item of cart) {
      const existingId = await checkSongExists(item);
      if (existingId) {
        existingSongsFound.push(item.title);
      } else {
        songsToProcess.push(item);
      }
    }
    setIsSearching(false);

    if (existingSongsFound.length > 0) {
      showAlert(
        `Các bài hát sau đã tồn tại trên hệ thống:\n- ${existingSongsFound.join("\n- ")}\n\nHệ thống sẽ tự động bỏ qua chúng và chỉ bóc tách các bài chưa có.`,
      );
      if (songsToProcess.length === 0) {
        setCart([]);
        return;
      }
    }

    setBulkQueue(songsToProcess);
    setBulkCurrentIndex(0);
    setBulkSuccessCount(0);
    setBulkErrors([]);
    setIsBulkProcessing(true);
  };

  const runBulkConversionStep = async (index: number, queue: any[]) => {
    if (index >= queue.length) return;

    const currentItem = queue[index];
    setProcessingSong({
      title: currentItem.title,
      image:
        currentItem.thumbnail ||
        `https://i.ytimg.com/vi/${currentItem.id || currentItem.video_id}/hqdefault.jpg`,
      channel: currentItem.channel || currentItem.artist || "YouTube",
    });
    setConvertProgress(0);
    setConvertStep(
      `Đang xử lý [${index + 1}/${queue.length}]: ${currentItem.title}`,
    );
    setConvertError(null);

    const videoId = currentItem.id || currentItem.video_id;
    const url = currentItem.url || `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const res = await fetch(`${API_BASE}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi khởi tạo");

      const jobId = data.job_id;
      const pythonSongId = data.song_id;

      const eventSource = new EventSource(
        `${API_BASE}/convert/${jobId}/events`,
      );

      eventSource.onopen = () => {
        setConvertStep(
          `[${index + 1}/${queue.length}] Đang kết nối tới máy chủ phân tích...`,
        );
      };

      eventSource.onmessage = (event) => {
        try {
          const eData = JSON.parse(event.data);
          if (eData.progress !== undefined) setConvertProgress(eData.progress);
          if (eData.step)
            setConvertStep(`[${index + 1}/${queue.length}] ${eData.step}`);
        } catch (e) {
          console.error("Progress parse error:", e);
        }
      };

      eventSource.addEventListener("status", (event: any) => {
        try {
          const eData = JSON.parse(event.data);
          if (eData.progress !== undefined) setConvertProgress(eData.progress);
          if (eData.step)
            setConvertStep(`[${index + 1}/${queue.length}] ${eData.step}`);
        } catch (e) {
          console.error("Status parse error:", e);
        }
      });

      eventSource.addEventListener("error", (event: any) => {
        let msg = "Lỗi xử lý file âm thanh.";
        if (event.data) {
          try {
            const eData = JSON.parse(event.data);
            msg = eData.message || msg;
          } catch (e) {}
        }
        eventSource.close();
        setBulkErrors((prev) => [...prev, `${currentItem.title}: ${msg}`]);
        setBulkCurrentIndex((i) => i + 1);
      });

      eventSource.addEventListener("done", async (event: any) => {
        eventSource.close();

        try {
          const result = JSON.parse(event.data);
          await saveToLibrary(
            result,
            pythonSongId,
            jobId,
            url,
            currentItem,
            false,
          );
          setBulkSuccessCount((c) => c + 1);
        } catch (e: any) {
          console.error("Save error:", e);
          setBulkErrors((prev) => [
            ...prev,
            `${currentItem.title}: Lỗi lưu bài hát (${e.message || e})`,
          ]);
        }
        setBulkCurrentIndex((i) => i + 1);
      });
    } catch (error: any) {
      console.error("Convert:", error);
      setBulkErrors((prev) => [
        ...prev,
        `${currentItem.title}: ${error.message || "Lỗi kết nối"}`,
      ]);
      setBulkCurrentIndex((i) => i + 1);
    }
  };

  useEffect(() => {
    if (isBulkProcessing && bulkQueue.length > 0) {
      if (bulkCurrentIndex < bulkQueue.length) {
        runBulkConversionStep(bulkCurrentIndex, bulkQueue);
      } else {
        setIsBulkProcessing(false);
        setCart([]);
        setProcessingSong(null);

        const successMsg = `Đã bóc tách thành công ${bulkSuccessCount}/${bulkQueue.length} bài hát!`;
        const errorMsg =
          bulkErrors.length > 0
            ? `\n\nCó ${bulkErrors.length} lỗi xảy ra:\n- ${bulkErrors.join("\n- ")}`
            : "";

        showAlert(successMsg + errorMsg);
        navigate("/dashboard");
      }
    }
  }, [isBulkProcessing, bulkCurrentIndex, bulkQueue]);

  const handleConfirmStart = async () => {
    if (selectedSong) {
      if (!(await checkUploadLimit())) return;

      const songToConvert = selectedSong;

      if (!auth.currentUser) {
        showAlert("Bạn cần đăng nhập để thao tác");
        return;
      }

      try {
        const existingId = await checkSongExists(songToConvert);
        if (existingId) {
          setExistingSongId(existingId);
          return;
        }
      } catch (error) {
        console.error("Lỗi kiểm tra bài hát tồn tại", error);
      }

      setSelectedSong(null);
      setExistingSongId(null);
      startConversion(songToConvert.url, songToConvert);
    }
  };

  const startConversion = async (url: string, sourceData?: any) => {
    if (!auth.currentUser) {
      showAlert("Bạn cần đăng nhập để thao tác");
      return;
    }

    setProcessingSong({
      title: sourceData?.title || url,
      image: sourceData?.thumbnail || "",
      channel: sourceData?.channel || sourceData?.artist || "",
    });

    setIsConverting(true);
    setConvertProgress(0);
    setConvertStep("Khởi tạo...");
    setConvertError(null);

    try {
      const res = await fetch(`${API_BASE}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi khởi tạo");

      const jobId = data.job_id;
      const pythonSongId = data.song_id;

      // Setup SSE
      console.log(`Connecting to SSE: ${API_BASE}/convert/${jobId}/events`);
      const eventSource = new EventSource(
        `${API_BASE}/convert/${jobId}/events`,
      );

      eventSource.onopen = () => {
        console.log("SSE Connection opened");
        setConvertStep("Đang kết nối tới máy chủ phân tích...");
      };

      eventSource.onmessage = (event) => {
        console.log("SSE onmessage:", event.data);
        try {
          const eData = JSON.parse(event.data);
          if (eData.progress !== undefined) setConvertProgress(eData.progress);
          if (eData.step) setConvertStep(eData.step);
        } catch (e) {
          console.error("Progress parse error:", e);
        }
      };

      eventSource.addEventListener("status", (event: any) => {
        console.log("SSE status:", event.data);
        try {
          const eData = JSON.parse(event.data);
          if (eData.progress !== undefined) setConvertProgress(eData.progress);
          if (eData.step) setConvertStep(eData.step);
        } catch (e) {
          console.error("Status parse error:", e);
        }
      });

      eventSource.addEventListener("error", (event: any) => {
        console.error("SSE error event:", event);
        if (event.data) {
          try {
            const eData = JSON.parse(event.data);
            const backendMessage =
              eData.error_detail ||
              eData.message ||
              eData.error ||
              "Lỗi xử lý file âm thanh.";
            setConvertError(backendMessage);
          } catch (e) {
            setConvertError("Lỗi không xác định từ server.");
          }
          eventSource.close();
        } else {
          console.error(
            "SSE Network Error. readyState:",
            eventSource.readyState,
          );
          if (eventSource.readyState === EventSource.CLOSED) {
            setConvertError("Mất kết nối tới server xử lý.");
            eventSource.close();
          }
        }
      });

      eventSource.addEventListener("done", async (event: any) => {
        console.log("SSE done event:", event.data);
        eventSource.close();
        setConvertStep("Lưu vào thư viện...");
        setConvertProgress(100);

        try {
          const result = JSON.parse(event.data);
          await saveToLibrary(result, pythonSongId, jobId, url, sourceData);
        } catch (e) {
          console.error("Save error:", e);
          setConvertError("Lỗi khi lưu bài hát: " + e);
          // Không gọi setIsConverting(false) để hiển thị lỗi
        }
      });
    } catch (error: any) {
      console.error("Convert:", error);
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Có lỗi xảy ra kết nối server.";
      setConvertError(backendMessage);
      // Bỏ setIsConverting(false) để UI giữ lại thanh loading và hiển thị form báo lỗi
    }
  };

  const handleUploadFile = async () => {
    if (!uploadFile) return;
    if (!auth.currentUser) {
      showAlert("Bạn cần đăng nhập để thao tác");
      return;
    }
    if (!(await checkUploadLimit())) return;

    setProcessingSong({
      title: uploadFile.name,
      image: "",
      channel: "Upload file",
    });
    setIsUploading(true);
    setConvertProgress(0);
    setConvertStep("Đang tải file lên...");
    setConvertError(null);

    try {
      const data = await createUploadConvertJob(uploadFile);
      const jobId = data.job_id;
      const pythonSongId = data.song_id;
      const sourceData = {
        title: uploadFile.name,
        channel: "Upload file",
        sourceType: "upload",
        filename: uploadFile.name,
      };

      console.log(`Connecting to SSE: ${API_BASE}/convert/${jobId}/events`);
      const eventSource = new EventSource(
        `${API_BASE}/convert/${jobId}/events`,
      );

      eventSource.onopen = () => {
        setConvertStep("Đang kết nối tới máy chủ phân tích...");
      };

      eventSource.onmessage = (event) => {
        try {
          const eData = JSON.parse(event.data);
          if (eData.progress !== undefined) setConvertProgress(eData.progress);
          if (eData.step) setConvertStep(eData.step);
        } catch (e) {
          console.error("Progress parse error:", e);
        }
      };

      eventSource.addEventListener("status", (event: any) => {
        try {
          const eData = JSON.parse(event.data);
          if (eData.progress !== undefined) setConvertProgress(eData.progress);
          if (eData.step) setConvertStep(eData.step);
        } catch (e) {
          console.error("Status parse error:", e);
        }
      });

      eventSource.addEventListener("error", (event: any) => {
        if (event.data) {
          try {
            const eData = JSON.parse(event.data);
            setConvertError(
              eData.error_detail ||
                eData.message ||
                eData.error ||
                "Lỗi xử lý file âm thanh.",
            );
          } catch {
            setConvertError("Lỗi không xác định từ server.");
          }
          eventSource.close();
        } else if (eventSource.readyState === EventSource.CLOSED) {
          setConvertError("Mất kết nối tới server xử lý.");
          eventSource.close();
        }
      });

      eventSource.addEventListener("done", async (event: any) => {
        eventSource.close();
        setConvertStep("Lưu vào thư viện...");
        setConvertProgress(100);
        try {
          const result = JSON.parse(event.data);
          await saveToLibrary(
            result,
            pythonSongId,
            jobId,
            `upload://${uploadFile.name}`,
            sourceData,
          );
          setUploadFile(null);
          if (uploadInputRef.current) {
            uploadInputRef.current.value = "";
          }
        } catch (e) {
          console.error("Save error:", e);
          setConvertError("Lỗi khi lưu bài hát: " + e);
        }
      });
    } catch (error: any) {
      console.error("Upload convert:", error);
      setConvertError(error?.message || "Có lỗi xảy ra khi tải file lên.");
    } finally {
      setIsUploading(false);
    }
  };

  const saveToLibrary = async (
    result: any,
    pythonSongId: string,
    jobId: string,
    url: string,
    sourceData?: any,
    shouldRedirect = true,
  ) => {
    if (!auth.currentUser) return;

    // Chunking the base64 data (Firestore max size 1MB, we split just to be safe if very big,
    // but usually MIDI float32 is small. We'll do 1 chunk for simplicity but structure allows more)

    const songDocRef = doc(collection(db, "songs"));

    await setDoc(doc(db, "songs", songDocRef.id, "noteChunks", "chunk_0"), {
      ownerId: auth.currentUser.uid,
      songId: songDocRef.id,
      index: 0,
      data: result.notes_base64,
    });

    // Calculate pitch metrics
    let minPitch = 20000;
    let maxPitch = 0;
    const pitchCounts: Record<number, number> = {};

    try {
      const binaryString = atob(result.notes_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const floatArray = new Float32Array(bytes.buffer);
      for (let i = 0; i < floatArray.length; i += 3) {
        const pitch = Math.round(floatArray[i + 1]);
        if (pitch > maxPitch) maxPitch = pitch;
        if (pitch > 0 && pitch < minPitch) minPitch = pitch;
        if (pitch > 0) {
          pitchCounts[pitch] = (pitchCounts[pitch] || 0) + 1;
        }
      }
    } catch (e) {
      console.error("Error parsing base64 notes for metrics:", e);
    }

    if (minPitch === 20000) minPitch = 0;

    let modePitch = 0;
    let maxCount = 0;
    Object.entries(pitchCounts).forEach(([pitch, count]) => {
      if (count > maxCount) {
        maxCount = count;
        modePitch = Number(pitch);
      }
    });

    // Calculate difficulty (Simple logic based on pitch range)
    let difficulty = "Dễ";
    let difficultyColor = "text-green-400 bg-green-500/10 border-green-500/20";
    if (maxPitch > 0 && minPitch > 0) {
      const rangeOctaves = (maxPitch - minPitch) / 12;
      if (rangeOctaves >= 2.5) {
        difficulty = "Khó";
        difficultyColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
      } else if (rangeOctaves >= 1.5) {
        difficulty = "Trung bình";
        difficultyColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
      }
    }

    let videoId = pythonSongId; // Usually the backend returns youtube video id as song_id for YT
    if (sourceData && (sourceData.video_id || sourceData.id)) {
      videoId = sourceData.video_id || sourceData.id;
    }

    await setDoc(songDocRef, {
      ownerId: auth.currentUser.uid,
      title: sourceData?.title || result.metadata?.title || "Unknown Song",
      artist:
        sourceData?.channel || result.metadata?.artist || "Unknown Artist",
      sourceType: "youtube",
      sourceUrl: url,
      youtubeVideoId: videoId,
      thumbnail:
        sourceData?.thumbnail ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: result.metadata?.duration || sourceData?.duration || 0,
      pythonSongId: pythonSongId,
      convertJobId: jobId,
      noteChunkCount: 1,
      status: "public",
      pitchMetrics: {
        minPitch,
        maxPitch,
        modePitch,
      },
      difficultyInfo: {
        label: difficulty,
        colorClass: difficultyColor,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Redirect to play screen only if requested
    if (shouldRedirect) {
      navigate(`/song/${songDocRef.id}`);
    }
  };

  const [linkInput, setLinkInput] = useState("");

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="flex items-center gap-4 text-sm font-medium">
        <Link to="/dashboard" className="text-slate-400 hover:text-white">
          Bài hát của tôi
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-violet-400">Thêm bài hát mới</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {isConverting || isBulkProcessing ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
            <div className="relative mb-8">
              <div className="w-32 h-32 border-4 border-slate-800 rounded-full flex items-center justify-center">
                <div className="text-3xl font-black text-white">
                  {convertProgress}%
                </div>
              </div>
              <svg className="absolute -inset-1 w-[136px] h-[136px] transform -rotate-90">
                <circle
                  cx="68"
                  cy="68"
                  r="64"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-violet-500"
                  strokeDasharray="402"
                  strokeDashoffset={402 - (402 * convertProgress) / 100}
                  style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                />
              </svg>
            </div>

            {processingSong && (
              <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl max-w-sm w-full mb-6">
                {processingSong.image ? (
                  <img
                    src={processingSong.image}
                    alt={processingSong.title}
                    className="w-20 h-14 rounded-xl object-cover shrink-0 border border-slate-800 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-14 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center shrink-0 shadow-md">
                    <Music className="w-6 h-6 text-violet-400" />
                  </div>
                )}
                <div className="text-left min-w-0 flex-1">
                  <p className="text-[9px] text-violet-400 font-extrabold uppercase tracking-widest mb-0.5">
                    ĐANG XỬ LÝ
                  </p>
                  <h4
                    className="text-xs font-bold text-white truncate text-left"
                    title={processingSong.title}
                  >
                    {processingSong.title}
                  </h4>
                  {processingSong.channel && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 text-left">
                      {processingSong.channel}
                    </p>
                  )}
                </div>
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-2">
              Đang xử lý AI ToneForge
            </h3>
            <p className="text-violet-400 font-mono tracking-widest uppercase text-sm mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse" />{" "}
              {convertStep.startsWith("queued") ? (
                convertStep.includes(":") 
                  ? `Đang trong hàng đợi (Vị trí: ${convertStep.split(":")[1]}). Vui lòng chờ...` 
                  : "Đang trong hàng đợi, vui lòng chờ người trước hoàn thành..."
              ) : (
                convertStep.replace(/_/g, " ")
              )}
            </p>
            <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Có thể mất từ 30s ~ 40s mỗi bài hát
            </p>

            {convertError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mt-4 max-w-md text-center">
                <p className="font-bold mb-1">Lỗi xử lý</p>
                <p className="text-sm">{convertError}</p>
                <Button
                  onClick={() => {
                    setIsConverting(false);
                    setIsBulkProcessing(false);
                  }}
                  variant="outline"
                  className="mt-4 border-red-500/30 hover:bg-red-500/20 text-red-300"
                >
                  Thử lại
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Thêm bài hát để luyện tập
              </h2>
              <p className="text-slate-400 text-sm">
                Hệ thống AI sẽ tự động bóc tách lời, nhận diện hợp âm, cao độ và
                nốt nhạc.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 max-w-2xl mx-auto">
              <button
                onClick={() => setActiveTab("youtube")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "youtube"
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Youtube className="w-5 h-5 text-red-500" /> YouTube
              </button>
              <button
                onClick={() => setActiveTab("link")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "link"
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <LinkIcon className="w-4 h-4 text-blue-400" /> Dán link
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "upload"
                    ? "bg-slate-800 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <UploadCloud className="w-4 h-4 text-violet-400" /> Upload File
                <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 border border-amber-500/30">
                  <Crown className="w-3 h-3" /> VIP
                </span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="mt-8 relative z-10 min-h-[300px]">
              {activeTab === "youtube" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 max-w-2xl mx-auto">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Tìm kiếm video trên YouTube..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-12 pr-32 py-4 text-white focus:ring-2 focus:ring-red-500 focus:outline-none focus:border-red-500/50 placeholder:text-slate-600 transition-all text-lg"
                      />
                      <Button
                        onClick={() => handleSearch()}
                        disabled={isSearching}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-600 hover:bg-red-500 text-white h-10 px-6 rounded-xl font-bold mt-[0]"
                      >
                        {isSearching ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Tìm kiếm"
                        )}
                      </Button>
                    </div>

                    {/* Clickable Cart Widget */}
                    <div className="relative">
                      <button
                        ref={cartButtonRef}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-700 hover:border-violet-500 p-4 rounded-2xl text-slate-300 hover:text-violet-400 transition-all flex items-center justify-center relative min-w-[56px] min-h-[56px] shadow-lg shadow-black/40"
                        onClick={() => setIsHoveredCart(true)}
                      >
                        <ShoppingCart className="w-6 h-6" />
                        {cart.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white font-bold text-xs px-2 py-0.5 rounded-full animate-bounce">
                            {cart.length}
                          </span>
                        )}
                      </button>

                      {/* Cart list Modal overlay */}
                      {isHoveredCart && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                            onClick={() => setIsHoveredCart(false)}
                          />

                          {/* Modal Content */}
                          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-250">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                              <h4 className="font-bold text-lg text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-violet-400" />{" "}
                                Giỏ đi chợ của bạn ({cart.length})
                              </h4>
                              <div className="flex items-center gap-3">
                                {cart.length > 0 && (
                                  <button
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Xoá toàn bộ bài hát trong giỏ hàng?",
                                        )
                                      ) {
                                        setCart([]);
                                      }
                                    }}
                                    className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
                                  >
                                    Xoá hết
                                  </button>
                                )}
                                <button
                                  onClick={() => setIsHoveredCart(false)}
                                  className="text-slate-400 hover:text-white text-xs font-semibold bg-slate-800 hover:bg-slate-755 px-3 py-1.5 rounded-xl transition-all"
                                >
                                  Đóng
                                </button>
                              </div>
                            </div>

                            {cart.length === 0 ? (
                              <div className="text-center py-12 text-slate-400">
                                <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                                <p className="text-sm font-medium">
                                  Giỏ hàng đang trống.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Hãy nhấn nút "Đi chợ" ở kết quả YouTube để
                                  thêm bài hát.
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                                  {cart.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 group relative"
                                    >
                                      <img
                                        src={item.thumbnail}
                                        alt={item.title}
                                        className="w-16 h-10 rounded-lg object-cover shrink-0"
                                      />
                                      <div className="flex-1 min-w-0 pr-8">
                                        <p className="text-xs font-bold text-white truncate">
                                          {item.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                          {item.channel}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCart((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                          );
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Xóa khỏi giỏ"
                                      >
                                        <Trash className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <div className="border-t border-slate-800 mt-4 pt-4 flex gap-3">
                                  <Button
                                    onClick={() => setIsHoveredCart(false)}
                                    variant="outline"
                                    className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs py-2"
                                  >
                                    Tiếp tục chọn
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setIsHoveredCart(false);
                                      handleStartBulkProcessing();
                                    }}
                                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-950/40"
                                  >
                                    <CheckCircle className="w-4 h-4" /> Xử lý (
                                    {cart.length} bài hát)
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="max-w-2xl mx-auto space-y-3 mt-8">
                      {searchResults.map((result: any, idx: number) => {
                        const isInCart = cart.some(
                          (item) =>
                            (item.id || item.video_id) ===
                            (result.id || result.video_id),
                        );
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedSong(result)}
                            className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-950 transition-all cursor-pointer group border ${
                              isInCart
                                ? "border-violet-500 bg-violet-950/10 shadow-lg shadow-violet-950/20"
                                : "border-slate-800 hover:border-violet-500/50 hover:bg-slate-850"
                            }`}
                          >
                            <div className="relative w-full sm:w-32 h-40 sm:h-20 rounded-xl overflow-hidden shrink-0">
                              <img
                                src={result.thumbnail}
                                alt={result.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                              <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(result.duration)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold truncate mb-1 group-hover:text-violet-400 transition-colors text-sm sm:text-base">
                                {result.title}
                              </h4>
                              <div className="flex items-center text-xs text-slate-500 truncate gap-2">
                                <span className="truncate max-w-[125px]">
                                  {result.channel}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />{" "}
                                  {formatViews(result.view_count)}
                                </span>
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Add/remove from shopping cart button */}
                              <button
                                onClick={(e) => {
                                  if (isInCart) {
                                    setCart((prev) =>
                                      prev.filter(
                                        (item) =>
                                          (item.id || item.video_id) !==
                                          (result.id || result.video_id),
                                      ),
                                    );
                                  } else {
                                    handleSelectSong(result, e);
                                  }
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                  isInCart
                                    ? "bg-green-500/10 hover:bg-red-500/10 text-green-400 hover:text-red-400 border-green-500/20 hover:border-red-500/20"
                                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:border-violet-500"
                                }`}
                                title={
                                  isInCart
                                    ? "Xoá khỏi giỏ đi chợ"
                                    : "Bỏ vào giỏ đi chợ"
                                }
                              >
                                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                                <span>{isInCart ? "Trong giỏ" : "Đi chợ"}</span>
                              </button>

                              {/* Original single analyze flow button */}
                              <button
                                onClick={() => setSelectedSong(result)}
                                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-violet-950/20"
                              >
                                <Music2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Chọn bài</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "link" && (
                <div className="space-y-6">
                  <div className="relative max-w-2xl mx-auto">
                    <LinkIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="Dán đường dẫn YouTube (ví dụ: https://youtube.com/...)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-12 pr-32 py-4 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600 transition-all text-lg"
                    />
                    <Button
                      onClick={async () => {
                        if (isYouTubeLink(linkInput)) {
                          showAlert(
                            "Link YouTube không dùng để tải âm thanh trực tiếp nữa. Hãy dùng tab Upload File để bóc tách, hoặc tab YouTube để tìm bài hát.",
                          );
                          return;
                        }
                        if (await checkUploadLimit()) {
                          showAlert(
                            "Luồng dán link đã được tắt cho YouTube. Vui lòng dùng Upload File để xử lý thật.",
                          );
                        }
                      }}
                      disabled={!linkInput.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white h-10 px-6 rounded-xl font-bold mt-[0]"
                    >
                      Không dùng
                    </Button>
                  </div>
                  <div className="text-center text-sm text-slate-500 mt-2">
                    Hãy dùng tab Upload File để bóc tách thật sự. YouTube ở đây
                    chủ yếu để tìm bài và kiểm tra thông tin.
                  </div>
                </div>
              )}

              {activeTab === "upload" && (
                <div>
                  <div className="border-2 border-dashed border-slate-700/50 hover:border-violet-500/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-slate-950/30 hover:bg-slate-800/30 transition-colors mx-auto max-w-2xl relative overflow-hidden group">
                    <div className="w-16 h-16 rounded-full bg-violet-600/10 text-violet-400 flex items-center justify-center mb-4 relative z-10">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1 relative z-10">
                      Tải lên File Âm thanh
                    </h3>
                    <p className="text-slate-400 text-sm mb-6 relative z-10">
                      Chọn file MP3, WAV, FLAC, M4A hoặc OGG để AI bóc tách
                      và chấm điểm.
                    </p>

                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept=".mp3,.wav,.flac,.m4a,.ogg,audio/*,video/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full max-w-lg mx-auto text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-white hover:file:bg-violet-500 relative z-10"
                    />

                    {uploadFile && (
                      <p className="mt-4 text-xs text-slate-400 relative z-10">
                        Đã chọn: <span className="text-white">{uploadFile.name}</span>
                      </p>
                    )}

                    <Button
                      onClick={handleUploadFile}
                      disabled={!uploadFile || isUploading}
                      className="mt-6 bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 rounded-xl relative z-10"
                    >
                      {isUploading ? "Đang tải lên..." : "Bắt đầu bóc tách"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Context info under */}
            <div className="bg-slate-950/50 rounded-xl p-4 flex gap-4 text-sm border border-slate-800 max-w-2xl mx-auto mt-8 relative z-10">
              <FileMusic className="w-6 h-6 text-slate-500 shrink-0" />
              <div>
                <p className="text-slate-300 font-bold mb-1">
                  Công nghệ Pitch AI Pipeline:
                </p>
                <p className="text-slate-500 leading-relaxed text-xs">
                  Phân tách hòa âm, dò cao độ bằng CREPE, và gộp thành các khối
                  nốt MIDI. Đảm bảo sai số dưới ~10 cents.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
              <img
                src={selectedSong.thumbnail}
                alt={selectedSong.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-bold text-lg text-white mb-1 leading-tight">
              {selectedSong.title}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {selectedSong.channel}
            </p>

            {existingSongId ? (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm p-4 rounded-xl mb-4 text-center">
                <p className="font-bold mb-3">
                  Bài hát này đã có sẵn trong thư viện cộng đồng
                </p>
                <Link to={`/song/${existingSongId}`}>
                  <Button className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                    Xem chi tiết
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedSong(null);
                    setExistingSongId(null);
                  }}
                  className="w-full mt-2 text-slate-400 hover:text-white"
                >
                  Đóng
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                  onClick={() => {
                    setSelectedSong(null);
                    setExistingSongId(null);
                  }}
                >
                  Hủy
                </Button>
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                  onClick={handleConfirmStart}
                >
                  Xác nhận & Xử lý
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {flyAnimations.map((anim) => (
        <div
          key={anim.id}
          className="fixed z-[100] pointer-events-none rounded-xl overflow-hidden shadow-2xl shadow-violet-500/50 border border-violet-500"
          style={
            {
              width: 64,
              height: 64,
              top: 0,
              left: 0,
              "--start-x": `${anim.startX}px`,
              "--start-y": `${anim.startY}px`,
              "--end-x": `${anim.endX}px`,
              "--end-y": `${anim.endY}px`,
              animation:
                "flyToCartAnim 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
            } as React.CSSProperties
          }
        >
          <img
            src={anim.thumbnail}
            alt="fly"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      <style>{`
        @keyframes flyToCartAnim {
          0% {
            transform: translate(calc(var(--start-x) - 50%), calc(var(--start-y) - 50%)) scale(1) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(var(--end-x) - 50%), calc(var(--end-y) - 50%)) scale(0.1) rotate(15deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
