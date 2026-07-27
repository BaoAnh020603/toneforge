import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Crown, RefreshCw, Clock, Loader2, Award, Calendar, AlertCircle, Sparkles, X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { BADGES_LIST } from './dashboard/DashboardQuests';

export default function Leaderboard() {
  const [songs, setSongs] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [levelRankings, setLevelRankings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'score' | 'level'>('score');
  
  const [loading, setLoading] = useState(true);
  const [cacheTime, setCacheTime] = useState<number | null>(null);
  const [isCalculatedRealTime, setIsCalculatedRealTime] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin role
  useEffect(() => {
    const checkAdmin = async () => {
      if (!auth.currentUser) return;
      try {
        const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const me = currentUserDoc.data();
        if (me?.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
      }
    };
    checkAdmin();
  }, []);

  // Fetch real songs lists
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, 'songs'), where('status', '==', 'public')));
        const dbSongs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setSongs(dbSongs);
      } catch (err) {
        console.error("Error fetching songs: ", err);
      }
    };
    fetchSongs();
  }, []);

  const navigate = useNavigate();

  const openUserProfile = async (user: any) => {
    navigate(`/profile/${user.id}`);
  };

  // Compute or load rankings
  const loadRankings = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setIsCalculatedRealTime(false);

    try {
      // Check cache document if not forced
      const cacheDocRef = doc(db, 'leaderboardCache', 'global');
      
      let useCache = false;
      let cachedRankings: any[] = [];
      let cachedLevelRankings: any[] = [];
      let lastUpdated = 0;

      if (!forceRefresh) {
        try {
          const cacheSnap = await getDoc(cacheDocRef);
          if (cacheSnap.exists()) {
            const data = cacheSnap.data();
            cachedRankings = data.rankings || [];
            cachedLevelRankings = data.levelRankings || [];
            lastUpdated = data.lastUpdated || 0;
            
            // Cache is fresh for 24 hours
            const oneDayMs = 24 * 60 * 60 * 1000;
            if (Date.now() - lastUpdated < oneDayMs && (cachedRankings.length > 0 || cachedLevelRankings.length > 0)) {
              useCache = true;
            }
          }
        } catch (cacheErr) {
          console.warn("Could not retrieve cache, calculating fresh data:", cacheErr);
        }
      }

      if (useCache) {
        setRankings(cachedRankings);
        setLevelRankings(cachedLevelRankings);
        setCacheTime(lastUpdated);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap: Record<string, any> = {};
      usersSnap.docs.forEach(docSnap => {
        usersMap[docSnap.id] = docSnap.data();
      });

      // 2. Fetch Score Rankings
      const statsSnap = await getDocs(collection(db, 'userSongStats'));
      const userAggregates: { [uid: string]: { userId: string; name: string; avatar: string; score: number } } = {};
      
      statsSnap.docs.forEach(docSnap => {
        const row = docSnap.data();
        const uId = row.userId;
        if (!uId) return;

        const scoreValue = Number(row.maxScore) || 0;
        const displayNameVal = usersMap[uId]?.displayName || row.displayName || "Giọng ca bí ẩn";
        const photoURLVal = usersMap[uId]?.photoURL || row.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uId}`;

        if (!userAggregates[uId]) {
          userAggregates[uId] = { userId: uId, name: displayNameVal, avatar: photoURLVal, score: 0 };
        }
        userAggregates[uId].score += scoreValue;
      });

      let sortedList = Object.values(userAggregates)
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({
          id: item.userId,
          name: item.name,
          avatar: item.avatar,
          score: item.score,
          rank: index + 1
        }));

      // 3. Fetch Level Rankings
      const voiceStatsSnap = await getDocs(collection(db, 'voiceStats'));
      const levelAggregates: any[] = [];
      
      voiceStatsSnap.docs.forEach(docSnap => {
        const row = docSnap.data();
        const uId = docSnap.id;
        
        const xpValue = Number(row.xp) || 0;
        const levelValue = Number(row.level) || 1;
        const displayNameVal = usersMap[uId]?.displayName || "Giọng ca bí ẩn";
        const photoURLVal = usersMap[uId]?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uId}`;

        levelAggregates.push({
          userId: uId,
          name: displayNameVal,
          avatar: photoURLVal,
          level: levelValue,
          xp: xpValue,
          badgesCount: row.unlockedBadges?.length || 0
        });
      });

      let sortedLevelList = levelAggregates
        .sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          return b.xp - a.xp;
        })
        .map((item, index) => ({
          id: item.userId,
          name: item.name,
          avatar: item.avatar,
          score: item.xp, // using score field for generic rendering
          level: item.level,
          badgesCount: item.badgesCount,
          rank: index + 1
        }));

      if (sortedList.length === 0 && sortedLevelList.length === 0) {
        sortedList = [];
        sortedLevelList = [];
      }

      setRankings(sortedList);
      setLevelRankings(sortedLevelList);
      
      const now = Date.now();
      setCacheTime(now);

      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'leaderboardCache', 'global'), {
            rankings: sortedList,
            levelRankings: sortedLevelList,
            lastUpdated: now
          });
        } catch (writeErr) {
          console.warn("Failed to write updated rankings cache to Firestore:", writeErr);
        }
      }
    } catch (err) {
      console.error("Error building leaderboard rankings list: ", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, []);

  const currentRankingsList = activeTab === 'score' ? rankings : levelRankings;
  const displayRankings = currentRankingsList;
  const isDemoMode = rankings.length === 0 && levelRankings.length === 0;

  // Utility to safely retrieve placement or return beautifully formatted placeholder blocks
  const getRankData = (index: number) => {
    if (index < displayRankings.length) {
      return displayRankings[index];
    }
    return {
      id: `empty-${index}`,
      name: "Đang chờ vị trí này...",
      score: 0,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder-${index}`,
      rank: index + 1
    };
  };

  const top1 = getRankData(0);
  const top2 = getRankData(1);
  const top3 = getRankData(2);

  const formatCacheTime = (time: number) => {
    const date = new Date(time);
    return `Tính toán từ máy chủ lúc: ${date.toLocaleTimeString('vi-VN')} ngày ${date.toLocaleDateString('vi-VN')}`;
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-16 pt-6 max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-amber-500/10 text-yellow-500 border border-yellow-500/20 shadow-inner">
          <Trophy className="w-7 h-7" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 tracking-tight leading-none pt-2">
          Bảng Vàng Danh Vọng
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
          Những hồ sơ có tiến bộ nổi bật nhất trên hệ thống ToneForge.
        </p>
        
        {/* Tabs */}
        <div className="flex justify-center mt-4">
          <div className="bg-slate-900 border border-slate-800 rounded-full p-1 inline-flex shrink-0">
            <button
              onClick={() => setActiveTab('score')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === 'score' 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Điểm Hát
            </button>
            <button
              onClick={() => setActiveTab('level')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === 'level' 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 shadow-lg' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Cấp Độ & XP
            </button>
          </div>
        </div>

        {/* Optimised daily cash information & recalculate controller */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 pt-1.5 bg-slate-900/40 border border-slate-800/60 p-2.5 sm:p-3 rounded-2xl max-w-md mx-auto">
          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <div className="flex-1 text-left select-none leading-relaxed">
            <span className="font-semibold text-slate-300 block">Dữ liệu được lưu bộ nhớ đệm (24h)</span>
            <span className="text-[10px] text-slate-400">
              {cacheTime ? formatCacheTime(cacheTime) : "Chưa có lưu trữ đệm hiện tại"}
            </span>
          </div>
          {isAdmin && (
            <button 
              onClick={() => loadRankings(true)}
              disabled={isRefreshing || loading}
              title="Tính toán lại toàn hệ thống"
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white rounded-lg transition-all shrink-0 border border-slate-700 flex items-center justify-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Demo Warning Banner */}
      {isDemoMode && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-2xl max-w-2xl mx-auto flex items-start gap-3 shadow-md"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <h4 className="font-bold text-sm">Chế độ trải nghiệm</h4>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              Hệ thống chưa ghi nhận lượt thi đấu ca hát chính thức nào. Hiện tại đang hiển thị dữ liệu bảng vàng mô phỏng để minh họa tính năng.
            </p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Đang tập hợp danh sách tinh tú...</p>
        </div>
      ) : (
        <>
          {/* Podium (Top 3) */}
          <div className="flex items-end justify-center gap-2 md:gap-6 pt-10 pb-8 px-2 max-w-3xl mx-auto w-full select-none">
            {/* Rank 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex flex-col items-center w-1/3 max-w-[150px] cursor-pointer hover:scale-105 transition-transform"
              onClick={() => top2.id && !top2.id.startsWith('empty') && openUserProfile(top2)}
            >
              <div className="relative mb-3 flex flex-col items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-300 bg-slate-800 overflow-hidden shadow-lg relative shrink-0">
                  <img src={top2.avatar} alt={top2.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 w-6 h-6 bg-slate-300 rounded-full flex items-center justify-center text-slate-950 font-black text-xs shadow-lg border border-slate-400">
                  2
                </div>
              </div>
              <div className="text-center font-bold text-slate-200 text-xs md:text-sm truncate w-full mt-1.5 px-0.5">{top2.name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                {activeTab === 'level' && top2.level && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-sm">Lv.{top2.level}</span>}
                <div className="text-slate-400 text-[11px] md:text-xs font-mono font-bold">{top2.score ? `${top2.score.toLocaleString()} ${activeTab === 'score' ? 'pt' : 'XP'}` : '--'}</div>
              </div>
              <div className="w-full h-20 md:h-28 bg-slate-800/60 rounded-t-2xl mt-4 border-t-2 border-slate-400/50 relative shadow-inner">
                <div className="absolute inset-x-0 bottom-4 flex justify-center text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Ag (Bạc)</div>
              </div>
            </motion.div>

            {/* Rank 1 */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center w-1/3 max-w-[170px] z-10 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => top1.id && !top1.id.startsWith('empty') && openUserProfile(top1)}
            >
              <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] animate-bounce" />
              <div className="relative mb-3 flex flex-col items-center">
                <div className="w-20 h-20 md:w-26 md:h-26 rounded-full border-4 border-yellow-400 bg-slate-800 overflow-hidden shadow-[0_0_25px_rgba(250,204,21,0.25)] relative shrink-0">
                  <img src={top1.avatar} alt={top1.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 w-7.5 h-7.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-slate-950 font-black text-xs md:text-sm shadow-xl border-2 border-yellow-300">
                  1
                </div>
              </div>
              <div className="text-center font-black text-yellow-400 text-sm md:text-base truncate w-full mt-1 px-0.5">{top1.name}</div>
              <div className="flex items-center gap-1.5 mt-1 pb-1">
                {activeTab === 'level' && top1.level && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-sm">Lv.{top1.level}</span>}
                <div className="text-slate-300 text-xs md:text-sm font-mono font-black">{top1.score ? `${top1.score.toLocaleString()} ${activeTab === 'score' ? 'pt' : 'XP'}` : '--'}</div>
              </div>
              <div className="w-full h-28 md:h-38 bg-gradient-to-t from-yellow-950/20 to-yellow-600/10 rounded-t-3xl mt-4 border-t-4 border-yellow-500/70 backdrop-blur-sm relative shadow-lg">
                <div className="absolute inset-x-0 bottom-4 flex justify-center text-[10px] uppercase tracking-wider font-extrabold text-yellow-500/80">Au (Vàng)</div>
              </div>
            </motion.div>

            {/* Rank 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col items-center w-1/3 max-w-[150px] cursor-pointer hover:scale-105 transition-transform"
              onClick={() => top3.id && !top3.id.startsWith('empty') && openUserProfile(top3)}
            >
              <div className="relative mb-3 flex flex-col items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-amber-700 bg-slate-800 overflow-hidden shadow-lg relative shrink-0">
                  <img src={top3.avatar} alt={top3.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 w-6 h-6 bg-amber-700 rounded-full flex items-center justify-center text-amber-100 font-black text-xs shadow-lg border border-amber-600">
                  3
                </div>
              </div>
              <div className="text-center font-bold text-slate-200 text-xs md:text-sm truncate w-full mt-1.5 px-0.5">{top3.name}</div>
              <div className="flex items-center gap-1.5 mt-1">
                {activeTab === 'level' && top3.level && <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 rounded-sm">Lv.{top3.level}</span>}
                <div className="text-slate-400 text-[11px] md:text-xs font-mono font-bold">{top3.score ? `${top3.score.toLocaleString()} ${activeTab === 'score' ? 'pt' : 'XP'}` : '--'}</div>
              </div>
              <div className="w-full h-16 md:h-22 bg-slate-800/60 rounded-t-2xl mt-4 border-t-2 border-amber-800/60 relative shadow-inner">
                <div className="absolute inset-x-0 bottom-4 flex justify-center text-[10px] uppercase tracking-wider font-extrabold text-amber-600">Cu (Đồng)</div>
              </div>
            </motion.div>
          </div>

          {/* List Of All Rankers */}
          {displayRankings.length <= 3 ? (
            <div className="text-center py-10 bg-slate-900/10 border border-slate-800/50 rounded-3xl max-w-xl mx-auto">
              <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Chưa có người chơi xếp ở thứ hạng tiếp theo.</p>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-900/90 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="px-4 sm:px-6 py-4 bg-slate-900/40 border-b border-slate-900/90 flex text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest leading-none">
                <div className="w-14 sm:w-20 text-center">Xếp Hạng</div>
                <div className="flex-1">Ngôi sao</div>
                <div className="w-24 sm:w-36 text-right">Tổng điểm</div>
              </div>
              <div className="divide-y divide-slate-900/60">
                {displayRankings.slice(3).map((user, idx) => (
                  <motion.div 
                    key={user.id || `rank-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    onClick={() => openUserProfile(user)}
                    className="flex items-center px-4 sm:px-6 py-4 hover:bg-slate-800/60 transition-all duration-200 cursor-pointer"
                  >
                    <div className="w-14 sm:w-20 text-center font-bold text-slate-400 text-sm font-mono">
                      #{user.rank}
                    </div>
                    <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 border border-slate-850 overflow-hidden shrink-0 relative">
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-300 hover:text-white truncate text-sm sm:text-base transition-colors">
                          {user.name}
                        </span>
                        {activeTab === 'level' && user.level && (
                          <span className="text-[10px] text-amber-500 font-bold">Lv.{user.level} • {user.badgesCount} Danh hiệu</span>
                        )}
                      </div>
                    </div>
                    <div className="w-24 sm:w-36 text-right font-mono text-xs sm:text-sm font-extrabold text-amber-400">
                      {user.score?.toLocaleString()} {activeTab === 'score' ? 'pt' : 'XP'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

