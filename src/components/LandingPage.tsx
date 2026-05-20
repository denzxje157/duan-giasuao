import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, MessageSquare, BookOpen, Mic, Target, Zap, ChevronRight, CheckCircle2, Send, Bot, User } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onGuestLogin?: () => void;
}

export default function LandingPage({ onLoginClick, onGuestLogin }: LandingPageProps) {
  const [demoMessages, setDemoMessages] = useState<Array<{ role: 'user' | 'bot', content: string }>>([
    { role: 'bot', content: 'Chào bạn! Mình là Gia sư ảo. Bạn có bài tập nào cần hỗ trợ không?' }
  ]);
  const [demoInput, setDemoInput] = useState('');
  const [demoCount, setDemoCount] = useState(0);
  const demoRef = useRef<HTMLDivElement>(null);
  const demoInputRef = useRef<HTMLInputElement>(null);

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => demoInputRef.current?.focus(), 500);
  };

  const handleDemoSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoCount >= 3) {
      onLoginClick();
      return;
    }
    if (!demoInput.trim()) return;

    const userMessage = demoInput.trim();
    setDemoInput('');
    setDemoMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    const currentCount = demoCount + 1;
    setDemoCount(currentCount);

    // Mock bot response
    setTimeout(() => {
      let botReply = 'Đây là bản dùng thử nhanh. Bạn hãy đăng nhập để trao đổi chi tiết hơn về các môn Toán, Văn, Anh nhé!';
      if (currentCount === 1) botReply = `Thật tuyệt! Câu hỏi "${userMessage}" rất thú vị. Bạn có muốn mình giải thích từng bước không?`;
      else if (currentCount === 2) botReply = `Mình hiểu ý bạn. Hãy thử hỏi thêm một chi tiết nữa xem sao!`;
      else if (currentCount >= 3) {
        botReply = `Bạn đã sử dụng hết lượt dùng thử. Đang chuyển hướng đến trang đăng nhập...`;
        setTimeout(() => {
          onLoginClick();
        }, 1500);
      }
      
      setDemoMessages(prev => [...prev, { role: 'bot', content: botReply }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-50 border-b border-slate-100 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                <BookOpen className="w-6 h-6 text-white" />
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-800">GiaSư<span className="text-brand-600">Ảo</span></span>
          </div>
          <button 
             onClick={onLoginClick}
             className="px-6 py-2 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all shadow-md"
          >
             Đăng nhập / Đăng ký
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-semibold"
             >
               <Zap className="w-4 h-4" /> Tiên phong AI trong giáo dục
             </motion.div>
             
             <motion.h1 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900"
             >
               Học tập thông minh hơn với <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-500">Gia sư AI 1 kèm 1</span>
             </motion.h1>

             <motion.p 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="text-lg text-slate-600 leading-relaxed max-w-xl font-medium"
             >
               Không chỉ đưa ra đáp án, Gia sư ảo giúp bạn phân tích từng bước, bám sát sách giáo khoa và tạo lộ trình học riêng biệt cho bạn.
             </motion.p>

             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
             >
               <button 
                 onClick={onGuestLogin || scrollToDemo}
                 className="px-8 py-4 bg-brand-600 text-white rounded-full font-bold text-lg hover:bg-brand-700 shadow-xl shadow-brand-600/30 flex items-center gap-3 transition-transform hover:-translate-y-1"
               >
                 Học ngay miễn phí <ArrowRight className="w-5 h-5" />
               </button>
               <p className="text-sm font-medium text-slate-400 mt-4 flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Không cần thẻ tín dụng
               </p>
             </motion.div>
          </div>

          <motion.div 
            ref={demoRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-2 shadow-2xl border border-slate-100 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-20 shadow-sm uppercase tracking-wider">
               Bản dùng thử (Còn {3 - demoCount} lượt)
            </div>
            <div className="bg-slate-50 rounded-2xl h-[450px] border border-slate-100 flex flex-col overflow-hidden relative z-10">
              <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-brand-600" />
                 </div>
                 <div>
                    <div className="font-bold text-sm">Gia sư AI Demo</div>
                    <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Trực tuyến
                    </div>
                 </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                <AnimatePresence>
                  {demoMessages.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                       {msg.role === 'bot' && (
                         <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                           <Bot className="w-4 h-4 text-brand-600" />
                         </div>
                       )}
                       <div className={`p-3 rounded-2xl max-w-[80%] text-sm font-medium ${
                         msg.role === 'user' 
                           ? 'bg-brand-600 text-white rounded-tr-sm' 
                           : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                       }`}>
                         {msg.content}
                       </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <form onSubmit={handleDemoSend} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                 <div className="relative flex-1">
                   <input 
                     ref={demoInputRef}
                     disabled={demoCount > 3}
                     type="text" 
                     value={demoInput}
                     onChange={e => setDemoInput(e.target.value)}
                     placeholder={demoCount >= 3 ? "Đã hết lượt. Hãy đăng ký ngay!" : "Hỏi thử mình một câu nhé..."}
                     className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all font-medium disabled:opacity-50"
                   />
                   <button type="button" disabled={demoCount > 3} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 disabled:opacity-50">
                     <Mic className="w-4 h-4" />
                   </button>
                 </div>
                 <button 
                   disabled={(!demoInput.trim() && demoCount < 3) || demoCount > 3}
                   className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white shrink-0 disabled:opacity-50 hover:bg-brand-700 transition-colors"
                 >
                   <Send className="w-4 h-4 -ml-0.5" />
                 </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Outline */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
             <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">Tính năng nổi bật</h2>
             <p className="text-slate-500 font-medium">Ba trụ cột giúp bạn làm chủ kiến thức và duy trì thói quen học.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               { icon: Target, title: 'Kho dữ liệu giáo khoa chuẩn', desc: 'Sách giáo khoa, sách bài tập được nạp trực tiếp qua công nghệ RAG, đảm bảo AI trả lời đúng trọng tâm.' },
               { icon: MessageSquare, title: 'Không gian học tập trung', desc: 'Chế độ Focus Mode kết hợp Pomodoro giúp bạn làm bài tập hiệu quả, không bị xao nhãng.' },
               { icon: Mic, title: 'Giảng bài bằng giọng nói', desc: 'Có thể nghe giảng bài bằng giọng nói truyền cảm, biến môn học khó hiểu thành các câu chuyện dễ nhớ.' }
             ].map((feat, i) => (
               <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors group">
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-brand-600 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <feat.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{feat.title}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{feat.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* User Guide */}
      <section className="py-20 px-4 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
             <div className="space-y-8">
                <h2 className="text-3xl md:text-4xl font-extrabold">Cách hoạt động</h2>
                <div className="space-y-6">
                   {[
                     { step: 1, title: 'Cấu hình và Nạp tài liệu', desc: 'Admin sẽ nạp kho tàng sách của các lớp học vào hệ thống để AI đọc hiểu.' },
                     { step: 2, title: 'Học sinh chọn cấp lớp', desc: 'Học sinh đăng nhập và chọn khối lớp để gia sư gợi ý đúng nội dung.' },
                     { step: 3, title: 'Tương tác thông minh', desc: 'Hỏi đáp, chọn sách để giải, trò chuyện bằng giọng nói, thu nạp huy hiệu học tập.' }
                   ].map(s => (
                     <div key={s.step} className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400 shrink-0">
                          {s.step}
                        </div>
                        <div>
                          <h4 className="text-lg font-bold mb-1">{s.title}</h4>
                          <p className="text-slate-400 font-medium">{s.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
                <button 
                  onClick={onLoginClick}
                  className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 uppercase tracking-wide text-sm"
                >
                  Bắt đầu ngay <ChevronRight className="w-4 h-4" />
                </button>
             </div>
             <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-purple-500 blur-3xl opacity-20" />
                <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 relative shadow-2xl">
                   <div className="space-y-4">
                     <div className="h-4 w-1/3 bg-slate-700 rounded-full animate-pulse" />
                     <div className="h-4 w-3/4 bg-slate-700 rounded-full animate-pulse delay-75" />
                     <div className="h-4 w-1/2 bg-slate-700 rounded-full animate-pulse delay-150" />
                     <div className="p-4 bg-brand-500/20 border border-brand-500/30 rounded-xl mt-6">
                        <div className="font-bold text-brand-300 text-sm mb-2">&gt; Sẵn sàng phục vụ bạn</div>
                        <div className="text-slate-300 font-mono text-xs">Hãy để trí tuệ nhân tạo trở thành người bạn đồng hành trong hành trình chinh phục tri thức.</div>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-white text-center">
        <p className="text-slate-500 font-medium text-sm">© 2026 GiaSư Ảo. Tiên phong ứng dụng AI.</p>
      </footer>
    </div>
  );
}
