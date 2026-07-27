import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Music4, Clock, Network, ScrollText, ArrowRight, Activity, Volume2, Waves, Mic, Sparkles, Wind, ArrowRightLeft, TrendingDown, Heart, User, MessageCircle, Ear } from 'lucide-react';
import { Button } from '../../components/ui/button';

export default function DashboardTheory() {
  const lessons = [
    {
      id: "notes",
      title: "1. Nốt Nhạc & Solfege",
      desc: "Làm quen với Đồ Rê Mi và ký hiệu chữ cái C D E.",
      icon: Music4,
      color: "text-blue-400",
      bg: "bg-blue-500/10"
    },
    {
      id: "rhythm",
      title: "2. Nhịp điệu & Tempo",
      desc: "Hiểu về nhịp 2/4, 3/4, 4/4 và tốc độ bài hát.",
      icon: Clock,
      color: "text-green-400",
      bg: "bg-green-500/10"
    },
    {
      id: "keys",
      title: "3. Tông bài hát (Chìa khoá)",
      desc: "Đô trưởng, Rê thứ, Mi giáng... là gì? Cách chọn tông.",
      icon: Network,
      color: "text-amber-400",
      bg: "bg-amber-500/10"
    },
    {
      id: "sheet",
      title: "4. Đọc Sheet Nhạc",
      desc: "Khuông nhạc, dòng kẻ, nén, móc đơn, móc kép.",
      icon: ScrollText,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10"
    }
  ];

  const techniquesLevel1 = [
    {
      id: 'pitch',
      title: 'Cao độ (Pitch)',
      icon: Activity,
      desc: 'Hát đúng nốt nhạc, tránh lạc tông, phô chênh.',
      goal: 'Nghe và hát chính xác giai điệu.',
      appSupport: 'Phân tích tần số âm thanh thời gian thực so với nốt nhạc chuẩn.',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      id: 'timing',
      title: 'Trường độ & Nhịp điệu',
      icon: Clock,
      desc: 'Giữ nốt nhạc đủ lâu, hát đúng nhịp điệu và tempo của bài.',
      goal: 'Hát khớp với "beat" của bài nhạc.',
      appSupport: 'So sánh thời lượng nốt hát với các mốc nhịp trong MIDI/bản nhạc.',
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    },
    {
      id: 'dynamics',
      title: 'Cường độ (Dynamics)',
      icon: Volume2,
      desc: 'Thay đổi âm lượng giọng hát một cách biểu cảm (từ nhỏ đến lớn).',
      goal: 'Tạo điểm nhấn, cảm xúc cho bài hát qua âm lượng.',
      appSupport: 'Đo lường biên độ âm thanh và so sánh với yêu cầu của bài.',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10'
    },
    {
      id: 'vibrato',
      title: 'Rung giọng (Vibrato)',
      icon: Waves,
      desc: 'Kỹ thuật tạo rung động đều đặn, tự nhiên trong giọng hát.',
      goal: 'Giọng hát bay bổng, chuyên nghiệp hơn.',
      appSupport: 'Phân tích sự dao động tần số âm thanh (chuẩn 5–7 Hz).',
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10'
    },
    {
      id: 'onset',
      title: 'Khởi âm & Ngắt âm',
      icon: Mic,
      desc: 'Bắt đầu hát một nốt nhạc đúng thời điểm, mượt mà và chính xác.',
      goal: 'Đảm bảo sự liền mạch, không bị trễ nhịp.',
      appSupport: 'Phát hiện thời điểm tín hiệu âm thanh bắt đầu đủ mạnh so với nhịp.',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10'
    }
  ];

  const techniquesLevel2 = [
    {
      title: 'Chất giọng / Màu giọng',
      icon: Sparkles,
      desc: 'Các đặc trưng âm sắc riêng biệt của giọng hát (sáng, tối, khàn, mũi…).',
      goal: 'Nhận diện và phát huy tối đa màu giọng tự nhiên.',
      appSupport: 'Phân tích phổ tần số (FFT), huấn luyện AI nhận diện âm sắc.'
    },
    {
      title: 'Hơi Thở',
      icon: Wind,
      desc: 'Sức mạnh và sự ổn định của hơi thở là nền tảng cho giọng hát.',
      goal: 'Hát chắc chắn, không bị hụt hơi, run rẩy.',
      appSupport: 'Phân tích thành phần nhiễu (noise floor) trong waveform.'
    },
    {
      title: 'Legato & Staccato',
      icon: ArrowRightLeft,
      desc: 'Kỹ thuật nối các nốt nhạc liền mạch hoặc hát rời rạc.',
      goal: 'Áp dụng đúng kỹ thuật cho từng thể loại nhạc.',
      appSupport: 'Phân tích khoảng dừng và sự chuyển tiếp giữa các nốt.'
    },
    {
      title: 'Trôi Cao độ',
      icon: TrendingDown,
      desc: 'Hiện tượng cao độ bị thay đổi dần lên hoặc xuống trong một câu hát.',
      goal: 'Duy trì sự ổn định cao độ xuyên suốt câu hát.',
      appSupport: 'Theo dõi sự biến thiên tần số trong từng nốt và câu hát.'
    }
  ];

  const techniquesLevel3 = [
    {
      title: 'Cảm xúc & Diễn giải',
      icon: Heart,
      desc: 'Truyền tải nội dung, tâm trạng, sắc thái của bài hát qua giọng hát.'
    },
    {
      title: 'Phong cách Biểu Diễn',
      icon: User,
      desc: 'Sự tự tin, kết nối với khán giả, ngôn ngữ cơ thể khi trình diễn.'
    },
    {
      title: 'Xử lý Ngôn Ngữ Đặc Thù',
      icon: MessageCircle,
      desc: 'Hát đúng thanh điệu, ngữ âm, phát âm chuẩn (âm đóng mở, nguyên âm).'
    },
    {
      title: 'Kỹ Thuật Cộng Hưởng',
      icon: Ear,
      desc: 'Điều chỉnh vị trí cộng hưởng âm thanh trong cơ thể để tạo âm sắc.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Lý thuyết & Kỹ Thuật Thanh Nhạc</h1>
        <p className="text-slate-400 text-lg">Nắm vững nền tảng âm nhạc và kỹ thuật thanh nhạc để phát triển giọng hát toàn diện cùng AI ToneForge.</p>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white border-b border-slate-800 pb-4">Phần 1: Nhạc Lý Cơ Bản</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lessons.map((lesson, idx) => (
            <Link key={lesson.id} to={`/dashboard/theory/${lesson.id}`}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900 border border-slate-800 hover:border-violet-500/50 rounded-3xl p-6 transition-all shadow-lg h-full group relative overflow-hidden"
              >
                {/* Bg glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${lesson.bg} rounded-full blur-3xl group-hover:scale-150 transition-transform`} />
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${lesson.bg} ${lesson.color} group-hover:scale-110 transition-transform shadow-lg`}>
                    <lesson.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-300 transition-colors">{lesson.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">{lesson.desc}</p>
                    <div className="inline-flex items-center gap-1 text-sm font-semibold text-violet-400 group-hover:text-violet-300">
                      Bắt đầu học <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6 pt-8 border-t border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Phần 2: Kỹ Thuật Thanh Nhạc</h2>
          <p className="text-slate-400 text-sm">Hệ thống bài học nâng cao giúp cải thiện chất lượng giọng hát, được hỗ trợ phân tích bởi AI.</p>
        </div>

        {/* Level 1 Techniques */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold">1</div>
            <h3 className="text-xl font-bold text-white">Nền Tảng Giọng Hát</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techniquesLevel1.map((item, idx) => (
              <Link key={idx} to={`/dashboard/techniques/${item.id}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-900 border border-slate-800 hover:border-violet-500/50 rounded-3xl p-6 transition-all shadow-lg h-full group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-violet-300 transition-colors">{item.title}</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400"><span className="font-semibold text-slate-300">Hiểu về:</span> {item.desc}</p>
                    <p className="text-sm text-slate-400"><span className="font-semibold text-slate-300">Mục tiêu:</span> {item.goal}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Level 2 Techniques */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">2</div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Phát Triển Giọng Hát 
              <span className="bg-amber-500 text-[10px] text-white px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold">VIP</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {techniquesLevel2.map((item, idx) => (
               <div key={idx} className="bg-slate-900/50 border border-amber-500/10 hover:border-amber-500/30 rounded-3xl p-6 relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                 <div className="flex items-start gap-4 relative z-10">
                   <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                      <item.icon className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-200 mb-2">{item.title}</h3>
                      <p className="text-sm text-slate-400 mb-2"><span className="font-semibold text-slate-300">Hiểu về:</span> {item.desc}</p>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Level 3 Techniques */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-bold">3</div>
            <h3 className="text-xl font-bold text-white">Nghệ Thuật Ca Hát</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {techniquesLevel3.map((item, idx) => (
               <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-300">{item.title}</h3>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
}
