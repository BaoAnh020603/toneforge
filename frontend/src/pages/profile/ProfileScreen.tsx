import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Trophy, Music, Disc, ArrowLeft, Loader2, Star, Sparkles, Award, Clock, Mail, Crown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, documentId } from 'firebase/firestore';

export default function ProfileScreen() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [voiceStats, setVoiceStats] = useState<any>(null);
  const [topScores, setTopScores] = useState<any[]>([]);
  const [topPractices, setTopPractices] = useState<any[]>([]);
  const [songsCache, setSongsCache] = useState<Record<string, any>>({});
  const [totalRecordings, setTotalRecordings] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        // Fetch base user
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }

        // Fetch voice stats
        const statsDoc = await getDoc(doc(db, 'voiceStats', userId));
        if (statsDoc.exists()) {
          setVoiceStats(statsDoc.data());
        }

        // Fetch user's song stats
        const statsSnap = await getDocs(query(collection(db, 'userSongStats'), where('userId', '==', userId)));
        const statsList = statsSnap.docs.map(d => d.data());
        
        setTotalRecordings(statsList.length);

        // Sort for top scores
        const sortedByScore = [...statsList].sort((a, b) => (b.maxScore || 0) - (a.maxScore || 0)).slice(0, 10);
        
        // Sort for top practice
        const sortedByPractice = [...statsList].sort((a, b) => (b.totalPracticeTime || 0) - (a.totalPracticeTime || 0)).slice(0, 10);

        setTopScores(sortedByScore);
        setTopPractices(sortedByPractice);

        // Fetch song details for these items
        const songIds = new Set<string>();
        sortedByScore.forEach(s => s.songId && songIds.add(s.songId));
        sortedByPractice.forEach(s => s.songId && songIds.add(s.songId));

        const songsMap: Record<string, any> = {};
        for (const id of Array.from(songIds)) {
           const sDoc = await getDoc(doc(db, 'songs', id));
           if (sDoc.exists()) {
              songsMap[id] = { id: sDoc.id, ...sDoc.data() };
           }
        }
        setSongsCache(songsMap);

      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
        <p className="text-slate-400 mt-4 font-medium">Đang tải hồ sơ nghệ sĩ...</p>
      </div>
    );
  }

  const joinDateStr = userProfile?.createdAt?.toDate ? userProfile.createdAt.toDate().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long' }) : 'Chưa rõ';
  const roleStr = userProfile?.role === 'admin' ? 'Quản trị viên' : userProfile?.isVip ? 'Thành viên VIP' : 'Thành viên';
  
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-50 relative pb-20">
      {/* Cover Header */}
      <div className="h-64 md:h-80 w-full bg-gradient-to-r from-violet-900 to-slate-900 relative">
         <button onClick={() => navigate(-1)} className="absolute top-6 left-6 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors border border-white/10">
           <ArrowLeft className="w-5 h-5" />
         </button>
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440503-62f80a0f5a70?w=1200&q=80')] opacity-30 mix-blend-overlay object-cover" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-20">
        {/* Profile Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
           <div className="relative shrink-0 self-center">
             <img 
                src={userProfile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} 
                alt="Avatar" 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-slate-900 bg-slate-800 shadow-xl"
             />
             <div className="absolute -bottom-2 md:-bottom-4 left-1/2 -translate-x-1/2 bg-slate-950 border-2 border-slate-800 rounded-xl px-4 py-1 flex items-center justify-center gap-1.5 shadow-lg whitespace-nowrap">
                <Star className="w-4 h-4 text-blue-400 fill-blue-400" />
                <span className="font-black text-white text-sm md:text-base tracking-wide">Cấp {voiceStats?.level || 1}</span>
             </div>
           </div>
           
           <div className="flex-1 text-center md:text-left mt-6 md:mt-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{userProfile?.displayName || 'Ca sĩ ẩn danh'}</h1>
              <p className="text-slate-400 mb-2 truncate max-w-md mx-auto md:mx-0">{roleStr} • Thành viên từ {joinDateStr}</p>
              
              {userProfile?.email && (
                 <div className="flex items-center justify-center md:justify-start gap-1.5 text-slate-300 text-sm mb-4">
                    <Mail className="w-4 h-4 text-violet-400" />
                    <a href={`mailto:${userProfile.email}`} className="hover:text-violet-300 hover:underline">{userProfile.email}</a>
                 </div>
              )}
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                 {userProfile?.bestVoiceType && (
                    <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold rounded-lg truncate max-w-full">
                      Giọng: {userProfile.bestVoiceType}
                    </span>
                 )}
                 {userProfile?.isVip && (
                    <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> VIP
                    </span>
                 )}
              </div>
           </div>
           
           <div className="flex gap-4 w-full md:w-auto self-center md:self-stretch mt-6 md:mt-2">
              <div className="flex flex-col justify-center flex-1 md:flex-none text-center bg-slate-950 rounded-2xl p-4 md:px-6 border border-slate-800 min-w-[140px] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-10 -mt-10" />
                 <div className="text-2xl font-black text-emerald-400 mb-1 flex justify-center items-center gap-1.5 relative z-10">
                    <Sparkles className="w-5 h-5"/> {(voiceStats?.xp || 0).toLocaleString()}
                 </div>
                 <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold relative z-10 text-center">Kinh Nghiệm</div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
           {/* Thống kê Tổng Quát */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                 <Award className="text-violet-400" /> Thống kê Khái Quát
              </h3>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800">
                          <Disc className="w-5 h-5 text-slate-400" />
                       </div>
                       <div className="font-semibold text-slate-300 text-sm">Tổng số bản thu đã hát</div>
                    </div>
                    <div className="font-bold text-xl text-white">{totalRecordings}</div>
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800">
                          <Crown className="w-5 h-5 text-yellow-500" />
                       </div>
                       <div className="font-semibold text-slate-300 text-sm">Danh hiệu đạt được</div>
                    </div>
                    <div className="font-bold text-xl text-yellow-400">{voiceStats?.unlockedBadges?.length || 0}</div>
                 </div>
              </div>
           </div>
           
           {/* Top 5 Điểm số */}
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
                 <Trophy className="text-amber-400" /> Top Điểm Số
              </h3>
              <div className="space-y-3">
                 {topScores.length === 0 && <div className="text-slate-500 text-sm text-center py-6">Chưa có dữ liệu điểm số.</div>}
                 {topScores.slice(0, 5).map((stat, idx) => {
                    const song = songsCache[stat.songId];
                    if (!song) return null;
                    return (
                       <Link to={`/play/${song.id}`} key={idx} className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-2xl transition-colors group">
                           <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 relative">
                               <img src={song.thumbnail || `https://i.ytimg.com/vi/${song.youtubeVideoId}/hqdefault.jpg`} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-5 h-5 text-white ml-0.5" />
                               </div>
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="text-sm font-bold text-white truncate">{song.title}</div>
                               <div className="text-xs text-slate-400 truncate">{song.artist}</div>
                           </div>
                           <div className="text-right shrink-0">
                               <div className="text-amber-400 font-black text-lg leading-none">{stat.maxScore.toLocaleString()}</div>
                               <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Điểm</div>
                           </div>
                       </Link>
                    )
                 })}
              </div>
           </div>
        </div>

        {/* Top Bài Hát Luyện Tập Nhiều Nhất */}
        <div className="mt-8 mb-12">
           <h2 className="text-2xl font-bold flex items-center gap-2 mb-6 px-2">
              <Clock className="text-blue-400" /> Top Bài Hát Yêu Thích 
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {topPractices.length === 0 && <div className="text-slate-500 text-sm px-2 col-span-full">Chưa có bài hát nào phổ biến.</div>}
             {topPractices.map((stat, idx) => {
                const song = songsCache[stat.songId];
                if (!song) return null;
                const min = Math.floor((stat.totalPracticeTime || 0) / 60);
                const hrs = Math.floor(min / 60);
                const mins = min % 60;
                const timeStr = hrs > 0 ? `${hrs} giờ ${mins} phút` : `${min} phút`;

                return (
                  <Link to={`/song/${song.id}`} key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col group hover:border-slate-700 transition-colors">
                    <div className="aspect-video w-full overflow-hidden relative">
                       <img src={song.thumbnail || `https://i.ytimg.com/vi/${song.youtubeVideoId}/hqdefault.jpg`} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                       <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                          <div className="bg-blue-600/20 backdrop-blur-md border border-blue-500/30 text-blue-100 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5">
                             <Clock className="w-3 h-3" /> {timeStr}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-lg translate-y-10 group-hover:translate-y-0 transition-transform duration-300">
                             <Play className="ml-0.5 w-4 h-4"/>
                          </div>
                       </div>
                    </div>
                    <div className="p-4">
                       <h3 className="font-bold text-base mb-1 line-clamp-1">{song.title}</h3>
                       <p className="text-xs text-slate-400 line-clamp-1">{song.artist}</p>
                    </div>
                  </Link>
                );
             })}
           </div>
        </div>

      </div>
    </div>
  );
}



