import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Mic, Square, RefreshCw, AudioLines, Sparkles, CheckCircle2, ChevronRight, Play, Activity, Info, Target, Crown, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { GoogleGenAI } from "@google/genai";
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { UpgradeModal } from '../../components/UpgradeModal';
import { useAlert } from "../../contexts/AlertContext";

function getGeminiClient(apiKey?: string | null) {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6

const voiceTypes = [
  { name: 'Bass (Nam trầm)', min: 40, max: 64, desc: 'Giọng nam trầm, sâu lắng và uy lực.', genres: 'Jazz, Classical, R&B trầm' },
  { name: 'Baritone (Nam trung)', min: 43, max: 67, desc: 'Giọng nam phổ biến nhất, ấm áp và dày dặn.', genres: 'Pop, Rock, Country, Jazz' },
  { name: 'Tenor (Nam cao)', min: 48, max: 72, desc: 'Giọng nam cao, sáng và tràn đầy năng lượng.', genres: 'Pop, Rock, R&B, Musical' },
  { name: 'Alto/Contralto (Nữ trầm)', min: 53, max: 77, desc: 'Giọng nữ trầm, dày, tối và có chiều sâu.', genres: 'Jazz, Blues, Soul, R&B' },
  { name: 'Mezzo-Soprano (Nữ trung)', min: 57, max: 81, desc: 'Giọng nữ trung, linh hoạt và phong phú.', genres: 'Pop, R&B, Musical, Classical' },
  { name: 'Soprano (Nữ cao)', min: 60, max: 84, desc: 'Giọng nữ cao, vang sáng và bay bổng.', genres: 'Classical, Opera, Pop Ballad, Musical' }
];

function getVoiceType(min: number, max: number) {
  const userCenter = (min + max) / 2;
  let bestMatch = voiceTypes[0];
  let minDiff = Infinity;

  voiceTypes.forEach(vt => {
    const vtCenter = (vt.min + vt.max) / 2;
    const diff = Math.abs(vtCenter - userCenter);
    if (diff < minDiff) {
      minDiff = diff;
      bestMatch = vt;
    }
  });

  return bestMatch;
}

function getNoteFromFrequency(frequency: number) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function getNoteName(midi: number) {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTES[midi % 12];
  return `${name}${octave}`;
}

function autoCorrelate(buf: Float32Array, sampleRate: number) {
  let SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // not enough signal

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++)
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++)
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE - i; j++)
      c[i] = c[i] + buf[j] * buf[j + i];

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

