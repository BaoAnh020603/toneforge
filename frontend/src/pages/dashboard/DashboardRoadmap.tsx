import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Calendar, CheckCircle2, Circle, ChevronDown, Trophy, Wind, Activity, Heart, ArrowRight, PlayCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const ROADMAP_DATA = [
  {
    month: 1,
    title: "Tháng 1: Nền Tảng Hơi Thở & Giải Phóng Âm Thanh",
    desc: "Xây dựng móng nhà vững chắc. Học cách kiểm soát hơi thở và loại bỏ sự căng thẳng khi hát.",
    icon: Wind,
    color: "violet",
    weeks: [
      {
        week: 1,
        title: "Khai mở và Thư giãn (Relaxation & Posture)",
        goals: ["Hiểu về tư thế đứng/ngồi chuẩn khi hát", "Thư giãn cơ hàm, cổ và vai", "Bài tập Humming (ngậm miệng rung môi) để khởi động thanh quản nhẹ nhàng"],
        practice: "Thực hành Humming 10 phút/ngày, chú ý cảm giác rần rần ở môi."
      },
      {
        week: 2,
        title: "Hơi Thở Bụng (Diaphragmatic Breathing)",
        goals: ["Nhận biết cơ hoành", "Hít thở sâu không nhô vai", "Kiểm soát luồng hơi ra đều đặn (xì hơi qua kẽ răng)"],
        practice: "Bài tập Xì xì (Sss) kéo dài 15-20s, giữ hơi ổn định."
      },
      {
        week: 3,
        title: "Kết Nối Hơi Thở & Âm Thanh (Support)",
        goals: ["Đưa âm thanh lên vùng mặt (Mask resonance)", "Hát các nguyên âm cơ bản (A, O, E, I, U) với luồng hơi đều"],
        practice: "Luyện thanh với âm 'Mi - Ma' trên các nốt nhạc ở quãng giữa."
      },
      {
        week: 4,
        title: "Phát Âm & Khẩu Hình (Articulation)",
        goals: ["Mở khẩu hình dọc đúng cách", "Hát rõ chữ, không bị bẹt hoặc nghẹt mũi"],
        practice: "Đọc to rõ lời bài hát bạn thích, cường độ chậm, chú ý khẩu hình."
      }
    ]
  },
  {
    month: 2,
    title: "Tháng 2: Làm Chủ Cao Độ & Kỹ Thuật Thanh Nhạc",
    desc: "Rèn luyện đôi tai (Ear Training) và làm chủ các kỹ thuật điều khiển dây thanh.",
    icon: Activity,
    color: "blue",
    weeks: [
      {
        week: 5,
        title: "Luyện Tai Nghe & Bắt Tone (Ear Training)",
        goals: ["Phân biệt nốt cao/thấp", "Nghe và hát lại chính xác một nốt nhạc từ piano"],
        practice: "Dùng tính năng 'Kiểm tra Quãng giọng' để tập hát khớp nốt."
      },
      {
        week: 6,
        title: "Chuyển Quãng mượt mà (Registers transition)",
        goals: ["Nhận biết Giọng ngực (Chest voice) và Giọng đầu (Head voice)", "Bài tập Lip trill (rung môi) để đi qua vùng chuyển giọng (Passaggio)"],
        practice: "Rung môi quét từ âm trầm nhất lên cao nhất và ngược lại."
      },
      {
        week: 7,
        title: "Khởi Âm & Ngắt Âm (Onset & Release)",
        goals: ["Bắt đầu âm thanh gọn gàng, không bị shock thanh quản", "Kết thúc câu hát mượt mà, không bị hụt hơi"],
        practice: "Hát ngắt quãng (Staccato) âm 'Ha - Ha - Ha' kết hợp nảy bụng."
      },
      {
        week: 8,
        title: "Độ Nảy & Sự Linh Hoạt (Voice Agility)",
        goals: ["Hát các chùm nốt nhanh mà vẫn rõ", "Kiểm soát thanh quản khi thay đổi nốt liên tục"],
        practice: "Luyện thanh vòng quãng 3 hoặc quãng 5 với tốc độ tăng dần."
      }
    ]
  },
  {
    month: 3,
    title: "Tháng 3: Cảm Xúc & Nghệ Thuật Xử Lý Bài Hát",
    desc: "Đưa tâm hồn vào âm nhạc và áp dụng kỹ thuật vào thực tế.",
    icon: Heart,
    color: "rose",
    weeks: [
      {
        week: 9,
        title: "Cường Độ (Dynamics) - To & Nhỏ",
        goals: ["Biết cách hát nhỏ (Piano) mà vẫn rõ nét", "Hát to (Forte) mà không bị gào, rát họng"],
        practice: "Hát 1 câu từ nhỏ dần sang to dần, rồi lại nhỏ dần."
      },
      {
        week: 10,
        title: "Rung Giọng (Vibrato) Tự Nhiên",
        goals: ["Cảm nhận sự dao động tự nhiên quanh 1 nốt", "Tránh rung bằng cơ hàm hoặc nắc cục"],
        practice: "Hát 1 nốt thẳng, sau đó từ từ thả lỏng để tạo vibrato ở cuối câu."
      },
      {
        week: 11,
        title: "Ngắt Câu & Nuôi Chữ (Phrasing)",
        goals: ["Chia câu lấy hơi hợp lý", "Nhấn nhá từ khóa trong câu (Word painting)"],
        practice: "Thực hành trên 1 bài hát cụ thể, đánh dấu chỗ lấy hơi và chỗ nhấn."
      },
      {
        week: 12,
        title: "Tổng Duyệt & Định Hình Phong Cách",
        goals: ["Hát hoàn thiện 1 bài từ đầu đến cuối với cảm xúc", "Thu âm và tự đánh giá lại"],
        practice: "Sử dụng tính năng chấm điểm AI để xem hiệu quả cả bài hát."
      }
    ]
  }
];

