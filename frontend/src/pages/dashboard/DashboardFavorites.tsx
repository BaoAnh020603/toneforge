import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Heart, Play, Music, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';

export default function DashboardFavorites() {
  const [favoriteSongs, setFavoriteSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const fetchFavorites = async () => {
    if (!auth.currentUser) return;
    
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'favoriteSongs'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snap = await getDocs(q);
      const favDocs = snap.docs.map(d => ({ favId: d.id, ...d.data() }));
      
      const promises = favDocs.map(async (f: any) => {
        const songDoc = await getDoc(doc(db, 'songs', f.songId));
        if (songDoc.exists()) {
          return { id: songDoc.id, favId: f.favId, ...songDoc.data() };
        }
        return null;
      });
      
      const fetchedSongs = (await Promise.all(promises)).filter(Boolean);
      setFavoriteSongs(fetchedSongs);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu thích", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveFavorite = async (favId: string) => {
    try {
      await deleteDoc(doc(db, 'favoriteSongs', favId));
      setFavoriteSongs(prev => prev.filter(s => s.favId !== favId));
    } catch (error) {
      console.error("Lỗi bỏ yêu thích", error);
    }
  };

  const totalPages = Math.ceil(favoriteSongs.length / itemsPerPage);
  const currentItems = favoriteSongs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bài hát yêu thích</h1>
          <p className="text-slate-400">Danh sách các bài hát bạn đã lưu.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
           <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      ) : favoriteSongs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Chưa có bài hát yêu thích nào</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">Bạn có thể lướt xem các bài hát từ kho dữ liệu hoặc cộng đồng và nhấn nút yêu thích để lưu vào đây.</p>
          <Link to="/dashboard/community">
             <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-full">
               Khám phá Cộng đồng
             </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map((song, idx) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-colors group relative"
              >
                <div className="aspect-video bg-black relative">
                  <img 
                    src={`https://img.youtube.com/vi/${song.youtubeVideoId}/hqdefault.jpg`} 
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/song/${song.id}`}>
                      <div className="w-14 h-14 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-xl hover:bg-violet-500 hover:scale-110 transition-all cursor-pointer backdrop-blur-sm">
                        <Play className="w-6 h-6 ml-1" />
                      </div>
                    </Link>
                  </div>
                  <div className="absolute top-3 right-3">
                     <button onClick={() => handleRemoveFavorite(song.favId)} className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors backdrop-blur-md">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs px-2 py-1 rounded font-mono">
                    Hoàn tất
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-white text-lg mb-1 truncate">{song.title}</h3>
                  <p className="text-slate-400 text-sm mb-4 truncate">{song.artist}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                       <span className="text-xs font-medium text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1">
                         <Music className="w-3 h-3 text-violet-400" /> Bản tách nhạc
                       </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
               <div className="text-sm text-slate-400">
                  Hiển thị <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> đến <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, favoriteSongs.length)}</span> trong <span className="font-medium text-white">{favoriteSongs.length}</span> bài hát
               </div>
               <div className="flex items-center gap-2">
                  <Button 
                     variant="outline" 
                     size="sm" 
                     className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                  >
                     <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                     {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                           key={i}
                           onClick={() => setCurrentPage(i + 1)}
                           className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === i + 1 
                              ? 'bg-violet-600 text-white' 
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                           }`}
                        >
                           {i + 1}
                        </button>
                     ))}
                  </div>
                  <Button 
                     variant="outline" 
                     size="sm" 
                     className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                  >
                     <ChevronRight className="w-4 h-4" />
                  </Button>
               </div>
             </div>
          )}
        </>
      )}
    </div>
  );
}