export default function DashboardAIEvaluate() {
  const { showAlert } = useAlert();
  const [testState, setTestState] = useState<'IDLE' | 'RECORDING' | 'ANALYZING' | 'RESULT' | 'CHECKING_KEY'>('IDLE');
  const [recordingTime, setRecordingTime] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  
  // Pitch Detection States
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [minNote, setMinNote] = useState<number | null>(null);
  const [maxNote, setMaxNote] = useState<number | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimeRef = useRef(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>();
  const maxVolumeRef = useRef<number>(0);

  useEffect(() => {
    if (auth.currentUser) {
       const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
         if (doc.exists()) {
           setProfile(doc.data());
         }
       });
       return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const getCustomGenAI = () => {
    const customKey = localStorage.getItem('gemini_api_key');
    if (customKey) {
      return { ai: getGeminiClient(customKey), customModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash', isCustom: true };
    }
    return { ai: getGeminiClient((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY), customModel: 'gemini-3.1-pro-preview', isCustom: false };
  };

  const checkKeyAndStartRecording = async () => {
    const { isCustom, ai: currentAi, customModel } = getCustomGenAI();

    if (!profile?.isVip && !isCustom) {
       const todayString = new Date().toLocaleDateString();
       const count = profile?.lastEvalDate === todayString ? (profile?.todayEvalsCount || 0) : 0;
       if (count >= 3) {
          setShowUpgradeModal(true);
          return;
       }
    }

    if (isCustom) {
      setTestState('CHECKING_KEY');
      if (!currentAi) {
        setTestState('IDLE');
        showAlert("Chưa có Gemini API key. Tính năng AI tạm thời bị tắt.");
        return;
      }
      try {
        // Quick verification of the API key
        await currentAi.models.generateContent({
           model: customModel,
           contents: "Test API Key"
        });
      } catch (err: any) {
        console.error("API Key Verification failed:", err);
        setTestState('IDLE');
        if (err.message?.includes('API key not valid') || err.message?.includes('403')) {
          showAlert("API Key không hợp lệ hoặc đã hết hạn/hết lượt. Vui lòng vào Cài đặt để cập nhật API Key mới!");
        } else if (err.message?.includes('429')) {
          showAlert("API Key của bạn đã đạt giới hạn quota (het luot). Vui lòng sử dụng API Key khác!");
        } else {
          showAlert("Lỗi kiểm tra API Key: " + err.message);
        }
        return;
      }
    }

    startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordingTimeRef.current < 5) return;
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await analyzeAudio(audioBlob, mediaRecorder.mimeType);
      };

      mediaRecorder.start();
      
      // Pitch Detection Initialization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 2048;
      analyzerRef.current = analyzer;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);

      const bufferLength = analyzer.fftSize;
      const buffer = new Float32Array(bufferLength);

      const updatePitch = () => {
        analyzer.getFloatTimeDomainData(buffer);
        
        // Calculate RMS for volume check
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        if (rms > maxVolumeRef.current) {
          maxVolumeRef.current = rms;
        }

        const ac = autoCorrelate(buffer, audioCtx.sampleRate);

        if (ac !== -1) {
          const note = getNoteFromFrequency(ac);
          if (note >= MIN_MIDI - 12 && note <= MAX_MIDI + 12) {
            setActiveNote(note);
            setMinNote(prev => prev === null ? note : Math.min(prev, note));
            setMaxNote(prev => prev === null ? note : Math.max(prev, note));
          }
        } else {
          setActiveNote(null);
        }
        requestRef.current = requestAnimationFrame(updatePitch);
      };

      maxVolumeRef.current = 0;
      updatePitch();

      setTestState('RECORDING');
      setRecordingTime(0);
      setMinNote(null);
      setMaxNote(null);
      recordingTimeRef.current = 0;
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          if (next >= 60) { // Max 60 seconds
            stopRecording();
            return 60;
          }
          return next;
        });
      }, 1000);
      
    } catch (err) {
      showAlert("Vui lòng cấp quyền Microphone để sử dụng tính năng này.");
      setTestState('IDLE');
    }
  };

  const stopRecording = () => {
    if (recordingTimeRef.current < 5) {
      showAlert("Vui lòng thu âm ít nhất 5 giây để AI có thể phân tích chính xác.");
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      stopMediaTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      setTestState('IDLE');
      setActiveNote(null);
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    stopMediaTracks();
    if (timerRef.current) clearInterval(timerRef.current);
    
    setTestState('ANALYZING');
    setActiveNote(null);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const analyzeAudio = async (audioBlob: Blob, mimeType: string) => {
    try {
      if (maxVolumeRef.current < 0.02) {
        setAnalysisResult("Hệ thống không thu được âm thanh rõ ràng hoặc quá im lặng. Vui lòng kiểm tra lại micro và hát thành tiếng lớn hơn rồi thu âm lại.");
        setTestState('RESULT');
        return;
      }

      const base64Audio = await blobToBase64(audioBlob);
      
      const vType = minNote !== null && maxNote !== null ? getVoiceType(minNote, maxNote) : null;
      const detectedRange = minNote !== null && maxNote !== null ? `${getNoteName(minNote)} - ${getNoteName(maxNote)}` : "Không xác định";
      
      const promptText = `Bạn là một Huấn luyện viên Thanh nhạc (voice Coach) chuyên nghiệp. Hãy phân tích đoạn thu âm ngắn này.
      Thông tin kỹ thuật từ hệ thống thu được:
      - Quãng giọng (voice Range) ghi nhận: ${detectedRange}
      - Phân loại giọng (Voice Type) dự kiến: ${vType ? vType.name : "Chưa xác định"}
      
      Hãy cung cấp "Nhận xét chuyên môn" chi tiết nhưng dễ hiểu cho học trò:
      1) Phân tích Cao độ (Pitch Analysis): Âm thanh phát ra có đúng trọng tâm (on-pitch), bị non (flat - lệch thấp hơn) hay sắc (sharp - lệch cao hơn), có bị rung rinh phô chênh ở đoạn nào không?
      2) Khớp nhịp & Tiết tấu (Rhythm & Timing): Độ ổn định và phách nhịp.
      3) Âm sắc & Kỹ thuật (Tone & Technique): Cảm nhận về vị trí âm thanh, hỗ trợ hơi (breath support), độ mở khẩu hình và truyền cảm.
      
      Trình bày bằng tiếng Việt, mang tính sư phạm, khích lệ người học. Dùng gạch đầu dòng ngắn gọn, rõ ràng. Nếu file âm thanh quá ồn hoặc không phải giọng người, hãy nhắc nhở học viên thu âm lại ở nơi yên tĩnh hơn.`;

      const { ai: currentAi, customModel, isCustom } = getCustomGenAI();
      if (!currentAi) {
        showAlert("Chưa có Gemini API key. Tính năng AI tạm thời bị tắt.");
        setTestState('RESULT');
        return;
      }

      let modelToUse = customModel;
      if (!isCustom) {
        modelToUse = "gemini-3.1-pro-preview";
      }

      setTestState('RESULT');
      setAnalysisResult('');

      const responseStream = await currentAi.models.generateContentStream({
        model: modelToUse,
        contents: {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio
              }
            }
          ]
        }
      });

      let fullText = '';
      for await (const chunk of responseStream) {
         if (chunk.text) {
           fullText += chunk.text;
           setAnalysisResult(fullText);
         }
      }

      // Auto-save to history if user is logged in
      if (auth.currentUser) {
        try {
          const userRange = minNote !== null && maxNote !== null ? `${getNoteName(minNote)} - ${getNoteName(maxNote)}` : "N/A";
          const vType = minNote !== null && maxNote !== null ? getVoiceType(minNote, maxNote) : null;
          
          await addDoc(collection(db, 'voiceEvaluations'), {
            userId: auth.currentUser.uid,
            minNote: minNote !== null ? getNoteName(minNote) : null,
            maxNote: maxNote !== null ? getNoteName(maxNote) : null,
            voiceType: vType ? vType.name : null,
            analysisResult: fullText,
            createdAt: serverTimestamp(),
            score: 0 // Could be parsed from text if needed
          });

          // Update user profile summary
          const todayString = new Date().toLocaleDateString();
          const newCount = profile?.lastEvalDate === todayString ? (profile?.todayEvalsCount || 0) + 1 : 1;
          
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            userId: auth.currentUser.uid,
            displayName: auth.currentUser.displayName,
            bestVoiceType: vType ? vType.name : null,
            bestVoiceRange: userRange,
            todayEvalsCount: newCount,
            lastEvalDate: todayString,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          console.log("Evaluation saved successfully");
        } catch (saveErr) {
          console.error("Error saving evaluation:", saveErr);
        }
      }
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      if (error?.message?.includes('API key') || error?.message?.includes('429')) {
        setAnalysisResult(`Lỗi API Key: ${error.message} (Vui lòng nâng cấp gói hoặc cập nhật lại API Key mới trong Cài đặt).`);
      } else {
        setAnalysisResult("Đã có lỗi xảy ra kết nối với AI (Vui lòng thử lại sau). " + error);
      }
      setTestState('RESULT');
    }
  };

  const resetTest = () => {
    setTestState('IDLE');
    setRecordingTime(0);
    setAnalysisResult('');
  };

  const isCustomKeyConfigured = !!localStorage.getItem('gemini_api_key');

  // Format time (ex: 00:05)
  const formatTime = (secs: number) => {
    return `00:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium text-sm mb-4">
          <Sparkles className="w-4 h-4" />
          AI ToneForge
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">Hát và đánh giá bởi AI</h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Thu âm trực tiếp một đoạn điệp khúc hoặc bài hát bạn yêu thích (tối đa 60 giây). AI sẽ lắng nghe và phân tích cao độ, nhịp điệu và âm sắc như một huấn luyện viên thanh nhạc thực thụ.
        </p>
        
        {isCustomKeyConfigured ? (
          <p className="text-blue-400 text-sm mt-3 font-semibold">
             <CheckCircle2 className="w-4 h-4 inline mr-1 -mt-1"/>
             Đang sử dụng API Key Cấu hình (Không giới hạn lượt truy cập)
          </p>
        ) : !profile?.isVip ? (
           <p className="text-amber-500 text-sm mt-3 font-semibold">
              <Crown className="w-4 h-4 inline mr-1 -mt-1"/>
              Hôm nay bạn đã dùng: {profile?.lastEvalDate === new Date().toLocaleDateString() ? (profile?.todayEvalsCount || 0) : 0}/3 lượt miễn phí
           </p>
        ) : null}
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {/* STAGE: IDLE */}
            {testState === 'IDLE' && (
              <motion.div
                key="stage-idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-32 h-32 rounded-full bg-slate-800/80 border-4 border-slate-700 flex items-center justify-center mb-8 shadow-2xl relative group cursor-pointer" onClick={checkKeyAndStartRecording}>
                  <div className="absolute inset-0 rounded-full bg-violet-500/20 scale-0 group-hover:scale-100 transition-transform duration-300" />
                  <Mic className="w-12 h-12 text-slate-300 group-hover:text-white relative z-10" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">Bắt đầu thu âm giọng hát</h3>
                <p className="text-slate-400 mb-8 max-w-md text-center">
                  Thể hiện một đoạn hát ngắn (tối đa 60 giây). Hệ thống AI sẽ tự động đo lường cao độ trực tiếp và phân tích chất lượng giọng hát rộng khắp quãng giọng của bạn.
                </p>

                <Button 
                  size="lg" 
                  onClick={checkKeyAndStartRecording}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-full font-bold px-8 py-6 h-auto shadow-[0_0_30px_rgba(124,58,237,0.3)] transition-all hover:scale-105"
                >
                  <Play className="w-5 h-5 mr-2" /> Bắt đầu thu âm
                </Button>
              </motion.div>
            )}

            {/* STAGE: CHECKING KEY */}
            {testState === 'CHECKING_KEY' && (
              <motion.div
                key="stage-checking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent" 
                  />
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Đang kiểm tra API Key...</h3>
                <p className="text-blue-300 text-center max-w-sm text-sm">
                  Vui lòng đợi vài giây để hệ thống xác thực mã API Key của bạn.
                </p>
              </motion.div>
            )}

            {/* STAGE: RECORDING */}

            {testState === 'RECORDING' && (
              <motion.div
                key="stage-recording"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center w-full"
              >
                <div className="w-full max-w-sm mb-8">
                   <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-violet-500/5 animate-pulse"></div>
                      <span className="text-slate-500 text-xs font-bold uppercase block mb-2 relative z-10">Nốt đang hát (Live Pitch)</span>
                      <span className="text-4xl font-black text-violet-400 relative z-10 block tracking-wider">
                         {activeNote !== null ? getNoteName(activeNote) : '--'}
                      </span>
                   </div>
                </div>

                <div className="flex items-end justify-center gap-2 h-24 mb-6 w-full max-w-sm">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: activeNote ? [`${Math.random() * 40 + 40}%`, `${Math.random() * 20 + 70}%`, `${Math.random() * 40 + 40}%`] : [`10%`, `15%`, `10%`] }}
                      transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                      className={`w-3 rounded-full ${activeNote ? 'bg-violet-500' : 'bg-slate-700'}`}
                    />
                  ))}
                </div>
                
                <div className="text-5xl font-mono font-bold text-white tracking-widest mb-10 text-shadow-glow">
                  {formatTime(recordingTime)}
                </div>
                
                <Button 
                  size="lg" 
                  onClick={stopRecording}
                  className="bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold px-10 py-6 h-auto shadow-[0_0_30px_rgba(225,29,72,0.4)]"
                >
                  <Square className="w-5 h-5 mr-3 fill-current" />
                  KẾT THÚC & PHÂN TÍCH
                </Button>
              </motion.div>
            )}

            {/* STAGE: ANALYZING */}
            {testState === 'ANALYZING' && (
              <motion.div
                key="stage-analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent" 
                  />
                  <motion.div
                     animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                     <AudioLines className="w-12 h-12 text-violet-400" />
                  </motion.div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">AI đang phân tích giọng hát...</h3>
                <p className="text-violet-300 text-center max-w-sm">
                  Gemini AI đang bóc tách cao độ, cảm nhịp và chất giọng của bạn. Quá trình này mất khoảng 5-10 giây.
                </p>
              </motion.div>
            )}

            {/* STAGE: RESULT */}
            {testState === 'RESULT' && (
              <motion.div
                key="stage-result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full text-left"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Nhận xét từ ToneForge AI</h2>
                  </div>

                  {minNote !== null && maxNote !== null && (
                     <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-6">
                        <div className="text-center">
                           <span className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Cữ âm sử dụng</span>
                           <span className="text-lg font-bold text-violet-400">
                              {getNoteName(minNote)} - {getNoteName(maxNote)}
                           </span>
                        </div>
                        <div className="w-px h-8 bg-slate-800"></div>
                        <div className="text-center">
                           <span className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Dự đoán chất giọng</span>
                           <span className="text-lg font-bold text-amber-500">
                              {getVoiceType(minNote, maxNote).name.split(' (')[0]}
                           </span>
                        </div>
                     </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8 prose prose-invert prose-violet max-w-none">
                  {!analysisResult && (
                     <div className="flex items-center gap-3 text-violet-400 py-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="font-semibold">AI đang soạn nhận xét chuyên môn...</span>
                     </div>
                  )}
                  {/* Clean up the markdown from AI for better UI */}
                  {analysisResult.split('\n').map((line, i) => {
                     if (line.startsWith('##')) return <h3 key={i} className="text-xl font-bold text-violet-400 mt-6 mb-3">{line.replace(/##/g, '')}</h3>
                     if (line.startsWith('#')) return <h2 key={i} className="text-2xl font-bold text-white mt-8 mb-4">{line.replace(/#/g, '')}</h2>
                     if (line.startsWith('* ') || line.startsWith('- ')) return (
                        <div key={i} className="flex items-start gap-3 mb-3">
                           <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                           <p className="text-slate-300 m-0">{line.substring(2)}</p>
                        </div>
                     )
                     if (line.match(/^\d+\./)) return (
                        <div key={i} className="flex items-start gap-3 mb-4 mt-6">
                           <ChevronRight className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                           <p className="text-slate-200 font-semibold m-0">{line}</p>
                        </div>
                     )
                     if (!line.trim()) return <div key={i} className="h-2" />;
                     return <p key={i} className="text-slate-300 leading-relaxed">{line}</p>
                  })}
                </div>

                <div className="flex justify-center gap-4">
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={resetTest}
                    className="border-slate-700 text-slate-300 hover:text-white rounded-full font-bold px-8 h-12"
                  >
                     <RefreshCw className="w-4 h-4 mr-2" /> Thử lại
                  </Button>
                  <Link to="/dashboard/history">
                    <Button 
                      size="lg" 
                      className="bg-violet-600 hover:bg-violet-500 text-white rounded-full font-bold px-8 h-12"
                    >
                      <Activity className="w-4 h-4 mr-2" /> Xem lịch sử
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}



