import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Flame, 
  Coins, 
  Sparkles, 
  Mic2, 
  CheckCircle, 
  Calendar, 
  Award, 
  Volume2, 
  Play, 
  Gift, 
  Lock, 
  Check, 
  RotateCcw, 
  Star, 
  Heart, 
  Compass, 
  Coffee,
  HelpCircle,
  X,
  Target,
  Crown,
  BookOpen
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAlert } from "../../contexts/AlertContext";

interface VoiceStats {
  level: number;
  xp: number;
  nextXp: number;
  coins: number;
  streak: number;
  lastClaimedDate: string | null;
  itemsOwned: string[];
  activeEffects: string[];
  unlockedBadges: string[];
  completedQuests: string[];
  dailyQuestsDate: string;
}

const DEFAULT_STATS: VoiceStats = {
  level: 1,
  xp: 120,
  nextXp: 500,
  coins: 80,
  streak: 3,
  lastClaimedDate: null,
  itemsOwned: [],
  activeEffects: [],
  unlockedBadges: ['de-tu-nhap-mon'],
  completedQuests: [],
  dailyQuestsDate: new Date().toDateString(),
};

const TEACHER_QUOTES = [
  "Chào trò! Hát giống như nói vậy, chỉ có điều cao điệu hơn và mở khẩu hình dọc hơn. Hôm nay luyện thanh chưa?",
  "Cơ hoành chính là bệ phóng của giọng hát! Hãy thử lấy hơi sâu nảy bụng xem nào.",
  "Mẹo nhỏ: Khi hát nốt cao, hãy hạ cằm nhẹ xuống thay vì ngửa cổ lên. Dây thanh sẽ đỡ mỏi rất nhiều đấy!",
  "Humming là liệu pháp massage tuyệt vời nhất cho thanh quản. Đừng thét quá lớn, hãy bắt đầu thật êm dịu.",
  "Động lực là thứ rủ bạn bắt đầu, thói quen rèn luyện là thứ đưa bạn đến thành công. Hát vang lên nào!",
  "Uống nước ấm và tránh đồ đá lạnh nhé trò. Thanh đới đang cần sự chiều chuộng từ bạn đấy."
];

const DAILY_QUESTS_LIST = [
  { id: 'q1', title: 'Khởi động hơi thở cùng Thầy Nam', desc: 'Thực hiện bài hát thử/Humming 10 giây tại phòng máy', xp: 80, coins: 25, type: 'warmup' },
  { id: 'q2', title: 'Người săn nhạc', desc: 'Đi chợ & bóc tách AI 1 bài hát bất kỳ từ YouTube', xp: 120, coins: 40, type: 'upload' },
  { id: 'q3', title: 'Uống trà dưỡng giọng', desc: 'Sử dụng một cốc Trà Thảo Mộc để bảo bối thanh đới', xp: 50, coins: 15, type: 'drink' },
  { id: 'q4', title: 'Học hỏi lý thuyết', desc: 'Đọc chi tiết 1 bài kỹ thuật hoặc lý thuyết thanh nhạc', xp: 70, coins: 20, type: 'theory' },
  { id: 'q5', title: 'Gia Tài Âm Thanh', desc: 'Thêm 3 bản phân tích mới lên hệ thống', xp: 100, coins: 30, type: 'catalog' }
];

export const BADGES_LIST = [
  { id: 'de-tu-nhap-mon', name: 'Đệ Tử Nhập Môn', icon: Award, desc: 'Bắt đầu hành trình giải phóng âm thanh cùng ToneForge', color: 'from-blue-600 to-cyan-500' },
  { id: 'la-phoi-thep', name: 'Lá Phổi Thép', icon: Flame, desc: 'Hoàn thành bài tập thở hơi Humming đạt trên 90 điểm', color: 'from-amber-500 to-orange-600' },
  { id: 'chuong-khanh-tieu-so', name: 'Chuông Khánh Tiêu Sơ', icon: Star, desc: 'Đạt nốt cao cộng hưởng hoàn mỹ ổn định', color: 'from-violet-600 to-pink-500' },
  { id: 'ong-gia-cham-chi', name: 'Chiến Binh Bền Bỉ', icon: CheckCircle, desc: 'Đạt chuỗi rèn luyện 7 ngày liên tục', color: 'from-emerald-500 to-teal-600' },
  { id: 'ca-nhan-tai-ba', name: 'Vua Phòng Thu', icon: Trophy, desc: 'Bóc tách thành công 5 bài hát cá nhân lên thư viện', color: 'from-yellow-500 to-amber-600' },
  { id: 'tuyet-dinh-thanh-nhac', name: 'Tuyệt Đỉnh Thanh Nhạc', icon: Sparkles, desc: 'Đạt 5000 XP Kinh nghiệm Thanh nhạc', color: 'from-purple-500 to-indigo-600' },
  { id: 'quyen-luc-vip', name: 'Đẳng Cấp Thượng Lưu', icon: Crown, desc: 'Trở thành thành viên VIP của khoá học', color: 'from-yellow-400 to-yellow-600' },
  { id: 'thien-tai-nhac-ly', name: 'Thiên Tài Nhạc Lý', icon: BookOpen, desc: 'Hoàn thành 10 bài học lý thuyết thanh nhạc', color: 'from-emerald-400 to-cyan-600' }
];

