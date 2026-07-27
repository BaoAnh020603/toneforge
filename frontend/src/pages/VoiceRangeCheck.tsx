import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mic, Play, Info, Check, X, AlertTriangle, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAlert } from "../contexts/AlertContext";

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIN_MIDI = 36; // C2
const MAX_MIDI = 84; // C6

const VOCAL_TYPES = [
  { name: 'Bass (Nam trầm)', min: 40, max: 64, desc: 'Giọng nam trầm, sâu lắng và uy lực.', genres: 'Jazz, Classical, R&B trầm' },
  { name: 'Baritone (Nam trung)', min: 43, max: 67, desc: 'Giọng nam phổ biến nhất, ấm áp và dày dặn.', genres: 'Pop, Rock, Country, Jazz' },
  { name: 'Tenor (Nam cao)', min: 48, max: 72, desc: 'Giọng nam cao, sáng và tràn đầy năng lượng.', genres: 'Pop, Rock, R&B, Musical' },
  { name: 'Alto/Contralto (Nữ trầm)', min: 53, max: 77, desc: 'Giọng nữ trầm, dày, tối và có chiều sâu.', genres: 'Jazz, Blues, Soul, R&B' },
  { name: 'Mezzo-Soprano (Nữ trung)', min: 57, max: 81, desc: 'Giọng nữ trung, linh hoạt và phong phú.', genres: 'Pop, R&B, Musical, Classical' },
  { name: 'Soprano (Nữ cao)', min: 60, max: 84, desc: 'Giọng nữ cao, vang sáng và bay bổng.', genres: 'Classical, Opera, Pop Ballad, Musical' }
];