export default function DashboardRoadmap() {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(1);
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().completedWeeks) {
            setCompletedWeeks(docSnap.data().completedWeeks);
          } else {
             const localData = localStorage.getItem('roadmap_progress');
             if (localData) {
                setCompletedWeeks(JSON.parse(localData));
             }
          }
        } catch (error) {
          console.error("Error fetching roadmap progress", error);
        }
      } else {
        const localData = localStorage.getItem('roadmap_progress');
        if (localData) {
          setCompletedWeeks(JSON.parse(localData));
        }
      }
    };
    fetchProgress();
  }, []);

  const saveProgress = async (newCompletedWeeks: number[]) => {
    setIsSaving(true);
    setCompletedWeeks(newCompletedWeeks);
    localStorage.setItem('roadmap_progress', JSON.stringify(newCompletedWeeks));
    
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(docRef, { completedWeeks: newCompletedWeeks }, { merge: true });
      } catch (error) {
        console.error("Error saving roadmap progress", error);
      }
    }
    setIsSaving(false);
  };

  const toggleMonth = (month: number) => {
    if (expandedMonth === month) {
      setExpandedMonth(null);
    } else {
      setExpandedMonth(month);
    }
  };

  const toggleWeekCompletion = (weekNum: number, e: any) => {
    e.stopPropagation();
    let newCompletedWeeks;
    if (completedWeeks.includes(weekNum)) {
      newCompletedWeeks = completedWeeks.filter(w => w !== weekNum);
    } else {
      newCompletedWeeks = [...completedWeeks, weekNum];
    }
    saveProgress(newCompletedWeeks);
  };

  const progress = Math.round((completedWeeks.length / 12) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Lộ trình Huấn luyện Cá nhân</h1>
        <p className="text-slate-400 text-lg">Giáo án 3 tháng thiết kế bởi chuyên gia, giúp bạn xây dựng nền tảng vững chắc và làm chủ giọng hát của mình.</p>
      </div>

      {/* Progress Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex items-center gap-8 shadow-xl">
         <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
               <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-800" strokeWidth="8" />
               <motion.circle 
                 cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-violet-500" strokeWidth="8" 
                 strokeLinecap="round"
                 strokeDasharray="283"
                 initial={{ strokeDashoffset: 283 }}
                 animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                 transition={{ duration: 1, ease: "easeInOut" }}
               />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-2xl font-bold text-white">{progress}%</span>
            </div>
         </div>
         <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <Trophy className="w-5 h-5 text-amber-500" />
               Tiến trình học tập
            </h2>
            <p className="text-slate-400">Bạn đã hoàn thành {completedWeeks.length} trên tổng số 12 tuần luyện tập.</p>
            {completedWeeks.length === 12 && (
               <div className="mt-3 inline-flex items-center gap-2 text-sm text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                  <Trophy className="w-4 h-4" /> Tuyệt vời! Bạn đã hoàn thành lộ trình.
               </div>
            )}
         </div>
      </div>

      <div className="space-y-4">
         {ROADMAP_DATA.map((monthData) => {
            const MonthIcon = monthData.icon;
            const isExpanded = expandedMonth === monthData.month;
            const monthWeeks = monthData.weeks.map(w => w.week);
            const completedInMonth = completedWeeks.filter(w => monthWeeks.includes(w)).length;
            
            const colorMap: Record<string, string> = {
               violet: "from-violet-500/20 to-violet-900/10 border-violet-500/30 text-violet-400",
               blue: "from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-400",
               rose: "from-rose-500/20 to-rose-900/10 border-rose-500/30 text-rose-400"
            };

            const bgClass = colorMap[monthData.color];

            return (
               <div key={monthData.month} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-colors shadow-lg">
                  {/* Month Header */}
                  <button 
                     onClick={() => toggleMonth(monthData.month)}
                     className={`w-full p-6 text-left flex items-center justify-between transition-colors hover:bg-slate-800/50 ${isExpanded ? 'bg-slate-800/30 border-b border-slate-800' : ''}`}
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${bgClass}`}>
                           <MonthIcon className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-white mb-1">{monthData.title}</h3>
                           <p className="text-slate-400 text-sm hidden md:block">{monthData.desc}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-slate-500 hidden sm:block">
                           {completedInMonth}/{monthData.weeks.length} tuần
                        </div>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                           <ChevronDown className="w-5 h-5 text-slate-400" />
                        </motion.div>
                     </div>
                  </button>

                  {/* Weeks Accordion */}
                  <AnimatePresence>
                     {isExpanded && (
                        <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           className="overflow-hidden"
                        >
                           <div className="p-4 md:p-6 space-y-4 bg-slate-950/50">
                              {monthData.weeks.map((week) => {
                                 const isCompleted = completedWeeks.includes(week.week);
                                 return (
                                    <div key={week.week} className={`p-5 rounded-2xl border transition-all ${isCompleted ? 'bg-green-500/5 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'bg-slate-900 border-slate-800'}`}>
                                       <div className="flex items-start gap-4">
                                          <button 
                                             onClick={(e) => toggleWeekCompletion(week.week, e)}
                                             className="mt-1 shrink-0 transition-transform active:scale-95"
                                          >
                                             {isCompleted ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                             ) : (
                                                <Circle className="w-6 h-6 text-slate-600 hover:text-slate-400" />
                                             )}
                                          </button>
                                          <div className="flex-1">
                                             <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Tuần {week.week}</span>
                                                <h4 className={`text-lg font-bold ${isCompleted ? 'text-slate-300' : 'text-white'}`}>{week.title}</h4>
                                             </div>
                                             
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                                   <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wide">Mục tiêu</span>
                                                   <ul className="space-y-1.5">
                                                      {week.goals.map((goal, i) => (
                                                         <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />
                                                            <span>{goal}</span>
                                                         </li>
                                                      ))}
                                                   </ul>
                                                </div>
                                                <div className="bg-violet-900/10 p-4 rounded-xl border border-violet-500/20">
                                                   <span className="text-xs font-semibold text-violet-400 block mb-2 uppercase tracking-wide">Thực hành</span>
                                                   <p className="text-sm text-violet-200/80">{week.practice}</p>
                                                   <div className="mt-4">
                                                      <Link to={`/dashboard/roadmap/${week.week}`}>
                                                        <Button size="sm" variant="outline" className="h-8 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-500/20 w-full sm:w-auto">
                                                           <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Xem bài giảng
                                                        </Button>
                                                      </Link>
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            );
         })}
      </div>
      
      {/* Daily reminder setup module placeholder */}
      <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-slate-900 border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
         <div>
            <h3 className="text-xl font-bold text-white mb-2">Lời khuyên từ Huấn luyện viên</h3>
            <p className="text-slate-400 max-w-lg text-sm leading-relaxed">
               Thanh nhạc giống như tập gym, cơ bắp cần thời gian để làm quen. <b>15 phút mỗi ngày</b> liên tục trong 1 tuần sẽ hiệu quả hơn việc tập 2 tiếng vào cuối tuần. Hãy kiên nhẫn!
            </p>
         </div>
         <Link to="/voice-range">
            <Button className="bg-slate-800 hover:bg-slate-700 text-white rounded-full shrink-0">
               Kiểm tra Quãng giọng ngay
               <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
         </Link>
      </div>

    </div>
  );
}

