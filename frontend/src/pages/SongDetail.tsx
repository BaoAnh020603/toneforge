import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic2, ArrowLeft, Trophy, PlayCircle, BarChart2, Loader2, SearchX, Star, Clock, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { db } from '../lib/firebase';
import { doc, getDoc, query, collection, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface FirebaseSong {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
  genre?: string;
  difficulty?: string;
  viewCount?: number;
  playCount?: number;
  totalPracticeTime?: number;
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
            notes.push({ start: floatArray[i], pitch: Math.round(floatArray[i+1]), duration: floatArray[i+2] });
        }
        return notes;
    } catch(e) { return []; }
}

function midiToNoteName(midi: number) {
    if (!midi || midi <= 0) return 'N/A';
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    return notes[midi % 12] + octave;
}

function midiToHz(midi: number) {
    if (!midi || midi <= 0) return 0;
    return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState<any>(null);
  const [topScores, setTopScores] = useState<any[]>([]);
  const [topPracticers, setTopPracticers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSongAndStats = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'songs', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSong({ id: docSnap.id, ...docSnap.data() });
        } else {
          setSong(null);
          return;
        }

        // Fetch top scores
        const qScores = query(
           collection(db, 'userSongStats'),
           where('songId', '==', id),
           orderBy('maxScore', 'desc'),
           limit(3)
        );
        const snScores = await getDocs(qScores);
        setTopScores(snScores.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch top practice times
        const qHardest = query(
           collection(db, 'userSongStats'),
           where('songId', '==', id),
           orderBy('totalPracticeTime', 'desc'),
           limit(3)
        );
        const snHardest = await getDocs(qHardest);
        setTopPracticers(snHardest.docs.map(d => ({ id: d.id, ...d.data() })));
        
      } catch (error) {
        console.error("Lỗi khi tải thông tin bài hát:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongAndStats();
  }, [id]);

  if (isLoading) {
    return (
      <div className="pb-16 pt-32 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
        <p>Đang tải thông tin bài hát...</p>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="pb-16 pt-32 flex flex-col items-center justify-center text-slate-500">
        <SearchX className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-xl font-medium text-white mb-2">Không tìm thấy bài hát</p>
        <p className="mb-6">Bài hát này có thể đã bị xóa hoặc không tồn tại.</p>
        <Button onClick={() => navigate(-1)} className="bg-violet-600 hover:bg-violet-500 text-white">Quay lại</Button>
      </div>
    );
  }

  const genre = song.genre || 'Khác';
  const difficulty = song.difficultyInfo?.label || song.difficulty || 'Trung bình';
  const difficultyColor = song.difficultyInfo?.colorClass || 'text-slate-200 bg-slate-800 border-slate-700';
  const plays = song.playCount || 0;
  const views = song.viewCount || 0;
  const totalTime = song.totalPracticeTime || 0;
  const thumbnail = song.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80';

  const minPitch = song.pitchMetrics?.minPitch || 0;
  const maxPitch = song.pitchMetrics?.maxPitch || 0;
  const modePitch = song.pitchMetrics?.modePitch || 0;
  
  const minNote = midiToNoteName(minPitch);
  const maxNote = midiToNoteName(maxPitch);
  const modeNote = midiToNoteName(modePitch);

  return (
    <div className="pb-16 pt-4 max-w-7xl mx-auto px-4">
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Quay lại
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Cover & Global Data */}
        <div className="col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <div className="aspect-square relative">
              <img src={thumbnail} alt={song.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent" />
              
              <div className="absolute bottom-0 left-0 w-full p-6">
                <div className="flex gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-violet-600 text-white backdrop-blur-md">
                    {genre}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${difficultyColor}`}>
                    Độ khó: {difficulty}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">{song.title}</h1>
                <p className="text-lg text-slate-300">{song.artist}</p>
              </div>
            </div>
          </motion.div>

          <Link to={`/play/${song.id}`} className="block w-full text-decoration-none border-0 pt-2 pb-2">
            <Button className="w-full h-14 text-lg font-bold bg-white text-slate-900 hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Mic2 className="mr-2 w-5 h-5" />
              Bắt đầu hát
            </Button>
          </Link>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <PlayCircle className="w-5 h-5 text-slate-400 mb-2" />
              <div className="text-xl font-bold text-white mb-1">{plays.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Lượt hát</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Eye className="w-5 h-5 text-slate-400 mb-2" />
              <div className="text-xl font-bold text-white mb-1">{views.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Lượt xem</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Clock className="w-5 h-5 text-violet-400 mb-2" />
              <div className="text-xl font-bold text-violet-400 mb-1">
                {totalTime > 3600 ? `${(totalTime / 3600).toFixed(1)}h` : `${Math.floor(totalTime / 60)}m`}
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Tổng giờ tập</div>
            </div>
          </div>
        </div>

        {/* Right Col: Notes Chart & Leaderboard */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Voice Range Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
             {/* Decorative background elements */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="flex items-start justify-between mb-8 relative">
              <div>
                 <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                   <BarChart2 className="text-violet-400" />
                   Hồ sơ quãng giọng
                 </h3>
                 <p className="text-slate-400 text-sm">Quãng giọng yêu cầu để thể hiện bài hát này</p>
              </div>
              <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50 flex flex-col items-end">
                 <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Khoảng cách</span>
                 <span className="text-sm font-semibold text-white">
                    {minNote !== 'N/A' && maxNote !== 'N/A' ? `${minNote} - ${maxNote}` : 'Không xác định'}
                 </span>
              </div>
            </div>
            
            <div className="flex bg-slate-950 rounded-2xl border border-slate-800/50 p-4 sm:p-6 relative items-center justify-between gap-1 sm:gap-4">
                
                {/* Lowest Note */}
                <div className="flex flex-col items-center gap-1.5 sm:gap-2 relative z-10 w-auto flex-1 max-w-[100px]">
                   <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-lg shadow-slate-950 relative group">
                      <div className="absolute inset-0 bg-violet-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                       <span className="text-xl sm:text-2xl font-bold font-mono text-white relative z-10">{minNote}</span>
                   </div>
                   <div className="text-center">
                       <div className="text-xs sm:text-sm font-semibold text-slate-300 whitespace-nowrap">Thấp nhất</div>
                       <div className="text-[10px] sm:text-xs text-slate-500 font-mono">{Number.isNaN(minPitch) ? 0 : Math.round(midiToHz(minPitch))} Hz</div>
                   </div>
                </div>

                {/* Connecting Line 1 */}
                <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-slate-700 to-violet-500/50 mx-4 relative z-0" />

                {/* Mode Note */}
                <div className="flex flex-col items-center gap-1.5 sm:gap-2 relative z-10 w-auto flex-1 max-w-[120px]">
                   <div className="w-15 h-15 sm:w-20 sm:h-20 rounded-full bg-slate-800 border-2 border-violet-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] relative group">
                      <div className="absolute inset-0 bg-violet-500 rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
                       <span className="text-xl sm:text-3xl font-bold font-mono text-white relative z-10">{modeNote}</span>
                   </div>
                   <div className="text-center">
                       <div className="text-xs sm:text-sm font-semibold text-violet-300 whitespace-nowrap">Phổ biến</div>
                       <div className="text-[10px] sm:text-xs text-slate-500 font-mono">{Number.isNaN(modePitch) ? 0 : Math.round(midiToHz(modePitch))} Hz</div>
                   </div>
                </div>

                {/* Connecting Line 2 */}
                <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-violet-500/50 to-slate-700 mx-4 relative z-0" />

                {/* Highest Note */}
                <div className="flex flex-col items-center gap-1.5 sm:gap-2 relative z-10 w-auto flex-1 max-w-[100px]">
                   <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-lg shadow-slate-950 relative group">
                      <div className="absolute inset-0 bg-amber-500 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                       <span className="text-xl sm:text-2xl font-bold font-mono text-white relative z-10">{maxNote}</span>
                   </div>
                   <div className="text-center">
                       <div className="text-xs sm:text-sm font-semibold text-slate-300 whitespace-nowrap">Cao nhất</div>
                       <div className="text-[10px] sm:text-xs text-slate-500 font-mono">{Number.isNaN(maxPitch) ? 0 : Math.round(midiToHz(maxPitch))} Hz</div>
                   </div>
                </div>
            </div>
            
            <div className="mt-6 flex items-start gap-3 bg-violet-500/10 border border-violet-500/20 p-4 rounded-xl">
               <Mic2 className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
               <p className="text-sm text-violet-200/80 leading-relaxed text-left">
                 <strong>Mẹo luyện tập:</strong> Hãy đảm bảo giọng của bạn đã được khởi động kỹ trước khi cố gắng hát những nốt cao nhất của bài hát để tránh tổn thương dây thanh quản.
               </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Top Scores */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                   <Star className="text-amber-400" />
                   Top Điểm Số
                 </h3>
                 <div className="space-y-4">
                   {topScores.length === 0 && <div className="text-slate-500 text-sm">Chưa có ai ghi điểm</div>}
                   {topScores.map((user, idx) => (
                     <div 
                       key={user.id} 
                       onClick={() => navigate(`/profile/${user.userId}`)}
                       className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl cursor-pointer hover:bg-slate-800 transition-colors"
                     >
                       <div className={`w-6 font-bold text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-amber-600'}`}>
                         #{idx + 1}
                       </div>
                       <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800" />
                       <div className="flex-1 min-w-0">
                         <div className="font-semibold text-white truncate">{user.displayName}</div>
                       </div>
                       <div className="font-bold text-amber-400 text-lg">
                         {(user.maxScore || 0).toLocaleString()} <span className="text-xs text-slate-500 font-normal">điểm</span>
                       </div>
                     </div>
                   ))}
                 </div>
             </div>

             {/* Top Practice */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                   <Trophy className="text-yellow-400" />
                   Top Luyện Tập
                 </h3>
                 <div className="space-y-4">
                   {topPracticers.length === 0 && <div className="text-slate-500 text-sm">Chưa có ai luyện tập</div>}
                   {topPracticers.map((user, idx) => (
                     <div 
                       key={user.id} 
                       onClick={() => navigate(`/profile/${user.userId}`)}
                       className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl cursor-pointer hover:bg-slate-800 transition-colors"
                     >
                       <div className={`w-6 font-bold text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : 'text-amber-600'}`}>
                         #{idx + 1}
                       </div>
                       <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.userId}`} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800" />
                       <div className="flex-1 min-w-0">
                         <div className="font-semibold text-white truncate">{user.displayName}</div>
                       </div>
                       <div className="font-bold text-violet-400 text-sm flex items-center gap-1">
                         <Clock className="w-3.5 h-3.5" />
                         {(user.totalPracticeTime || 0) > 3600 ? `${Math.floor((user.totalPracticeTime || 0) / 3600)}h` : `${Math.floor((user.totalPracticeTime || 0) / 60)}m`}
                       </div>
                     </div>
                   ))}
                 </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

