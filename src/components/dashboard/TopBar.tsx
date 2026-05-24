import React, { useState, useEffect } from 'react';
import { LogOut, Bell, Search, Clock, Flame, Timer, CheckCircle } from 'lucide-react';
import { User as UserType } from '../../types';

interface TopBarProps {
  user: UserType;
  onLogout: () => void;
}

export default function TopBar({ user, onLogout }: TopBarProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [pomodoroLeft, setPomodoroLeft] = useState<number | null>(null);
  const [pomodoroActive, setPomodoroActive] = useState(false);

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
    <header className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-100">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 leading-tight">
            Xin chào, {user.name} 👋
          </h2>
          <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
            {user.grade <= 5 ? "Hôm nay em muốn mình cùng học gì nào?" : user.grade >= 10 ? "Hôm nay bạn muốn học môn nào?" : "Hôm nay bạn muốn học gì nào?"}
            {user.isGuest && (
               <span className="inline-flex items-center gap-1 text-[11px] bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-bold ml-2">
                 <Clock className="w-3 h-3" />
                 Còn {formatTime(timeLeft)}
               </span>
            )}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài học..." 
            className="text-sm font-medium outline-none bg-transparent w-48 text-slate-700"
          />
        </div>

        {/* Gamification Streak */}
        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-full px-3 py-1.5 shadow-sm" title="Streak liên tiếp">
          <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
          <span className="text-sm font-bold">12</span>
        </div>

        {/* Pomodoro Focus Mode */}
        <button 
          onClick={togglePomodoro}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-sm shadow-sm transition-all border ${pomodoroActive ? 'bg-red-500 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
          title="Focus Mode (Pomodoro)"
        >
          <span>🍅</span>
          {pomodoroActive && pomodoroLeft !== null ? (
            <span className="w-10 text-center font-mono">{formatTime(pomodoroLeft)}</span>
          ) : (
            <span className="hidden sm:inline">Tập trung</span>
          )}
        </button>

        <button className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand-500 hover:border-brand-200 transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block" />

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 py-1.5 pl-1.5 pr-4 rounded-full cursor-pointer hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-700">Lớp {user.grade}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