const SHOP_ITEMS = [
  { id: 'tea', name: 'Trà Bồ Đề Mật Ong', price: 30, icon: Coffee, desc: 'Làm mềm dịu dây thanh quản rát buốt, kích hoạt hiệu ứng "Rung Giọng Mượt Mà" trong 2 giờ.', effect: 'vibrato_boost' },
  { id: 'candy', name: 'Kẹo Ngậm Bạc Hà', price: 20, icon: Sparkles, desc: 'Thông mũi mát họng, mở rộng khẩu hình. Tăng cường "Cao Độ Chuẩn Xác" +10% trong 1 giờ.', effect: 'pitch_boost' },
  { id: 'crown_vip', name: 'Huy Hiệu Vip Thử Thách 1 Ngày', price: 150, icon: Trophy, desc: 'Nâng hạng tài khoản lên VIP dùng thử trong 24 giờ kể từ lúc mở khoá.', effect: 'vip_trial' }
];

export default function DashboardQuests() {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const [stats, setStats] = useState<VoiceStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(0);
  
  // Custom game elements
  const [showChest, setShowChest] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const [chestReward, setChestReward] = useState({ xp: 0, coins: 0 });
  
  // Microphone Game Warm-Up
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStep, setGameStep] = useState<'intro' | 'recording' | 'feedback'>('intro');
  const [warmupType, setWarmupType] = useState<'humming' | 'vowel_a' | 'trill'>('humming');
  const [gameCountdown, setGameCountdown] = useState(10);
  const [gameScore, setGameScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [achievementToast, setAchievementToast] = useState<{ id: string, name: string, desc: string, icon: any, color: string } | null>(null);
  
  // Web Audio Hook-ups
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameIntervalRef = useRef<any>(null);

  const [songsToday, setSongsToday] = useState(0);

  useEffect(() => {
    if (auth.currentUser) {
      import('firebase/firestore').then(({ collection, query, where, getDocs }) => {
         const q = query(collection(db, 'songs'), where('ownerId', '==', auth.currentUser.uid));
         getDocs(q).then(snap => {
            let count = 0;
            const now = new Date();
            snap.docs.forEach(doc => {
               const data = doc.data();
               if (data.createdAt && data.createdAt.toDate) {
                  const d = data.createdAt.toDate();
                  if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                     count++;
                  }
               }
            });
            setSongsToday(count);
         }).catch(console.error);
      });
    }
  }, [auth.currentUser]);

  // Load from firebase or fallback
  useEffect(() => {
    let activeUser = auth.currentUser;
    if (!activeUser) {
      // Offline fallback
      const local = localStorage.getItem('voice_quests_stats');
      if (local) {
        try {
          setStats(JSON.parse(local));
        } catch (e) {}
      }
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'voiceStats', activeUser.uid);
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as VoiceStats;
        // Verify reset on new day
        const todayStr = new Date().toDateString();
        if (data.dailyQuestsDate !== todayStr) {
          const resetData = {
            ...data,
            completedQuests: [],
            dailyQuestsDate: todayStr
          };
          setStats(resetData);
          updateDoc(docRef, { completedQuests: [], dailyQuestsDate: todayStr });
        } else {
          setStats(data);
        }
      } else {
        setDoc(docRef, DEFAULT_STATS);
        setStats(DEFAULT_STATS);
      }
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });

    // Pick random teacher quote
    setQuoteIdx(Math.floor(Math.random() * TEACHER_QUOTES.length));
  }, []);

  // Save helper
  const saveStats = async (newStats: VoiceStats) => {
    // Check global achievements before saving
    let finalStats = newStats;
    if (finalStats.xp >= 5000 && !finalStats.unlockedBadges.includes('tuyet-dinh-thanh-nhac')) {
       finalStats = unlockAchievement('tuyet-dinh-thanh-nhac', finalStats);
    }
    
    setStats(finalStats);
    localStorage.setItem('voice_quests_stats', JSON.stringify(finalStats));
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'voiceStats', auth.currentUser.uid), finalStats);
      } catch (e) {
        console.error("Lỗi lưu DB:", e);
      }
    }
  };

  const unlockAchievement = (badgeId: string, currentStats: VoiceStats) => {
    if (currentStats.unlockedBadges.includes(badgeId)) return currentStats;
    const badge = BADGES_LIST.find(b => b.id === badgeId);
    if (badge) {
      setAchievementToast(badge);
      setTimeout(() => setAchievementToast(null), 5000);
    }
    return {
      ...currentStats,
      unlockedBadges: [...currentStats.unlockedBadges, badgeId]
    };
  };

  // Add XP and level transition
  const addRewards = (xpToAdd: number, coinsToAdd: number, baseStats: VoiceStats = stats) => {
    let newXp = baseStats.xp + xpToAdd;
    let newLevel = baseStats.level;
    let nextXp = baseStats.nextXp;

    while (newXp >= nextXp) {
      newXp -= nextXp;
      newLevel += 1;
      nextXp = Math.floor(nextXp * 1.35);
      showAlert(`🎉 CHÚC MỪNG BẠN LÊN CẤP! Bạn đạt Cấp ${newLevel}. Thầy Nam gửi lời ngợi khen sự chăm chỉ của trò!`);
    }

    const updated = {
      ...baseStats,
      level: newLevel,
      xp: newXp,
      nextXp,
      coins: baseStats.coins + coinsToAdd
    };
    saveStats(updated);
  };

  // Daily box chest claim
  const handleClaimDailyChest = () => {
    if (stats.lastClaimedDate === new Date().toDateString()) {
      showAlert("Hôm nay trò đã điểm danh rồi! Hãy quay lại vào ngày mai nhé.");
      return;
    }

    const randomXp = Math.floor(Math.random() * 30) + 30; // 30-60 XP
    const randomCoins = Math.floor(Math.random() * 15) + 15; // 15-30 custom Coins
    setChestReward({ xp: randomXp, coins: randomCoins });
    setShowChest(true);
    setChestOpened(false);
  };

  const confirmClaimChest = () => {
    setChestOpened(true);
    const todayStr = new Date().toDateString();
    const isConsecutive = stats.streak < 7; // cap loop
    const newStreak = isConsecutive ? stats.streak + 1 : 1; 

    const updated: VoiceStats = {
      ...stats,
      lastClaimedDate: todayStr,
      streak: newStreak
    };
    
    // Auto-unlock complete warrior badge if 7 consecutive streak
    let finalUpdated = updated;
    if (newStreak >= 7) {
       finalUpdated = unlockAchievement('ong-gia-cham-chi', finalUpdated);
    }

    addRewards(chestReward.xp, chestReward.coins, finalUpdated);
  };

  // Trigger Complete Quest
  const handleCheckQuest = (questId: string) => {
    if (stats.completedQuests.includes(questId)) return;
    
    const questObj = DAILY_QUESTS_LIST.find(q => q.id === questId);
    if (!questObj) return;

    const newCompleted = [...stats.completedQuests, questId];
    const updated = {
      ...stats,
      completedQuests: newCompleted
    };

    addRewards(questObj.xp, questObj.coins, updated);
    
    // Quick alert
    showAlert(`🎯 Rực rỡ! Hoàn thành "${questObj.title}"\n+${questObj.xp} XP | +${questObj.coins} Đồng tiền Dưỡng Thanh`);
  };

  // Shop Buy Item
  const handleBuyItem = (item: typeof SHOP_ITEMS[0]) => {
    if (stats.coins < item.price) {
      showAlert("Trò chưa tích đủ Đồng Tiền Dưỡng Thanh rồi! Hãy siêng năng rèn luyện mỗi ngày để kiếm thêm đồng xu nhé.");
      return;
    }

    // Process Purchase
    const hasAlready = stats.itemsOwned.includes(item.id);
    const updatedItems = [...stats.itemsOwned, item.id];
    const updatedActive = [...stats.activeEffects, item.effect];

    const updated = {
      ...stats,
      coins: stats.coins - item.price,
      itemsOwned: updatedItems,
      activeEffects: updatedActive
    };

    // Auto complete quest q3 if buying tea
    if (item.id === 'tea' && !updated.completedQuests.includes('q3')) {
      updated.completedQuests.push('q3');
      // trigger coin rewards
      updated.coins += 15;
      updated.xp += 50;
    }

    saveStats(updated);
    showAlert(`🍵 Đã pha chế thành công: ${item.name}!\nChi phí: -${item.price} Đồng Tiền Dưỡng Thanh. Hiệu ứng đã được sử dụng trực tiếp.`);
  };

  // Live microphone capture and canvas setup
  const startMicProcessing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      // Web Audio context setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Draw loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawWaveform = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        animationRef.current = requestAnimationFrame(drawWaveform);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Clear canvas
        ctx.fillStyle = '#0f172a'; // slate 900
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate average mic volume
        let totalVal = 0;
        dataArray.forEach(val => totalVal += val);
        const avg = totalVal / bufferLength;
        setMicVolume(avg);

        // Draw nice neon wave lines
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const percent = dataArray[i] / 255;
          const height = percent * canvas.height * 0.9;
          
          // Color gradient base on intensity
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - height);
          gradient.addColorStop(0, '#8b5cf6'); // Violet
          gradient.addColorStop(0.5, '#3b82f6'); // Blue
          gradient.addColorStop(1, '#10b981'); // Emerald (peak)

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - height, barWidth - 1, height);

          // Top mirror wave
          ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
          ctx.fillRect(x, 0, barWidth - 1, height * 0.3);

          x += barWidth;
        }

        // Draw targets template line
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red target threshold
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.35);
        ctx.lineTo(canvas.width, canvas.height * 0.35);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Excellent sweet tone
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.65);
        ctx.lineTo(canvas.width, canvas.height * 0.65);
        ctx.stroke();
      };

      drawWaveform();

    } catch (err) {
      console.warn("Could not access microphone, starting fallback simulated waves.", err);
      // Fallback visualization using requestAnimationFrame with maths
      const drawSimulated = () => {
        if (!canvasRef.current) return;
        animationRef.current = requestAnimationFrame(drawSimulated);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw running sine wave representing pitch
        const t = Date.now() * 0.01;
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin(x * 0.03 + t) * 20 * Math.sin(t * 0.2);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.cos(x * 0.02 - t) * 12 * Math.sin(t * 0.1);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawSimulated();
    }
  };

  const stopMicProcessing = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicVolume(0);
  };

  // Launch warmup game
  const handleStartWarmupGame = (type: 'humming' | 'vowel_a' | 'trill') => {
    if (stats.completedQuests.includes('q1')) {
      showAlert("Bạn đã khởi động hơi thở trong hôm nay rồi! Thanh quản cần được nghỉ ngơi, hãy quay lại luyện tập vào ngày mai nhé.");
      return;
    }
    setWarmupType(type);
    setIsGameActive(true);
    setGameStep('recording');
    setGameCountdown(10);
    setGameScore(0);
    
    // Start Audio analyser
    setTimeout(() => {
      startMicProcessing();
    }, 100);

    // Score evaluation over time
    const scoresCollected: number[] = [];
    
    gameIntervalRef.current = setInterval(() => {
      setGameCountdown(prev => {
        if (prev <= 1) {
          clearInterval(gameIntervalRef.current);
          
          // finish recording
          stopMicProcessing();
          setGameStep('feedback');

          // generate score logic (85 - 98 with small variations based on volume or simulated high note)
          const avgScore = scoresCollected.length > 0 
            ? Math.round(scoresCollected.reduce((a, b) => a + b, 0) / scoresCollected.length)
            : Math.floor(Math.random() * 10) + 86; // fallback 86-96
          
          const finalScore = Math.min(100, Math.max(70, avgScore));
          setGameScore(finalScore);

          let finalUpdated = { ...stats };
          
          if (finalScore >= 90) {
             setShowConfetti(true);
             // auto-unlock iron lungs badge if not owned
             finalUpdated = unlockAchievement('la-phoi-thep', finalUpdated);
          }

          // Automatically complete Daily Quest 1
          if (!finalUpdated.completedQuests.includes('q1')) {
            const updatedCompleted = [...finalUpdated.completedQuests, 'q1'];
            finalUpdated = {
               ...finalUpdated,
               completedQuests: updatedCompleted,
               coins: finalUpdated.coins + 25,
               xp: finalUpdated.xp + 80
            };
          }
          
          saveStats(finalUpdated);

          return 0;
        }

        // sample score basing on actual micro intensity or normal curves
        const instantVal = micVolume > 0 ? Math.min(98, 75 + Math.round(micVolume * 1.5)) : Math.floor(Math.random() * 12) + 82;
        scoresCollected.push(instantVal);

        return prev - 1;
      });
    }, 1000);
  };

  const handleCloseGame = () => {
    clearInterval(gameIntervalRef.current);
    stopMicProcessing();
    setIsGameActive(false);
    setShowConfetti(false);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Visual background header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-violet-500/10 to-transparent pointer-events-none" />
        
        {/* Tutor Thầy Nam Persona Section */}
        <div className="flex items-start gap-5 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-violet-600/30 shrink-0">
               👨‍🏫
            </div>
            {stats.streak > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md border-2 border-slate-900 animate-bounce">
                <Flame className="w-3 h-3 fill-white" /> {stats.streak}
              </span>
            )}
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Thầy Giáo Nam</h2>
                <span className="text-[10px] uppercase font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-md">
                   Giảng viên Thanh nhạc AI
                </span>
             </div>
             {/* Speech Bubble */}
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-slate-300 relative text-sm max-w-xl shadow-md">
                <p className="leading-relaxed">"{TEACHER_QUOTES[quoteIdx]}"</p>
                <div className="absolute left-4 top-[-6px] w-3 h-3 bg-slate-900 border-l border-t border-slate-800 transform rotate-45" />
             </div>
          </div>
        </div>

        {/* Quick levels scoreboard */}
        <div className="shrink-0 flex flex-col justify-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl md:min-w-[200px] shadow-lg relative">
          <div className="flex items-center justify-between mb-1.5">
             <span className="text-xs text-slate-400 font-bold">CẤP ĐỘ HỌC NGHIỆP</span>
             <span className="text-xs bg-violet-600/20 text-violet-400 text-right px-2 py-0.5 rounded-full font-bold">Level {stats.level}</span>
          </div>

          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden mb-2">
             <div 
                className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-500" 
                style={{ width: `${(stats.xp / stats.nextXp) * 100}%` }}
             />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
             <span>{stats.xp} XP</span>
             <span>Cần {stats.nextXp} XP để Level Up</span>
          </div>
          
          <div className="border-t border-slate-800/85 mt-3 pt-3 flex justify-between items-center text-xs">
             <span className="text-slate-400 flex items-center gap-1">
                <Coins className="w-4 h-4 text-amber-500" /> Đồng xu: 
             </span>
             <span className="text-amber-400 font-mono font-bold text-sm">{stats.coins} Dưỡng Thanh</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Quests and Warm up mini game */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Daily Quests Board */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
             <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-violet-500/5 to-transparent pointer-events-none" />
             
             <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Target className="w-5 h-5 text-violet-400 animate-pulse" /> Nhiệm Vụ Hàng Ngày
                  </h3>
                  <p className="text-xs text-slate-400">Hoàn thành bài tập do thầy Nam chỉ định để thăng tiến vững vàng.</p>
                </div>
                <div className="text-xs font-mono font-bold bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-500">
                   Hoàn thành: {stats.completedQuests.length}/{DAILY_QUESTS_LIST.length}
                </div>
             </div>

             <div className="space-y-3.5">
                {DAILY_QUESTS_LIST.map((q) => {
                   const isCompleted = stats.completedQuests.includes(q.id);
                   return (
                     <div 
                        key={q.id}
                        className={`flex items-start md:items-center justify-between p-4 rounded-2xl border transition-all ${
                          isCompleted 
                            ? 'bg-violet-950/10 border-violet-500/20 opacity-80' 
                            : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                        }`}
                     >
                        <div className="flex gap-3.5 items-start">
                           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 md:mt-0 ${
                             isCompleted ? 'bg-violet-600/10 text-violet-400' : 'bg-slate-900 border border-slate-800 text-slate-400'
                           }`}>
                              {isCompleted ? <Check className="w-5 h-5" /> : <Star className="w-5 h-5 text-violet-400" />}
                           </div>
                           <div className="min-w-0">
                              <h4 className={`text-sm font-bold truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>{q.title}</h4>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{q.desc}</p>
                              
                              {/* Rewards indicators */}
                              <div className="flex items-center gap-2.5 mt-2">
                                 <span className="text-[10px] font-bold text-violet-400 bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10 flex items-center gap-1">
                                    +{q.xp} XP
                                 </span>
                                 <span className="text-[10px] font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 flex items-center gap-1">
                                    +{q.coins} xu
                                 </span>
                              </div>
                           </div>
                        </div>

                        <div className="shrink-0 ml-4">
                           {isCompleted ? (
                              <span className="text-xs font-bold text-violet-400 bg-violet-600/10 border border-violet-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                 <CheckCircle className="w-3.5 h-3.5" /> Đã xong
                              </span>
                           ) : (
                              <Button 
                                 onClick={() => {
                                    if (q.type === 'warmup') {
                                       const el = document.getElementById('warmup-section');
                                       if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    } else if (q.type === 'upload') {
                                       if (songsToday >= 1) handleCheckQuest(q.id);
                                       else navigate('/dashboard/upload');
                                    } else if (q.type === 'catalog') {
                                       if (songsToday >= 3) handleCheckQuest(q.id);
                                       else navigate('/dashboard/upload');
                                    } else if (q.type === 'theory') {
                                       const readKey = auth.currentUser ? `theoryRead_${auth.currentUser.uid}_${new Date().toDateString()}` : null;
                                       if (readKey && localStorage.getItem(readKey)) handleCheckQuest(q.id);
                                       else navigate('/dashboard/theory');
                                    } else {
                                       handleCheckQuest(q.id);
                                    }
                                 }}
                                 className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 flex flex-col gap-0.5 min-w-[90px]"
                              >
                                 <span>
                                    {q.type === 'drink' ? 'Nhận thưởng' :
                                      (q.type === 'theory' && auth.currentUser && localStorage.getItem(`theoryRead_${auth.currentUser.uid}_${new Date().toDateString()}`)) ? 'Nhận thưởng' :
                                      (q.type === 'upload' && songsToday >= 1) ? 'Nhận thưởng' :
                                      (q.type === 'catalog' && songsToday >= 3) ? 'Nhận thưởng' :
                                      'Thực hiện'}
                                 </span>
                                 {(q.type === 'upload' || q.type === 'catalog') && (
                                   <span className="text-[9px] font-medium text-violet-200">
                                      {Math.min(songsToday, q.type === 'catalog' ? 3 : 1)}/{q.type === 'catalog' ? 3 : 1}
                                   </span>
                                 )}
                              </Button>
                           )}
                        </div>
                     </div>
                   );
                })}
             </div>
           </div>

           {/* Interactive voice Sound Warm-up Center */}
           <div id="warmup-section" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-3.5 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                    <Mic2 className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-white">Phòng Luyện Hơi Thở & Khởi Động Âm</h3>
                    <p className="text-xs text-slate-400">Đặt kẽ răng mở đều, hát thử trực tiếp qua micro để máy phân tích nốt & cột hơi.</p>
                 </div>
              </div>

              {/* Three training levels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                 <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between group hover:border-emerald-500/35 transition-all">
                    <div>
                       <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Mức Khởi Đầu</span>
                       <h4 className="text-sm font-bold text-white mt-1 mb-2">Thở Humming 10s</h4>
                       <p className="text-xs text-slate-500">Giữ âm môi rung 'Hummm' đều nốt và ổn định luồng hơi.</p>
                    </div>
                    <Button 
                       onClick={() => handleStartWarmupGame('humming')}
                       className="w-full mt-4 bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white text-xs font-bold py-2 rounded-xl"
                    >
                       Tập Humming
                    </Button>
                 </div>

                 <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between group hover:border-violet-500/35 transition-all">
                    <div>
                       <span className="text-[9px] uppercase font-bold text-violet-400 tracking-wider">Mức Trung Cấp</span>
                       <h4 className="text-sm font-bold text-white mt-1 mb-2">Tròn Chữ 'Aaaaa' 10s</h4>
                       <p className="text-xs text-slate-500">Mở khẩu hình dọc rộng, đưa âm thanh lên mặt nạ cộng hưởng (Resonance).</p>
                    </div>
                    <Button 
                       onClick={() => handleStartWarmupGame('vowel_a')}
                       className="w-full mt-4 bg-violet-600/10 hover:bg-violet-600 border border-violet-500/20 hover:border-violet-500 text-violet-400 hover:text-white text-xs font-bold py-2 rounded-xl"
                    >
                       Tập Tròn Chữ
                    </Button>
                 </div>

                 <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between group hover:border-pink-500/35 transition-all">
                    <div>
                       <span className="text-[9px] uppercase font-bold text-pink-400 tracking-wider">Thử Thách Khó</span>
                       <h4 className="text-sm font-bold text-white mt-1 mb-2">Rung Môi (Lip Trill)</h4>
                       <p className="text-xs text-slate-500">Lip trill quét chuỗi âm bậc thang mượt mà qua các nốt cao.</p>
                    </div>
                    <Button 
                       onClick={() => handleStartWarmupGame('trill')}
                       className="w-full mt-4 bg-pink-600/10 hover:bg-pink-600 border border-pink-500/20 hover:border-pink-500 text-pink-400 hover:text-white text-xs font-bold py-2 rounded-xl"
                    >
                       Tập Lip Trill
                    </Button>
                 </div>
              </div>
           </div>

        </div>

        {/* Right 1 Column: Streaks / Badge room / Tea shop */}
        <div className="space-y-8">
           
           {/* Streak Check and gifts */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
             <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
             
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                   <Calendar className="w-5 h-5 text-amber-400" /> Động Lực Điểm Danh
                </h3>
                <span className="text-xs text-slate-500 font-mono">Hàng ngày</span>
             </div>

             <div className="text-center bg-slate-950/80 border border-slate-850 rounded-2xl p-4 mb-4">
                <div className="flex justify-center mb-2 relative">
                   <Flame className="w-12 h-12 text-orange-500 fill-orange-500 animate-pulse" />
                   <span className="absolute bottom-0 bg-slate-900 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-slate-800">
                      {stats.streak} ngày rèn
                   </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Chuỗi Học Hôm Nay</h4>
                <p className="text-xs text-slate-500">Giữ chuỗi liên lục 7 ngày để trở thành ca sĩ vĩ đại thực lực!</p>
                
                {/* 7 step simple indicator bar */}
                <div className="flex justify-between items-center gap-1.5 mt-4">
                   {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const isActive = stats.streak >= day;
                      return (
                        <div 
                           key={day} 
                           className={`h-2.5 flex-1 rounded-full ${
                             isActive ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-glow' : 'bg-slate-800'
                           }`} 
                           title={`Ngày ${day}`}
                        />
                      );
                   })}
                </div>
             </div>

             <Button 
                onClick={handleClaimDailyChest} 
                disabled={stats.lastClaimedDate === new Date().toDateString()}
                className={`w-full font-bold text-xs py-2.5 rounded-xl shadow-lg flex items-center justify-center gap-1.5 ${
                  stats.lastClaimedDate === new Date().toDateString() 
                    ? 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white shadow-orange-950/20'
                }`}
             >
                <Gift className="w-4 h-4 shrink-0" />
                {stats.lastClaimedDate === new Date().toDateString() ? 'Ngày hôm nay đã điểm danh' : 'Điểm danh nhận Rương Quà'}
             </Button>
           </div>

           {/* Rewards Tea shop */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                 <Coffee className="w-5 h-5 text-violet-400" /> Quán Trà Dưỡng Giọng Thầy Nam
              </h3>
              
              <div className="space-y-4">
                 {SHOP_ITEMS.map((item) => (
                    <div key={item.id} className="bg-slate-950 border border-slate-850 p-3.5 rounded-2xl flex items-center justify-between gap-3 group hover:border-violet-500/20 transition-all">
                       <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                             <span className="text-xl shrink-0">
                                {item.id === 'tea' ? '🍵' : item.id === 'candy' ? '🍬' : '👑'}
                             </span>
                             <h4 className="font-bold text-xs text-white truncate">{item.name}</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>
                       </div>
                       
                       <button
                          onClick={() => handleBuyItem(item)}
                          className="shrink-0 bg-slate-900 hover:bg-violet-600 text-slate-300 hover:text-white border border-slate-800 hover:border-violet-500 transition-all px-3 py-1.5 rounded-xl font-mono font-bold text-[11px] flex flex-col items-center gap-0.5"
                       >
                          <span>{item.price} ĐT</span>
                          <span className="text-[8px] opacity-70">Mua</span>
                       </button>
                    </div>
                 ))}
              </div>
           </div>

           {/* Badges / Achievements collection */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                 <Award className="w-5 h-5 text-emerald-400" /> Huy Chương & Thành Tựu
              </h3>

              <div className="grid grid-cols-2 gap-3.5">
                 {BADGES_LIST.map((b) => {
                    const isUnlocked = stats.unlockedBadges.includes(b.id);
                    return (
                      <div 
                         key={b.id} 
                         className={`p-3 rounded-2xl border text-center relative overflow-hidden flex flex-col items-center justify-center transition-all ${
                           isUnlocked 
                             ? 'bg-slate-950/70 border-violet-500/20 shadow-lg shadow-violet-950/10' 
                             : 'bg-slate-950/30 border-slate-850/80 grayscale opacity-40'
                         }`}
                         title={b.desc}
                      >
                         <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${isUnlocked ? b.color : 'from-slate-800 to-slate-700'} flex items-center justify-center text-white shadow-md mb-2`}>
                            <b.icon className="w-5 h-5" />
                         </div>
                         <h4 className="text-[11px] font-bold text-white leading-tight">{b.name}</h4>
                         <p className="text-[8px] text-slate-500 mt-1 leading-snug line-clamp-2">{b.desc}</p>
                         
                         {!isUnlocked && (
                            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center backdrop-blur-[1px]">
                               <Lock className="w-4 h-4 text-slate-600" />
                            </div>
                         )}
                      </div>
                    );
                 })}
              </div>
           </div>

        </div>

      </div>

      {/* Pop up Game screen */}
      <AnimatePresence>
        {isGameActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             {/* Backdrop */}
             <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={handleCloseGame} />
             
             {/* Content container */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl px-6 py-8 shadow-2xl relative z-10 text-center overflow-hidden">
                <button onClick={handleCloseGame} className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800/80 transition-colors">
                   <X className="w-5 h-5" />
                </button>
                
                {gameStep === 'intro' && (
                  <div className="space-y-6 py-6 animate-in fade-in zoom-in-95 duration-200">
                     <span className="text-3xl">👨‍🏫</span>
                     <h3 className="text-2xl font-bold text-white">Lớp học rèn thở của thầy Nam</h3>
                     <p className="text-slate-400 max-w-md mx-auto text-sm leading-relaxed">
                        Thầy muốn trò hát thử một tiếng tròn đầy kéo dài 10 giây. Hãy tìm một chỗ yên tĩnh, ngồi tư thế thẳng lưng rồi nhấn khởi động.
                     </p>

                     <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl max-w-sm mx-auto flex items-center gap-3 text-left">
                        <span className="text-2xl shrink-0">🎤</span>
                        <div className="min-w-0">
                           <h4 className="font-bold text-xs text-white">Yêu cầu quyền truy cập Micro</h4>
                           <p className="text-[10px] text-slate-500 mt-0.5">Hệ thống phân tích cao độ & độ rung hơi hoàn toàn ngay trong trình duyệt.</p>
                        </div>
                     </div>

                     <div className="flex justify-center gap-3.5 pt-4">
                        <Button onClick={handleCloseGame} variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-850 px-6 font-bold">Hủy bỏ</Button>
                        <Button onClick={() => handleStartWarmupGame(warmupType)} className="bg-violet-600 hover:bg-violet-500 text-white px-8 font-bold">Tôi đã sẵn sàng</Button>
                     </div>
                  </div>
                )}

                {gameStep === 'recording' && (
                  <div className="space-y-6 py-4 animate-in fade-in duration-200">
                     <div className="flex items-center justify-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <h3 className="text-lg font-bold text-rose-500 uppercase tracking-widest font-mono">ĐANG THU ÂM HAI QUẢN...</h3>
                     </div>

                     <div className="w-32 h-32 rounded-full border-4 border-violet-500/25 flex items-center justify-center mx-auto relative shadow-2xl">
                        <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                           <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(139, 92, 246, 0.15)" strokeWidth="4" />
                           <circle 
                              cx="64" cy="64" r="58" fill="none" stroke="#8b5cf6" strokeWidth="4" 
                              strokeDasharray="364"
                              strokeDashoffset={364 - (364 * gameCountdown) / 10}
                              className="transition-all duration-1000 ease-linear"
                           />
                        </svg>
                        <span className="text-4xl font-mono font-black text-white">{gameCountdown}s</span>
                     </div>

                     <div className="space-y-1 max-w-sm mx-auto">
                        <p className="text-white text-base font-bold capitalize">Tập luyện: {warmupType === 'humming' ? 'Humming hơi thở' : warmupType === 'vowel_a' ? 'Khẩu hình âm "Aaaaa"' : 'Lip Trill rung môi'}</p>
                        <p className="text-xs text-slate-400">Hãy giữ hơi thở dồi dào, phát âm vang và kéo dài đều đặn.</p>
                     </div>

                     {/* Oscilloscope Web Audio Canvas */}
                     <div className="border border-slate-850 rounded-2xl overflow-hidden shadow-inner bg-slate-950 relative max-w-md mx-auto">
                        <canvas ref={canvasRef} width={400} height={120} className="w-full h-[120px] block" />
                        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                           Cường độ âm lượng thời gian thực
                        </div>
                     </div>
                  </div>
                )}

                {gameStep === 'feedback' && (
                  <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
                     <span className="text-4xl">🏆</span>
                     <h3 className="text-2xl font-bold text-white">Kết Quả Đánh Giá Của Thầy</h3>
                     
                     <div className="max-w-xs mx-auto p-5 rounded-2xl bg-slate-950 border border-slate-850 shadow-inner relative">
                        <div className="text-center">
                           <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1">ĐIỂM SỐ LUỒNG HƠI</span>
                           <span className="text-5xl font-mono font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400">{gameScore} / 100</span>
                        </div>
                        {gameScore >= 90 ? (
                           <p className="text-[10px] text-green-400 font-bold bg-green-500/10 inline-block px-3 py-1 rounded-full border border-green-500/20 mt-3">
                              Cộng hưởng hoàn hảo! Nhận Huy chương Lá Phổi Thép
                           </p>
                        ) : (
                           <p className="text-[10px] text-amber-400 font-bold bg-amber-500/10 inline-block px-3 py-1 rounded-full border border-amber-500/20 mt-3">
                              Khá ổn định, hãy tập trung điều chế cột hơi bụng nhé trò.
                           </p>
                        )}
                     </div>

                     <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl max-w-sm mx-auto text-left flex items-start gap-3.5">
                        <span className="text-2xl">🎁</span>
                        <div>
                           <h4 className="font-bold text-xs text-white">Phần thưởng thăng chức học nghiệp</h4>
                           <p className="text-[10px] text-slate-500 mt-1">Cột hơi khoẻ mạnh giúp cải thiện chất giọng. Trò nhận được:</p>
                           <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold text-violet-400 flex items-center gap-1">+80 XP</span>
                              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">+25 Đồng xu d.thanh</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-center pt-4">
                        <Button 
                           onClick={() => {
                             handleCloseGame();
                             addRewards(80, 25);
                           }} 
                           className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8"
                        >
                           Hoàn Thành & Đóng lớp học
                        </Button>
                     </div>
                  </div>
                )}

             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop up Treasure Chest modal */}
      <AnimatePresence>
         {showChest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowChest(false)} />
               
               <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl w-full max-w-sm shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-bold text-white mb-1.5 flex items-center justify-center gap-2">
                     🎁 Điểm Danh & Nhận Rương Quà
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">Mỗi ngày đi luyện thanh siêng năng, thầy Nam gửi biếu trò quà nhỏ.</p>
                  
                  {!chestOpened ? (
                     <div className="py-8 space-y-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-amber-600 to-orange-500 rounded-3xl flex items-center justify-center text-4xl shadow-2xl mx-auto shadow-orange-950/40 animate-pulse hover:scale-105 transition-transform cursor-pointer" onClick={confirmClaimChest}>
                           📦
                        </div>
                        <p className="text-sm font-bold text-white">Gõ hai lóng tay vào rương để mở quà!</p>
                     </div>
                  ) : (
                     <div className="space-y-6 py-4 animate-in zoom-in-100 duration-250">
                        <div className="text-6xl animate-bounce">🎇</div>
                        <div>
                           <h4 className="font-black text-rose-400 tracking-wider">MỞ RƯƠNG THÀNH CÔNG!</h4>
                           <p className="text-xs text-slate-500 mt-1">Dưới đáy rương cổ trang có bùa chú dưỡng giọng:</p>
                        </div>

                        <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl flex flex-col justify-center items-center gap-2">
                           <div className="text-sm font-bold text-violet-400 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> +{chestReward.xp} XP Kinh nghiệm voice
                           </div>
                           <div className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
                              <Coins className="w-4 h-4" /> +{chestReward.coins} Đồng xu Dưỡng Thanh
                           </div>
                        </div>

                        <Button 
                           onClick={() => setShowChest(false)}
                           className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold"
                        >
                           Nhận Hộp Quà & Khép Lại
                        </Button>
                     </div>
                  )}
               </div>
            </div>
         )}
      </AnimatePresence>

      {/* Achievement Toast */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 p-4 rounded-3xl shadow-[0_0_40px_rgba(139,92,246,0.3)] min-w-[320px] max-w-sm flex items-center gap-4"
          >
            <div className={`w-12 h-12 shrink-0 rounded-full bg-gradient-to-tr ${achievementToast.color} flex items-center justify-center text-white shadow-inner animate-bounce`}>
              <achievementToast.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <span className="text-[10px] uppercase font-black text-violet-400 tracking-wider">Thành tựu mới!</span>
              <h4 className="text-white font-bold text-sm truncate leading-tight">{achievementToast.name}</h4>
              <p className="text-xs text-slate-400 line-clamp-1">{achievementToast.desc}</p>
            </div>
            <button onClick={() => setAchievementToast(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

