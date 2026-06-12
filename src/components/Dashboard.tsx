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

import { Sparkles, Trophy, Clock, BrainCircuit, ChevronLeft, ChevronRight, Target, Library as LibraryIcon, MessageSquare, Edit3, User as UserIcon, Lock, X } from 'lucide-react';

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
  const [isTrackerExpanded, setIsTrackerExpanded] = useState(true);
  const [activeSubject, setActiveSubject] = useState('Chung');
  const [showTrackerMobile, setShowTrackerMobile] = useState(() => localStorage.getItem('study_tracker_enabled_mobile') === 'true');

  useEffect(() => {
    const handleToggle = () => {
      setShowTrackerMobile(localStorage.getItem('study_tracker_enabled_mobile') === 'true');
    };
    window.addEventListener('study-tracker-widget-toggle', handleToggle);
    return () => window.removeEventListener('study-tracker-widget-toggle', handleToggle);
  }, []);

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

    window.addEventListener('study-tick', handleStudyTick);

    return () => {
      window.removeEventListener('study-tick', handleStudyTick);
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
        return <Progress user={user} setActiveTab={setActiveTab} />;
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
        <TopBar user={user} onLogout={onLogout} currentGrade={user.grade} onGradeChange={onGradeChange} />
        
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
            className={`fixed top-28 right-4 md:top-auto md:bottom-6 md:right-6 z-40 md:flex ${showTrackerMobile ? 'flex' : 'hidden md:flex'} items-center gap-2 md:gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 md:px-4 md:py-3 text-white shadow-2xl cursor-pointer select-none max-w-[calc(100vw-32px)]`}
            onClick={() => setIsTrackerExpanded(!isTrackerExpanded)}
          >
            {isTrackerExpanded ? (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative flex h-2.5 w-2.5 md:h-3 md:w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <BrainCircuit className="w-2.5 h-2.5 md:w-3 md:h-3 text-brand-400" /> Thời gian con đã học
                  </span>
                  <span className="text-[11px] md:text-xs font-semibold text-slate-200">
                    Đang học: <strong className="text-white">{activeTimer.subject}</strong> ({activeTimer.minutes.toString().padStart(2, '0')}m {activeTimer.seconds.toString().padStart(2, '0')}s)
                  </span>
                </div>
                <div className="text-slate-400 hover:text-white pl-0.5 md:pl-1 shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-2.5" title="Click để mở rộng chi tiết">
                <div className="relative flex h-2 w-2 md:h-2.5 md:w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 md:h-2.5 md:w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]"></span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[8px] md:text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Đã học
                  </span>
                  <span className="text-[11px] md:text-xs font-extrabold text-white tracking-wide font-mono">
                    {activeTimer.minutes.toString().padStart(2, '0')}:{activeTimer.seconds.toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="text-slate-400 hover:text-white pl-0.5 md:pl-1 shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
              </div>
            )}

            {/* Mobile close button to hide tracker widget */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTrackerMobile(false);
                localStorage.setItem('study_tracker_enabled_mobile', 'false');
                window.dispatchEvent(new Event('study-tracker-widget-toggle'));
              }}
              className="block md:hidden text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded shrink-0 ml-1"
              title="Tắt widget"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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
