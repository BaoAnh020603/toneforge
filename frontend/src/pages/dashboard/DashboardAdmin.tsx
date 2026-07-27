import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Music, Search, Shield, ShieldAlert, Crown, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db, auth } from '../../lib/firebase';
import { collection, query, getDocs, doc, getDoc, setDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { useAlert } from "../../contexts/AlertContext";

export default function DashboardAdmin() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'users' | 'songs' | 'errors'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  const [errorToDelete, setErrorToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingMetrics, setIsUpdatingMetrics] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {

      if (!auth.currentUser) return;
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const me = currentUserDoc.data();
      if (me?.role === 'admin') {
         setIsAdmin(true);
         fetchUsers();
         fetchSongs();
         fetchErrors();
      } else {
         setIsAdmin(false);
         setIsLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const fetchSongs = async () => {
    try {
      const q = query(collection(db, 'songs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchErrors = async () => {
    try {
      const q = query(collection(db, 'errorLogs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setErrors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleVip = async (userId: string, currentVipStatus: boolean) => {
    try {
      await setDoc(doc(db, 'users', userId), { isVip: !currentVipStatus }, { merge: true });
      setUsers(users.map(u => u.id === userId ? { ...u, isVip: !currentVipStatus } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
        await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) {
        console.error(e);
    }
  };

  const toggleSongStatus = async (songId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'hidden' ? 'public' : 'hidden';
    try {
      await setDoc(doc(db, 'songs', songId), { status: newStatus }, { merge: true });
      setSongs(songs.map(s => s.id === songId ? { ...s, status: newStatus } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSong = async (songId: string) => {
    // legacy, but keep structure for now
  };

  const updateMissingPitchMetrics = async () => {
    setIsUpdatingMetrics(true);
    try {
      const q = query(collection(db, 'songs'));
      const snap = await getDocs(q);
      let updatedCount = 0;

      for (const d of snap.docs) {
        const data = d.data();
        if (!data.pitchMetrics) {
          const chunkSnap = await getDoc(doc(db, 'songs', d.id, 'noteChunks', 'chunk_0'));
          if (chunkSnap.exists()) {
            const chunkData = chunkSnap.data();
            if (chunkData.data) {
                let minPitch = 20000;
                let maxPitch = 0;
                const pitchCounts: Record<number, number> = {};
                
                try {
                  const binaryString = atob(chunkData.data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                  }
                  const floatArray = new Float32Array(bytes.buffer);
                  for (let i = 0; i < floatArray.length; i += 3) {
                      const pitch = Math.round(floatArray[i+1]);
                      if (pitch > maxPitch) maxPitch = pitch;
                      if (pitch > 0 && pitch < minPitch) minPitch = pitch;
                      if (pitch > 0) {
                          pitchCounts[pitch] = (pitchCounts[pitch] || 0) + 1;
                      }
                  }
                } catch (e) {
                  console.error("Error parsing base64", e);
                }
                
                if (minPitch === 20000) minPitch = 0;
                
                let modePitch = 0;
                let maxCount = 0;
                Object.entries(pitchCounts).forEach(([pitch, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        modePitch = Number(pitch);
                    }
                });

                let difficulty = 'Dễ';
                let difficultyColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                if (maxPitch > 0 && minPitch > 0) {
                   const rangeOctaves = (maxPitch - minPitch) / 12;
                   if (rangeOctaves >= 2.5) {
                       difficulty = 'Khó';
                       difficultyColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                   } else if (rangeOctaves >= 1.5) {
                       difficulty = 'Trung bình';
                       difficultyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                   }
                }

                await setDoc(doc(db, 'songs', d.id), {
                    pitchMetrics: { minPitch, maxPitch, modePitch },
                    difficultyInfo: { label: difficulty, colorClass: difficultyColor }
                }, { merge: true });
                updatedCount++;
            }
          }
        }
      }
      showAlert(`Đã cập nhật hồ sơ quãng giọng cho ${updatedCount} bài hát.`);
      fetchSongs();
    } catch (e) {
      console.error(e);
      showAlert('Có lỗi xảy ra khi cập nhật.');
    } finally {
      setIsUpdatingMetrics(false);
    }
  };

  const confirmDeleteSong = async () => {
    if (!songToDelete) return;
    setIsDeleting(true);
    const songId = songToDelete;
    try {
      // 1. Delete noteChunks
      const chunksSnap = await getDocs(collection(db, 'songs', songId, 'noteChunks'));
      const chunkDeletes = chunksSnap.docs.map(d => deleteDoc(doc(db, 'songs', songId, 'noteChunks', d.id)));
      await Promise.all(chunkDeletes);
      
      // 2. Delete from favoriteSongs
      const favStatsSnap = await getDocs(query(collection(db, 'favoriteSongs'), where('songId', '==', songId)));
      const favDeletes = favStatsSnap.docs.map(d => deleteDoc(doc(db, 'favoriteSongs', d.id)));
      await Promise.all(favDeletes);

      // 3. Delete from userSongStats
      const statsSnap = await getDocs(query(collection(db, 'userSongStats'), where('songId', '==', songId)));
      const statsDeletes = statsSnap.docs.map(d => deleteDoc(doc(db, 'userSongStats', d.id)));
      await Promise.all(statsDeletes);
      
      // 4. Delete from singingHistory
      const historySnap = await getDocs(query(collection(db, 'singingHistory'), where('songId', '==', songId)));
      const historyDeletes = historySnap.docs.map(d => deleteDoc(doc(db, 'singingHistory', d.id)));
      await Promise.all(historyDeletes);

      // 5. Delete the song itself
      await deleteDoc(doc(db, 'songs', songId));
      
      setSongs(songs.filter(s => s.id !== songId));
      setSongToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteError = async () => {
    if (!errorToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'errorLogs', errorToDelete));
      setErrors(errors.filter(e => e.id !== errorToDelete));
      setErrorToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isLoading && !isAdmin) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-16 text-center pt-20">
         <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
         <h1 className="text-3xl font-bold text-white mb-2">Truy cập bị từ chối</h1>
         <p className="text-slate-400">Bạn không có quyền truy cập trang quản trị hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-slate-400">Quản lý người dùng, phân quyền và dữ liệu hệ thống.</p>
      </div>

      <div className="flex border-b border-slate-800 gap-6">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'users' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Người dùng
        </button>
        <button 
          onClick={() => setActiveTab('songs')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'songs' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          <Music className="w-4 h-4" /> Bài hát
        </button>
        <button 
          onClick={() => setActiveTab('errors')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'errors' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-white'}`}
        >
          <AlertTriangle className="w-4 h-4" /> Lỗi hệ thống
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
      ) : (
        <>
          {activeTab === 'users' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-300">
                   <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                     <tr>
                       <th className="px-6 py-4 font-medium">Người dùng</th>
                       <th className="px-6 py-4 font-medium">UID</th>
                       <th className="px-6 py-4 font-medium text-center">VIP Status</th>
                       <th className="px-6 py-4 font-medium text-center">Role (Admin)</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {users.map(user => (
                       <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                         <td className="px-6 py-4">
                           <div className="font-bold text-white">{user.displayName || 'Không tên'}</div>
                           <div className="text-xs text-slate-500">{user.email || 'Không có email'}</div>
                         </td>
                         <td className="px-6 py-4 text-xs font-mono text-slate-500">{user.id}</td>
                         <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => toggleVip(user.id, user.isVip)}
                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user.isVip ? 'bg-amber-500' : 'bg-slate-700'}`}
                           >
                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.isVip ? 'translate-x-6' : 'translate-x-1'}`} />
                           </button>
                         </td>
                         <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => toggleRole(user.id, user.role)}
                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user.role === 'admin' ? 'bg-rose-500' : 'bg-slate-700'}`}
                           >
                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.role === 'admin' ? 'translate-x-6' : 'translate-x-1'}`} />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'songs' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button 
                  onClick={updateMissingPitchMetrics} 
                  disabled={isUpdatingMetrics}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isUpdatingMetrics ? 'Đang cập nhật...' : 'Cập nhật quãng giọng bị thiếu'}
                </Button>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm text-slate-300">
                   <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                     <tr>
                       <th className="px-6 py-4 font-medium">Bài hát</th>
                       <th className="px-6 py-4 font-medium">Nghệ sĩ / Kênh</th>
                       <th className="px-6 py-4 font-medium">Owner UID</th>
                       <th className="px-6 py-4 font-medium text-center">Hiển thị (Public)</th>
                       <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {songs.map(song => (
                       <tr key={song.id} className="hover:bg-slate-800/30 transition-colors">
                         <td className="px-6 py-3">
                           <div className="flex items-center gap-3">
                             {song.thumbnail && <img src={song.thumbnail} alt="" className="w-12 h-8 object-cover rounded" />}
                             <div className="font-bold text-white max-w-[200px] truncate">{song.title}</div>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-slate-400">{song.artist}</td>
                         <td className="px-6 py-4 text-xs font-mono text-slate-500">{song.ownerId}</td>
                         <td className="px-6 py-4 text-center">
                           <button 
                             onClick={() => toggleSongStatus(song.id, song.status || 'public')}
                             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(song.status || 'public') === 'public' ? 'bg-green-500' : 'bg-slate-700'}`}
                             title={(song.status || 'public') === 'public' ? 'Đang hiển thị' : 'Đang ẩn'}
                           >
                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(song.status || 'public') === 'public' ? 'translate-x-6' : 'translate-x-1'}`} />
                           </button>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => setSongToDelete(song.id)}
                             className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                             title="Xoá bài hát"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
           </div>
          )}

          {activeTab === 'errors' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-300">
                   <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
                     <tr>
                       <th className="px-6 py-4 font-medium">Thời gian</th>
                       <th className="px-6 py-4 font-medium">Lỗi</th>
                       <th className="px-6 py-4 font-medium">Context</th>
                       <th className="px-6 py-4 font-medium">Thông tin thêm</th>
                       <th className="px-6 py-4 font-medium text-right">Thao tác</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {errors.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Không có lỗi nào được ghi lại</td>
                       </tr>
                     ) : errors.map(error => (
                       <tr key={error.id} className="hover:bg-slate-800/30 transition-colors">
                         <td className="px-6 py-4 whitespace-nowrap">
                           {error.timestamp?.toDate ? new Date(error.timestamp.toDate()).toLocaleString() : 'N/A'}
                         </td>
                         <td className="px-6 py-4">
                           <div className="font-bold text-rose-400 mb-1">{error.message}</div>
                           <div className="text-xs font-mono text-slate-500 truncate max-w-xs" title={error.stack}>{error.stack}</div>
                         </td>
                         <td className="px-6 py-4 text-amber-400">{error.context}</td>
                         <td className="px-6 py-4">
                           <div className="text-xs text-slate-400">User: {error.userId}</div>
                           <div className="text-xs text-slate-400 truncate max-w-[200px]" title={error.url}>URL: {error.url}</div>
                           {error.info && <div className="text-[10px] bg-slate-950 p-1 rounded mt-1 overflow-auto max-h-20 whitespace-pre-wrap">{error.info}</div>}
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => setErrorToDelete(error.id)}
                             className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                             title="Xoá log"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </>
      )}

      {/* Delete Song Modal */}
      {songToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-2">Xóa bài hát?</h3>
             <p className="text-slate-400 text-sm mb-6">Bạn có chắc chắn muốn xóa bài hát này khỏi hệ thống? Mọi dữ liệu liên quan (điểm số, lịch sử) sẽ bị xóa vĩnh viễn.</p>
             <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setSongToDelete(null)} disabled={isDeleting}>Hủy</Button>
                <Button 
                   onClick={confirmDeleteSong}
                   disabled={isDeleting}
                   className="bg-red-500 hover:bg-red-600 text-white"
                >
                   {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* Delete Error Modal */}
      {errorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-2">Xóa log lỗi?</h3>
             <p className="text-slate-400 text-sm mb-6">Log lỗi này sẽ bị xóa vĩnh viễn.</p>
             <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setErrorToDelete(null)} disabled={isDeleting}>Hủy</Button>
                <Button 
                   onClick={confirmDeleteError}
                   disabled={isDeleting}
                   className="bg-red-500 hover:bg-red-600 text-white"
                >
                   {isDeleting ? 'Đang xóa...' : 'Xóa'}
                </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
