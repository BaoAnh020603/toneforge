import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Home, 
  Upload, 
  Globe, 
  History, 
  Settings, 
  LogOut, 
  Mic2,
  Crown,
  GraduationCap,
  Target,
  MessageSquareWarning,
  Sparkles,
  Heart,
  Shield,
  Menu,
  X,
  Trophy
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UpgradeModal } from '../components/UpgradeModal';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
        if (doc.exists()) setProfile(doc.data());
      });
      return () => unsubscribe();
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading || !user) return null;

  const navItems = [
    { name: 'Tổng quan', path: '/dashboard', icon: Home, end: true },
    { name: 'Mục đã lưu', path: '/dashboard/favorites', icon: Heart },
    { name: 'Lộ trình cá nhân', path: '/dashboard/roadmap', icon: Target },
    { name: 'Mục tiêu & huy hiệu', path: '/dashboard/quests', icon: Trophy },
    { name: 'Bảng tiến bộ', path: '/leaderboard', icon: Crown },
    { name: 'Phòng mẫu', path: '/dashboard/community', icon: Globe },
    { name: 'Kiến thức cốt lõi', path: '/dashboard/theory', icon: GraduationCap },
    { name: 'Khởi động giọng', path: '/dashboard/pronunciation', icon: MessageSquareWarning },
    { name: 'AI đánh giá', path: '/dashboard/ai-evaluate', icon: Sparkles },
    { name: 'Nhật ký luyện tập', path: '/dashboard/history', icon: History },
    { name: 'Cài đặt', path: '/dashboard/settings', icon: Settings },
    ...(profile?.role === 'admin' ? [{ name: 'Quản trị Admin', path: '/dashboard/admin', icon: Shield }] : [])
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50 font-sans">
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform">
              <Mic2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">
              ToneForge
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1 hide-scrollbar">
          {navItems.map((item) => {
            const isActive = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 bg-violet-600/10 border border-violet-500/20 rounded-xl"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-violet-400" : "")} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}

          <div className="mt-8 mb-4 px-3">
             <Link to="/dashboard/upload">
               <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20">
                 <Upload className="w-4 h-4 mr-2" />
                 Tạo bài mới
               </Button>
             </Link>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-500">{profile?.isVip ? 'Creator Plan' : 'Starter Plan'}</span>
            </div>
            {!profile?.isVip && (
              <button onClick={() => setShowUpgradeModal(true)} className="text-xs text-amber-400 hover:underline">Nâng cấp</button>
            )}
          </div>
          
          <div className="flex items-center gap-3 px-2">
            <Link to="/dashboard/settings" className="relative shrink-0">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 hover:border-violet-500 transition-colors" />
              {profile?.isVip && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                   <Crown className="w-2.5 h-2.5 text-slate-900" />
                </div>
              )}
            </Link>
            <Link to="/dashboard/settings" className="flex-1 truncate group">
              <div className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{profile?.displayName || user.displayName || user.email?.split('@')[0]}</div>
              <div className="text-xs text-slate-500 truncate">Phong cách: {profile?.bestVoiceType?.split(' (')[0] || 'Chưa xác định'}</div>
            </Link>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative flex w-72 max-w-[85vw] flex-col bg-slate-950 border-r border-slate-900 h-full p-4 justify-between shadow-2xl z-50">
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-6">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
                    <Mic2 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">
                    ToneForge
                  </span>
                </Link>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1 overflow-y-auto flex-1 pr-2 hide-scrollbar">
                {navItems.map((item) => {
                  const isActive = item.end ? location.pathname === item.path : location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group",
                        isActive ? "text-white bg-violet-600/15 border border-violet-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 relative z-10", isActive ? "text-violet-400" : "")} />
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                  );
                })}

                <div className="mt-8 px-1">
                   <Link to="/dashboard/upload" onClick={() => setIsMobileMenuOpen(false)}>
                     <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20">
                       <Upload className="w-4 h-4 mr-2" />
                       Tạo bài mới
                     </Button>
                   </Link>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-auto shrink-0">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-500">{profile?.isVip ? 'Creator Plan' : 'Starter Plan'}</span>
                </div>
                {!profile?.isVip && (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowUpgradeModal(true);
                    }} 
                    className="text-xs text-amber-400 hover:underline animate-pulse"
                  >
                    Nâng cấp
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 px-2">
                <Link to="/dashboard/settings" onClick={() => setIsMobileMenuOpen(false)} className="relative shrink-0">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700" />
                  {profile?.isVip && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                       <Crown className="w-2.5 h-2.5 text-slate-900" />
                    </div>
                  )}
                </Link>
                <Link to="/dashboard/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex-1 truncate group">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-violet-400 transition-colors">{profile?.displayName || user.displayName || user.email?.split('@')[0]}</div>
                  <div className="text-xs text-slate-500 truncate">Phong cách: {profile?.bestVoiceType?.split(' (')[0] || 'Chưa xác định'}</div>
                </Link>
                <button onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        <header className="md:hidden h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg focus:outline-none"
              aria-label="Mở menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                <Mic2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400 whitespace-nowrap">
                ToneForge
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
             {!profile?.isVip && (
                <button onClick={() => setShowUpgradeModal(true)} className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">Nâng cấp Creator</button>
             )}
             <Link to="/dashboard/settings" className="relative">
               <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="avatar" className="w-8 h-8 rounded-full bg-slate-800" />
               {profile?.isVip && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                   <Crown className="w-2.5 h-2.5 text-slate-900" />
                </div>
              )}
             </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}

