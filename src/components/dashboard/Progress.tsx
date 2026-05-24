import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Calendar, Award, TrendingUp, Clock, BookOpen, Star, Sparkles, Target, Settings, ChevronRight } from 'lucide-react';
import { User } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { API_BASE_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ProgressProps {
  user: User;
}

const activityDataMock = [
  { day: 'T2', thu2: 120, time: 120 },
  { day: 'T3', thu3: 45, time: 45 },
  { day: 'T4', thu4: 160, time: 160 },
  { day: 'T5', thu5: 80, time: 80 },
  { day: 'T6', thu6: 210, time: 210 },
  { day: 'T7', thu7: 300, time: 300 },
  { day: 'CN', cn: 150, time: 150 },
];

const radarDataMock = [
  { subject: 'Đại số', score: 90, fullMark: 100 },
  { subject: 'Hình học', score: 30, fullMark: 100 },
  { subject: 'Lượng giác', score: 75, fullMark: 100 },
  { subject: 'Giải tích', score: 85, fullMark: 100 },
  { subject: 'Xác suất', score: 65, fullMark: 100 },
];

const subjectData = [
  { name: 'Toán học', hours: 12, color: '#3b82f6' }, // blue
  { name: 'Ngữ văn', hours: 5, color: '#f59e0b' },   // amber
  { name: 'Tiếng Anh', hours: 7, color: '#10b981' }, // emerald
  { name: 'Khoa học', hours: 3, color: '#8b5cf6' },  // violet
];

const badges = [
  { id: 1, title: 'Chiến thần Toán học', desc: 'Giải thành công 100 bài Toán khó', icon: Target, color: 'text-rose-500', bg: 'bg-rose-100', unlocked: true },
  { id: 2, title: 'Cây bút chăm chỉ', desc: 'Học liên tục trong 7 ngày', icon: Flame, color: 'text-amber-500', bg: 'bg-amber-100', unlocked: true },
  { id: 3, title: 'Nhà thông thái', desc: 'Trả lời đúng 50 câu trắc nghiệm Văn', icon: Star, color: 'text-brand-500', bg: 'bg-brand-100', unlocked: true },
  { id: 4, title: 'Cú đêm học tập', desc: 'Hoàn thành bài tập sau 10h tối', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-100', unlocked: false },
  { id: 5, title: 'Sách là bạn', desc: 'Hoàn thành đọc 5 cuốn SGK trên hệ thống', icon: BookOpen, color: 'text-slate-400', bg: 'bg-slate-100', unlocked: false },
  { id: 6, title: 'Thủ khoa tương lai', desc: 'Đạt điểm tối đa 5 bài kiểm tra', icon: Trophy, color: 'text-slate-400', bg: 'bg-slate-100', unlocked: false },
];

export default function Progress({ user }: ProgressProps) {
  const [stats, setStats] = useState({ streak: 0, total_study_minutes: 0, max_streak: 0, total_sp: 0 });
  const [activityData, setActivityData] = useState(activityDataMock);
  const [radarData, setRadarData] = useState(radarDataMock);

  useEffect(() => {
    if (user.isGuest) return;
    const fetchProgress = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Fetch overall stats
        const statsUrl = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/gamification-stats` : '/api/user/gamification-stats';
        const statsRes = await fetch(statsUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        const statsData = await statsRes.json();
        if (statsData.status === 'success' && statsData.data) {
          setStats(statsData.data);
        }

        // Fetch charts
        const chartsUrl = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/progress-charts` : '/api/user/progress-charts';
        const chartsRes = await fetch(chartsUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        const chartsData = await chartsRes.json();
        if (chartsData.status === 'success' && chartsData.data) {
          setActivityData(chartsData.data.activityData);
          setRadarData(chartsData.data.radarData);
        }
      } catch (err) {
        console.error("Failed to fetch progress:", err);
      }
    };
    fetchProgress();
  }, [user]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Thành tích & Tiến độ</h2>
           <p className="text-slate-500 font-medium">Theo dõi hành trình học tập và nhận phần thưởng xứng đáng.</p>
        </div>
        <button className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shadow-sm text-slate-500 hover:text-slate-800 transition-colors">
           <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Top row: Streak and Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 opacity-20">
            <Flame className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-orange-50">Chuỗi ngày học tập</span>
            </div>
            
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold tracking-tighter">{stats.streak || 0}</span>
                <span className="text-xl font-bold text-orange-100">ngày liên tiếp</span>
              </div>
              <p className="text-sm font-medium text-orange-100 mt-2">Cố lên! Kỷ lục cao nhất của bạn là {stats.max_streak || 0} ngày.</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                <Clock className="w-5 h-5" />
             </div>
             <div>
                <h3 className="font-bold text-slate-700">Tổng thời gian (tuần này)</h3>
                <p className="text-xs text-slate-500 font-medium">+20% so với tuần trước</p>
             </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <span className="text-4xl font-extrabold text-slate-800">18.5</span>
              <span className="text-lg font-bold text-slate-500 ml-1">giờ</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-4 h-4" /> 3h
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-600">
                <Trophy className="w-5 h-5" />
             </div>
             <div>
                <h3 className="font-bold text-slate-700">Điểm kinh nghiệm (XP)</h3>
                <p className="text-xs text-slate-500 font-medium">Cấp độ 5 - Nhà thám hiểm</p>
             </div>
          </div>
          <div className="mt-4">
             <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-slate-800">2,450 XP</span>
                <span className="text-xs font-bold text-slate-400">3,000 XP để lên cấp</span>
             </div>
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-fuchsia-500 rounded-full w-[80%]" />
             </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-500" />
                    Biểu đồ hoạt động
                 </h3>
                 <select className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-brand-500/20">
                    <option>Tuần này</option>
                    <option>Tháng này</option>
                 </select>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                      formatter={(val: number) => [`${val} phút`, 'Thời gian học']}
                    />
                    <Area type="monotone" dataKey="time" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Badges Collection */}
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Bộ sưu tập Huy hiệu
                 </h3>
                 <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">3 / 6 Đã mở khóa</span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {badges.map((badge, idx) => (
                    <motion.div 
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * idx }}
                      className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                        badge.unlocked 
                          ? 'border-slate-200 bg-white hover:border-slate-300 shadow-sm' 
                          : 'border-slate-100 bg-slate-50 opacity-60 grayscale-[50%]'
                      }`}
                    >
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${badge.bg}`}>
                          <badge.icon className={`w-6 h-6 ${badge.color}`} />
                       </div>
                       <div>
                          <h4 className={`font-bold ${badge.unlocked ? 'text-slate-800' : 'text-slate-600'}`}>{badge.title}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-1">{badge.desc}</p>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>
        </div>

        {/* Right column: Distribution & AI Recommendations */}
        <div className="space-y-8">
           <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
              <h3 className="font-bold text-slate-800 mb-2 w-full text-left flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" /> Phân tích Điểm mù (Knowledge Gap)
              </h3>
              <p className="text-xs text-slate-500 font-medium w-full text-left mb-4">Biểu đồ Mạng nhện phân tích các mảng kiến thức</p>
              
              <div className="w-full h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Radar name="Kỹ năng" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 bg-indigo-50 text-indigo-700 p-3 rounded-xl text-sm font-semibold w-full border border-indigo-100">
                <span className="block mb-1">🔥 Mạnh: <strong>Đại số (90%)</strong></span>
                <span>⚠️ Điểm mù: <strong>Hình học (30%)</strong></span>
              </div>
           </div>

           <div className="bg-gradient-to-br from-brand-900 to-slate-900 rounded-3xl p-6 text-white border border-brand-800 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Sparkles className="w-24 h-24 text-brand-400" />
              </div>
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-400" />
                    <h3 className="font-bold text-brand-100">Gia sư Gợi ý</h3>
                 </div>
                 
                 <p className="text-sm font-medium text-slate-300 leading-relaxed shadow-sm">
                   Dựa vào Biểu đồ Mạng nhện, bạn đang làm rất tốt phần <strong>Đại số</strong>. Tuy nhiên, <strong>Hình học</strong> đang là lỗ hổng kiến thức lớn nhất (chỉ đạt 30%). Hãy vá ngay lỗ hổng này!
                 </p>
                 
                 <div className="bg-white/10 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                   <div className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2">Bài tiếp theo</div>
                   <h4 className="font-bold text-white">Lộ trình vá lỗi: Trắc nghiệm Hình học cơ bản</h4>
                   <button className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                     Bắt đầu ôn tập <ChevronRight className="w-4 h-4" />
                   </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
