import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Flame, Calendar, Award, TrendingUp, Clock, BookOpen, Star, Sparkles, Target, Settings, ChevronRight } from 'lucide-react';
import { User } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { API_BASE_URL, ChatSessionGroup } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ProgressProps {
  user: User;
}

const activityDataMock = [
  { day: 'T2', time: 0 },
  { day: 'T3', time: 0 },
  { day: 'T4', time: 0 },
  { day: 'T5', time: 0 },
  { day: 'T6', time: 0 },
  { day: 'T7', time: 0 },
  { day: 'CN', time: 0 },
];

const radarDataMock = [
  { subject: 'Toán', score: 0, fullMark: 100 },
  { subject: 'Ngữ văn', score: 0, fullMark: 100 },
  { subject: 'Tiếng Anh', score: 0, fullMark: 100 },
];

const subjectData = [
  { name: 'Toán', hours: 0, color: '#3b82f6' }, // blue
  { name: 'Ngữ văn', hours: 0, color: '#f59e0b' },   // amber
  { name: 'Tiếng Anh', hours: 0, color: '#10b981' }, // emerald
];

export default function Progress({ user }: ProgressProps) {
  const [stats, setStats] = useState({ streak: 0, total_study_minutes: 0, max_streak: 0, total_sp: 0 });
  const [activityData, setActivityData] = useState(activityDataMock);
  const [radarData, setRadarData] = useState(radarDataMock);

  useEffect(() => {
    if (user.isGuest) {
      // Compute stats and charts from local storage guest chats
      const localSessionsStr = localStorage.getItem('ai_chat_guest_sessions');
      if (localSessionsStr) {
        try {
          const groups = JSON.parse(localSessionsStr) as ChatSessionGroup[];
          
          let totalMsgs = 0;
          const subjectCounts: Record<string, number> = {};
          const dailyCounts: Record<string, number> = {
            'T2': 0, 'T3': 0, 'T4': 0, 'T5': 0, 'T6': 0, 'T7': 0, 'CN': 0
          };
          
          const dayMapping: Record<number, string> = {
            1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN'
          };

          const uniqueDays = new Set<string>();

          groups.forEach(g => {
            g.subjects.forEach(subGroup => {
              const subName = subGroup.subject;
              subGroup.sessions.forEach(sess => {
                const storedMsgsStr = localStorage.getItem(`ai_chat_guest_messages_${sess.session_id}`);
                if (storedMsgsStr) {
                  try {
                    const msgs = JSON.parse(storedMsgsStr);
                    const count = msgs.length;
                    totalMsgs += count;
                    subjectCounts[subName] = (subjectCounts[subName] || 0) + count;
                    
                    // Group activity by day of the week based on updated_at
                    if (sess.updated_at) {
                      const d = new Date(sess.updated_at);
                      const dayLabel = dayMapping[d.getDay()];
                      if (dayLabel) {
                        dailyCounts[dayLabel] += count * 3; // 3 minutes per message
                      }
                      
                      const dateKey = d.toISOString().split('T')[0];
                      uniqueDays.add(dateKey);
                    }
                  } catch (e) {}
                }
              });
            });
          });

          const streak = uniqueDays.size;
          const totalMins = totalMsgs * 3;
          const totalSp = totalMsgs * 15; // 15 XP per message

          setStats({
            streak: streak || 0,
            max_streak: streak || 0,
            total_study_minutes: totalMins,
            total_sp: totalSp
          });

          // Map activityData
          const updatedActivityData = Object.keys(dailyCounts).map(day => ({
            day,
            time: dailyCounts[day]
          }));
          setActivityData(updatedActivityData);

          // Map radarData
          const updatedRadarData = Object.keys(subjectCounts).map(subj => ({
            subject: subj,
            score: Math.min(100, subjectCounts[subj] * 10), // Scale score
            fullMark: 100
          }));
          
          if (updatedRadarData.length === 0) {
            setRadarData([
              { subject: 'Toán', score: 0, fullMark: 100 },
              { subject: 'Ngữ văn', score: 0, fullMark: 100 },
              { subject: 'Tiếng Anh', score: 0, fullMark: 100 },
            ]);
          } else {
            setRadarData(updatedRadarData);
          }

        } catch (e) {
          console.error("Error parsing guest sessions for progress:", e);
        }
      }
      return;
    }

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

  const badgesList = useMemo(() => {
    return [
      {
        id: 1,
        title: 'Chiến thần Học tập',
        desc: 'Học tập tích cực trên hệ thống',
        icon: Target,
        color: 'text-rose-500',
        bg: 'bg-rose-100',
        unlocked: stats.total_study_minutes > 0
      },
      {
        id: 2,
        title: 'Cây bút chăm chỉ',
        desc: 'Học liên tục trong ít nhất 3 ngày',
        icon: Flame,
        color: 'text-amber-500',
        bg: 'bg-amber-100',
        unlocked: stats.streak >= 3 || stats.max_streak >= 3
      },
      {
        id: 3,
        title: 'Nhà thông thái',
        desc: 'Đạt từ 200 điểm kinh nghiệm (XP) trở lên',
        icon: Star,
        color: 'text-brand-500',
        bg: 'bg-brand-100',
        unlocked: stats.total_sp >= 200
      },
      {
        id: 4,
        title: 'Cú đêm học tập',
        desc: 'Học tập hơn 30 phút trên hệ thống',
        icon: Clock,
        color: 'text-slate-500',
        bg: 'bg-slate-100',
        unlocked: stats.total_study_minutes >= 30
      },
      {
        id: 5,
        title: 'Hiếu học',
        desc: 'Tích lũy hơn 100 phút học tập',
        icon: BookOpen,
        color: 'text-sky-500',
        bg: 'bg-sky-100',
        unlocked: stats.total_study_minutes >= 100
      },
      {
        id: 6,
        title: 'Thủ khoa tương lai',
        desc: 'Đạt cấp độ thám hiểm cấp cao (1,000 XP)',
        icon: Trophy,
        color: 'text-yellow-500',
        bg: 'bg-yellow-100',
        unlocked: stats.total_sp >= 1000
      },
    ];
  }, [stats]);

  const levelInfo = useMemo(() => {
    const xp = stats.total_sp || 0;
    const level = Math.floor(xp / 500) + 1;
    const currentLevelStart = (level - 1) * 500;
    const nextLevelTarget = level * 500;
    const progress = xp - currentLevelStart;
    const percent = Math.min(100, Math.max(0, (progress / 500) * 100));
    
    let levelName = 'Tập sự';
    if (level >= 2) levelName = 'Nhà thám hiểm';
    if (level >= 4) levelName = 'Chuyên gia';
    if (level >= 6) levelName = 'Thầy đội';
    if (level >= 8) levelName = 'Thủ khoa';
    
    return { level, levelName, nextLevelTarget, percent };
  }, [stats.total_sp]);

  const analysis = useMemo(() => {
    if (!radarData || radarData.length === 0) {
      return { strength: null, blindSpot: null };
    }
    const sorted = [...radarData].sort((a, b) => b.score - a.score);
    const hasData = sorted.some(item => item.score > 0);
    if (!hasData) {
      return { strength: null, blindSpot: null };
    }
    
    const strength = sorted[0];
    const blindSpot = sorted[sorted.length - 1];
    return { strength, blindSpot };
  }, [radarData]);

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
              <span className="text-4xl font-extrabold text-slate-800">{(stats.total_study_minutes / 60).toFixed(1)}</span>
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
                <p className="text-xs text-slate-500 font-medium">Cấp độ {levelInfo.level} - {levelInfo.levelName}</p>
             </div>
          </div>
          <div className="mt-4">
             <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-slate-800">{stats.total_sp.toLocaleString()} XP</span>
                <span className="text-xs font-bold text-slate-400">{levelInfo.nextLevelTarget.toLocaleString()} XP để lên cấp</span>
             </div>
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${levelInfo.percent}%` }} />
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
                 <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{badgesList.filter(b => b.unlocked).length} / {badgesList.length} Đã mở khóa</span>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {badgesList.map((badge, idx) => (
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
                {analysis.strength && analysis.blindSpot ? (
                  <>
                    <span className="block mb-1">🔥 Mạnh: <strong>{analysis.strength.subject} ({analysis.strength.score}%)</strong></span>
                    <span>⚠️ Điểm mù: <strong>{analysis.blindSpot.subject} ({analysis.blindSpot.score}%)</strong></span>
                  </>
                ) : (
                  <span>📊 Chưa có đủ dữ liệu học tập để phân tích điểm mù. Hãy trò chuyện với Gia sư AI nhiều hơn!</span>
                )}
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
                   {analysis.strength && analysis.blindSpot ? (
                     <>
                       Dựa vào phân tích, em đang làm rất tốt phần <strong>{analysis.strength.subject}</strong>. Tuy nhiên, <strong>{analysis.blindSpot.subject}</strong> đang là lỗ hổng kiến thức lớn nhất (chỉ đạt {analysis.blindSpot.score}%). Hãy ôn luyện thêm mảng này nhé!
                     </>
                   ) : (
                     "Hãy bắt đầu đặt câu hỏi cho Gia sư ảo ở màn hình chính để chúng mình cùng phân tích lộ trình học tập và chỉ ra các điểm mù kiến thức của bạn nhé!"
                   )}
                 </p>
                 
                 {analysis.blindSpot && (
                   <div className="bg-white/10 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                     <div className="text-xs font-semibold text-brand-300 uppercase tracking-wider mb-2">Bài tiếp theo</div>
                     <h4 className="font-bold text-white">Lộ trình vá lỗi: Ôn tập chuyên đề {analysis.blindSpot.subject}</h4>
                     <button className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                       Bắt đầu ôn tập <ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
