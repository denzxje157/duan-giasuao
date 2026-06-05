import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './dashboard/Sidebar.tsx';
import TopBar from './dashboard/TopBar.tsx';
import Overview from './dashboard/Overview.tsx';
import AIChat from './dashboard/AIChat.tsx';
import Library from './dashboard/Library.tsx';
import AdminPanel from './dashboard/AdminPanel.tsx';
import Progress from './dashboard/Progress.tsx';
import Profile from './dashboard/Profile.tsx';
import Quiz from './dashboard/Quiz.tsx';
import Workspace from './dashboard/Workspace.tsx';
import { User, Grade } from '../types';
import { useStudyTracker } from '../hooks/useStudyTracker';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onGradeChange: (grade: Grade) => void;
  onUserUpdate?: (user: User) => void;
}

export interface WorkspaceConfig {
  url: string;
  title: string;
  grade: string | number;
  subject: string;
}

import { Sparkles, Trophy, Clock, BrainCircuit, ChevronLeft, ChevronRight, Target, Library as LibraryIcon, MessageSquare, Edit3, User as UserIcon, Lock } from 'lucide-react';

export default function Dashboard({ user, onLogout, onGradeChange, onUserUpdate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig | null>(null);

  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (user && !user.isGuest && user.id) {
      const checkLockStatus = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          if (data && data.full_name) {
            const parts = data.full_name.split('|');
            const hasLocked = parts.some(p => p.trim() === 'status:locked');
            if (hasLocked) {
              setIsLocked(true);
            } else {
              setIsLocked(false);
            }
          }
        } catch (e) {
          console.error("Failed to check lock status:", e);
        }
      };
      checkLockStatus();
      
      const interval = setInterval(checkLockStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // States for parallel study tracking UI
  const [activeTimer, setActiveTimer] = useState<{ sessionSeconds: number; minutes: number; seconds: number; subject: string } | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; subjectName: string; visible: boolean } | null>(null);
  const [isTrackerExpanded, setIsTrackerExpanded] = useState(true);
  const [activeSubject, setActiveSubject] = useState('Chung');

  // Dynamically determine default subject based on activeTab
  useEffect(() => {
    if (activeTab === 'home') setActiveSubject('Chung');
    else if (activeTab === 'library') setActiveSubject('Tủ sách');
    else if (activeTab === 'workspace') setActiveSubject(workspaceConfig?.subject || 'Tài liệu');
    else if (activeTab === 'progress') setActiveSubject('Chung');
    else if (activeTab === 'profile') setActiveSubject('Chung');
  }, [activeTab, workspaceConfig]);

  // Run study tracker globally at the root
  useStudyTracker(user, activeSubject);

  useEffect(() => {
    const handleStudyTick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveTimer({
        sessionSeconds: detail.sessionSeconds,
        minutes: detail.minutes,
        seconds: detail.seconds,
        subject: detail.subject
      });
    };

    const handleXpEarned = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setXpToast({
        xp: detail.xp,
        subjectName: detail.subjectName,
        visible: true
      });
      
      // Auto hide toast after 4 seconds
      const timeout = setTimeout(() => {
        setXpToast(prev => prev ? { ...prev, visible: false } : null);
      }, 4000);

      return () => clearTimeout(timeout);
    };

    window.addEventListener('study-tick', handleStudyTick);
    window.addEventListener('study-xp-earned', handleXpEarned);

    return () => {
      window.removeEventListener('study-tick', handleStudyTick);
      window.removeEventListener('study-xp-earned', handleXpEarned);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Overview user={user} setActiveTab={setActiveTab} />;
      case 'ai':
        return <AIChat user={user} onGradeChange={onGradeChange} onSubjectChange={setActiveSubject} />;
      case 'library':
        return <Library currentGrade={user.grade} setActiveTab={setActiveTab} user={user} onOpenWorkspace={(cfg) => { setWorkspaceConfig(cfg); setActiveTab('workspace'); }} />;
      case 'workspace':
        return <Workspace user={user} setActiveTab={setActiveTab} config={workspaceConfig} />;
      case 'quiz':
        return <Quiz user={user} onSubjectChange={setActiveSubject} />;
      case 'admin':
        return <AdminPanel />;
      case 'progress':
        return <Progress user={user} />;
      case 'profile':
        return <Profile user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-2 border-dashed border-slate-300 rounded-full" />
             </div>
             <p className="text-slate-500 text-lg font-medium">Tính năng này đang được phát triển...</p>
          </div>
        );
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 w-full h-full">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Tài khoản đã bị khóa</h3>
            <p className="text-sm text-slate-400 font-medium">Tài khoản của bạn tạm thời bị khóa bởi Quản trị viên do vi phạm điều khoản hoặc nghi ngờ bất thường.</p>
          </div>
          <button 
            onClick={onLogout}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <Sidebar 
        currentGrade={user.grade} 
        onGradeChange={onGradeChange} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        user={user}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} onLogout={onLogout} />
        
        <main className={`flex-1 overflow-y-auto ${activeTab === 'workspace' ? '' : 'p-4 md:p-8 pb-24 lg:pb-8'} custom-scrollbar`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + user.grade}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`h-full w-full ${activeTab === 'workspace' ? '' : 'max-w-7xl mx-auto'}`}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Parallel Study Tracker Indicator */}
      <AnimatePresence>
        {activeTimer && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-2xl cursor-pointer select-none"
            onClick={() => setIsTrackerExpanded(!isTrackerExpanded)}
          >
            {isTrackerExpanded ? (
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <BrainCircuit className="w-3 h-3 text-brand-400" /> Thời gian con đã học
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    Đang học: <strong className="text-white">{activeTimer.subject}</strong> ({activeTimer.minutes.toString().padStart(2, '0')}m {activeTimer.seconds.toString().padStart(2, '0')}s)
                  </span>
                </div>
                <div className="text-slate-400 hover:text-white pl-1 shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5" title="Click để mở rộng chi tiết">
                <div className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Đã học
                  </span>
                  <span className="text-xs font-extrabold text-white tracking-wide font-mono">
                    {activeTimer.minutes.toString().padStart(2, '0')}:{activeTimer.seconds.toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="text-slate-400 hover:text-white pl-1 shrink-0">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated XP Toast Notification popup */}
      <AnimatePresence>
        {xpToast && xpToast.visible && (
          <motion.div
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 24, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed left-1/2 top-0 z-[100] transform flex items-center gap-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-6 py-4.5 rounded-2xl border border-brand-400/20 shadow-2xl shadow-brand-500/20"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-yellow-300 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                +{xpToast.xp} XP Thưởng! <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              </h4>
              <p className="text-xs font-semibold text-brand-100 mt-0.5">
                Đã ghi nhận 1 phút tự học môn {xpToast.subjectName}. Hệ thống đang liên tục phân tích Điểm mù.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      {activeTab !== 'workspace' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-8px_30px_rgb(0,0,0,0.06)]">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all relative ${activeTab === 'home' ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Target className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">{user.grade <= 5 ? "Trang chủ" : "Tổng quan"}</span>
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all relative ${activeTab === 'library' ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LibraryIcon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Tủ sách</span>
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all relative ${activeTab === 'ai' ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500"></span>
              </span>
            </div>
            <span className="text-[10px] tracking-tight">{user.grade <= 5 ? "Hỏi Gia Sư" : "Gia sư AI"}</span>
          </button>
          <button 
            onClick={() => setActiveTab('quiz')}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all relative ${activeTab === 'quiz' ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Edit3 className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Luyện tập</span>
          </button>
          <button 
            onClick={() => setActiveTab('progress')}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all relative ${activeTab === 'progress' ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Điểm mù</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all relative ${activeTab === 'profile' ? 'text-brand-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Cá nhân</span>
          </button>
        </div>
      )}
    </div>
  );
}
