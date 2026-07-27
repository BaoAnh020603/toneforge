import { useState, useEffect } from 'react';
import { User, Bell, Crown, Shield, LogOut, Check, X, Star, Key, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UpgradeModal } from '../../components/UpgradeModal';
import { useAlert } from "../../contexts/AlertContext";

export default function DashboardSettings() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [voiceType, setVoiceType] = useState('Chưa xác định');
  const [isSaving, setIsSaving] = useState(false);

  // AI API settings state
  const [apiKey, setApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setDisplayName(user.displayName || user.email?.split('@')[0] || '');
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          if (data.displayName) setDisplayName(data.displayName);
          if (data.bestVoiceType) setVoiceType(data.bestVoiceType);
        }
      }
    };
    fetchProfile();

    // Load AI config from localStorage
    const savedKey = localStorage.getItem('gemini_api_key');
    const savedModel = localStorage.getItem('gemini_model');
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setGeminiModel(savedModel);
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName,
        bestVoiceType: voiceType
      }, { merge: true });
      
      // Update local profile state so UI updates
      setProfile((prev: any) => ({ ...prev, displayName, bestVoiceType: voiceType }));
      showAlert('Đã lưu hồ sơ thành công!');
    } catch (e) {
      console.error(e);
      showAlert('Lỗi lưu hồ sơ!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAIConfig = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    localStorage.setItem('gemini_model', geminiModel);
    showAlert('Đã cập nhật cấu hình AI (Gemini API) thành công!');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Cài đặt tài khoản</h1>
          <p className="text-slate-400">Quản lý thông tin cá nhân và cấu hình ứng dụng.</p>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-slate-800 md:hidden">
          <LogOut className="w-5 h-5 mr-2" />
          Đăng xuất
        </Button>
      </div>

      {/* AI Settings Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Key className="text-blue-400" />
             <h2 className="text-xl font-bold text-white">Cấu hình AI Cá nhân</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
             <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-sm font-bold text-blue-300">Nhập mã API Key của Google Gemini</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                   Hệ thống sử dụng AI Gemini để đánh giá giọng hát. Mỗi ngày bạn có số lượt giới hạn từ hệ thống.
                   Bằng cách dùng API Key cá nhân, bạn sẽ được <b>mở khoá không giới hạn độ dài thu âm và hoàn toàn miễn phí</b> (API Gemini hiện đang miễn phí sử dụng mức tiêu chuẩn).
                </p>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-2">
                   Lấy API Key tại Google AI Studio ↗
                </a>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-slate-300">Gemini API Key</label>
              <div className="relative">
                 <input 
                    type={showApiKey ? "text" : "password"} 
                    placeholder="AIzaSy..."
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none pr-12 font-mono text-sm" 
                 />
                 <button 
                    type="button" 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                 >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                 </button>
              </div>
            </div>
            
            <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-300">Model Đánh giá</label>
               <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-3.0-flash">Gemini 3.0 Flash</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
               </select>
            </div>
          </div>
          
          <Button onClick={handleSaveAIConfig} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full sm:w-auto">
            Lưu cấu hình AI
          </Button>
        </div>
      </section>

      {/* Profil details */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <User className="text-violet-400" />
           <h2 className="text-xl font-bold text-white">Hồ sơ cá nhân</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-6">
            <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'An'}`} alt="avatar" className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700" />
            <Button variant="outline" className="border-slate-700 text-slate-300">Đổi Ảnh</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Email đăng nhập</label>
              <input type="email" value={user?.email || ''} readOnly className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 focus:outline-none cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Tên hiển thị</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none" />
            </div>
            <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-300">Loại giọng (Tự đánh giá)</label>
               <select value={voiceType} onChange={(e) => setVoiceType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-violet-500 focus:outline-none appearance-none">
                  <option value="Chưa xác định">Chưa xác định</option>
                  <option value="Bass">Bass</option>
                  <option value="Baritone">Baritone</option>
                  <option value="Tenor">Tenor</option>
                  <option value="Alto">Alto</option>
                  <option value="Mezzo">Mezzo-soprano</option>
                  <option value="Soprano">Soprano</option>
               </select>
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-violet-600 hover:bg-violet-500 text-white">
            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </Button>
        </div>
      </section>

      {/* Plan */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <Crown className="text-amber-500" />
           <h2 className="text-xl font-bold text-white">Gói dịch vụ</h2>
        </div>
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-950">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <span className="text-amber-500 font-bold">
                 {profile?.isVip ? 'Gói Cao Cấp (VIP)' : 'Gói Miễn Phí (Free)'}
               </span>
             </div>
             <p className="text-sm text-slate-400 max-w-sm">
               {profile?.isVip 
                 ? 'Bạn đang sử dụng gói VIP với đầy đủ các tính năng nâng cao và phân tích AI không giới hạn.' 
                 : 'Giới hạn tải lên 10 bài hát/tháng. Nâng cấp VIP để mở khoá tính năng hát Private và không giới hạn kho nhạc.'}
             </p>
           </div>
           {!profile?.isVip && (
             <Button 
               onClick={() => setShowUpgradeModal(true)}
               className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0 shadow-lg shadow-amber-500/20 shrink-0"
             >
                <Star className="w-4 h-4 mr-2" />
                Nâng cấp VIP ngay
             </Button>
           )}
        </div>
      </section>

       {/* Notifications */}
       <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
           <Bell className="text-blue-400" />
           <h2 className="text-xl font-bold text-white">Thông báo & Quyền riêng tư</h2>
        </div>
        <div className="p-6 space-y-4">
           <div className="flex items-center justify-between">
             <div>
               <div className="font-semibold text-white">Thông báo bài hát mới</div>
               <div className="text-sm text-slate-500">Nhận email khi có bài hát cộng đồng hot.</div>
             </div>
             <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-violet-600 focus:outline-none">
               <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition-transform" />
             </button>
           </div>
           <div className="flex items-center justify-between pt-4 border-t border-slate-800">
             <div>
               <div className="font-semibold text-white">Trang phục cá nhân Public</div>
               <div className="text-sm text-slate-500">Cho phép người khác truy cập trang cá nhân (Profile) của bạn.</div>
             </div>
             <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-violet-600 focus:outline-none">
               <span className="inline-block h-4 w-4 transform translate-x-6 rounded-full bg-white transition-transform" />
             </button>
           </div>
        </div>
      </section>

      {/* Upgrade Modal */}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </div>
  );
}



