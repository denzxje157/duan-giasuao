import React, { useState, useEffect } from 'react';
import { LogOut, Bell, Search, Clock, Flame, Timer, CheckCircle, Trophy } from 'lucide-react';
import { User as UserType } from '../../types';
import { getUserStats, API_BASE_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { getCachedStale, setCached } from '../../lib/cache';

interface TopBarProps {
  user: UserType;
  onLogout: () => void;
}

export default function TopBar({ user, onLogout }: TopBarProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [pomodoroLeft, setPomodoroLeft] = useState<number | null>(null);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const statsCacheKey = `gamification_stats_${user.isGuest ? 'guest' : (user.id || 'guest')}`;

  const [currentStreak, setCurrentStreak] = useState(() => {
    try {
      const cached = localStorage.getItem(statsCacheKey);
      if (cached) {
        const item = JSON.parse(cached);
        return item.data?.streak || 0;
      }
    } catch (e) {}
    return 0;
  });
  const [totalSP, setTotalSP] = useState(() => {
    try {
      const cached = localStorage.getItem(statsCacheKey);
      if (cached) {
        const item = JSON.parse(cached);
        return item.data?.total_sp || 0;
      }
    } catch (e) {}
    return 0;
  });

  useEffect(() => {
    const loadGuestStats = () => {
      // 1. Calculate guest SP from completed quests
      let questSpEarned = 0;
      const questKey = `ai_chat_quests_guest`;
      const savedQuests = localStorage.getItem(questKey);
      if (savedQuests) {
        try {
          const parsedQuests = JSON.parse(savedQuests);
          parsedQuests.forEach((q: any) => {
            if (q.completed) questSpEarned += q.xp;
          });
        } catch (e) {}
      }

      // 2. Calculate guest SP from messages
      let guestMsgCount = 0;
      let uniqueDays = new Set<string>();
      const localSessionsStr = localStorage.getItem('ai_chat_guest_sessions');
      if (localSessionsStr) {
        try {
          const groups = JSON.parse(localSessionsStr);
          groups.forEach((g: any) => {
            g.subjects.forEach((subGroup: any) => {
              subGroup.sessions.forEach((sess: any) => {
                const storedMsgsStr = localStorage.getItem(`ai_chat_guest_messages_${sess.session_id}`);
                if (storedMsgsStr) {
                  try {
                    const msgs = JSON.parse(storedMsgsStr);
                    guestMsgCount += msgs.length;
                  } catch (e) {}
                }
                if (sess.updated_at) {
                  const d = new Date(sess.updated_at);
                  const dateKey = d.toISOString().split('T')[0];
                  uniqueDays.add(dateKey);
                }
              });
            });
          });
        } catch (e) {}
      }

      let totalMins = guestMsgCount * 3;
      let totalSp = guestMsgCount * 15 + questSpEarned;
      let streak = uniqueDays.size || 0;

      // Add tracked time for guests
      try {
        const guestStatsCached = localStorage.getItem('gamification_stats_guest');
        if (guestStatsCached) {
          const parsedStats = JSON.parse(guestStatsCached);
          streak = parsedStats.streak || streak;
          totalSp = parsedStats.total_sp || totalSp;
          totalSp += questSpEarned; // re-add quest SP to the total SP
        }
      } catch (e) {}

      setTotalSP(totalSp);
      setCurrentStreak(streak);
    };

    // If logged in
    const fetchGamificationStats = async () => {
      if (user.isGuest) {
        loadGuestStats();
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
          setCurrentStreak(data.data.streak || 0);
          setTotalSP(data.data.total_sp || 0);
          setCached(statsCacheKey, data.data);
        }
      } catch (e) {
        console.error("Failed to fetch gamification stats for TopBar:", e);
      }
    };

    fetchGamificationStats();
    
    // Refresh stats when events occur
    const handleRefresh = () => {
      fetchGamificationStats();
    };
    
    window.addEventListener('sp-updated', handleRefresh);
    window.addEventListener('study-activity-tracked', handleRefresh);
    
    const interval = setInterval(fetchGamificationStats, 10000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('sp-updated', handleRefresh);
      window.removeEventListener('study-activity-tracked', handleRefresh);
    };
  }, [user]);

  useEffect(() => {
    if (user.isGuest && user.guestStartTime) {
      const MAX_GUEST_TIME = 3 * 60 * 1000;
      
      const updateTimer = () => {
        const elapsed = Date.now() - user.guestStartTime!;
        const remaining = Math.max(0, MAX_GUEST_TIME - elapsed);
        setTimeLeft(remaining);
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Pomodoro Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (pomodoroActive && pomodoroLeft !== null && pomodoroLeft > 0) {
      interval = setInterval(() => {
        setPomodoroLeft(prev => prev !== null ? prev - 1000 : null);
      }, 1000);
    } else if (pomodoroLeft === 0) {
      setPomodoroActive(false);
      setPomodoroLeft(null);
      // Play a sound or show a confetti if needed
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroLeft]);

  const togglePomodoro = () => {
    if (pomodoroActive) {
      setPomodoroActive(false);
      setPomodoroLeft(null);
    } else {
      setPomodoroLeft(25 * 60 * 1000); // 25 mins
      setPomodoroActive(true);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between py-3 md:py-4 px-4 md:px-6 bg-white border-b border-slate-100 gap-3 md:gap-4 shrink-0">
      {/* Top Row on Mobile: Greeting on left, Notifications + Avatar + Logout on right */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="min-w-0 pr-2">
          <h2 className="text-base md:text-xl font-bold text-slate-800 leading-tight truncate">
            Xin chào, {user.name} 👋
          </h2>
          <p className="text-xs md:text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-0.5 md:mt-0">
            <span className="truncate">
              {user.grade <= 5 ? "Hôm nay em muốn mình cùng học gì nào?" : user.grade >= 10 ? "Hôm nay bạn muốn học môn nào?" : "Hôm nay bạn muốn học gì nào?"}
            </span>
            {user.isGuest && (
               <span className="inline-flex items-center gap-1 text-[10px] md:text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold ml-1.5 shrink-0">
                 <Clock className="w-2.5 h-2.5" />
                 Còn {formatTime(timeLeft)}
               </span>
            )}
          </p>
        </div>

        {/* Mobile profile actions (Bell, Avatar, Logout) - hidden on desktop */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(prev => !prev)}
              className={`w-9 h-9 rounded-lg bg-slate-50 border flex items-center justify-center text-slate-500 transition-all relative ${notificationsOpen ? 'border-brand-500 text-brand-500 bg-brand-50/50' : 'border-slate-200 hover:text-brand-500 hover:border-brand-200'}`}
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white animate-pulse" />
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                <div className="absolute right-0 mt-2 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-brand-500" /> Thông báo học tập
                    </h4>
                    <button 
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[10px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md"
                    >
                      Đã đọc
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
                    <div className="p-2 bg-brand-50/40 rounded-xl border border-brand-100 text-[11px] font-semibold text-brand-900 leading-relaxed text-left">
                      ⏱️ <strong>Theo dõi song song:</strong> Hệ thống tự động ghi nhận thời gian tự học của bạn theo từng phút và tích lũy XP!
                    </div>
                    <div className="p-2 bg-orange-50/40 rounded-xl border border-orange-100 text-[11px] font-semibold text-orange-950 leading-relaxed text-left">
                      🔥 <strong>Chuỗi học tập:</strong> Học mỗi ngày ít nhất 5 phút để duy trì chuỗi liên tục và mở khóa Huy hiệu cực hiếm!
                    </div>
                    <div className="p-2 bg-indigo-50/40 rounded-xl border border-indigo-100 text-[11px] font-semibold text-indigo-950 leading-relaxed text-left">
                      🎯 <strong>Mảnh ghép điểm mù:</strong> Gia sư đang phân tích các kỹ năng của bạn. Hãy xem báo cáo chi tiết ở tab "Huy hiệu & Điểm mù"!
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-slate-200">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>

          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
      
      {/* Bottom Row on Mobile / Right side on Desktop: Search + Stats Badges + Desktop Actions */}
      <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài học..." 
            className="text-sm font-medium outline-none bg-transparent w-40 text-slate-700"
          />
        </div>

        {/* Gamification Star Points */}
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 shadow-sm font-bold text-[10px] md:text-xs shrink-0" title="Điểm sao tích lũy">
          <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 fill-amber-500 animate-bounce" />
          <span>{totalSP.toLocaleString()} SP</span>
        </div>

        {/* Gamification Streak */}
        <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 shadow-sm font-bold text-[10px] md:text-xs shrink-0" title="Chuỗi học tập liên tiếp">
          <Flame className="w-3 h-3 md:w-3.5 md:h-3.5 fill-orange-500 text-orange-500" />
          <span>{currentStreak} ngày</span>
        </div>

        {/* Pomodoro Focus Mode */}
        <button 
          onClick={togglePomodoro}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 font-bold text-[10px] md:text-sm shadow-sm transition-all border shrink-0 ${pomodoroActive ? 'bg-red-500 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
          title="Focus Mode (Pomodoro)"
        >
          <span>🍅</span>
          {pomodoroActive && pomodoroLeft !== null ? (
            <span className="w-9 md:w-10 text-center font-mono">{formatTime(pomodoroLeft)}</span>
          ) : (
            <span className="hidden xs:inline">Tập trung</span>
          )}
        </button>

        {/* Desktop actions (Bell dropdown, Divider, Class badge, Logout) - hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(prev => !prev)}
              className={`w-10 h-10 rounded-lg bg-slate-50 border flex items-center justify-center text-slate-500 transition-all relative ${notificationsOpen ? 'border-brand-500 text-brand-500 bg-brand-50/50' : 'border-slate-200 hover:text-brand-500 hover:border-brand-200'}`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </button>

            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)}></div>
                <div className="absolute right-0 mt-2 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-brand-500" /> Thông báo học tập
                    </h4>
                    <button 
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded-lg"
                    >
                      Đã đọc hết
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    <div className="p-2.5 bg-brand-50/40 rounded-xl border border-brand-100 text-xs font-semibold text-brand-900 leading-relaxed text-left">
                      ⏱️ <strong>Theo dõi song song:</strong> Hệ thống tự động ghi nhận thời gian tự học của bạn theo từng phút và tích lũy XP!
                    </div>
                    <div className="p-2.5 bg-orange-50/40 rounded-xl border border-orange-100 text-xs font-semibold text-orange-950 leading-relaxed text-left">
                      🔥 <strong>Chuỗi học tập:</strong> Học mỗi ngày ít nhất 5 phút để duy trì chuỗi liên tục và mở khóa Huy hiệu cực hiếm!
                    </div>
                    <div className="p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100 text-xs font-semibold text-indigo-950 leading-relaxed text-left">
                      🎯 <strong>Mảnh ghép điểm mù:</strong> Gia sư đang phân tích các kỹ năng của bạn. Hãy xem báo cáo chi tiết ở tab "Huy hiệu & Điểm mù"!
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 mx-1" />

          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 py-1.5 pl-1.5 pr-4.5 rounded-full cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs font-bold text-slate-700">Lớp {user.grade}</p>
          </div>

          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
