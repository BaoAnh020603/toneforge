import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useState } from 'react';

export default function DashboardSongEdit() {
  const { id } = useParams();
  const [isPublic, setIsPublic] = useState(true);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Quay lại
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Chỉnh sửa bài hát</h1>
        <p className="text-slate-400">ID: {id} • Cập nhật thông tin và cài đặt quyền riêng tư.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
        <div className="flex items-center justify-between p-4 rounded-xl border bg-slate-950/50 border-slate-800">
           <div>
             <div className="font-semibold text-white mb-1">Trạng thái bài hát</div>
             <div className="text-sm text-slate-500">Người khác có thể tìm thấy và hát bài này không?</div>
           </div>
           
           <button 
             onClick={() => setIsPublic(!isPublic)}
             className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${isPublic ? 'bg-violet-600' : 'bg-slate-700'}`}
           >
             <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-7' : 'translate-x-1'}`} />
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Tên bài hát</label>
            <input type="text" defaultValue="Chắc Ai Đó Sẽ Về" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Ca sĩ / Tác giả</label>
            <input type="text" defaultValue="Sơn Tùng M-TP" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none" />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-semibold text-slate-300">Thể loại</label>
             <input type="text" defaultValue="Pop/Ballad" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none" />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-semibold text-slate-300">Độ khó (Tự đánh giá)</label>
             <select defaultValue="Medium" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none appearance-none">
                <option value="Easy">Dễ</option>
                <option value="Medium">Trung bình</option>
                <option value="Hard">Khó</option>
             </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Lyric Timestamp (Đồng bộ lời)</label>
          <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 min-h-[150px] font-mono text-sm text-slate-400">
            [00:15.20] Anh tìm nỗi nhớ, anh tìm quá khứ<br/>
            [00:20.10] Nhớ lắm ký ức anh và em<br/>
            [00:25.40] Ngồi lại đây một chút, nghĩ về nhau một chút<br/>
            <div className="mt-4 text-violet-400 cursor-pointer hover:underline inline-block">Mở trình chỉnh sửa nâng cao...</div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <Button variant="ghost" className="text-slate-400 hover:text-white">Huỷ thay đổi</Button>
          <Link to="/dashboard">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white">
              <Save className="w-4 h-4 mr-2" />
              Lưu cập nhật
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
