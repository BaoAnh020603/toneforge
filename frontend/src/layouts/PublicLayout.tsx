import { Outlet, Link, useLocation } from 'react-router-dom';
import { Mic2, Radio, Sparkles, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

export default function PublicLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: 'Studio', path: '/community', icon: Radio },
    { name: 'Bảng tiến bộ', path: '/leaderboard', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950 font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 w-full border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform">
              <Mic2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-blue-400">
              ToneForge
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-full border border-slate-800/50">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-slate-800 rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className={cn("relative flex items-center gap-2 z-10", isActive ? "text-violet-300" : "text-slate-400 hover:text-slate-200")}>
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard" className="flex items-center gap-3">
                <span className="hidden sm:inline text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{user.displayName || user.email}</span>
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 hover:border-violet-500 transition-colors"
                />
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-slate-800">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/login">
                  <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 text-white shadow-lg shadow-violet-600/25">
                    <span className="hidden sm:inline">Vào Studio</span>
                    <span className="sm:hidden">
                      <LogIn className="w-4 h-4" />
                    </span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800/50 bg-slate-950 py-8 relative z-10">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} ToneForge. Thiết kế giọng nói theo cách của bạn.</p>
        </div>
      </footer>
    </div>
  );
}
