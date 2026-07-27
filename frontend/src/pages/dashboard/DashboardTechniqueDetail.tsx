import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Activity, Clock, Volume2, Waves, Mic, PlayCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';

const TECHNIQUE_DATA: Record<string, any> = {
  pitch: {
    title: 'Cao độ (Pitch)',
    icon: Activity,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    concept: 'Cao độ (Pitch) là độ cao thấp của âm thanh, được quyết định bởi tần số dao động của dây thanh quản. Khi bạn hát "đúng tông" (on pitch), nghĩa là bạn đang phát ra âm thanh có cùng tần số với nốt nhạc chuẩn.',
    commonIssues: [
      { name: 'Hát Phô / Thấp (Flat)', desc: 'Hát dưới nốt nhạc chuẩn một chút. Nguyên nhân thường do thiếu hơi, mệt mỏi hoặc chưa quen nghe cao độ.' },
      { name: 'Hát Chênh / Cao (Sharp)', desc: 'Hát vọt lên trên nốt nhạc chuẩn. Thường do rướn quá sức, đẩy hơi quá mạnh hoặc căng thẳng cổ họng.' }
    ],
    visualization: (
      <div className="relative h-64 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />
        {/* Target Line */}
        <div className="relative mb-8">
          <div className="absolute -left-2 -translate-y-1/2 text-xs text-slate-500 font-mono">Chuẩn</div>
          <div className="h-1.5 w-full bg-slate-700 rounded-full" />
        </div>
        
        {/* Perfect Pitch */}
        <div className="relative mb-8">
          <div className="absolute -left-2 -translate-y-1/2 text-xs text-green-400 font-mono">Đúng</div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
             <motion.div 
               className="h-full w-full bg-green-400"
               initial={{ x: '-100%' }}
               animate={{ x: '0%' }}
               transition={{ duration: 2, repeat: Infinity }}
             />
          </div>
        </div>

        {/* Flat Pitch */}
        <div className="relative">
          <div className="absolute -left-2 -translate-y-1/2 text-xs text-red-500 font-mono">Phô</div>
          <svg className="w-full h-12 absolute -top-8" preserveAspectRatio="none">
             <motion.path 
               d="M0,20 Q100,50 200,30 T400,20" 
               fill="none" 
               stroke="#ef4444" 
               strokeWidth="3"
               strokeLinecap="round"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               transition={{ duration: 2, repeat: Infinity }}
             />
          </svg>
        </div>
      </div>
    )
  },
  timing: {
    title: 'Trường độ & Nhịp điệu (Timing)',
    icon: Clock,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    concept: 'Nhịp điệu là xương sống của bài hát. Trường độ điều khiển việc bạn giữ một nốt ngân dài bao lâu, còn Nhịp điệu (Timing) kiểm soát việc bạn vào nhịp (hát từ đầu tiên của câu) lúc nào so với beat của nhạc cụ.',
    commonIssues: [
      { name: 'Hát Nhanh / Trật Nhịp Bơm (Rushing)', desc: 'Bạn hát xong một câu trước khi beat nhạc đổ tới. Thường do hồi hộp.' },
      { name: 'Hát Trễ (Dragging)', desc: 'Lê thê phía sau tiếng beat. Sẽ làm câu hát nghe mệt mỏi và làm nhạc sến đi.' }
    ],
    visualization: (
      <div className="relative h-64 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center overflow-hidden">
         <div className="flex gap-4 items-center justify-center h-full">
            {[1, 2, 3, 4].map((beat, idx) => (
              <div key={beat} className="relative w-16 h-32 flex flex-col items-center">
                 <div className="w-px h-full bg-slate-700 border-l border-dashed border-slate-600 absolute" />
                 <div className="text-xs text-slate-500 font-bold mb-2 z-10 bg-slate-900 px-1">Nhịp {beat}</div>
                 
                 {/* Correct Timing Block */}
                 {idx === 0 && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                     className="absolute top-1/2 -translate-y-1/2 w-12 h-8 bg-green-500/80 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                   >
                     ĐÚNG
                   </motion.div>
                 )}
                 {/* Early Block */}
                 {idx === 1 && (
                   <div className="absolute top-1/3 -translate-y-1/2 -left-4 w-12 h-6 bg-red-400/80 rounded flex items-center justify-center text-white text-[10px] font-bold">
                     SỚM
                   </div>
                 )}
                 {/* Late Block */}
                 {idx === 2 && (
                   <div className="absolute top-2/3 -translate-y-1/2 left-4 w-12 h-6 bg-yellow-400/80 rounded flex items-center justify-center text-white text-[10px] font-bold">
                     TRỄ
                   </div>
                 )}
              </div>
            ))}
         </div>
      </div>
    )
  },
  dynamics: {
    title: 'Cường độ (Dynamics)',
    icon: Volume2,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    concept: 'Cường độ là sự thay đổi âm lượng (to/nhỏ) trong giọng hát. Một bài hát đều đều một âm lượng từ đầu đến cuối sẽ rất nhàm chán. Cường độ giúp bạn kể câu chuyện của bài hát, tạo ra các điểm nhấn (climax) và sự êm dịu (softness).',
    commonIssues: [
      { name: 'Hát Quá Đều (Flat Dynamics)', desc: 'Không có sự phân biệt giữa đoạn verse (cần nhỏ nhẹ, kề cận) và điệp khúc (cần bùng nổ).' },
      { name: 'Gào Thét (Over-belting)', desc: 'Cố gắng hát to bằng cách gồng cổ họng, gây đau rát học và mất kiểm soát âm thanh.' }
    ],
    visualization: (
      <div className="relative h-64 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex items-center justify-center overflow-hidden">
         <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
            {/* Base line */}
            <line x1="0" y1="50" x2="400" y2="50" stroke="#334155" strokeWidth="2" strokeDasharray="5,5" />
            
            {/* Dynamic wave */}
            <motion.path 
              d="M 0 50 Q 50 45, 100 50 T 200 50 Q 250 10, 300 50 T 400 50" 
              fill="rgba(234, 179, 8, 0.2)"
              stroke="#eab308"
              strokeWidth="3"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               transition={{ duration: 3, repeat: Infinity }}
            />
            
            <text x="50" y="80" fill="#94a3b8" fontSize="12" textAnchor="middle">Piano (Nhỏ)</text>
            <text x="250" y="80" fill="#facc15" fontSize="14" fontWeight="bold" textAnchor="middle">Forte (Lớn)</text>
         </svg>
      </div>
    )
  },
  vibrato: {
    title: 'Rung giọng (Vibrato)',
    icon: Waves,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    concept: 'Vibrato là sự dao động đều đặn và tự nhiên của cao độ. Nó giống như một vòng xoay nhỏ quanh một nốt nhạc chính, với tốc độ lý tưởng khoảng 5 đến 7 vòng xoay mỗi giây. Rung giọng giúp giải tỏa căng thẳng cho thanh quản và thêm sự ấm áp cho giọng hát.',
    commonIssues: [
      { name: 'Rung Quá Chậm (Wobble)', desc: 'Giọng nghe như bị nắc cục, thường do cơ hàm hoặc thanh quản rung lực quá mức thay vì luồng hơi.' },
      { name: 'Rung Quá Nhanh (Tremolo)', desc: 'Giọng nghe như tiếng cừu non, do dây thanh âm bị nén chặt và hơi đẩy qua quá nhanh (run rẩy).' }
    ],
    visualization: (
      <div className="relative h-64 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center items-center overflow-hidden">
         <div className="absolute top-4 left-4 flex gap-4 text-xs font-medium text-slate-500">
           <div className="flex items-center gap-1"><div className="w-3 h-1 bg-slate-600 rounded"></div> Nốt thẳng (Straight)</div>
           <div className="flex items-center gap-1"><div className="w-3 h-1 bg-fuchsia-400 rounded"></div> Vibrato chuẩn</div>
         </div>

         <div className="w-full relative h-32 flex items-center">
            {/* Straight line base */}
            <div className="absolute left-0 w-1/3 h-1 bg-slate-600 rounded-l-full" />
            
            {/* Vibrato wave */}
            <svg className="absolute left-1/3 w-2/3 h-full" preserveAspectRatio="none" viewBox="0 0 200 40">
               <motion.path 
                 d="M 0 20 Q 10 5, 20 20 T 40 20 T 60 20 T 80 20 T 100 20 T 120 20 T 140 20 T 160 20 T 180 20 T 200 20"
                 fill="none" 
                 stroke="#e879f9" 
                 strokeWidth="2"
                 initial={{ d: "M 0 20 L 20 20 L 40 20 L 60 20 L 80 20 L 100 20 L 120 20 L 140 20 L 160 20 L 180 20 L 200 20" }}
                 animate={{ d: "M 0 20 Q 10 5, 20 20 T 40 20 T 60 20 T 80 20 T 100 20 T 120 20 T 140 20 T 160 20 T 180 20 T 200 20" }}
                 transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
               />
            </svg>
         </div>
      </div>
    )
  },
  onset: {
    title: 'Khởi âm & Ngắt âm (Onset & Attack)',
    icon: Mic,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    concept: 'Khởi âm (Onset) là cách bạn bắt đầu phát ra âm thanh. Có 3 loại khởi âm chính: Glottal (Cứng - Khép dây thanh trước khi luồng hơi tới), Breathy (Hơi - Luồng hơi đi ra trước khi dây thanh khép), và Balanced (Cân bằng - Hơi và dây thanh hoạt động cùng lúc).',
    commonIssues: [
      { name: 'Glottal Shock (Quá cứng)', desc: 'Bật tiếng quá mạnh ở cổ, gây tổn thương dây thanh theo thời gian.' },
      { name: 'Quá nhiều hơi (Too breathy)', desc: 'Nghe xì xào, thiếu độ nét, gây tốn hơi nhanh (phù hợp với ASMR hoặc Ballad thủ thỉ, nhưng không tốt nếu lạm dụng).' }
    ],
    visualization: (
      <div className="relative h-64 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex items-center justify-center overflow-hidden gap-10">
         <div className="flex flex-col items-center">
            <h4 className="text-sm font-bold text-slate-300 mb-4">Breathy (Hơi)</h4>
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center relative">
               <motion.div animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute w-full h-full rounded-full bg-slate-600" />
               <WindIcon />
            </div>
         </div>
         <div className="flex flex-col items-center">
            <h4 className="text-sm font-bold text-rose-400 mb-4">Cân Bằng</h4>
            <div className="w-20 h-20 rounded-full bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center relative">
               <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-12 h-12 bg-rose-500 rounded-full" />
            </div>
         </div>
         <div className="flex flex-col items-center">
            <h4 className="text-sm font-bold text-slate-300 mb-4">Glottal (Cứng)</h4>
            <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden">
               <motion.div animate={{ x: [-10, 10, -10] }} transition={{ duration: 0.1, repeat: Infinity }} className="w-2 h-10 bg-slate-500" />
            </div>
         </div>
      </div>
    )
  }
};

function WindIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 0 2-4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>
  );
}

export default function DashboardTechniqueDetail() {
  const { techniqueId } = useParams();
  const data = TECHNIQUE_DATA[techniqueId || 'pitch'];

  if (!data) {
    return <div>Kỹ thuật không tồn tại</div>;
  }

  const techKeys = Object.keys(TECHNIQUE_DATA);
  const currentIndex = techKeys.indexOf(techniqueId || 'pitch');
  const prevId = currentIndex > 0 ? techKeys[currentIndex - 1] : null;
  const nextId = currentIndex < techKeys.length - 1 ? techKeys[currentIndex + 1] : null;

  const Icon = data.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <Link to="/dashboard/theory" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Về Lý Thuyết & Kỹ Thuật
      </Link>

      <div className="flex items-center gap-4">
         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${data.bg} ${data.color}`}>
            <Icon className="w-8 h-8" />
         </div>
         <div>
            <h1 className="text-3xl font-bold text-white mb-2">{data.title}</h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
               Nền Tảng Giọng Hát
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
               <h2 className="text-xl font-bold text-white mb-4">Khái niệm dễ hiểu</h2>
               <p className="text-slate-400 leading-relaxed">
                  {data.concept}
               </p>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
               <h2 className="text-xl font-bold text-white mb-4">Các lỗi phổ biến</h2>
               <ul className="space-y-4">
                 {data.commonIssues.map((issue: any, idx: number) => (
                    <li key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                       <h4 className="font-semibold text-rose-300 mb-1 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-rose-500" /> {issue.name}
                       </h4>
                       <p className="text-sm text-slate-400 pl-4">{issue.desc}</p>
                    </li>
                 ))}
               </ul>
            </section>
         </div>

         <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
               <h2 className="text-xl font-bold text-white mb-4">Mô phỏng trực quan</h2>
               {data.visualization}
            </section>

            <section className="bg-gradient-to-br from-violet-900/30 to-blue-900/30 border border-violet-500/20 rounded-3xl p-6 shadow-xl text-center">
               <h2 className="text-lg font-bold text-white mb-2">Sẵn sàng để thử?</h2>
               <p className="text-slate-400 text-sm mb-6">Mở trình luyện thanh và xem ToneForge phân tích {data.title} của bạn theo thời gian thực.</p>
               <Link to="/dashboard/community">
                 <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-12">
                   <PlayCircle className="w-5 h-5 mr-2" />
                   Tập ngay với bài hát
                 </Button>
               </Link>
            </section>
         </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
         {prevId ? (
           <Link to={`/dashboard/techniques/${prevId}`} className="w-full sm:w-auto">
             <Button variant="outline" className="w-full sm:w-auto border-slate-700 text-white rounded-xl h-14 px-8 text-lg font-semibold hover:bg-slate-800">
                <ArrowLeft className="w-5 h-5 mr-2" /> Kỹ thuật trước
             </Button>
           </Link>
         ) : (
           <Link to="/dashboard/theory/sheet" className="w-full sm:w-auto">
             <Button variant="outline" className="w-full sm:w-auto border-slate-700 text-white rounded-xl h-14 px-8 text-lg font-semibold hover:bg-slate-800">
                <ArrowLeft className="w-5 h-5 mr-2" /> Về Lý thuyết
             </Button>
           </Link>
         )}
         
         {nextId ? (
           <Link to={`/dashboard/techniques/${nextId}`} className="w-full sm:w-auto">
             <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-14 px-8 text-lg font-semibold shadow-xl shadow-violet-600/20">
                Hiểu kỹ thuật tiếp theo <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
             </Button>
           </Link>
         ) : <div className="hidden sm:block" />}
      </div>
    </div>
  );
}
