import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Music4, Clock, Network, ScrollText } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { auth } from '../../lib/firebase';

function InteractivePiano() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const playNote = (frequency: number, actKey: string) => {
    setActiveKey(actKey);
    setTimeout(() => setActiveKey(null), 200);

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 1.5);
  };

  const whiteKeys = [
    { label: 'C (Đô)', freq: 261.63, id: 'C4' },
    { label: 'D (Rê)', freq: 293.66, id: 'D4' },
    { label: 'E (Mi)', freq: 329.63, id: 'E4' },
    { label: 'F (Fa)', freq: 349.23, id: 'F4' },
    { label: 'G (Sol)', freq: 392.00, id: 'G4' },
    { label: 'A (La)', freq: 440.00, id: 'A4' },
    { label: 'B (Si)', freq: 493.88, id: 'B4' },
    { label: 'C (Đô)', freq: 523.25, id: 'C5' }
  ];

  const blackKeys = [
    { label: 'C# / Db', freq: 277.18, left: '8.5%', id: 'Cs4' },
    { label: 'D# / Eb', freq: 311.13, left: '21%', id: 'Ds4' },
    { label: 'F# / Gb', freq: 369.99, left: '46%', id: 'Fs4' },
    { label: 'G# / Ab', freq: 415.30, left: '58.5%', id: 'Gs4' },
    { label: 'A# / Bb', freq: 466.16, left: '71%', id: 'As4' }
  ];

  return (
    <div className="relative w-full overflow-x-auto pb-4 pt-4">
      <div className="text-center text-sm font-medium text-violet-400 mb-4 animate-pulse">
         👆 Nhấn vào các phím đàn để nghe âm thanh 
      </div>
      <div className="flex w-full md:w-[600px] h-32 relative mx-auto select-none">
        {/* White keys */}
        {whiteKeys.map((k) => (
          <div 
            key={k.id} 
            onClick={() => playNote(k.freq, k.id)}
            className={`flex-1 border border-slate-300 rounded-b-md flex items-end justify-center pb-2 text-slate-800 text-[10px] sm:text-xs font-bold font-mono shadow-sm cursor-pointer transition-colors active:bg-slate-200 ${activeKey === k.id ? 'bg-slate-200 shadow-inner' : 'bg-white'}`}
          >
            {k.label}
          </div>
        ))}
        {/* Black keys */}
        {blackKeys.map((k) => (
           <div 
            key={k.id}
            onClick={() => playNote(k.freq, k.id)}
            style={{ left: k.left }}
            className={`absolute top-0 w-[8%] h-[60%] rounded-b-md border border-slate-700 shadow-md flex items-end justify-center pb-2 cursor-pointer transition-colors active:bg-slate-800 z-10 ${activeKey === k.id ? 'bg-slate-700' : 'bg-slate-900'}`}
          >
            <span className="text-[8px] text-white rotate-90 transform origin-left whitespace-nowrap opacity-50 pointer-events-none">{k.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardTheoryDetail() {
  const { theoryId } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Mark reading theory for daily quest
    if (auth.currentUser) {
       localStorage.setItem(`theoryRead_${auth.currentUser.uid}_${new Date().toDateString()}`, 'true');
    }
  }, []);

  const THEORY_DATA: Record<string, any> = {
    notes: {
      title: "1. Nốt Nhạc & Solfege",
      icon: Music4,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      concept: "Trong âm nhạc phương Tây, có 7 nốt nhạc cơ bản tạo thành một vòng tuần hoàn: Đồ - Rê - Mi - Fa - Sol - La - Si. Tương ứng với ký hiệu chữ cái quốc tế là C - D - E - F - G - A - B. Hiểu được các nốt này giúp bạn biết mình đang hát ở độ cao nào.",
      details: [
        { title: "Cung & Nửa cung", desc: "Khoảng cách giữa các nốt nhạc được tính bằng 'cung' (step). Trên đàn Piano, khoảng cách giữa 2 phím trắng liền kề (có phím đen ở giữa) là 1 cung. Nếu không có phím đen ở giữa (như Mi-Fa, Si-Đô), khoảng cách là nửa cung." },
        { title: "Dấu thăng (#) & giáng (b)", desc: "Dấu thăng (#) nâng nốt nhạc lên nửa cung. Dấu giáng (b) làm giảm nốt nhạc xuống nửa cung. Ví dụ nốt phím đen giữa C và D là C# (Đô thăng) hoặc Db (Rê giáng)." }
      ],
      visualization: <InteractivePiano />
    },
    rhythm: {
      title: "2. Nhịp điệu & Tempo (Tốc độ)",
      icon: Clock,
      color: "text-green-400",
      bg: "bg-green-500/10",
      concept: "Nhịp là khung xương của bài hát. Số chỉ nhịp (VD: 4/4, 3/4) luôn được viết đầu bản nhạc. Con số ở trên chỉ số phách (mốc nhịp đập) trong 1 khoảng thời gian gọi là ô nhịp (measure). Tempo là tốc độ bài hát, tính bằng số nhịp đập mỗi phút (BPM).",
      details: [
        { title: "Nhịp 4/4", desc: "Loại nhịp phổ biến nhất thế giới (Pop, Rock, Ballad, R&B). Gồm 4 phách trong một ô nhịp. Phách 1 mạnh, phách 2 nhẹ, phách 3 mạnh vừa, phách 4 nhẹ. Cảm giác đếm: MỘT-hai-Ba-bốn." },
        { title: "Nhịp 3/4 & 6/8", desc: "Thường dùng cho điệu Valse (Valt), mang tính chất khiêu vũ, đung đưa. Đếm: MỘT-hai-ba, MỘT-hai-ba." }
      ],
      visualization: (
        <div className="flex flex-col gap-6 w-full pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
             <div className="text-2xl font-bold font-serif w-12 text-center text-green-400 bg-slate-950 rounded-lg p-2 border border-slate-800">4<br/><span className="border-t border-green-400/30 w-8 mx-auto block"></span>4</div>
             <div className="flex gap-2 flex-1">
                {[1,2,3,4].map(b => (
                  <div key={b} className={`flex-1 h-14 flex flex-col items-center justify-center rounded-lg font-bold text-sm ${b === 1 ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : b===3 ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-800 text-slate-500 opacity-70'}`}>
                    <span>Phách {b}</span>
                    <span className="text-[10px] font-normal">{b===1 ? "Mạnh" : b===3 ? "Vừa" : "Nhẹ"}</span>
                  </div>
                ))}
             </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
             <div className="text-2xl font-bold font-serif w-12 text-center text-blue-400 bg-slate-950 rounded-lg p-2 border border-slate-800">3<br/><span className="border-t border-blue-400/30 w-8 mx-auto block"></span>4</div>
             <div className="flex gap-2 flex-1 md:w-3/4 md:flex-none">
                {[1,2,3].map(b => (
                  <div key={b} className={`flex-1 h-14 flex flex-col items-center justify-center rounded-lg font-bold text-sm ${b === 1 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800 text-slate-500 opacity-70'}`}>
                    <span>Phách {b}</span>
                    <span className="text-[10px] font-normal">{b===1 ? "Mạnh" : "Nhẹ"}</span>
                  </div>
                ))}
             </div>
          </div>
          <div className="mt-2 text-center text-xs text-slate-500 italic">
            Tempo 60 BPM = 1 phách/giây (Tốc độ kim xoay đồng hồ).
          </div>
        </div>
      )
    },
    keys: {
      title: "3. Tông bài hát (Key / Chìa khóa)",
      icon: Network,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      concept: "Mỗi bài hát đều được xây dựng xung quanh một nốt nhạc trung tâm, gọi là 'Chủ âm'. Tập hợp các nốt đi theo chủ âm đó gọi là Âm giai (Scale). Tông bài hát (Key) chính là việc xác định chủ âm và âm giai của bài. Biết tông bài hát giúp ca sĩ chọn âm vực phù hợp với giọng của mình.",
      details: [
        { title: "Giọng Trưởng (Major)", desc: "Đô trưởng (C), Sol trưởng (G)... Mang sắc thái vui vẻ, tươi sáng, hùng tráng." },
        { title: "Giọng Thứ (Minor)", desc: "La thứ (Am), Mi thứ (Em)... Mang sắc thái u buồn, da diết, trầm lắng." },
        { title: "Ký hiệu trên App", desc: "Khi thấy bài hát ghi 'Tông: C' nghĩa là Đô Trưởng. 'Tông: Am' là La thứ. Đôi khi bạn thấy nốt giáng (b) như Eb (Mi giáng trưởng) vì bản gốc ca sĩ hát ở tông này. Bạn hoàn toàn có thể [+1] hoặc [-1] tông trên app mượt mà." }
      ],
      visualization: (
        <div className="grid grid-cols-2 gap-4 h-full pt-4">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-xl p-6 flex flex-col justify-center items-center text-center shadow-lg">
             <div className="text-5xl mb-3">☀️</div>
             <h3 className="font-bold text-yellow-400 text-lg">Giọng Trưởng (Major)</h3>
             <div className="flex gap-2 mt-3 flex-wrap justify-center">
                <span className="px-2 py-1 bg-yellow-500/20 rounded text-xs font-mono text-yellow-300">C</span>
                <span className="px-2 py-1 bg-yellow-500/20 rounded text-xs font-mono text-yellow-300">D</span>
                <span className="px-2 py-1 bg-yellow-500/20 rounded text-xs font-mono text-yellow-300">G</span>
                <span className="px-2 py-1 bg-yellow-500/20 rounded text-xs font-mono text-yellow-300">F</span>
             </div>
          </div>
          <div className="bg-gradient-to-br from-blue-600/20 to-indigo-900/40 border border-blue-500/30 rounded-xl p-6 flex flex-col justify-center items-center text-center shadow-lg">
             <div className="text-5xl mb-3">🌧️</div>
             <h3 className="font-bold text-blue-400 text-lg">Giọng Thứ (Minor)</h3>
             <div className="flex gap-2 mt-3 flex-wrap justify-center">
                <span className="px-2 py-1 bg-blue-500/20 rounded text-xs font-mono text-blue-300">Am</span>
                <span className="px-2 py-1 bg-blue-500/20 rounded text-xs font-mono text-blue-300">Em</span>
                <span className="px-2 py-1 bg-blue-500/20 rounded text-xs font-mono text-blue-300">Dm</span>
             </div>
          </div>
        </div>
      )
    },
    sheet: {
      title: "4. Đọc Sheet Nhạc (Khuông nhạc)",
      icon: ScrollText,
      color: "text-fuchsia-400",
      bg: "bg-fuchsia-500/10",
      concept: "Để ghi lại cao độ và nhịp điệu, người ta dùng 'Khuông nhạc' (Staff) gồm 5 dòng kẻ song song và 4 khe. Nốt nhạc nằm càng cao trên khuông nhạc thì âm thanh phát ra càng cao.",
      details: [
        { title: "Khóa Sol (Treble Clef)", desc: "Thường dùng cho giọng nữ, nam cao, tay phải piano, guitar. Nốt Sol nằm ngay trên dòng kẻ thứ 2 từ dưới đếm lên (đầu não của hình dấu khóa Sol)." },
        { title: "Khóa Fa (Bass Clef)", desc: "Dùng cho giọng nam trầm, tay trái piano, bass. Ít gặp trong sheet nhạc thanh nhạc bài hát thông thường." },
        { title: "Hình nốt (Đen, Trắng, Đơn)", desc: "Nốt trắng (trắng ruột) ngân 2 phách. Nốt đen (đen ruột) ngân 1 phách. Nốt móc đơn ngân nửa phách." }
      ],
      visualization: (
        <div className="relative bg-[#f5f0e6] rounded-xl h-56 w-full max-w-[500px] border border-[#d4cbb8] flex flex-col justify-center p-4 overflow-hidden mt-4 mx-auto shadow-inner text-slate-900">
           {/* Lines */}
           <div className="absolute inset-x-8 h-24 flex flex-col justify-between">
             {[1,2,3,4,5].map(l => (
               <div key={l} className="w-full h-[1px] bg-slate-900/60" />
             ))}
           </div>
           
           {/* G Clef Mock */}
           <div className="absolute left-10 text-[80px] font-serif leading-none opacity-80" style={{ top: '48px'}}>
             𝄞
           </div>

           {/* Notes Mock */}
           <div className="absolute w-4 h-3.5 bg-slate-900 rounded-[50%] -rotate-12" style={{ left: '120px', top: '126px' }}>
              <div className="text-[10px] absolute -bottom-5 -left-1 font-mono font-bold text-slate-600">Đô(C)</div>
           </div>
           <div className="absolute w-[1.5px] h-12 bg-slate-900" style={{ left: '134px', top: '78px' }} />
           {/* Ledger line for C */}
           <div className="absolute w-8 h-[2px] bg-slate-900" style={{ left: '112px', top: '132px' }} />

           <div className="absolute w-4 h-3.5 bg-slate-900 rounded-[50%] -rotate-12" style={{ left: '180px', top: '114px' }}>
              <div className="text-[10px] absolute -bottom-5 -left-1 font-mono font-bold text-slate-600">Rê(D)</div>
           </div>
           <div className="absolute w-[1.5px] h-12 bg-slate-900" style={{ left: '194px', top: '66px' }} />

           <div className="absolute w-4 h-3.5 bg-slate-900 rounded-[50%] -rotate-12" style={{ left: '240px', top: '102px' }}>
              <div className="text-[10px] absolute -bottom-5 -left-1 font-mono font-bold text-slate-600">Mi(E)</div>
           </div>
           <div className="absolute w-[1.5px] h-12 bg-slate-900" style={{ left: '254px', top: '54px' }} />

           <div className="absolute w-4 h-3.5 bg-slate-900 rounded-[50%] -rotate-12" style={{ left: '300px', top: '90px' }}>
              <div className="text-[10px] absolute -bottom-5 -left-1 font-mono font-bold text-slate-600">Fa(F)</div>
           </div>
           <div className="absolute w-[1.5px] h-12 bg-slate-900" style={{ left: '314px', top: '42px' }} />
           
        </div>
      )
    }
  };

  const data = THEORY_DATA[theoryId || 'notes'];

  if (!data) {
    return <div className="text-white text-center py-20">Bài học không tồn tại</div>;
  }

  const theoryKeys = Object.keys(THEORY_DATA);
  const currentIndex = theoryKeys.indexOf(theoryId || 'notes');
  const prevId = currentIndex > 0 ? theoryKeys[currentIndex - 1] : null;
  const nextId = currentIndex < theoryKeys.length - 1 ? theoryKeys[currentIndex + 1] : null;

  const Icon = data.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <Link to="/dashboard/theory" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Về Lý Thuyết & Kỹ Thuật
      </Link>

      <div className="flex items-center gap-4">
         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${data.bg} ${data.color} shadow-lg`}>
            <Icon className="w-8 h-8" />
         </div>
         <div>
            <h1 className="text-3xl font-bold text-white mb-2">{data.title}</h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
               Giáo Trình Lý Thuyết
            </div>
         </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-xl space-y-8">
         <section>
            <h2 className="text-xl font-bold text-white mb-4">🎵 Hiểu bản chất</h2>
            <p className="text-slate-300 leading-relaxed text-lg">
               {data.concept}
            </p>
         </section>

         <section className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
            <h2 className="text-lg font-bold text-violet-400 mb-4 flex items-center gap-2">
               📝 Ghi nhớ chi tiết
            </h2>
            <div className="space-y-6">
              {data.details.map((detail: any, idx: number) => (
                 <div key={idx} className="border-l-2 border-violet-500/50 pl-4">
                    <h4 className="font-bold text-white mb-1">{detail.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{detail.desc}</p>
                 </div>
              ))}
            </div>
         </section>

         <section>
            <h2 className="text-xl font-bold text-white mb-2">👁️ Trực quan sinh động</h2>
            <p className="text-slate-400 text-sm mb-4">Hình ảnh minh hoạ giúp bạn dễ hình dung kiến thức trên.</p>
            {data.visualization}
         </section>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
         {prevId ? (
           <Link to={`/dashboard/theory/${prevId}`} className="w-full sm:w-auto">
             <Button variant="outline" className="w-full sm:w-auto border-slate-700 text-white rounded-xl h-14 px-8 text-lg font-semibold hover:bg-slate-800">
                <ArrowLeft className="w-5 h-5 mr-2" /> Bài trước
             </Button>
           </Link>
         ) : <div className="hidden sm:block" />}
         
         {nextId ? (
           <Link to={`/dashboard/theory/${nextId}`} className="w-full sm:w-auto">
             <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-14 px-8 text-lg font-semibold shadow-xl shadow-violet-600/20">
                Bài tiếp theo <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
             </Button>
           </Link>
         ) : (
           <Link to="/dashboard/techniques/pitch" className="w-full sm:w-auto">
             <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white rounded-xl h-14 px-8 text-lg font-semibold shadow-xl shadow-orange-600/20">
                Tiếp tục: Kỹ thuật Cao độ <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
             </Button>
           </Link>
         )}
      </div>
    </div>
  );
}
