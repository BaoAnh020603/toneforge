import { useState, useEffect } from 'react';
import { Search, Play, Star, Music, Heart, Activity, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
  difficulty?: string;
  difficultyInfo?: { label: string, colorClass: string };
  pitchMetrics?: { minPitch: number, maxPitch: number, modePitch: number };
}

function midiToNoteName(midi: number) {
    if (!midi || midi <= 0) return 'N/A';
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    return notes[midi % 12] + octave;
}

export default function DashboardCommunity() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('popular');
  const itemsPerPage = 9;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCommunitySongs = async () => {
      try {
        const q = query(
          collection(db, 'songs'),
          where('status', '==', 'public'),
          limit(100)
        );
        const querySnapshot = await getDocs(q);
        const songsList: Song[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          songsList.push({
            id: doc.id,
            title: data.title || 'Unknown Title',
            artist: data.artist || 'Unknown Artist',
            thumbnail: data.thumbnail,
            duration: data.duration,
            viewCount: data.viewCount || 0,
            playCount: data.playCount || 0,
            totalPracticeTime: data.totalPracticeTime || 0,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : 0
          } as any);
        });
        
        setSongs(songsList);
      } catch (error) {
        console.error("Error fetching community songs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunitySongs();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'favoriteSongs'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const favSet = new Set<string>();
      snap.docs.forEach(doc => favSet.add(doc.data().songId));
      setFavorites(favSet);
    });
    return () => unsubscribe();
  }, []);

  const toggleFavorite = async (songId: string, e: any) => {
     e.preventDefault();
     e.stopPropagation();
     if (!auth.currentUser) return;
     
     const q = query(collection(db, 'favoriteSongs'), where('userId', '==', auth.currentUser.uid), where('songId', '==', songId));
     const snap = await getDocs(q);
     
     if (!snap.empty) {
        await deleteDoc(doc(db, 'favoriteSongs', snap.docs[0].id));
     } else {
        await setDoc(doc(collection(db, 'favoriteSongs')), {
           userId: auth.currentUser.uid,
           songId: songId,
           createdAt: serverTimestamp()
        });
     }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    song.artist.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a: any, b: any) => {
    switch (sortBy) {
      case 'popular':
        // Calculate a score: 1 play = 2 views? Or just sum them up. Let's just do playCount + viewCount.
        return ((b.playCount || 0) * 2 + (b.viewCount || 0)) - ((a.playCount || 0) * 2 + (a.viewCount || 0));
      case 'views':
        return (b.viewCount || 0) - (a.viewCount || 0);
      case 'plays':
        return (b.playCount || 0) - (a.playCount || 0);
      case 'time':
        return (b.totalPracticeTime || 0) - (a.totalPracticeTime || 0);
      case 'newest':
      default:
        return (b.createdAt || 0) - (a.createdAt || 0);
    }
  });

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const currentItems = filteredSongs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Cộng đồng</h1>
        <p className="text-slate-400">Khám phá và hát những bài hát được chia sẻ từ người dùng khác.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm bài hát để luyện tập..." 
            className="w-full h-12 pl-10 pr-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-12 px-4 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[200px]"
        >
          <option value="popular">Phổ biến nhất</option>
          <option value="views">Nhiều lượt xem nhất</option>
          <option value="plays">Nhiều lượt hát nhất</option>
          <option value="time">Luyện tập nhiều nhất</option>
          <option value="newest">Mới nhất</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="p-16 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
          <p className="mb-4">Chưa có bài hát {searchTerm ? <strong className="text-white">"{searchTerm}"</strong> : "này"} trong cộng đồng.</p>
          <Link to={`/dashboard/upload?q=${encodeURIComponent(searchTerm)}`}>
             <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                Bấm vào đây để thêm bài hát mới
             </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentItems.map((song) => (
              <div key={song.id}
                   onClick={() => navigate(`/song/${song.id}`)}
                   className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-violet-500/30 transition-colors flex gap-4 group cursor-pointer"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative">
                  {song.thumbnail ? (
                    <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-8 h-8 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                 <div className="flex-1 flex flex-col pt-1 min-w-0 relative">
                   <div className="pr-8">
                     <h3 className="font-bold text-white text-lg leading-tight truncate group-hover:text-violet-300 transition-colors" title={song.title}>
                       {song.title}
                     </h3>
                   </div>
                   <button 
                     onClick={(e) => toggleFavorite(song.id, e)} 
                     className="absolute top-1 right-0 text-slate-500 hover:text-rose-500 transition-colors"
                   >
                     <Heart className={`w-5 h-5 ${favorites.has(song.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                   </button>
                   <p className="text-slate-400 text-sm mb-2 truncate" title={song.artist}>{song.artist}</p>
                   
                   <div className="flex flex-wrap gap-2 mb-2">
                     {song.difficultyInfo ? (
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${song.difficultyInfo.colorClass}`}>
                         {song.difficultyInfo.label}
                       </span>
                     ) : song.difficulty ? (
                       <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700">
                         {song.difficulty}
                       </span>
                     ) : null}
                     {song.pitchMetrics && song.pitchMetrics.minPitch > 0 && song.pitchMetrics.maxPitch > 0 && (
                       <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-violet-300 border border-violet-500/30">
                         {midiToNoteName(song.pitchMetrics.minPitch)} - {midiToNoteName(song.pitchMetrics.maxPitch)}
                       </span>
                     )}
                   </div>

                   <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                     <span className="flex items-center gap-1" title="Lượt xem"><Activity className="w-3.5 h-3.5"/> {(song as any).viewCount || 0}</span>
                     <span className="flex items-center gap-1" title="Lượt hát"><Play className="w-3.5 h-3.5"/> {(song as any).playCount || 0}</span>
                     <span className="flex items-center gap-1" title="Tổng giờ tập">
                       <Music className="w-3.5 h-3.5"/> 
                       {((song as any).totalPracticeTime || 0) > 3600 
                         ? `${((song as any).totalPracticeTime / 3600).toFixed(1)}h` 
                         : `${Math.round(((song as any).totalPracticeTime || 0) / 60)}m`}
                     </span>
                   </div>

                  <div className="mt-auto pt-3">
                      <Button size="sm" variant="outline" 
                              onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                              className="w-full bg-slate-950 border-slate-700 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all text-slate-300 group-hover:border-violet-500/50">
                         <Eye className="w-4 h-4 mr-2" />
                         Chi tiết
                      </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-2 pt-4 gap-4">
               <div className="text-sm text-slate-400">
                  Hiển thị <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> đến <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredSongs.length)}</span> trong <span className="font-medium text-white">{filteredSongs.length}</span> kết quả
               </div>
               <div className="flex items-center gap-2">
                  <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="h-8 px-3 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  >
                     Trước
                  </Button>
                  <div className="flex items-center gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                           return (
                              <button
                                 key={i}
                                 onClick={() => setCurrentPage(pageNum)}
                                 className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                                    currentPage === pageNum 
                                       ? 'bg-violet-600 text-white' 
                                       : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                 }`}
                              >
                                 {pageNum}
                              </button>
                           );
                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                           return <span key={`ellipsis-${pageNum}`} className="text-slate-500 w-6 text-center">...</span>;
                        }
                        return null;
                     })}
                  </div>
                  <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                     disabled={currentPage === totalPages}
                     className="h-8 px-3 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  >
                     Tiếp
                  </Button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
