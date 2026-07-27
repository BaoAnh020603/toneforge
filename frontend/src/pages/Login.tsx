import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mic, UploadCloud, History, Trophy, Chrome, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error', error);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: UploadCloud, title: "Tạo phiên phân tích bằng AI", desc: "Biến video hoặc file âm thanh thành bài phân tích cao độ và nhịp." },
    { icon: History, title: "Lưu lịch sử luyện tập", desc: "Theo dõi tiến bộ và xem lại các phiên trước đó." },
    { icon: Trophy, title: "So sánh tiến bộ", desc: "Xem thứ hạng cá nhân và mục tiêu đã đạt được." }
  ];

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl"
      >
        <div className="p-10 lg:p-12 bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 mb-8">
            <Mic className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Tại sao cần đăng nhập?</h2>
          <p className="text-slate-400 mb-8">
            Để trải nghiệm trọn vẹn các tính năng cá nhân hoá của ToneForge.
          </p>
          
          <ul className="space-y-6">
            {benefits.map((b, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                  <b.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200">{b.title}</h4>
                  <p className="text-sm text-slate-500">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-10 lg:p-12 flex flex-col justify-center items-center text-center bg-slate-950/50">
          <h3 className="text-2xl font-bold text-white mb-2">Đăng nhập tài khoản</h3>
          <p className="text-slate-400 text-sm mb-8">Chọn phương thức đăng nhập để tiếp tục</p>

          <Button 
            className="w-full h-12 bg-white text-slate-900 hover:bg-slate-200 text-base font-semibold shadow-lg"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 w-5 h-5 animate-spin" /> : <Chrome className="mr-2 w-5 h-5" />}
            Tiếp tục với Google
          </Button>

          <p className="mt-8 text-xs text-slate-500 max-w-xs text-center">
            Bằng việc đăng nhập, bạn đồng ý với <a href="#" className="text-violet-400 hover:underline">Điều khoản dịch vụ</a> và <a href="#" className="text-violet-400 hover:underline">Chính sách bảo mật</a> của chúng tôi.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
