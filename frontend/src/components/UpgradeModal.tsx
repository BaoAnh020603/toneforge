import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Check } from 'lucide-react';
import { Button } from './ui/button';

export const PLANS = [
  {
    name: "Starter",
    price: "0đ",
    period: "/ mãi mãi",
    desc: "Trải nghiệm những công cụ cơ bản của ToneForge.",
    features: [
      "Tạo tối đa 10 phiên phân tích / tháng",
      "Đo cao độ và nhịp cơ bản",
      "AI đánh giá 2 lượt / ngày",
      "Tham gia cộng đồng người dùng",
      "Giao diện không quảng cáo"
    ],
    buttonText: "Đang sử dụng",
    buttonVariant: "outline",
    popular: false
  },
  {
    name: "Creator",
    price: "199.000đ",
    period: "/ tháng",
    desc: "Mở khoá toàn bộ bộ công cụ AI để luyện giọng chuyên sâu.",
    features: [
      "Phiên phân tích không giới hạn",
      "AI đánh giá chuyên sâu không giới hạn",
      "Mở khoá lộ trình nâng cao",
      "Chế độ làm việc riêng tư",
      "Không quảng cáo",
      "Huy hiệu Creator trên hồ sơ"
    ],
    buttonText: "Liên hệ hỗ trợ",
    buttonVariant: "default",
    popular: true
  }
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
          >
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Nâng cấp trải nghiệm</h2>
                <p className="text-slate-400 text-sm">Mở khoá thêm công cụ AI và lộ trình cá nhân hoá.</p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 md:p-8 bg-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {PLANS.map((plan, idx) => (
                  <div 
                    key={idx} 
                    className={`relative flex flex-col p-6 rounded-2xl border ${
                      plan.popular 
                        ? 'bg-gradient-to-b from-amber-500/10 to-transparent border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' 
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 right-6 transform -translate-y-1/2">
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-amber-500/20">
                          <Crown className="w-3 h-3" /> Đề xuất
                        </span>
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                      <span className="text-slate-400 font-medium">{plan.period}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-6 min-h-[40px]">{plan.desc}</p>
                    
                    <div className="flex-1 space-y-4 mb-8">
                      {plan.features.map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-3">
                          <div className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-violet-400" />
                          </div>
                          <span className="text-sm text-slate-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button 
                      variant={plan.buttonVariant as "default" | "outline"}
                      onClick={() => {
                        if (plan.popular) {
                          window.open('https://www.facebook.com/anh.john.794288/', '_blank');
                        } else {
                          onClose();
                        }
                      }}
                      className={`w-full py-6 text-base font-semibold rounded-xl ${
                        plan.popular 
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 border-0 shadow-xl shadow-amber-500/20' 
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {plan.buttonText}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
