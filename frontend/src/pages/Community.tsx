import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Play, Star, Music, Link as LinkIcon, Youtube, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, onSnapshot, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
  genre?: string;
  videoUrl?: string;
  convertJobId?: string;
  plays?: number;
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

export default function Community() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [songs, setSongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const navigate = useNavigate();

  const genres = ['All', 'Pop', 'Ballad', 'Bolero', 'Indie', 'Khác'];

  useEffect(() => {
    const fetchCommunitySongs = async () => {
      try {
        const q = query(
          collection(db, 'songs'),
          where('status', '==', 'public')
        );
        const querySnapshot = await getDocs(q);
        const songsList: Song[] = [];
        querySnapshot.forEach((doc) => {
          songsList.push({ id: doc.id, ...doc.data() } as Song);
        });
        setSongs(songsList);
      } catch (error) {
        console.error("Lỗi khi tải bài hát cộng đồng:", error);
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
     if (!auth.currentUser) {
        navigate('/login');
        return;
     }
     
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
  }, [searchTerm, activeFilter]);

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          song.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const genre = song.genre || 'Khác';
    const matchesGenre = activeFilter === 'All' || genre === activeFilter || (activeFilter === 'Khác' && !genres.includes(genre as string));
    return matchesSearch && matchesGenre;
  });

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const currentItems = filteredSongs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col gap-8 pb-16 pt-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Thư viện bài hát</h1>
          <p className="text-slate-400">Khám phá các bài hát từ cộng đồng, chấm điểm và vinh danh.</p>
        </div>
        
        <div className="w-full md:w-auto relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-violet-400 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input 
            type="text" 
            placeholder="Tìm tên bài, ca sĩ..." 
            className="w-full md:w-[300px] h-12 pl-10 pr-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <div className="flex items-center gap-2 text-slate-400 mr-2">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Thể loại:</span>
        </div>
        {genres.map(genre => (
          <button
            key={genre}
            onClick={() => setActiveFilter(genre)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === genre 
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredSongs.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentItems.map((song, idx) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Link to={`/song/${song.id}`}>
                <div className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-violet-500/50 transition-colors">
                  {/* Image */}
                  <div className="aspect-[4/3] w-full overflow-hidden relative">
                    <img 
                      src={song.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80'} 
                      alt={song.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/20 to-transparent" />
                    
                    {/* Play overlay hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                      <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/50 transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-6 h-6 ml-1" />
                      </div>
                    </div>
  
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-900/80 text-slate-200 backdrop-blur-md">
                        {song.genre || 'Khác'}
                      </span>
                    </div>
                  </div>
  
                  {/* Info */}
                  <div className="p-5 relative">
                    <div className="pr-8">
                       <h3 className="text-xl font-bold text-white mb-1 group-hover:text-violet-300 transition-colors line-clamp-1">{song.title}</h3>
                    </div>
                    <button 
                      onClick={(e) => toggleFavorite(song.id, e)} 
                      className="absolute top-5 right-5 text-slate-500 hover:text-rose-500 transition-colors z-10"
                    >
                      <Heart className={`w-5 h-5 ${favorites.has(song.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                    <p className="text-slate-400 text-sm mb-4">{song.artist}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
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

                    <div className="flex items-center justify-between text-sm">
                      <div className="text-violet-400 text-xs font-medium px-2 py-1 bg-violet-500/10 rounded-full">
                         Cộng đồng
                      </div>
                      <div className="text-slate-500">
                        {song.plays ? song.plays.toLocaleString() : '0'} lượt hát
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between py-6 border-t border-slate-800/50 gap-4 mt-8">
               <div className="text-sm text-slate-400">
                  Hiển thị <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> đến <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, filteredSongs.length)}</span> trong <span className="font-medium text-white">{filteredSongs.length}</span> bài hát
               </div>
               <div className="flex items-center gap-2">
                  <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                     disabled={currentPage === 1}
                     className="h-9 px-4 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
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
                                 className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                                    currentPage === pageNum 
                                       ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25' 
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
                     className="h-9 px-4 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  >
                     Tiếp
                  </Button>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
            <Music className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-medium text-slate-300 mb-2">Không tìm thấy bài hát nào</h3>
          <p className="text-slate-500">Hãy thử từ khoá khác hoặc thể loại khác xem sao.</p>
        </div>
      )}
    </div>
  );
}
