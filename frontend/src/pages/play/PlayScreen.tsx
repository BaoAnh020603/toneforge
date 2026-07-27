import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, X, Save, Settings2, Mic, Activity, CheckCircle, AlertCircle, Music, Clock, Eye, EyeOff } from 'lucide-react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getNoteFromFrequency(frequency: number) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function getNoteName(midi: number) {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTES[midi % 12];
  return `${name}${octave}`;
}

// AutoCorrelate for pitch detection
function autoCorrelate(buf: Float32Array, sampleRate: number) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; 
  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  buf = buf.slice(r1, r2);
  SIZE = buf.length;
  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++)
    for (let j = 0; j < SIZE - i; j++)
      c[i] = c[i] + buf[j] * buf[j + i];
  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  let T0 = maxpos;
  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  return sampleRate / T0;
}

function decodeNotes(notesBase64: string) {
    if (!notesBase64) return [];
    try {
        const binaryString = atob(notesBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const floatArray = new Float32Array(bytes.buffer);
        const notes = [];
        for (let i = 0; i < floatArray.length; i += 3) {
            notes.push({
                startTime: floatArray[i],
                midi: Math.round(floatArray[i + 1]),
                endTime: floatArray[i] + floatArray[i + 2],
            });
        }
        return notes;
    } catch (e) {
        console.error("Decode error:", e);
        return [];
    }
}

export default function PlayScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [song, setSong] = useState<any>(null);
  const targetNotesRef = useRef<any[]>([]);

  const viewCountIncremented = useRef(false);

  const handleFinish = async () => {
     if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
         const recorder = audioRecorderRef.current;
         const stopPromise = new Promise<void>(resolve => {
             recorder.addEventListener('stop', () => resolve(), { once: true });
         });
         recorder.stop();
         await stopPromise;
         const mimeType = recorder.mimeType || 'audio/webm';
         const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
         recordingBlobUrlRef.current = URL.createObjectURL(audioBlob);
     }

     if (id && song) {
         try {
             await updateDoc(doc(db, 'songs', id), {
                 playCount: increment(1),
                 totalPracticeTime: increment(duration)
             });
             
             if (auth.currentUser) {
                const userStatRef = doc(db, 'userSongStats', `${auth.currentUser.uid}_${id}`);
                const statSnap = await getDoc(userStatRef);
                const currentMaxScore = statSnap.exists() ? (statSnap.data().maxScore || 0) : 0;
                const newMaxScore = Math.max(currentMaxScore, score);

                await setDoc(userStatRef, {
                   userId: auth.currentUser.uid,
                   songId: id,
                   displayName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Unknown',
                   photoURL: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser.uid}`,
                   totalPracticeTime: increment(duration),
                   lastPracticed: new Date(),
                   maxScore: newMaxScore
                }, { merge: true });
             }
         } catch(e) { console.error(e); }
     }
     navigate("/results/session-complete", { state: { score, song, duration, hasVoice, rhythmMetrics, recordingUrl: recordingBlobUrlRef.current, pitchHistory: (window as any).currentFullPitchHistory } });
  };

  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [latencyOffset, setLatencyOffset] = useState(-0.1); 
  const [duration, setDuration] = useState(0);
  const [hasVoice, setHasVoice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [showReferenceRoll, setShowReferenceRoll] = useState(false); // start hidden natively
  const [isAdmin, setIsAdmin] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailingDotsRef = useRef<{time: number, midi: number, color: string}[]>([]);
  const micLevelRef = useRef<HTMLDivElement>(null);
  
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingBlobUrlRef = useRef<string | null>(null);

  // Stats
  const [score, setScore] = useState(0);
  const [correctHits, setCorrectHits] = useState(0);
  const [flaggedHits, setFlaggedHits] = useState(0);
  const [currentNoteName, setCurrentNoteName] = useState<string>('--');
  
  const [rhythmMetrics, setRhythmMetrics] = useState({ correctFrames: 0, activeFrames: 0, voiceFrames: 0, vibratoFrames: 0 });
  
  const minMidi = 48; // C3
  const maxMidi = 84; // C6
  
  useEffect(() => {
    if (!id) return;
    const fetchSong = async () => {
       try {
           const songSnap = await getDoc(doc(db, 'songs', id));
           if (songSnap.exists()) {
               setSong({ id: songSnap.id, ...songSnap.data() });
               
               if (!viewCountIncremented.current) {
                   viewCountIncremented.current = true;
                   try {
                       await updateDoc(doc(db, 'songs', id), {
                           viewCount: increment(1)
                       });
                   } catch (e) {
                       console.error("error updating view count", e);
                   }
               }
               
               try {
                   const chunkSnap = await getDoc(doc(db, `songs/${id}/noteChunks/chunk_0`));
                   if (chunkSnap.exists()) {
                      const data = chunkSnap.data();
                      targetNotesRef.current = decodeNotes(data.data);
                   }
               } catch (e) { console.error("error chunk", e); }
           }
       } catch (e) {
           console.error("Error fetching song:", e);
       }
    };

    // Instead of waiting only for logged in user, fetch immediately.
    let isMounted = true;
    const loadData = async () => {
       await fetchSong();
    };
    loadData();

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
       if (currentUser) {
           const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
           if (userSnap.exists() && userSnap.data().role === 'admin') {
               setIsAdmin(true);
               setShowReferenceRoll(true);
           }
       }
    });

    return () => unsubscribe();
  }, [id]);

  const onPlayerReady = (event: any) => {
    setPlayer(event.target);
  };
  
  const onPlayerStateChange = (event: any) => {
    // PLAYING = 1, PAUSED = 2
    if (event.data === 1) setIsPlaying(true);
    else setIsPlaying(false);
  };

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isPlaying || !player) {
        if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
            audioRecorderRef.current.pause();
        }
        return;
    }

    let rafId: number;
    
    // Using refs for mutable state so we don't have to put them in dependency arrays causing rebuilds
    let accumulatedScore = score;
    let accumulatedCorrect = correctHits;
    let accumulatedFlagged = flaggedHits;
    let accumulatedDuration = duration;
    let accumulatedHasVoice = hasVoice;
    
    // RHYTHM & VIBRATO TRACKING
    let pitchHistory: number[] = [];
    let fullPitchHistory: number[] = (window as any).currentFullPitchHistory || [];
    (window as any).currentFullPitchHistory = fullPitchHistory; // Expose to handleFinish
    // We only reset fullPitchHistory if this is the very first time we start
    if (!streamRef.current) {
        fullPitchHistory.length = 0; // reset
    }
    let vibratoFrames = 0;
    let voiceFrames = 0; // Frames where user is singing
    let activeNoteFrames = 0; // Frames where a note is supposed to be sung
    let correctTimingFrames = 0; // Frames where user matched the timing of the note
    
    let lastTime = performance.now();

    const startAudio = async () => {
      try {
        if (!streamRef.current) {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            audioChunksRef.current = [];
            try {
                audioRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'audio/webm' });
            } catch (e) {
                audioRecorderRef.current = new MediaRecorder(streamRef.current);
            }
            audioRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            audioRecorderRef.current.start(100);

            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyzerRef.current = audioCtxRef.current.createAnalyser();
            analyzerRef.current.fftSize = 2048;
            const source = audioCtxRef.current.createMediaStreamSource(streamRef.current);
            source.connect(analyzerRef.current);
            setIsMicReady(true);
        } else {
            if (audioRecorderRef.current && audioRecorderRef.current.state === 'paused') {
                audioRecorderRef.current.resume();
            }
        }
        
        const analyzer = analyzerRef.current!;
        const buffer = new Float32Array(analyzer.fftSize);

        const loop = () => {
          if (!player || player.getPlayerState() !== 1) {
             lastTime = performance.now(); // keep it fresh
             rafId = requestAnimationFrame(loop);
             return;
          }
          
          const now = performance.now();
          if (now - lastTime >= 1000) {
             accumulatedDuration += 1;
             lastTime = now;
          }
          
          const rawTime = player.getCurrentTime();
          const time = rawTime + latencyOffset;
          
          analyzer.getFloatTimeDomainData(buffer);
          
          let rms = 0;
          for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
          rms = Math.sqrt(rms / buffer.length);
          
          if (micLevelRef.current) {
             const level = Math.min(100, rms * 100 * 5); // Scale up so quiet sounds still show
             micLevelRef.current.style.width = `${level}%`;
          }

          const ac = autoCorrelate(buffer, audioCtxRef.current!.sampleRate);
          
          let currentUserMidi: number | null = null;
          let dotColor = '#a855f7'; // fallback color
          
          if (ac !== -1) {
            currentUserMidi = getNoteFromFrequency(ac);
            setCurrentNoteName(getNoteName(currentUserMidi));
            accumulatedHasVoice = true;
          } else {
            setCurrentNoteName('--');
          }

          const targetNotes = targetNotesRef.current;
          const target = targetNotes.find((n: any) => time >= n.startTime && time <= n.endTime);
          
          if (target) activeNoteFrames++;
          
          if (currentUserMidi !== null && currentUserMidi >= minMidi && currentUserMidi <= maxMidi) {
             voiceFrames++;
             fullPitchHistory.push(currentUserMidi);
             
             // Track pitch history for vibrato (capture last 20 frames)
             pitchHistory.push(currentUserMidi);
             if (pitchHistory.length > 20) pitchHistory.shift();
             
             // Vibrato calculation: Check variance over the recent history
             // Vibrato typically oscillates slightly (e.g. standard deviation between 0.2 and 1.5)
             if (pitchHistory.length === 20 && target) {
                 const sum = pitchHistory.reduce((a, b) => a + b, 0);
                 const avg = sum / pitchHistory.length;
                 const variance = pitchHistory.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / pitchHistory.length;
                 const stdDev = Math.sqrt(variance);
                 
                 // If standard deviation is in optimal vibrato range, count it
                 if (stdDev >= 0.25 && stdDev <= 1.5) {
                     vibratoFrames++;
                 }
             }
             
             if (target) {
                // Rhythm timing: user sings when there's an active note
                correctTimingFrames++;
                
                const diff = Math.abs(currentUserMidi - target.midi);
                if (diff <= 1) {
                   dotColor = '#22c55e'; // Perfect/Great match (Green)
                   accumulatedScore += 5;
                   if (Math.random() > 0.8) accumulatedCorrect++;
                } else if (diff <= 4) {
                   dotColor = '#eab308'; // Close (Yellow)
                   accumulatedScore += 2;
                } else {
                   dotColor = '#ef4444'; // Off (Red)
                   if (Math.random() > 0.98) accumulatedFlagged++;
                }
             } else {
                // User is singing when there's no note => rhythm penalty
             }
             trailingDotsRef.current.push({ time, midi: currentUserMidi, color: dotColor });
          } else {
             pitchHistory = []; // Reset pitch history on silence
             fullPitchHistory.push(-1); // Record silence
          }

          // Cleanup old trails
          trailingDotsRef.current = trailingDotsRef.current.filter(d => time - d.time < 3);

          // Render canvas
          drawPianoRoll(time, currentUserMidi, dotColor);
          
          // Debounced state update
          if (Math.floor(time * 10) % 5 === 0) {
             setScore(Math.floor(accumulatedScore));
             setCorrectHits(accumulatedCorrect);
             setFlaggedHits(accumulatedFlagged);
             setDuration(accumulatedDuration);
             setHasVoice(accumulatedHasVoice);
             setRhythmMetrics({
                correctFrames: correctTimingFrames,
                activeFrames: activeNoteFrames,
                voiceFrames: voiceFrames,
                vibratoFrames: vibratoFrames
             });
          }

          rafId = requestAnimationFrame(loop);
        };
        
        loop();
      } catch (e) {
        console.error("Mic access denied", e);
        setIsMicReady(false);
      }
    };

    startAudio();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      // We don't stop the stream or ctx here, so it persists when paused
    };
  }, [isPlaying, player, latencyOffset]);

  useEffect(() => {
     // Component unmount cleanup
     return () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) audioCtxRef.current.close().catch(console.error);
     }
  }, []);

  const drawPianoRoll = (time: number, currentUserMidi: number | null, dotColor: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      const keyWidth = 45; // Width of the piano keys panel on the left
      
      ctx.clearRect(0,0,width,height);
      
      const currentX = keyWidth + (width - keyWidth) * 0.2; // 20% from the keys
      const pixelsPerSecond = ((width - keyWidth) * 0.8) / 8; // 8 seconds look-ahead
      const midiRange = maxMidi - minMidi;
      const pixelsPerMidi = height / midiRange;
      const blockHeight = Math.max(pixelsPerMidi - 1, 6);
      
      // Draw Grid / Pitch Lines (Right area)
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 1;
      for (let i = 0; i <= midiRange; i += 2) {
         const y = height - (i * pixelsPerMidi);
         ctx.beginPath(); ctx.moveTo(keyWidth, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Draw Playhead
      ctx.strokeStyle = '#8b5cf6'; // violet-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, height);
      ctx.stroke();

      // Glow effect for playhead
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#8b5cf6';
      ctx.stroke();
      ctx.shadowBlur = 0;

      const targetNotes = targetNotesRef.current;

      // Draw Target Notes (reference blocks)
      targetNotes.forEach((note: any) => {
          const startX = currentX + ((note.startTime - time) * pixelsPerSecond);
          const endX = currentX + ((note.endTime - time) * pixelsPerSecond);
          if (endX < keyWidth || startX > width) return; 
          
          const y = height - ((note.midi - minMidi) * pixelsPerMidi);
          
          // Draw note background (unplayed part)
          ctx.fillStyle = '#1e3a8a'; // Blue 900
          ctx.beginPath();
          // Using basic rect drawing to handle clipping gracefully
          const drawStartX = Math.max(keyWidth, startX);
          const drawWidth = Math.max(0, endX - drawStartX);
          ctx.roundRect(drawStartX, y - blockHeight / 2, drawWidth, blockHeight, 4);
          ctx.fill();
          
          // Draw filled part if active or past
          if (time > note.startTime) {
              const fillEndX = Math.min(endX, currentX); 
              if (fillEndX > startX && fillEndX > keyWidth) {
                 const drawFillStartX = Math.max(keyWidth, startX);
                 const drawFillWidth = Math.max(0, fillEndX - drawFillStartX);
                 
                 // If currently active and singing pitch matches, color green, else blue
                 const diff = currentUserMidi !== null ? Math.abs(currentUserMidi - note.midi) : null;
                 const isHitting = time <= note.endTime && diff !== null && diff <= 1;
                 
                 ctx.fillStyle = isHitting ? '#22c55e' : '#3b82f6'; 
                 ctx.beginPath();
                 ctx.roundRect(drawFillStartX, y - blockHeight / 2, drawFillWidth, blockHeight, 4);
                 
                 if (time <= note.endTime && isHitting) {
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                 } else {
                    ctx.fill();
                 }
              }
          }
      });
      
      // Draw Trails
      trailingDotsRef.current.forEach(dot => {
          const dotX = currentX - ((time - dot.time) * pixelsPerSecond);
          if (dotX < keyWidth) return;
          const dotY = height - ((dot.midi - minMidi) * pixelsPerMidi);
          ctx.fillStyle = dot.color;
          ctx.globalAlpha = Math.max(0, 1 - (time - dot.time) / 3);
          ctx.beginPath();
          ctx.arc(dotX, dotY, blockHeight / 2, 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw Current Pitch Dot
      if (currentUserMidi !== null && currentUserMidi >= minMidi && currentUserMidi <= maxMidi) {
          const y = height - ((currentUserMidi - minMidi) * pixelsPerMidi);
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(currentX, y, blockHeight / 1.5, 0, Math.PI * 2);
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = dotColor;
          ctx.fill();
          ctx.shadowBlur = 0;
      }

      // Draw Piano Keys (Y-axis labels) on the Left
      ctx.fillStyle = '#020617'; // slate-950
      ctx.fillRect(0, 0, keyWidth, height);
      
      for (let i = 0; i <= midiRange; i++) {
         const isBlackNote = [1, 3, 6, 8, 10].includes((minMidi + i) % 12);
         const y = height - (i * pixelsPerMidi);
         
         const isCurrentlyPlaying = targetNotes.some((n: any) => time >= n.startTime && time <= n.endTime && n.midi === minMidi + i);
         
         // Highlight the piano key if note is playing
         ctx.fillStyle = isCurrentlyPlaying ? '#3b82f6' : (isBlackNote ? '#0f172a' : '#1e293b');
         ctx.fillRect(0, y - pixelsPerMidi, keyWidth, pixelsPerMidi);
         
         // Draw borders for white keys
         if (!isBlackNote) {
             ctx.strokeStyle = '#334155';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(0, y);
             ctx.lineTo(keyWidth, y);
             ctx.stroke();
         }

         // Label for C notes or active note
         if ((minMidi + i) % 12 === 0 || isCurrentlyPlaying) {
             ctx.fillStyle = isCurrentlyPlaying ? '#ffffff' : '#94a3b8';
             ctx.font = isCurrentlyPlaying ? 'bold 10px monospace' : '10px monospace';
             ctx.fillText(getNoteName(minMidi + i), 5, y - pixelsPerMidi / 2 + 3);
         }
      }
      
      // Right border of piano keys
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(keyWidth, 0);
      ctx.lineTo(keyWidth, height);
      ctx.stroke();
  };

  // Adjust canvas resolution dynamically using ResizeObserver
  useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas) return;
     const parent = canvas.parentElement;
     if (!parent) return;

     const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
           canvas.width = entry.contentRect.width;
           canvas.height = entry.contentRect.height;
        }
     });

     resizeObserver.observe(parent);
     return () => {
        resizeObserver.disconnect();
     };
  }, [showReferenceRoll]);

  return (
    <div className="h-screen bg-black text-white font-sans overflow-hidden flex flex-col relative select-none">
      
      {/* Top Navbar */}
      <header className="absolute top-0 w-full p-2 sm:p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/dashboard" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
          </Link>
          <div className="min-w-0">
             <h1 className="font-bold text-sm sm:text-lg leading-tight truncate">{song ? song.title : 'Đang tải...'}</h1>
             <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Voice Practice Mode</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
           {/* Mic Status Visualizer */}
           <div className="hidden sm:flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 px-3 py-1.5 rounded-full" title="Microphone Level">
              <div className={`${isMicReady ? 'text-green-400' : 'text-slate-500'} transition-colors`}>
                 <Mic className="w-4 h-4" />
              </div>
              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div ref={micLevelRef} className="h-full bg-green-400 w-0 transition-all duration-75" />
              </div>
           </div>

           {isAdmin && (
           <button onClick={() => setShowReferenceRoll(!showReferenceRoll)} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900/50 rounded-full shrink-0" title={showReferenceRoll ? "Ẩn Piano Roll" : "Hiện Piano Roll"}>
             {showReferenceRoll ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
           </button>
           )}
           <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-900/50 rounded-full shrink-0">
             <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
           </button>
           
           <button onClick={handleFinish} className="bg-violet-600 hover:bg-violet-500 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-all">
             <Save className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Hoàn thành</span>
           </button>
        </div>
      </header>

      {/* Main Focus: YouTube IFrame */}
      <main className={`flex-1 flex flex-col relative z-10 w-full pt-16 px-2 sm:px-6 items-center justify-center min-h-0 transition-all duration-300 ${showReferenceRoll ? 'pb-36 sm:pb-44' : 'pb-6 sm:pb-8'}`}>
         {song && song.youtubeVideoId ? (
           <div className="w-full max-w-7xl flex-1 flex items-center justify-center min-h-0">
             <div 
                className="relative w-full bg-black/50 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80" 
                style={{ aspectRatio: '16/9', maxHeight: '100%', maxWidth: '100%' }}
             >
               <YouTube 
                  videoId={song.youtubeVideoId}
                  opts={{
                     width: '100%',
                     height: '100%',
                     playerVars: {
                        autoplay: 0,
                        controls: 1,
                        rel: 0,
                        showinfo: 0,
                        modestbranding: 1
                     }
                  }}
                  onReady={onPlayerReady}
                  onStateChange={onPlayerStateChange}
                  onEnd={handleFinish}
                  className="w-full h-full absolute inset-0"
                  iframeClassName="w-full h-full"
               />
               
               {/* Minimalist Stats Overlay */}
               {isAdmin && (
               <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col gap-2 pointer-events-none scale-75 sm:scale-100 origin-top-left z-10">
                  <div className="bg-black/60 backdrop-blur-md border border-slate-700/50 p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-4">
                     <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">TỔNG ĐIỂM</div>
                        <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tighter leading-none">{score.toLocaleString("en-US")}</div>
                     </div>
                     <div className="w-px h-6 sm:h-8 bg-slate-700/50"></div>
                     <div>
                        <div className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> ĐÚNG</div>
                        <div className="text-base sm:text-lg font-bold text-white leading-none">{correctHits}</div>
                     </div>
                     <div className="w-px h-6 sm:h-8 bg-slate-700/50"></div>
                     <div>
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> LỆCH</div>
                        <div className="text-base sm:text-lg font-bold text-white leading-none">{flaggedHits}</div>
                     </div>
                  </div>
               </div>
               )}

               {/* Current Pitch Display */}
               {isAdmin && (
               <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/60 backdrop-blur-md border border-slate-700/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 pointer-events-none scale-75 sm:scale-100 origin-top-right z-10">
                  <Music className="w-3 h-3 sm:w-4 sm:h-4 text-violet-400" />
                  <div>
                     <div className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">NỐT ĐANG HÁT</div>
                      <div className="text-lg sm:text-xl font-bold text-white tracking-widest text-right">{currentNoteName}</div>
                  </div>
               </div>
               )}
            </div>
           </div>
         ) : (
           <div className="w-full max-w-5xl aspect-video bg-slate-900/50 rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800/80 flex items-center justify-center">
              <Activity className="w-8 h-8 text-violet-500 animate-pulse" />
           </div>
         )}
      </main>

      {/* Reference Piano Roll overlay at bottom */}
      <AnimatePresence>
        {showReferenceRoll && (
          <motion.footer 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-0 w-full h-32 sm:h-40 bg-black/90 backdrop-blur-2xl border-t border-slate-800 z-50"
          >
            <div className="absolute top-0 left-4 -mt-3 bg-violet-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-widest shadow-lg">
               Live Reference Roll
            </div>
            <div className="w-full h-full relative p-2">
               <canvas 
                 ref={canvasRef} 
                 className="w-full h-full block rounded-xl outline outline-1 outline-slate-800/50" 
               />
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
               initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
               className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
            >
               <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                 <X className="w-5 h-5" />
               </button>
               <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                 <Settings2 className="w-6 h-6 text-violet-400" /> Cài đặt luyện tập
               </h3>
               
               <div className="space-y-6">
                 <div>
                    <label className="flex items-center justify-between text-sm font-bold text-slate-300 mb-2">
                       <span>Latency Offset (Độ trễ)</span>
                       <span className="text-amber-400 font-mono">{latencyOffset > 0 ? '+' : ''}{latencyOffset}s</span>
                    </label>
                    <input 
                      type="range" min="-1" max="1" step="0.05" 
                      value={latencyOffset}
                      onChange={(e) => setLatencyOffset(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-2">Chỉnh sửa nếu nhịp điệu của bạn bị lệch thời gian so với nốt hiển thị do trễ của Micro, tai nghe Bluetooth.</p>
                 </div>
                 
                 <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Thay đổi offset ngay trong khi hát để tìm mức đồng bộ tốt nhất.
                 </div>
               </div>
               
               <button onClick={() => setShowSettings(false)} className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold h-auto shadow-[0_0_30px_rgba(124,58,237,0.3)]">
                  Lưu & Đóng
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
