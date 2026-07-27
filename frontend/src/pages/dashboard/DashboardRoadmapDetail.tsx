import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle, Wind, Activity, Heart, Info, CheckCircle2, Mic } from 'lucide-react';
import { Button } from '../../components/ui/button';

const WEEK_DATA: Record<string, any> = {
  "1": {
    week: 1,
    title: "Khai mở và Thư giãn (Relaxation & Posture)",
    icon: Wind,
    color: "violet",
    textColor: "text-violet-400",
    concept: "Cơ thể chính là nhạc cụ của bạn. Khi bạn căng thẳng, thanh quản bị siết lại, âm thanh sẽ bị mỏng, chua và khó lên cao. Tư thế đứng đúng giúp luồng hơi đi lên không bị nghẽn.",
    details: [
      {
        title: "Tư thế chuẩn (Alignment)",
        desc: "Hai chân dang rộng bằng vai. Lưng thẳng tự nhiên, không rụt cổ, vai thả lỏng rớt xuống. Hãy tưởng tượng có một sợi dây kéo đỉnh đầu bạn lên trần nhà."
      },
      {
        title: "Thư giãn hàm và lưỡi",
        desc: "Nhiều người hát hay bị gồng quai hàm. Hãy massage nhẹ hai bên má, há miệng to tự nhiên như đang ngáp."
      }
    ],
    visualization: (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden">
        <h4 className="text-white font-bold mb-6">Trực quan: Tư thế thả lỏng</h4>
        <div className="flex justify-center gap-12">
            <div className="flex flex-col items-center opacity-50">
               <div className="w-16 h-20 border-4 border-red-500 rounded-full flex items-center justify-center relative mb-2">
                  <div className="absolute -right-2 top-2 w-4 h-4 bg-red-500 rounded-full" />
               </div>
               <div className="w-2 h-24 bg-red-500 transform rotate-12 origin-top" />
               <span className="text-red-400 font-bold mt-4 text-xs text-center">Gù lưng<br/>Căng cổ</span>
            </div>
            
            <div className="flex flex-col items-center">
               <div className="w-16 h-20 border-4 border-green-400 rounded-full flex items-center justify-center relative mb-2 shadow-[0_0_15px_rgba(74,222,128,0.4)]">
                  <div className="absolute right-0 top-10 w-4 h-4 bg-green-400 rounded-full" />
               </div>
               <div className="w-2 h-24 bg-green-400" />
               <span className="text-green-400 font-bold mt-4 text-xs text-center">Trục thẳng<br/>(Lưng thẳng, vai hạ)</span>
            </div>
        </div>
      </div>
    ),
    practice: "Bài tập Humming: Ngậm miệng, hai hàm răng không chạm nhau. Bắt đầu ngân âm 'Mmmm...' ở cao độ thoải mái nhất. Cảm nhận sự rung động rần rần ở môi và quanh mũi. Tập 5 phút."
  },
  "2": {
    week: 2,
    title: "Hơi Thở Bụng (Diaphragmatic Breathing)",
    icon: Wind,
    color: "blue",
    textColor: "text-blue-400",
    concept: "Hát bằng hơi ngực (nhô vai khi hít vào) sẽ khiến bạn nhanh hụt hơi và tức ngực. Hơi thở bụng sử dụng cơ hoành (diaphragm) giúp chứa được nhiều không khí hơn và kiểm soát luồng hơi ra (support) tốt hơn.",
    details: [
      {
        title: "Cách hít vào đúng (Inhale)",
        desc: "Thả lỏng bụng. Khi hít vào, tưởng tượng không khí đi thẳng xuống bụng làm bụng phình ra. Tuyệt đối KHÔNG nhô vai úp ngực."
      },
      {
        title: "Cách thở ra (Exhale)",
        desc: "Bụng xẹp lại từ từ. Cơ bụng lúc này hoạt động như một cái phanh tay, giữ cho luồng không khí đi ra qua thanh quản một cách đều đặn."
      }
    ],
    visualization: (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden h-[300px]">
        <h4 className="text-white font-bold mb-8 z-10 text-center">Tập thở theo nhịp (Xì hơi 10s)</h4>
        
        <div className="relative w-48 h-48 flex items-center justify-center z-10">
            {/* Breathing circle */}
            <motion.div 
               animate={{ 
                  scale: [1, 2.5, 2.5, 1, 1],
                  backgroundColor: ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.1)']
               }}
               transition={{ 
                  duration: 15,
                  times: [0, 0.2, 0.3, 0.9, 1], // Hít 3s (0.2), Giữ 1.5s (0.1), Xì 9s (0.6), Nghỉ 1.5s
                  repeat: Infinity 
               }}
               className="absolute w-16 h-16 rounded-full border-2 border-blue-400"
            />
            {/* Texts */}
            <motion.div 
               animate={{ opacity: [1, 0, 0, 0, 1] }}
               transition={{ duration: 15, times: [0, 0.2, 0.3, 0.9, 1], repeat: Infinity }}
               className="absolute text-center"
            >
               <span className="text-xs font-bold text-blue-300 uppercase">Hít sâu<br/>(Bụng phình)</span>
            </motion.div>
            <motion.div 
               animate={{ opacity: [0, 0, 1, 0, 0] }}
               transition={{ duration: 15, times: [0, 0.2, 0.3, 0.9, 1], repeat: Infinity }}
               className="absolute text-center"
            >
               <span className="text-sm font-bold text-white uppercase drop-shadow-md">Giữ hơi</span>
            </motion.div>
            <motion.div 
               animate={{ opacity: [0, 0, 0, 1, 0] }}
               transition={{ duration: 15, times: [0, 0.2, 0.3, 0.9, 1], repeat: Infinity }}
               className="absolute text-center"
            >
               <span className="text-xs font-bold text-blue-200 uppercase tracking-widest animate-pulse">Ssssss...<br/>(Bụng xẹp)</span>
            </motion.div>
        </div>
      </div>
    ),
    practice: "Bài tập Xì (Sss): Đặt tay lên bụng. Hít vào cho bụng phình. Dùng kẽ răng tạo âm thanh 'Sssss' liên tục, đều đặn trong 15-20 giây. Bụng từ từ xẹp xuống chứ không xẹp đột ngột."
  },
  "3": {
    week: 3,
    title: "Kết Nối Hơi Thở & Âm Thanh (Support)",
    icon: Activity,
    color: "amber",
    textColor: "text-amber-400",
    concept: "Khi đã có hơi thở bụng, bạn cần biết cách đặt âm thanh (vị trí âm thanh - resonance). Hát hay là khi âm thanh cộng hưởng ở 'Mặt nạ' (Mask - vùng xương gò má, mũi) chứ không phải bị kẹt ở cổ họng.",
    details: [
      {
         title: "Khái niệm Nén Hơi (Breath Support)",
         desc: "Sự giằng co giữa cơ hoành (muốn hạ xuống) và cơ bụng (đẩy lên) tạo ra áp lực đệm cho dây thanh, giúp hát nốt cao mà không bị căng cổ."
      },
      {
         title: "Vị trí âm thanh (Forward Placement)",
         desc: "Khi hát, hãy thử cảm nhận âm thanh đập vào răng cửa phía trên hoặc rung ở sống mũi. Nếu thấy đau rát cổ, bạn đang đặt âm thanh sai chỗ."
      }
    ],
    visualization: (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden">
         <h4 className="text-white font-bold mb-8">Vị trí tương tác MẶT NẠ (Mask)</h4>
         <div className="relative w-32 h-44 border-4 border-slate-700 rounded-[40px] flex items-center justify-center mb-8 bg-slate-800/50">
            {/* Mask / Nose area */}
            <div className="absolute top-8 w-20 h-10 bg-amber-500/20 blur-md rounded-full" />
            <motion.div 
               animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
               transition={{ duration: 1.5, repeat: Infinity }}
               className="absolute top-6 w-12 h-6 border-2 border-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] z-10"
            />
            <span className="absolute top-16 text-[10px] text-amber-300 font-bold text-center z-20">Vùng Mũi & Má<br/>Cộng hưởng</span>
            
            {/* Throat area */}
            <div className="absolute bottom-6 w-8 h-8 flex items-center justify-center">
               <motion.div animate={{ y: [0, -30], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_5px_rgba(255,255,255,1)]" />
               <motion.div animate={{ y: [0, -30], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }} className="absolute w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_5px_rgba(255,255,255,1)]" />
               <motion.div animate={{ y: [0, -30], opacity: [0.8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1 }} className="absolute w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_5px_rgba(255,255,255,1)]" />
            </div>
            <span className="absolute -bottom-8 text-[10px] text-slate-400 text-center uppercase font-bold">Luồng hơi</span>
         </div>
      </div>
    ),
    practice: "Bài tập Ney Ney Ney: Hát âm 'Ney' (giống tiếng kêu của phù thủy hoặc vịt Donald). Âm thanh này cực kỳ vang và ép bạn phải đưa âm thanh ra phía trước mặt. Tập trên vòng hòa âm 5 nốt (1-2-3-4-5-4-3-2-1)."
  }
};

export default function DashboardRoadmapDetail() {
  const { weekId } = useParams();
  
  // Create a default fallback for weeks that are not specifically mocked
  const defaultWeekBase = {
      week: weekId,
      title: `Tuần ${weekId}: Bài tập Kỹ thuật Chuyên sâu`,
      icon: PlayCircle,
      color: "violet",
      textColor: "text-violet-400",
      concept: "Ở tuần này, chúng ta sẽ tiếp tục rèn luyện kỹ năng thanh nhạc theo lộ trình cá nhân hóa của bạn. Hãy đảm bảo bạn đã ôn tập các kỹ thuật từ những tuần trước đó.",
      details: [
        {
          title: "Khởi động kĩ (Warm-up)",
          desc: "Luôn bắt đầu bằng Lip Trill hoặc Humming trong 5 phút để làm nóng thanh quản tự nhiên."
        },
        {
          title: "Thực hành liên tục",
          desc: "Sự nhất quán quan trọng hơn thời lượng. Hát 15 phút mỗi ngày sẽ tốt hơn 2 tiếng vào cuối tuần."
        }
      ],
      visualization: (
         <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-violet-900/40 to-slate-900 border border-violet-500/20 rounded-3xl relative overflow-hidden">
            <Mic className="w-16 h-16 text-violet-400 mb-6 opacity-80" />
            <h4 className="text-white font-bold text-xl mb-2 text-center">Chuẩn bị Micro của bạn</h4>
            <p className="text-slate-400 text-center max-w-sm">Mở giao diện luyện tập và sử dụng AI ToneForge để đo lường độ chính xác bài học của tuần này.</p>
         </div>
      ),
      practice: "Tuần này: Chọn 1 bài hát vừa sức trong mục Bài hát của tôi, thu âm và xem AI gợi ý sửa lỗi tập trung vào cao độ và nhịp điệu."
  };

  const data = WEEK_DATA[weekId || "1"] || defaultWeekBase;
  const Icon = data.icon;
  const TextColorClass = data.textColor;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <Link to="/dashboard/roadmap" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Về Lộ trình học
      </Link>

      <div className="flex items-center gap-4">
         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-slate-900 border border-slate-700`}>
            <Icon className={`w-8 h-8 ${TextColorClass}`} />
         </div>
         <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-800 ${TextColorClass} border border-slate-700`}>
               Tuần {data.week}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">{data.title}</h1>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
         <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
               <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-violet-400" />
                  Hiểu bản chất
               </h2>
               <p className="text-slate-300 leading-relaxed text-base">
                  {data.concept}
               </p>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
               <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Chi tiết thực hiện
               </h2>
               <div className="space-y-6">
                 {data.details.map((detail: any, idx: number) => (
                    <div key={idx} className={`border-l-2 pl-4 border-slate-700 bg-slate-950/30 p-4 rounded-r-xl`}>
                       <h4 className="font-bold text-white mb-2 text-lg">{detail.title}</h4>
                       <p className="text-sm text-slate-400 leading-relaxed">{detail.desc}</p>
                    </div>
                 ))}
               </div>
            </section>
         </div>

         <div className="space-y-6">
            <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
               {data.visualization}
            </section>

            <section className="bg-gradient-to-br from-violet-900/40 to-slate-900 border border-violet-500/20 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 z-0"></div>
               <h2 className="text-xl font-bold text-violet-400 mb-4 flex items-center gap-2 relative z-10">
                  <Mic className="w-5 h-5" />
                  Bài Tập Thực Hành
               </h2>
               <p className="text-slate-200 text-base leading-relaxed mb-8 relative z-10 font-medium bg-black/20 p-4 rounded-2xl border border-white/5">
                  {data.practice}
               </p>
               
               <Link to="/voice-range" className="w-full relative z-10 block">
                 <Button size="lg" className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-14 text-base font-bold shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                   <PlayCircle className="w-6 h-6 mr-2" />
                   Khởi động Trình Thu Âm
                 </Button>
               </Link>
            </section>
         </div>
      </div>
    </div>
  );
}
