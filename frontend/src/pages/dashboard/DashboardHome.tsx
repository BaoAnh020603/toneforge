import { useState, useEffect } from 'react';
import { Plus, Edit2, Play, Lock, Globe, Trash2, Music, Crown, Heart, Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAlert } from "../../contexts/AlertContext";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  status: string;
  createdAt: any;
  duration?: number;
}

export default function DashboardHome() {
  const { showAlert } = useAlert();
  const [mySongs, setMySongs] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showVipModal, setShowVipModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSongs = async (uid: string) => {
      try {
        const q = query(
          collection(db, 'songs'),
          where('ownerId', '==', uid)
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
            status: data.status,
            createdAt: data.createdAt,
            duration: data.duration
          });
        });
        
        // Sort in client side to avoid requiring a composite index right away if created doesn't have it
        songsList.sort((a, b) => {
           const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
           const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
           return timeB - timeA;
        });
        
        setMySongs(songsList);
      } catch (error) {
        console.error("Error fetching songs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchSongs(user.uid);
      } else {
        setMySongs([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
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

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '--/--/----';
    const date = timestamp.toDate();
    return date.toLocaleDateString('vi-VN');
  };

  const executeDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'songs', deletingId));
      setMySongs(prev => prev.filter(song => song.id !== deletingId));
    } catch (error) {
      console.error("Lỗi xóa bài hát:", error);
      showAlert("Có lỗi xảy ra khi xóa bài hát");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (songId: string, currentStatus: string) => {
    if (currentStatus === 'public') {
      // User is trying to switch public -> private
      // In a real app we would check user's VIP status here
      setShowVipModal(true);
      return;
    }

    try {
      await setDoc(doc(db, 'songs', songId), { status: 'public' }, { merge: true });
      setMySongs(prev => prev.map(s => s.id === songId ? { ...s, status: 'public' } : s));
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
    }
  };

  const totalPages = Math.ceil(mySongs.length / itemsPerPage);
  const currentItems = mySongs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bài hát của tôi</h1>
          <p className="text-slate-400">Quản lý kho nhạc cá nhân và các bài hát tự tải lên.</p>
        </div>
        <Link to="/dashboard/upload">
          <Button className="bg-violet-600 hover:bg-violet-500 text-white">
            <Plus className="w-5 h-5 mr-1" />
            Tải lên bài mới
          </Button>
        </Link>
      </div>

      {/* Gamification Nudge Banner */}
      <div className="bg-gradient-to-r from-violet-900/10 to-blue-900/10 border border-violet-500/15 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 border border-violet-500/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
               👨‍🏫
            </div>
            <div>
               <h4 className="font-bold text-sm text-violet-300">Lớp Học Thầy Nam Đang Chờ Trò</h4>
               <p className="text-xs text-slate-450 mt-0.5">Vào Lớp Học Thử Thách để thực hành Humming, tích lũy Đồng tiền Dưỡng Thanh và thăng hạng học vị!</p>
            </div>
         </div>
         <Link to="/dashboard/quests">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2 shrink-0">
               Vào Phòng Luyện
            </Button>
         </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
            </div>
          ) : mySongs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
               <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
                  <Music className="w-10 h-10" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">Chưa có bài hát nào</h3>
               <p className="text-slate-400 mb-6 max-w-md">Bạn chưa thêm bản phân tích nào lên hệ thống. Hãy tìm kiếm trên YouTube và tạo một phiên luyện tập để bắt đầu.</p>
               <Link to="/dashboard/upload">
                 <Button className="bg-violet-600 hover:bg-violet-500 text-white">
                    Tải lên ngay
                 </Button>
               </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card List (Hidden on tablet/desktop) */}
              <div className="sm:hidden space-y-4 p-4 divide-y divide-slate-800/40">
                 {currentItems.map((song) => (
                    <div 
                       key={song.id} 
                       onClick={() => navigate(`/song/${song.id}`)}
                       className="pt-4 first:pt-0 flex flex-col gap-3 group cursor-pointer"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-16 h-10 bg-slate-800 rounded-md overflow-hidden relative shrink-0">
                             {song.thumbnail ? (
                                <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                   <Music className="w-4 h-4 text-slate-500" />
                                </div>
                             )}
                          </div>
                          <div className="min-w-0 flex-1">
                             <div className="font-semibold text-slate-200 truncate flex items-center gap-2">
                                <span className="truncate text-sm leading-snug">{song.title}</span>
                             </div>
                             <div className="text-xs text-slate-500 truncate mt-0.5">{song.artist}</div>
                          </div>
                          <button
                            onClick={(e) => toggleFavorite(song.id, e)}
                            className="text-slate-500 hover:text-rose-500 transition-colors p-1 shrink-0 bg-slate-800/40 rounded-lg"
                          >
                            <Heart className={`w-4 h-4 ${favorites.has(song.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>
                       </div>
                       
                       <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                          <div className="flex items-center gap-3">
                             <button onClick={(e) => { e.stopPropagation(); toggleStatus(song.id, song.status); }} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors hover:brightness-125 cursor-pointer ${
                               song.status === 'public' 
                                 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                 : 'bg-slate-800 text-slate-400 border border-slate-700'
                             }`}>
                               {song.status === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                               {song.status === 'public' ? 'Công khai' : 'Riêng tư'}
                             </button>
                             <span className="text-[11px] text-slate-500">
                               {formatDate(song.createdAt)}
                             </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <Link to={`/song/${song.id}`} onClick={(e) => e.stopPropagation()}>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-green-400 hover:bg-green-400/10 transition-colors">
                                 <Eye className="w-4 h-4" />
                               </Button>
                             </Link>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" onClick={(e) => { e.stopPropagation(); setDeletingId(song.id); }}>
                               <Trash2 className="w-4 h-4" />
                             </Button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>

              {/* Desktop/Tablet Table Layout (Hidden on mobile) */}
              <table className="hidden sm:table w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-800/50 text-slate-400 font-medium">
                  <tr>
                    <th className="px-6 py-4">Bài hát</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">Kỷ lục cá nhân</th>
                    <th className="px-6 py-4">Ngày thêm</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {currentItems.map((song) => (
                    <tr key={song.id} 
                        onClick={() => navigate(`/song/${song.id}`)}
                        className="hover:bg-slate-800/20 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-10 bg-slate-800 rounded-md overflow-hidden relative">
                             {song.thumbnail ? (
                                <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-4 h-4 text-slate-500" />
                                </div>
                             )}
                             <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200 max-w-[200px] sm:max-w-[250px] truncate flex items-center gap-2" title={song.title}>
                               {song.title}
                               <button
                                 onClick={(e) => toggleFavorite(song.id, e)}
                                 className="text-slate-500 hover:text-rose-500 transition-colors"
                               >
                                 <Heart className={`w-4 h-4 ${favorites.has(song.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                               </button>
                            </div>
                            <div className="text-xs text-slate-500 max-w-[250px] truncate">{song.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={(e) => { e.stopPropagation(); toggleStatus(song.id, song.status); }} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors hover:brightness-125 cursor-pointer ${
                          song.status === 'public' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {song.status === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {song.status === 'public' ? 'Công khai' : 'Riêng tư'}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        --
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(song.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/song/${song.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-green-400 hover:bg-green-400/10 transition-colors tooltip-target" title="Chi tiết">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Xoá" onClick={(e) => { e.stopPropagation(); setDeletingId(song.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-800 gap-4">
             <div className="text-sm text-slate-400">
                Hiển thị <span className="font-medium text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> đến <span className="font-medium text-white">{Math.min(currentPage * itemsPerPage, mySongs.length)}</span> trong <span className="font-medium text-white">{mySongs.length}</span> bài hát
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

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in duration-200">
             <h3 className="font-bold text-lg text-white mb-2">Xác nhận xóa</h3>
             <p className="text-sm text-slate-400 mb-6">Bạn có chắc chắn muốn xóa bài hát này khỏi thư viện?</p>
             <div className="flex gap-3">
                <Button variant="outline" className="flex-1 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300" onClick={() => setDeletingId(null)}>Hủy</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-500 text-white" onClick={executeDelete}>Xóa bài hát</Button>
             </div>
          </div>
        </div>
      )}

      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-violet-500/30 rounded-3xl p-8 shadow-2xl max-w-sm w-full relative overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col items-center text-center">
             <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
                <Crown className="w-8 h-8" />
             </div>
             <h3 className="font-bold text-xl text-white mb-2">Nâng cấp VIP</h3>
             <p className="text-sm text-slate-400 mb-6">Tính năng chuyển bài hát sang trạng thái <strong className="text-slate-200">Riêng tư</strong> chỉ dành cho tài khoản VIP. Nâng cấp ngay để bảo vệ bài hát của bạn!</p>
             <div className="flex flex-col gap-3 w-full">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold" onClick={() => setShowVipModal(false)}>
                   Nâng cấp ngay
                </Button>
                <Button variant="ghost" className="w-full text-slate-400 hover:text-white" onClick={() => setShowVipModal(false)}>
                   Để sau
                </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
