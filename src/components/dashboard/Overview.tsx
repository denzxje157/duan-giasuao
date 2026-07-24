import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Zap, Target, BookOpen, Clock, Award, Star, Trophy, Flame, Calendar, PlayCircle, Check, Plus, Edit2, Trash2, Bell, X } from 'lucide-react';
import { User } from '../../types';
import { API_BASE_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { getCachedStale, setCached } from '../../lib/cache';
import ScheduleModal, { ScheduleItem } from './ScheduleModal';

interface OverviewProps {
  user: User;
  setActiveTab: (tab: string) => void;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
}

const StatCard = ({ icon: Icon, label, value, subtext }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-slate-300">
    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0">
      <Icon className="w-6 h-6 animate-pulse" />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
        <span className="text-xs font-semibold text-slate-400">{subtext}</span>
      </div>
    </div>
  </div>
);

export default function Overview({ user, setActiveTab }: OverviewProps) {
  const questKey = `ai_chat_quests_${user.isGuest ? 'guest' : (user.id || 'guest')}`;
  const lastQuestDateKey = `ai_chat_last_quest_date_${user.isGuest ? 'guest' : (user.id || 'guest')}`;
  const statsCacheKey = `gamification_stats_${user.isGuest ? 'guest' : (user.id || 'guest')}`;
  const scheduleKey = `study_schedules_${user.isGuest ? 'guest' : (user.id || 'guest')}`;

  const [stats, setStats] = useState(() => {
    return getCachedStale<any>(statsCacheKey) || { streak: 0, total_study_minutes: 0, max_streak: 0, total_sp: 0 };
  });

  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<{ subject: string; topic: string; time: string } | null>(null);

  const [quests, setQuests] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(questKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 1, text: "Chào Gia sư & chọn môn học mới", xp: 10, completed: true, tab: 'ai' },
      { id: 2, text: "Hỏi Gia sư AI một câu hỏi bất kỳ", xp: 15, completed: false, tab: 'ai' },
      { id: 3, text: "Khám phá sách mới trong Tủ sách", xp: 20, completed: false, tab: 'library' },
      { id: 4, text: "Thử tài với 1 câu hỏi Trắc nghiệm", xp: 25, completed: false, tab: 'quiz' },
      { id: 5, text: "Luyện vẽ tranh trên bảng vẽ tự do", xp: 30, completed: false, tab: 'ai' },
    ];
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(scheduleKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const todayStr = new Date().toISOString().split('T')[0];
    return [
      { id: '1', subject: 'Toán học', topic: 'Giải bài tập phương trình', date: todayStr, time: '08:00', color: 'bg-brand-500', notify: true, notifyMinutesBefore: 5, completed: false },
      { id: '2', subject: 'Ngữ văn', topic: 'Đọc hiểu văn bản', date: todayStr, time: '10:30', color: 'bg-rose-500', notify: true, notifyMinutesBefore: 5, completed: false },
      { id: '3', subject: 'Tiếng Anh', topic: 'Luyện nghe IELTS', date: todayStr, time: '14:00', color: 'bg-emerald-500', notify: true, notifyMinutesBefore: 5, completed: false },
    ];
  });

  const handleSaveSchedules = (updated: ScheduleItem[]) => {
    setSchedules(updated);
    localStorage.setItem(scheduleKey, JSON.stringify(updated));
  };

  const handleToggleScheduleItem = (id: string) => {
    const updated = schedules.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    handleSaveSchedules(updated);
  };

  const fetchStats = async () => {
    if (user.isGuest) {
      try {
        const cached = localStorage.getItem(statsCacheKey);
        if (cached) {
          setStats(JSON.parse(cached));
        }
      } catch (e) {}
      return;
    }
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const expiresAt = session.expires_at;
      const currentTime = Math.floor(Date.now() / 1000);
      if (expiresAt && currentTime >= expiresAt - 60) {
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        session = refreshedSession;
        if (!session?.access_token) return;
      }

      const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/gamification-stats` : '/api/user/gamification-stats';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        const freshStats = {
          streak: data.data.streak ?? stats.streak,
          total_study_minutes: data.data.total_study_minutes ?? stats.total_study_minutes,
          total_sp: data.data.total_sp ?? stats.total_sp,
          max_streak: data.data.max_streak ?? stats.max_streak
        };
        setStats(freshStats);
        setCached(statsCacheKey, freshStats);
      }
    } catch (err) {
      console.error("Failed to fetch gamification stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  useEffect(() => {
    const handleActivityTracked = () => {
      fetchStats();
    };
    window.addEventListener('study-activity-tracked', handleActivityTracked);
    return () => {
      window.removeEventListener('study-activity-tracked', handleActivityTracked);
    };
  }, [user, statsCacheKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem(lastQuestDateKey);
    
    if (lastDate !== todayStr) {
      const resetQuests = [
        { id: 1, text: "Chào Gia sư & chọn môn học mới", xp: 10, completed: false, tab: 'ai' },
        { id: 2, text: "Hỏi Gia sư AI một câu hỏi bất kỳ", xp: 15, completed: false, tab: 'ai' },
        { id: 3, text: "Khám phá sách mới trong Tủ sách", xp: 20, completed: false, tab: 'library' },
        { id: 4, text: "Thử tài với 1 câu hỏi Trắc nghiệm", xp: 25, completed: false, tab: 'quiz' },
        { id: 5, text: "Luyện vẽ tranh trên bảng vẽ tự do", xp: 30, completed: false, tab: 'ai' },
      ];
      setQuests(resetQuests);
      localStorage.setItem(questKey, JSON.stringify(resetQuests));
      localStorage.setItem(lastQuestDateKey, todayStr);
    }
  }, [user.id, questKey, lastQuestDateKey]);

  // Alarm & Real-time reminder checker
  useEffect(() => {
    const checkAlarms = () => {
      if (typeof window === 'undefined') return;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      schedules.forEach(item => {
        if (item.notify && !item.completed && (item.date === todayStr || !item.date)) {
          if (item.time === currentHHmm) {
            const alarmKey = `alarm_triggered_${item.id}_${currentHHmm}`;
            if (!sessionStorage.getItem(alarmKey)) {
              sessionStorage.setItem(alarmKey, 'true');
              setActiveAlarm({ subject: item.subject, topic: item.topic, time: item.time });

              // Web Audio Chime Sound
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
              } catch (e) {}

              // Native Browser Notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`⏰ Đã đến giờ học môn ${item.subject}!`, {
                  body: `${item.topic || 'Đã đến giờ vào lớp ôn tập cùng Gia Sư AI.'}`,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }
      });
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 15000);
    return () => clearInterval(interval);
  }, [schedules]);

  const triggerConfetti = () => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const newParticles = Array.from({ length: 24 }).map((_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 300 - 150,
      y: Math.random() * -180 - 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.15,
    }));
    setParticles(newParticles);
    setTimeout(() => {
      setParticles([]);
    }, 1500);
  };

  const handleToggleQuest = async (id: number) => {
    let questXp = 0;
    let isAdding = false;

    const updated = quests.map(q => {
      if (q.id === id) {
        const nextState = !q.completed;
        questXp = q.xp;
        isAdding = nextState;
        if (nextState) {
          triggerConfetti();
          setStats(prev => ({ ...prev, total_sp: prev.total_sp + q.xp }));
        } else {
          setStats(prev => ({ ...prev, total_sp: Math.max(0, prev.total_sp - q.xp) }));
        }
        return { ...q, completed: nextState };
      }
      return q;
    });

    setQuests(updated);
    localStorage.setItem(questKey, JSON.stringify(updated));

    if (!user.isGuest && user.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/add-sp` : '/api/user/add-sp';
          await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ sp_amount: isAdding ? questXp : -questXp })
          });
          window.dispatchEvent(new CustomEvent('sp-updated'));
        }
      } catch (err) {
        console.error("Failed to sync SP with backend:", err);
      }
    }
  };

  const completedCount = quests.filter(q => q.completed).length;
  const totalCount = quests.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySchedules = schedules.filter(s => s.date === todayStr || !s.date);

  return (
    <div className="space-y-6 pb-12">
      <style>{`
        @keyframes float-up-particle {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--p-x), var(--p-y)) scale(0.2) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Active Alarm Banner */}
      {activeAlarm && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm flex items-center gap-2">
                ⏰ Đã đến giờ học môn {activeAlarm.subject}! ({activeAlarm.time})
              </h4>
              <p className="text-xs text-amber-100">{activeAlarm.topic}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveAlarm(null);
                setActiveTab('ai');
              }}
              className="px-4 py-2 bg-white text-amber-800 font-extrabold text-xs rounded-xl hover:bg-amber-50 shadow-sm transition-all"
            >
              Vào học ngay
            </button>
            <button
              onClick={() => setActiveAlarm(null)}
              className="p-2 text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Gamification Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label={user.grade <= 5 ? "Chuỗi chăm chỉ" : "Chuỗi học tập"} value={String(stats.streak || 0)} subtext="ngày liên tục" />
        <StatCard icon={Clock} label={user.grade <= 5 ? "Thời gian ở đây" : "Thời gian học"} value={String(Math.floor((stats.total_study_minutes || 0)/60))} subtext={`giờ ${((stats.total_study_minutes || 0)%60)} phút`} />
        <StatCard icon={Target} label={user.grade <= 5 ? "Nhiệm vụ" : "Mục tiêu"} value={`${completedCount}/${totalCount}`} subtext="hoàn thành" />
        <StatCard icon={Trophy} label={user.grade <= 5 ? "Điểm sao" : "Điểm thưởng"} value={(stats.total_sp || 0).toLocaleString()} subtext="SP" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-brand-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
            <div className="relative z-10">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 inline-block">
                Học tập hiệu quả cùng Gia Sư
              </span>
              <h2 className="text-3xl font-extrabold mb-2 tracking-tight">
                {user.grade <= 5 ? "Cùng học thật vui nhé!" : user.grade >= 10 ? "Hướng tới mục tiêu!" : "Tiếp tục chặng đường!"}
              </h2>
              <p className="text-emerald-50 max-w-sm mb-6 leading-relaxed text-sm font-medium">
                {user.grade <= 5 ? "Rất nhiều điều thú vị đang chờ em khám phá cùng Gia Sư Ảo." : user.grade >= 10 ? "Tập trung cao độ cho các kỳ thi quan trọng sắp tới cùng Gia Sư Ảo." : "Bạn đang làm rất tốt. Hãy tiếp tục khám phá những kiến thức mới cùng Gia Sư Ảo nhé."}
              </p>
              <button 
                onClick={() => setActiveTab('ai')}
                className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 hover:scale-105 transition-all shadow-md inline-flex items-center gap-2"
              >
                {user.grade <= 5 ? "Hỏi bạn Gia Sư" : "Hỏi AI ngay"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute right-0 top-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Quick Actions / Shortcuts */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">
              {user.grade <= 5 ? "Tìm nhanh" : "Hành động nhanh"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('library')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-800 mb-1">
                  {user.grade <= 5 ? "Tủ sách của em" : "Mở thư viện"}
                </h4>
                <p className="text-xs text-slate-500">
                  {user.grade <= 5 ? "Sách vở và truyện hay lớp học" : "Đọc và tải sách SGK các môn học"}
                </p>
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                  <Star className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-800 mb-1">
                  {user.grade <= 5 ? "Luyện tập vui" : "Luyện tập & Quiz"}
                </h4>
                <p className="text-xs text-slate-500">
                  {user.grade <= 5 ? "Làm bài kiểm tra nhận quà sao" : "Làm câu hỏi trắc nghiệm do AI tự tạo"}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Quests & Schedule */}
        <div className="space-y-6 relative">
          
          {/* Daily Quests Gamified Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                🎯 {user.grade <= 5 ? "Nhiệm vụ hôm nay" : "Nhiệm vụ học tập"}
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
                {completedCount === totalCount ? "Hoàn thành!" : `+${quests.filter(q => !q.completed).reduce((acc, q) => acc + q.xp, 0)} SP`}
              </span>
            </div>
            
            {/* Quest Completion Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Tiến trình</span>
                <span>{Math.round((completedCount / totalCount) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" 
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5 relative">
              {quests.map((quest) => (
                <div 
                  key={quest.id} 
                  onClick={() => handleToggleQuest(quest.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    quest.completed 
                      ? 'bg-slate-50/60 border-slate-100 opacity-70 hover:opacity-100' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm hover:bg-emerald-50/20'
                  }`}
                  title={quest.completed ? "Bấm để mở lại nhiệm vụ" : "Bấm để đánh dấu hoàn thành nhiệm vụ"}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleQuest(quest.id);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                      quest.completed 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 hover:border-emerald-500 bg-white'
                    }`}
                  >
                    {quest.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <span className={`text-xs flex-1 text-left ${quest.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-700 font-bold'}`}>
                    {quest.text}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(quest.tab);
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                      quest.completed
                        ? 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    }`}
                    title="Đi tới mục bài tập"
                  >
                    🪙 +{quest.xp} SP
                  </button>
                </div>
              ))}

              {/* Floating Confetti Particles */}
              {particles.map((p) => (
                <span 
                  key={p.id}
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: '6px',
                    height: '6px',
                    backgroundColor: p.color,
                    animation: 'float-up-particle 1.2s ease-out forwards',
                    animationDelay: `${p.delay}s`,
                    '--p-x': `${p.x}px`,
                    '--p-y': `${p.y}px`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>

          {/* Time Schedule Widget (Fully Interactive) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div 
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center justify-between mb-5 cursor-pointer group"
            >
              <h3 className="font-extrabold text-slate-800 group-hover:text-emerald-600 transition-colors">
                {user.grade <= 5 ? "Thời khóa biểu" : "Lịch học hôm nay"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-all border border-emerald-200/60">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>Quản lý lịch</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {todaySchedules.length === 0 ? (
                <div 
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="text-center py-6 border border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all"
                >
                  <p className="text-xs text-slate-400 font-medium">Hôm nay chưa có lịch học nào.</p>
                  <span className="text-xs font-bold text-emerald-600 mt-1 inline-block">+ Đặt lịch học mới</span>
                </div>
              ) : (
                todaySchedules.slice(0, 5).map((task) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-slate-50 border-slate-100 opacity-60'
                        : 'bg-slate-50/50 border-slate-100 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleScheduleItem(task.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-emerald-500 bg-white'
                      }`}
                      title={task.completed ? "Đánh dấu chưa học" : "Đánh dấu đã học xong"}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="w-12 text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-700">{task.time}</span>
                    </div>

                    <div 
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="flex-1 text-left min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className={`w-2 h-2 rounded-full ${task.color || 'bg-brand-500'}`} />
                        <h4 className={`font-bold text-xs text-slate-800 truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
                          {task.subject}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate leading-normal">{task.topic}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsScheduleModalOpen(true)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0"
                      title="Chỉnh sửa lịch học"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="w-full py-2 mt-2 text-center text-xs font-bold text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200/80 hover:border-emerald-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" /> Thêm hoặc sửa lịch học
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Manager Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        user={user}
        schedules={schedules}
        onSaveSchedules={handleSaveSchedules}
        onNavigateToTab={setActiveTab}
      />
    </div>
  );
}