function getVoiceType(min: number, max: number) {
  const userCenter = (min + max) / 2;
  let bestMatch = VOCAL_TYPES[0];
  let minDiff = Infinity;

  VOCAL_TYPES.forEach(vt => {
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

function getFrequencyFromNote(note: number) {
  return 440 * Math.pow(2, (note - 69) / 12);
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
  if (rms < 0.01) return -1;
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

export default function VoiceRangeCheck() {
  const { showAlert } = useAlert();
  const [showWarnModal, setShowWarnModal] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [minNote, setMinNote] = useState<number | null>(null);
  const [maxNote, setMaxNote] = useState<number | null>(null);
  const [pitchHistory, setPitchHistory] = useState<number[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    return () => {
      stopTest();
    };
  }, []);

  const startTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 2048;
      analyzerRef.current = analyzer;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);
      setIsTesting(true);
      setTestCompleted(false);
      setShowWarnModal(false);
      setMinNote(null);
      setMaxNote(null);
      setPitchHistory([]);

      const buffer = new Float32Array(analyzer.fftSize);
      const updatePitch = () => {
        analyzer.getFloatTimeDomainData(buffer);
        const ac = autoCorrelate(buffer, audioCtx.sampleRate);
        if (ac !== -1) {
          const note = getNoteFromFrequency(ac);
          if (note >= MIN_MIDI - 12 && note <= MAX_MIDI + 12) {
            setActiveNote(note);
            setMinNote(prev => prev === null ? note : Math.min(prev, note));
            setMaxNote(prev => prev === null ? note : Math.max(prev, note));
            setPitchHistory(prev => [...prev.slice(-50), note]);
          }
        } else {
          setActiveNote(null);
        }
        requestRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      showAlert("Không thể truy cập Microphone. Vui lòng cấp quyền.");
    }
  };

  const stopTest = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsTesting(false);
    setActiveNote(null);
    setTestCompleted(true);
  };

  const pianoKeys = [];
  let whiteKeyIndex = 0;
  for (let i = MIN_MIDI; i <= MAX_MIDI; i++) {
    const noteInOctave = i % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
    if (!isBlack) {
      pianoKeys.push({ midi: i, isBlack: false, whiteIndex: whiteKeyIndex });
      whiteKeyIndex++;
    } else {
      pianoKeys.push({ midi: i, isBlack: true, whiteIndex: whiteKeyIndex - 1 });
    }
  }
  const totalWhiteKeys = whiteKeyIndex;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">Kiểm tra quãng giọng</h1>
          </div>
          <div className="flex items-center gap-4">
               {isTesting && (
                  <div className="flex items-center gap-2">
                     <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                     </span>
                     <span className="text-sm font-medium text-red-500">Đang thu âm</span>
                  </div>
               )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950 to-slate-950 pointer-events-none" />
         <div className="max-w-4xl w-full flex flex-col items-center gap-12 z-10">
            <div className="text-center space-y-4">
               {activeNote !== null ? (
                  <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     key={activeNote}
                     className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                  >
                     {getNoteName(activeNote)}
                  </motion.div>
               ) : (
                  <div className="text-6xl md:text-8xl font-black text-slate-800">--</div>
               )}
               <p className="text-slate-400 text-lg">
                  {isTesting ? "Hãy hát một nốt dài (Ahhh...)" : "Nhấn Bắt đầu để kiểm tra"}
               </p>
            </div>

            <div className="flex justify-center gap-8 md:gap-16 w-full">
               <div className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/80 border border-slate-800 w-40">
                  <span className="text-sm text-slate-400 mb-2">Nốt thấp nhất</span>
                  <span className="text-3xl font-bold text-blue-400">
                     {minNote !== null ? getNoteName(minNote) : '--'}
                  </span>
               </div>
               <div className="flex flex-col items-center p-6 rounded-2xl bg-slate-900/80 border border-slate-800 w-40">
                  <span className="text-sm text-slate-400 mb-2">Nốt cao nhất</span>
                  <span className="text-3xl font-bold text-rose-400">
                     {maxNote !== null ? getNoteName(maxNote) : '--'}
                  </span>
               </div>
            </div>

            <div className="w-full relative h-48 md:h-64 mt-8 rounded-xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl">
               <div className="flex w-full h-full">
                  {pianoKeys.map((key) => {
                     if (key.isBlack) return null;
                     const isActive = activeNote !== null && key.midi === activeNote;
                     const isEdge = key.midi === minNote || key.midi === maxNote;
                     const isWithinRange = minNote !== null && maxNote !== null && key.midi >= minNote && key.midi <= maxNote && !key.isBlack;

                     return (
                        <div 
                           key={key.midi} 
                           className={`flex-1 border-r border-slate-300 transition-colors duration-150 rounded-b-md
                              ${isActive ? 'bg-violet-400 shadow-[inset_0_-10px_20px_rgba(139,92,246,0.8)]' : 
                                isWithinRange ? 'bg-violet-100' :
                                'bg-white'}
                           `}
                        >
                           <div className="w-full h-full flex items-end justify-center pb-4 opacity-50">
                              <span className="text-[10px] text-slate-800 font-medium rotate-90 origin-bottom transform translate-y-3">{getNoteName(key.midi)}</span>
                           </div>
                        </div>
                     )
                  })}
               </div>
               {pianoKeys.map((key) => {
                  if (!key.isBlack) return null;
                  const leftPercent = ((key.whiteIndex + 1) / totalWhiteKeys) * 100;
                  const widthPercent = (1 / totalWhiteKeys) * 60;
                  const isActive = activeNote !== null && key.midi === activeNote;
                  return (
                     <div 
                        key={key.midi} 
                        className={`absolute top-0 z-10 transition-colors duration-150 rounded-b-md shadow-md
                           ${isActive ? 'bg-violet-500 shadow-[0_5px_15px_rgba(139,92,246,0.8)]' : 'bg-slate-900'}
                        `}
                        style={{ 
                           left: `calc(${leftPercent}% - ${widthPercent/2}%)`, 
                           width: `${widthPercent}%`,
                           height: '60%'
                        }}
                     />
                  )
               })}
            </div>

            <div className="flex justify-center mt-4">
               {!isTesting ? (
                  <Button size="lg" onClick={() => setShowWarnModal(true)} className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-8 h-14 text-lg font-bold shadow-[0_0_20px_rgba(124,58,237,0.4)]">
                     <Mic className="w-6 h-6 mr-2" />
                     Bắt đầu kiểm tra
                  </Button>
               ) : (
                  <Button size="lg" variant="destructive" onClick={stopTest} className="rounded-full px-8 h-14 text-lg font-bold">
                     <X className="w-6 h-6 mr-2" />
                     Dừng lại
                  </Button>
               )}
            </div>

            {testCompleted && minNote !== null && maxNote !== null && (
               <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mt-8 p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl"
               >
                  {(() => {
                     const voiceType = getVoiceType(minNote, maxNote);
                     return (
                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                           <div className="flex-1">
                              <h3 className="text-2xl font-bold text-white mb-2">Phân tích quãng giọng</h3>
                              <div className="text-violet-400 font-semibold text-lg mb-4">{getNoteName(minNote)} - {getNoteName(maxNote)}</div>
                              <p className="text-slate-300 mb-6 leading-relaxed">
                                 Dựa trên quá trình thu âm, quãng giọng của bạn dao động từ <span className="font-bold text-white">{getNoteName(minNote)}</span> đến <span className="font-bold text-white">{getNoteName(maxNote)}</span>. 
                                 Dải âm vực này phù hợp đặc trưng của loại giọng:
                              </p>
                              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                                 <h4 className="text-2xl font-bold text-amber-500 mb-3">{voiceType.name}</h4>
                                 <p className="text-slate-300 mb-4">{voiceType.desc}</p>
                                 <div className="flex items-start gap-3 text-sm">
                                    <div className="shrink-0 mt-0.5">
                                       <Activity className="w-5 h-5 text-violet-400" />
                                    </div>
                                    <div>
                                       <span className="text-slate-400 block mb-1">Thể loại nhạc phù hợp phát huy thế mạnh:</span>
                                       <span className="text-white font-medium text-base">{voiceType.genres}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           <div className="w-full md:w-[35%] space-y-4">
                              <h4 className="font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                 <Info className="w-4 h-4" />
                                 Tham khảo các loại giọng cơ bản
                              </h4>
                              <div className="space-y-3">
                                 {VOCAL_TYPES.map(vt => {
                                    const isMatch = vt.name === voiceType.name;
                                    return (
                                       <div key={vt.name} className={`flex justify-between items-center p-3 rounded-lg text-sm transition-colors ${
                                          isMatch ? 'bg-violet-500/20 border border-violet-500/30 text-white font-medium shadow-sm' : 'bg-slate-950/50 border border-transparent text-slate-400'
                                       }`}>
                                          <span>{vt.name.split(' (')[0]}</span>
                                          <span className="font-mono text-xs px-2 py-1 bg-black/30 rounded">{getNoteName(vt.min)} - {getNoteName(vt.max)}</span>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                     );
                  })()}
               </motion.div>
            )}
         </div>
      </main>

      <AnimatePresence>
         {showWarnModal && !isTesting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
               />
               <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
               >
                  <div className="p-6 md:p-8 flex flex-col items-center text-center">
                     <div className="w-16 h-16 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8" />
                     </div>
                     <h2 className="text-2xl font-bold text-white mb-4">Khởi động giọng trước!</h2>
                     <p className="text-slate-400 mb-6 leading-relaxed">
                        Để tránh chấn thương thanh quản và có kết quả chính xác nhất, bạn nên <strong>khởi động giọng (Warm-up)</strong> khoảng 5-10 phút trước khi hát các nốt quá cao hoặc quá thấp.
                     </p>
                     <div className="flex flex-col w-full gap-3">
                        <Button size="lg" onClick={startTest} className="bg-violet-600 hover:bg-violet-500 text-white font-bold w-full h-12">
                           Tôi đã khởi động, Bắt đầu!
                        </Button>
                        <Button size="lg" variant="ghost" onClick={() => setShowWarnModal(false)} className="text-slate-400 hover:text-white w-full h-12">
                           Để sau
                        </Button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
