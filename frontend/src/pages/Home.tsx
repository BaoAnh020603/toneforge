import { motion } from 'motion/react';
import { ArrowRight, Mic, Activity, Music, PlayCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const features = [
    {
      icon: Mic,
      title: 'Bản đồ giọng nói',
      description: 'Đo vùng âm vực, nhận diện quãng giọng và tìm ra chất giọng phù hợp với bạn.',
      color: 'from-blue-500 to-cyan-400',
    },
    {
      icon: Activity,
      title: 'Phản hồi realtime',
      description: 'Theo dõi cao độ và độ ổn định của giọng ngay khi bạn đang tập.',
      color: 'from-violet-500 to-purple-400',
    },
    {
      icon: Music,
      title: 'Lộ trình cá nhân',
      description: 'Mỗi người dùng có bộ mục tiêu và bài tập riêng để tiến bộ theo nhịp của mình.',
      color: 'from-pink-500 to-rose-400',
    },
  ];

  return (
    <div className="flex flex-col gap-24 pb-16">
      <section className="pt-20 lg:pt-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          <span className="text-sm font-medium">Bản Beta - Voice Lab cá nhân</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mb-6"
        >
          Xây dựng <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400">signature voice</span> của bạn.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10"
        >
          ToneForge là phòng thí nghiệm luyện giọng kết hợp phân tích cao độ realtime, phản hồi trực quan và lộ trình cá nhân hoá cho người muốn tiến bộ nhanh hơn.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16"
        >
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="h-12 px-8 text-base bg-white text-slate-950 hover:bg-slate-200">
                Đi tới Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="h-12 px-8 text-base bg-white text-slate-950 hover:bg-slate-200">
                Bắt đầu phiên tập
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          )}
          <Link to="/community">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base border-slate-700 text-slate-300 hover:bg-slate-800">
              <PlayCircle className="mr-2 w-5 h-5" />
              Khám phá phòng mẫu
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full max-w-4xl relative overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-900/40 to-blue-900/40 p-8 md:p-12 text-left shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 mb-4 border border-violet-500/30">
                   <Mic className="w-4 h-4" />
                   <span className="text-sm font-semibold tracking-wide">TÍNH NĂNG MỚI</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Kiểm tra quãng giọng của bạn</h2>
                <p className="text-violet-200/80 text-lg mb-6 max-w-lg">
                   Phát hiện dải âm vực của bạn với AI theo thời gian thực. Hát vào mic và xem kết quả trực quan trên bản đồ cao độ.
                </p>
                <Link to="/voice-range">
                   <Button size="lg" className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white border-0 shadow-lg shadow-violet-500/25 h-12 px-8 rounded-full">
                      Bắt đầu phân tích ngay
                      <ArrowRight className="w-5 h-5 ml-2" />
                   </Button>
                </Link>
             </div>
             
             <div className="shrink-0 w-48 h-32 bg-slate-950/50 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden shadow-xl">
                <div className="flex items-end gap-1 h-12">
                   {[40, 60, 30, 80, 50, 90, 40].map((h, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [`${h}%`, `${Math.random() * 50 + 20}%`, `${h}%`] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                        className="w-3 bg-violet-500 rounded-t-sm opacity-80" 
                      />
                   ))}
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-5xl w-full mx-auto">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/50 p-4 md:p-8 backdrop-blur-sm shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-violet-500/5 pointer-events-none" />
          
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Voice Trace Realtime</h3>
              <p className="text-sm text-slate-400">Hệ thống sẽ vẽ quỹ đạo giọng của bạn theo thời gian thực.</p>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] border border-green-400" />
            </div>
          </div>

          <div className="relative h-64 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden hide-scrollbar">
            <div className="absolute inset-0 flex flex-col justify-between py-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full h-px bg-slate-800/80 dashed" />
              ))}
            </div>

            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <path 
                d="M 0,150 Q 100,150 150,100 T 300,100 T 450,180 T 600,180 T 700, 80 T 850, 80 T 1000, 150" 
                fill="none" 
                stroke="#334155" 
                strokeWidth="20"
                strokeLinecap="round"
                className="opacity-50"
              />
            </svg>

            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <motion.path 
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                d="M 0,150 Q 100,155 150,105 T 300,95 T 450,185 T 600,175 T 700, 85 T 850, 75 T 1000, 150" 
                fill="none" 
                stroke="#8b5cf6" 
                strokeWidth="4"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0px 0px 8px rgba(139, 92, 246, 0.8))' }}
              />
            </svg>

             <div className="absolute bottom-4 left-0 w-full flex justify-center items-end">
                <p className="text-xl font-medium text-slate-400 bg-slate-950/80 px-4 py-1 rounded-full">
                  Làm sao cho <span className="text-violet-400 font-bold drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">vơi đi</span> nỗi buồn...
                </p>
             </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:bg-slate-900 transition-colors group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-6 transform group-hover:scale-110 transition-transform shadow-lg opacity-90`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-200 mb-3">{feature.title}</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
