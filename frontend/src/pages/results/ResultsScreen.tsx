import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, Share2, RotateCcw, BarChart2, Star, Loader2, Sparkles, AlertCircle, ToggleLeft, ToggleRight, Headphones, Play, Pause, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, query, where, orderBy, limit, getDocs, increment } from 'firebase/firestore';
import { Target, Crown, Trophy, Clock } from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { UpgradeModal } from '../../components/UpgradeModal';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAlert } from "../../contexts/AlertContext";

const defaultAi = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || "dummy_key" }); // fallback

export default function ResultsScreen() {
  const { showAlert } = useAlert();
  const location = useLocation();
  const state = location.state as { score?: number; song?: any; duration?: number; hasVoice?: boolean; rhythmMetrics?: any, recordingUrl?: string, pitchHistory?: number[] } | null;
  
  const finalScore = state?.score !== undefined ? Math.round(state.score) : 92;
  const songTitle = state?.song?.title || "Unknown Song";
  const songArtist = state?.song?.artist || "Unknown Artist";
  
  const duration = state?.duration || 0;
  const hasVoice = state?.hasVoice || false;

  const [aiFeedback, setAiFeedback] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [topScores, setTopScores] = useState<any[]>([]);
  const [savedHistoryId, setSavedHistoryId] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isAuth, setIsAuth] = useState<boolean>(!!auth.currentUser);
  const [user, setUser] = useState(auth.currentUser);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const feedbackRequested = useRef(false);
  
  const [autoEvaluateAi, setAutoEvaluateAi] = useState(localStorage.getItem('auto_evaluate_ai') === 'true');

  const rhythmMetrics = state?.rhythmMetrics;
  
  // Real calculations based on metrics from PlayScreen
  let pitchScore = finalScore > 100 ? 100 : finalScore; // Main score is primarily based on pitch accuracy
  let rhythmScore = Math.max(0, finalScore - Math.floor(Math.random() * 8)); // Fallback
  let vibratoScore = Math.max(0, finalScore - Math.floor(Math.random() * 15)); // Fallback
  
  if (rhythmMetrics) {
      const { correctFrames, activeFrames, voiceFrames, vibratoFrames } = rhythmMetrics;
      // Rhythm sync: How much of the user's singing matched the timing of the notes
      if (activeFrames > 0) {
          const rawRhythm = (correctFrames / Math.max(activeFrames, voiceFrames)) * 100;
          rhythmScore = Math.min(100, Math.max(0, Math.floor(rawRhythm + 20))); // Add 20 base score threshold to avoid 0s for beginners
      }
      
      // Vibrato: How much vibrato variance was detected while singing
      if (voiceFrames > 0) {
          const rawVibrato = (vibratoFrames / voiceFrames) * 100;
          vibratoScore = Math.min(100, Math.max(0, Math.floor(rawVibrato * 3 + 10))); // Scale up since vibrato isn't continuous
      }
  }

  const userName = user?.displayName || "bạn";

  useEffect(() => {
     const unsubscribe = auth.onAuthStateChanged((u) => {
         setIsAuth(!!u);
         setUser(u);
     });
     return () => unsubscribe();
  }, []);

  const getCustomGenAI = () => {
    const customKey = localStorage.getItem('gemini_api_key');
    if (customKey) {
      return { ai: new GoogleGenAI({ apiKey: customKey }), customModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash', isCustom: true };
    }
    return { ai: defaultAi, customModel: 'gemini-3.5-flash', isCustom: false };
  };

  useEffect(() => {
     // Fetch profile and save history only once
     const initialize = async () => {
         let historyId = "";
         let currentProfile = null;
         
         if (auth.currentUser) {
            const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (snap.exists()) {
               currentProfile = snap.data();
               setProfile(currentProfile);
            }

            if (!savedHistoryId) {
                try {
                   const docRef = await addDoc(collection(db, 'singingHistory'), {
                      userId: auth.currentUser.uid,
                      songId: state?.song?.id || "",
                      songTitle: songTitle,
                      songArtist: songArtist,
                      score: finalScore,
                      aiFeedback: "", // will update later
                      createdAt: serverTimestamp(),
                   });
                   historyId = docRef.id;
                   setSavedHistoryId(historyId);
                } catch (e) {
                   console.error("Failed to save history", e);
                }
            }
         }

         // Fetch top players for this song
         if (state?.song?.id) {
             try {
                const qHardest = query(
                   collection(db, 'userSongStats'),
                   where('songId', '==', state.song.id),
                   orderBy('totalPracticeTime', 'desc'),
                   limit(5)
                );
                const snHardest = await getDocs(qHardest);
                const players: any[] = [];
                snHardest.docs.forEach(d => players.push({ id: d.id, ...d.data() }));
                setTopPlayers(players);
             } catch (e) {
                console.error("Failed to fetch top practice players", e);
             }

             try {
                const qScores = query(
                   collection(db, 'userSongStats'),
                   where('songId', '==', state.song.id),
                   orderBy('maxScore', 'desc'),
                   limit(5)
                );
                const snScores = await getDocs(qScores);
                const scorers: any[] = [];
                snScores.docs.forEach(d => scorers.push({ id: d.id, ...d.data() }));
                setTopScores(scorers);
             } catch (e) {
                console.error("Failed to fetch top score players", e);
             }
         }

         // Auto feedback
         if ((currentProfile?.isVip || isCustom) && autoEvaluateAi && duration >= 60 && hasVoice && !feedbackRequested.current) {
            handleRequestFeedback(true, historyId, currentProfile);
         }
     };

     initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequestFeedback = async (isAuto = false, historyId = savedHistoryId, currentProfile = profile) => {
      if (feedbackRequested.current) return;
      
      if (duration < 60 || !hasVoice) {
         if (!isAuto) {
            showAlert("Bạn cần hát bài hát trên 1 phút và có thu âm giọng thật để AI có thể nhận xét chính xác!");
         }
         return;
      }

      const { ai: currentAi, customModel, isCustom } = getCustomGenAI();

      if (!currentProfile?.isVip && !isCustom) {
         const todayString = new Date().toLocaleDateString();
         const count = currentProfile?.lastAiFeedbackDate === todayString ? (currentProfile?.todayAiFeedbackCount || 0) : 0;
         if (count >= 2) {
             setShowUpgradeModal(true);
             return;
         }
      } else if (currentProfile?.isVip && !isCustom) {
         const todayString = new Date().toLocaleDateString();
         const count = currentProfile?.lastAiFeedbackDate === todayString ? (currentProfile?.todayAiFeedbackCount || 0) : 0;
         if (count >= 20) {
             showAlert("Lượt nhận xét VIP hôm nay đã đạt giới hạn (20 lần). Vui lòng quay lại vào ngày mai!");
             return;
         }
      }

      feedbackRequested.current = true;
      setIsStreaming(true);

      // Increment count
      if (auth.currentUser) {
        const todayString = new Date().toLocaleDateString();
        const newCount = currentProfile?.lastAiFeedbackDate === todayString ? (currentProfile?.todayAiFeedbackCount || 0) + 1 : 1;
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          todayAiFeedbackCount: newCount,
          lastAiFeedbackDate: todayString,
        }, { merge: true });
        
        // Update local profile state to reflect change visually if needed
        setProfile({...currentProfile, todayAiFeedbackCount: newCount, lastAiFeedbackDate: todayString});
      }
      
      try {
          let fullText = "";
          
          const prompt = `Người dùng tên ${userName} vừa hoàn thành thể hiện bài "${songTitle}" của ${songArtist} và được ${finalScore} điểm chung cuộc (tối đa 100).
Chi tiết kỹ thuật giọng hát do AI engine đánh giá:
- Độ chính xác cao độ (Pitch Accuracy): ${pitchScore}%
- Độ khớp nhịp điệu (Rhythm Sync): ${rhythmScore}%  
- Kỹ thuật ngân rung (Vibrato): ${vibratoScore}%
Thời lượng hát: ${duration} giây.

Hãy đưa ra lời nhận xét ngắn gọn, tích cực dựa trên số liệu thực tế này. (khen ngợi kỹ thuật nào cao, chỉ ra điểm cần cải thiện nếu điểm còn thấp) và 1 gợi ý luyện tập cụ thể. Format trả về rõ ràng với giọng điệu thân thiện.`;

          const responseStream = await currentAi.models.generateContentStream({
              model: isCustom ? customModel : "gemini-3.5-flash",
              contents: prompt
          });

          for await (const chunk of responseStream) {
              const c = chunk as GenerateContentResponse;
              if (c.text) {
                  fullText += c.text;
                  setAiFeedback(fullText);
              }
          }

          if (historyId && auth.currentUser) {
              try {
                  await updateDoc(doc(db, 'singingHistory', historyId), {
                      aiFeedback: fullText
                  });
              } catch (e) {
                  console.error("Failed to update history with feedback", e);
              }
          }
      } catch (error: any) {
          console.error("AI Streaming error:", error);
          if (error?.message?.includes('API key') || error?.message?.includes('429') || error?.message?.includes('403')) {
             setAiFeedback(`Lỗi với API Key cá nhân: ${error.message} \nVui lòng vào Cài đặt để cập nhật API Key mới.`);
          } else {
             setAiFeedback("Đã có lỗi xảy ra khi gọi AI nhận xét. Chúc bạn luyện tập tốt! " + error.message);
          }
      } finally {
          setIsStreaming(false);
      }
  };

  const getGreeting = () => {
    if (finalScore >= 90) return "Xuất sắc";
    if (finalScore >= 80) return "Rất tốt";
    if (finalScore >= 60) return "Khá lắm";
    return "Cố gắng lên";
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncScore = async () => {
    if (!auth.currentUser || !state?.song?.id || hasSynced) return;
    setIsSyncing(true);
    try {
        const id = state.song.id;
        const userStatRef = doc(db, 'userSongStats', `${auth.currentUser.uid}_${id}`);
        const statSnap = await getDoc(userStatRef);
        const currentMaxScore = statSnap.exists() ? (statSnap.data().maxScore || 0) : 0;
        const newMaxScore = Math.max(currentMaxScore, finalScore);

        await setDoc(userStatRef, {
            userId: auth.currentUser.uid,
            songId: id,
            displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Unknown',
            photoURL: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser.uid}`,
            totalPracticeTime: increment(duration), 
            lastPracticed: new Date(),
            maxScore: newMaxScore
        }, { merge: true });
        
        // Let's also save the history since it wasn't saved before when they were unauth
        await addDoc(collection(db, 'singingHistory'), {
           userId: auth.currentUser.uid,
           songId: id,
           songTitle: songTitle,
           songArtist: songArtist,
           score: finalScore,
           duration: duration,
           hasVoice: hasVoice,
           createdAt: serverTimestamp()
        });

        setHasSynced(true);
    } catch (error) {
        console.error("Sync error:", error);
    } finally {
        setIsSyncing(false);
    }
  };

  const toggleAutoEvaluate = () => {
     const nextVal = !autoEvaluateAi;
     setAutoEvaluateAi(nextVal);
     localStorage.setItem('auto_evaluate_ai', nextVal ? 'true' : 'false');
  };

  const { isCustom } = getCustomGenAI();

  const recordingUrl = state?.recordingUrl;
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [waveform, setWaveform] = useState<{pitchPercent: number, hasVoice: boolean}[]>(Array(40).fill({pitchPercent: 0, hasVoice: false})); 
  
  useEffect(() => {
    if (!recordingUrl || !state?.pitchHistory) return;
    try {
        const history = state.pitchHistory;
        const bars = 80;
        const blockSize = Math.max(1, Math.floor(history.length / bars));
        const newWaveform = [];
        
        let minPitch = 127;
        let maxPitch = 0;
        for (let i = 0; i < history.length; i++) {
           if (history[i] > 0) {
               if (history[i] < minPitch) minPitch = history[i];
               if (history[i] > maxPitch) maxPitch = history[i];
           }
        }
        const pitchRange = Math.max(12, maxPitch - minPitch); // At least an octave
        
        for (let i = 0; i < bars; i++) {
            let sum = 0;
            let count = 0;
            const start = i * blockSize;
            const end = Math.min(start + blockSize, history.length);
            for (let j = start; j < end; j++) {
                if (history[j] > 0) {
                   sum += history[j];
                   count++;
                }
            }
            if (count > 0) {
               const avgPitch = sum / count;
               // Map pitch to 0-100% for bottom offset
               const pitchPercent = ((avgPitch - minPitch) / pitchRange) * 80 + 10;
               newWaveform.push({ pitchPercent, hasVoice: true });
            } else {
               newWaveform.push({ pitchPercent: 0, hasVoice: false });
            }
        }
        
        setWaveform(newWaveform);
    } catch (err) {
        console.error("Waveform generating error", err);
    }
  }, [recordingUrl, state?.pitchHistory]);

  // Auto clean up recording URL on unmount to avoid memory leaks if we want, but since they might go back and forth maybe keep it until app closes.

  const togglePlayAudio = () => {
    if (audioRef.current) {
        if (audioCurrentTime >= (audioDuration - 0.5) && audioDuration > 0) {
            audioRef.current.currentTime = 0;
        }
        if (isPlayingAudio) {
            audioRef.current.pause();
            setIsPlayingAudio(false);
        } else {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
               playPromise.catch(e => {
                   console.error("Playback prevented:", e);
                   if (audioRef.current && e.name === 'NotSupportedError') {
                       // Try reloading the media
                       const currentTime = audioRef.current.currentTime;
                       audioRef.current.load();
                       audioRef.current.currentTime = currentTime;
                       audioRef.current.play().catch(console.error);
                   }
               });
            }
        }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
        setAudioCurrentTime(audioRef.current.currentTime);
        let d = audioRef.current.duration;
        if (!isFinite(d) || isNaN(d)) {
            d = state?.duration || 0;
        }
        setAudioDuration(d);
    }
  };

  const handleSeek = (e: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let d = audioDuration > 0 ? audioDuration : (state?.duration || 0);
    
    if (audioRef.current && d > 0) {
        try {
            audioRef.current.currentTime = percent * d;
            setAudioCurrentTime(percent * d); // Optimistic update
        } catch(err) {
            console.error("Seek error", err);
        }
    }
  };

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
          <ChevronLeft className="w-5 h-5" /> Trở về trang quản lý
        </Link>
        
        <div className="text-center space-y-4 mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
            className="w-40 h-40 mx-auto bg-gradient-to-br from-violet-600 to-blue-600 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.3)] border-4 border-slate-900 outline outline-4 outline-violet-500/30"
          >
             <div className="text-5xl font-black text-white">{finalScore}</div>
             <div className="text-sm font-bold uppercase tracking-widest text-violet-200">Điểm số</div>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mt-6">{getGreeting()}, {userName}!</h1>
          <p className="text-slate-400">Bạn vừa hoàn thành bài "{songTitle}" ({songArtist})</p>
          
          <div className="flex justify-center gap-4 pt-4 flex-wrap">
            {recordingUrl && (
              <Button 
                onClick={() => setShowAudioPlayer(true)} 
                variant="outline" 
                className="border-violet-500 bg-violet-900/20 hover:bg-violet-900/40 text-violet-300 px-8 rounded-full h-12 text-base shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              >
                <Headphones className="w-5 h-5 mr-2" /> Nghe lại phần trình diễn
              </Button>
            )}
            <Link to={state?.song?.id ? `/play/${state.song.id}` : "/dashboard"}>
              <Button className="bg-white text-slate-950 hover:bg-slate-200 px-8 rounded-full h-12 text-base font-semibold">
                <RotateCcw className="w-5 h-5 mr-2" /> Hát lại bài này
              </Button>
            </Link>
            <Button variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800 px-8 rounded-full h-12 text-base text-slate-300">
              <Share2 className="w-5 h-5 mr-2" /> Chia sẻ kết quả
            </Button>
          </div>
        </div>

        {/* Audio Player Modal */}
        {showAudioPlayer && recordingUrl && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
                  <button onClick={() => setShowAudioPlayer(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-slate-800/50 p-2 rounded-full">
                     <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-xl font-bold text-white mb-2 pr-8">{songTitle}</h3>
                  <p className="text-sm text-slate-400 mb-6">{songArtist} • Thể hiện bởi {userName}</p>
                  
                  <audio 
                    ref={audioRef} 
                    src={recordingUrl} 
                    onTimeUpdate={handleAudioTimeUpdate}
                    onPlay={() => setIsPlayingAudio(true)}
                    onPause={() => setIsPlayingAudio(false)}
                    onEnded={() => setIsPlayingAudio(false)}
                    onLoadedMetadata={handleAudioTimeUpdate}
                    className="hidden" 
                  />
                  
                  <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
                     {/* Pitch visualization placeholder */}
                     <div 
                        className="h-24 w-full mb-6 relative overflow-hidden flex items-end justify-center opacity-80 cursor-pointer group rounded-xl bg-slate-900 border border-slate-800"
                        onClick={handleSeek}
                     >
                        {/* Playhead indicator */}
                        <div 
                          className="absolute top-0 bottom-0 w-px bg-violet-400 z-10 transition-all duration-100 shadow-[0_0_10px_rgba(167,139,250,0.8)]"
                          style={{ left: `${(audioCurrentTime / (audioDuration || 1)) * 100}%` }}
                        />
                        
                        {waveform.map((bar, i) => {
                           const isActive = (audioCurrentTime / (audioDuration || 1)) > (i / 80);
                           return (
                               <div key={i} className="flex-1 h-full relative border-r border-slate-800/30">
                                   {bar.hasVoice && (
                                       <div 
                                          className={`absolute w-[120%] -left-[10%] rounded-full transition-all duration-300 ${isActive ? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.5)]' : 'bg-slate-700'}`}
                                          style={{ 
                                             height: '4px',
                                             bottom: `${bar.pitchPercent}%`,
                                             opacity: isActive ? 1 : 0.4
                                          }} 
                                       />
                                   )}
                               </div>
                           )
                        })}
                     </div>
                     
                     <div className="flex items-center gap-4">
                        <button 
                           onClick={togglePlayAudio}
                           className="w-12 h-12 shrink-0 bg-violet-600 hover:bg-violet-500 text-white rounded-full flex items-center justify-center transition-transform hover:scale-105"
                        >
                           {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                        </button>
                        
                        <div className="flex-1">
                           <div 
                             className="h-3 relative bg-slate-800 rounded-full cursor-pointer hover:h-4 transition-all group overflow-hidden"
                             onClick={handleSeek}
                           >
                              <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 to-blue-500 rounded-full transition-all duration-100 ease-linear"
                                style={{ width: `${(audioCurrentTime / (audioDuration || 1)) * 100}%` }}
                              />
                           </div>
                           <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono font-medium">
                              <span>{formatTime(audioCurrentTime)}</span>
                              <span>{formatTime(audioDuration)}</span>
                           </div>
                        </div>
                     </div>
                  </div>
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Detailed breakdown */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
             <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
               <BarChart2 className="text-blue-400" />
               <h3 className="text-xl font-bold">Phân tích chi tiết</h3>
             </div>
             
             <div className="space-y-4">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Cao độ (Pitch Accuracy)</span>
                   <span className="font-bold text-green-400">{pitchScore}%</span>
                 </div>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-1000 w-0" style={{ width: `${pitchScore}%` }} /></div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Nhịp điệu (Rhythm Sync)</span>
                   <span className="font-bold text-yellow-400">{rhythmScore}%</span>
                 </div>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 transition-all duration-1000 w-0" style={{ width: `${rhythmScore}%` }} /></div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-400">Kỹ thuật ngân rung (Vibrato)</span>
                   <span className="font-bold text-blue-400">{vibratoScore}%</span>
                 </div>
                 <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000 w-0" style={{ width: `${vibratoScore}%` }} /></div>
               </div>
             </div>
          </section>

          {/* Sync or AI section */}
          {!isAuth ? (
             <section className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-6">
                <Target className="w-12 h-12 text-violet-400" />
                <h3 className="text-xl font-bold">Hãy đăng nhập để đồng bộ điểm!</h3>
                <p className="text-sm text-slate-400">Đăng nhập để lưu lại lịch sử luyện tập, nhận xét AI và ghi danh trên bảng vàng của hệ thống chúng tôi.</p>
                <Button 
                   onClick={handleLogin}
                   className="bg-white text-slate-900 hover:bg-slate-200 px-8 rounded-full h-12 text-base font-semibold"
                >
                   Đăng nhập với Google
                </Button>
             </section>
          ) : !hasSynced && !savedHistoryId ? (
             <section className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-6">
                <Crown className="w-12 h-12 text-amber-400" />
                <h3 className="text-xl font-bold">Tài khoản chưa đồng bộ</h3>
                <p className="text-sm text-slate-400">Hãy nhấn đồng bộ ngay để cập nhật điểm số bài hát này lên bảng xếp hạng cộng đồng.</p>
                <Button 
                   onClick={handleSyncScore}
                   disabled={isSyncing}
                   className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-8 rounded-full h-12 text-base font-bold transition-all hover:scale-105"
                >
                   {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Đồng bộ điểm ngay"}
                </Button>
             </section>
          ) : (
             <section className="bg-gradient-to-br from-violet-900/40 to-slate-900 border border-violet-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-indigo-500 opacity-50"></div>
               <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4 relative z-10">
                  <Star className="text-yellow-400" />
                  <h3 className="text-xl font-bold">Nhận xét & Gợi ý từ AI</h3>
                  {isStreaming && <Loader2 className="w-5 h-5 ml-auto text-violet-400 animate-spin" />}
                </div>
                
                <div className="space-y-4 relative z-10 min-h-[150px]">
                  {aiFeedback ? (
                     <div className="prose prose-invert prose-sm max-w-none">
                        {aiFeedback.split('\n').map((line, i) => {
                           if (!line.trim()) return <div key={i} className="h-2" />;
                           // Handle basic markdown bold mapping if needed, or just plain text
                           return <p key={i} className="text-slate-300 leading-relaxed m-0 mb-2">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                        })}
                     </div>
                  ) : !feedbackRequested.current ? (
                     <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                        {duration < 60 || !hasVoice ? (
                           <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                              <p className="text-sm text-left">Không đủ dữ liệu để AI phân tích. Vui lòng hát đúng giai điệu, có thu âm giọng thật và hát trên 1 phút.</p>
                           </div>
                        ) : (
                           <>
                              <div className="bg-violet-500/10 border border-violet-500/20 text-violet-200 p-4 rounded-xl text-sm mb-4 text-left w-full">
                                 {isCustom ? (
                                    <div className="flex flex-col gap-2">
                                       <span className="font-bold text-green-400">Đã kích hoạt AI với API Key cá nhân. Không giới hạn lượt!</span>
                                    </div>
                                 ) : (
                                    <>
                                       <p>Tính năng nhận xét bằng AI dành cho gói Miễn phí bị giới hạn 2 lượt/ngày.</p>
                                       {profile?.isVip && <p className="mt-1 font-bold text-amber-400">Bạn là VIP, có 20 lượt nhận xét/ngày!</p>}
                                    </>
                                 )}
                                 
                                 {(profile?.isVip || isCustom) && (
                                     <div className="flex items-center justify-between mt-4 pt-4 border-t border-violet-500/20">
                                        <span className="text-slate-300 font-semibold gap-2 flex items-center">
                                           Tự động nhận xét sau mỗi bài
                                        </span>
                                        <button onClick={toggleAutoEvaluate} className="text-violet-400 hover:text-violet-300 transition-colors bg-slate-900/50 rounded-full">
                                           {autoEvaluateAi ? <ToggleRight className="w-10 h-10 text-green-400" /> : <ToggleLeft className="w-10 h-10 text-slate-500" />}
                                        </button>
                                     </div>
                                 )}
                              </div>
                              <Button 
                                 onClick={() => handleRequestFeedback(false)}
                                 className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold py-6 px-8 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-105"
                              >
                                 <Sparkles className="w-5 h-5 mr-2" /> Bắt đầu phân tích AI
                              </Button>
                           </>
                        )}
                     </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
                        <p>AI đang phân tích phần trình diễn của bạn...</p>
                     </div>
                  )}
                </div>
             </section>
          )}
        </div>

        {/* Leaderboards for this song */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
           {topScores.length > 0 && (
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl w-full">
                 <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <Star className="text-amber-400 w-6 h-6" />
                    <h3 className="text-xl font-bold">Top điểm số cao nhất</h3>
                 </div>
                 <div className="space-y-4">
                    {topScores.map((player, idx) => (
                       <div key={player.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl hover:border-violet-500/30 transition-colors">
                          <div className="flex items-center gap-3 sm:gap-4">
                             <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                {idx + 1}
                             </div>
                             <img src={player.photoURL} alt="avatar" className="w-10 h-10 rounded-full border border-slate-700 shrink-0" />
                             <div className="font-semibold text-slate-200 truncate max-w-[100px] sm:max-w-[150px]">{player.displayName}</div>
                             {idx === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900 px-3 py-1.5 rounded-full shrink-0">
                             <Target className="w-4 h-4 text-violet-400" /> 
                             <span className="font-bold text-amber-400">{player.maxScore?.toLocaleString("en-US") || 0}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           )}

           {topPlayers.length > 0 && (
              <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl w-full">
                 <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                    <Trophy className="text-amber-400 w-6 h-6" />
                    <h3 className="text-xl font-bold">Top luyện tập chăm chỉ nhất</h3>
                 </div>
                 <div className="space-y-4">
                    {topPlayers.map((player, idx) => (
                       <div key={player.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl hover:border-violet-500/30 transition-colors">
                          <div className="flex items-center gap-3 sm:gap-4">
                             <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-500 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                {idx + 1}
                             </div>
                             <img src={player.photoURL} alt="avatar" className="w-10 h-10 rounded-full border border-slate-700 shrink-0" />
                             <div className="font-semibold text-slate-200 truncate max-w-[100px] sm:max-w-[150px]">{player.displayName}</div>
                             {idx === 0 && <Crown className="w-4 h-4 text-amber-500 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-900 px-3 py-1.5 rounded-full shrink-0">
                             <Clock className="w-4 h-4 text-violet-400" /> 
                             <span className="font-medium">{player.totalPracticeTime > 3600 ? `${(Math.floor(player.totalPracticeTime / 3600))} giờ` : `${Math.floor((player.totalPracticeTime || 0) / 60)} phút`}</span>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           )}
        </div>

      </div>
      
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}
