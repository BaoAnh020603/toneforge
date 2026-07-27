import { BookOpen, Activity, Clock, Volume2, Waves, Mic, Sparkles, Wind, ArrowRightLeft, TrendingDown, Heart, User, MessageCircle, Ear } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';

export default function DashboardTechniques() {
  const level1 = [
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

  const level2 = [
    {
      title: 'Chất giọng / Màu giọng',
      icon: Sparkles,
      desc: 'Các đặc trưng âm sắc riêng biệt của giọng hát (sáng, tối, khàn, mũi…).',
      goal: 'Nhận diện và phát huy tối đa màu giọng tự nhiên.',
      appSupport: 'Phân tích phổ tần số (FFT), huấn luyện mô hình AI nhận diện các "dấu vân tay" âm sắc.'
    },
    {
      title: 'Hơi Thở',
      icon: Wind,
      desc: 'Sức mạnh và sự ổn định của hơi thở là nền tảng cho giọng hát.',
      goal: 'Hát chắc chắn, không bị hụt hơi, run rẩy.',
      appSupport: 'Phân tích thành phần nhiễu (noise floor) trong waveform âm thanh.'
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

  const level3 = [
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
      desc: 'Điều chỉnh vị trí cộng hưởng âm thanh trong cơ thể để tạo âm sắc và sức mạnh.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Kỹ thuật Thanh nhạc</h1>
        <p className="text-slate-400 text-lg">Giáo trình đào tạo thanh nhạc được chia thành 3 cấp độ. Hệ thống AI của ToneForge sẽ là người bạn đồng hành cùng bạn trên con đường luyện tập.</p>
      </div>

      {/* Level 1 */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-xl">1</div>
          <div>
             <h2 className="text-2xl font-bold text-white">Nền Tảng Giọng Hát</h2>
             <p className="text-slate-400 text-sm">Các yếu tố cốt lõi ToneForge phân tích theo thời gian thực (Realtime).</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {level1.map((item, idx) => (
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
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-violet-400 font-medium">✨ App hỗ trợ: {item.appSupport}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Level 2 */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xl">2</div>
          <div>
             <h2 className="text-2xl font-bold text-white flex items-center gap-2">
               Phát Triển Giọng Hát 
               <span className="bg-amber-500 text-[10px] text-white px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold">VIP</span>
              </h2>
             <p className="text-slate-400 text-sm">Các phân tích âm thanh nâng cao dùng AI. Yêu cầu tài khoản VIP.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {level2.map((item, idx) => (
             <div key={idx} className="bg-slate-900/50 border border-amber-500/10 hover:border-amber-500/30 rounded-3xl p-6 relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
               <div className="flex items-start gap-4 relative z-10">
                 <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <item.icon className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2">
                      {item.title}
                    </h3>
                    <div className="space-y-2 mb-4">
                       <p className="text-sm text-slate-400"><span className="font-semibold text-slate-300">Hiểu về:</span> {item.desc}</p>
                       <p className="text-sm text-slate-400"><span className="font-semibold text-slate-300">Mục tiêu:</span> {item.goal}</p>
                    </div>
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/20">
                      <p className="text-xs text-amber-400/90 font-medium leading-relaxed">🔒 Mở khoá VIP: {item.appSupport}</p>
                    </div>
                 </div>
               </div>
             </div>
           ))}
        </div>
      </section>

      {/* Level 3 */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xl">3</div>
          <div>
             <h2 className="text-2xl font-bold text-white">Nghệ Thuật Ca Hát</h2>
             <p className="text-slate-400 text-sm">Yếu tố cảm thụ và diễn giải. Chỉ con người mới đánh giá tốt nhất.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {level3.map((item, idx) => (
             <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-300">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
             </div>
           ))}
        </div>
        
        <div className="mt-8 bg-gradient-to-r from-violet-900/30 to-blue-900/30 border border-violet-500/20 rounded-3xl p-8 text-center flex flex-col items-center">
            <h3 className="text-xl font-bold text-white mb-2">Bạn đã sẵn sàng Luyện tập?</h3>
            <p className="text-slate-400 max-w-lg mb-6">Kết nối Micro và bắt đầu theo dõi tiến trình của bạn thông qua các bài hát trong kho dữ liệu cộng đồng.</p>
            <Link to="/dashboard/community">
              <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-8">
                Tìm bài hát ngay
              </Button>
            </Link>
        </div>
      </section>
    </div>
  );
}
