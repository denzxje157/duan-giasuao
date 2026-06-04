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

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onGradeChange: (grade: Grade) => void;
}

export interface WorkspaceConfig {
  url: string;
  title: string;
  grade: string | number;
  subject: string;
}

import { Sparkles, Trophy, Clock, BrainCircuit } from 'lucide-react';

export default function Dashboard({ user, onLogout, onGradeChange }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig | null>(null);

  // States for parallel study tracking UI
  const [activeTimer, setActiveTimer] = useState<{ sessionSeconds: number; minutes: number; seconds: number; subject: string } | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; subjectName: string; visible: boolean } | null>(null);

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
        return <AIChat user={user} onGradeChange={onGradeChange} />;
      case 'library':
        return <Library currentGrade={user.grade} setActiveTab={setActiveTab} user={user} onOpenWorkspace={(cfg) => { setWorkspaceConfig(cfg); setActiveTab('workspace'); }} />;
      case 'workspace':
        return <Workspace user={user} setActiveTab={setActiveTab} config={workspaceConfig} />;
      case 'quiz':
        return <Quiz user={user} />;
      case 'admin':
        return <AdminPanel />;
      case 'progress':
        return <Progress user={user} />;
      case 'profile':
        return <Profile user={user} onLogout={onLogout} />;
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
        
        <main className={`flex-1 overflow-y-auto ${activeTab === 'workspace' ? '' : 'p-4 md:p-8'} custom-scrollbar`}>
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
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-2xl"
          >
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129)]"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-brand-400" /> Hệ thống chạy song song
              </span>
              <span className="text-xs font-semibold text-slate-200">
                Đang học: <strong className="text-white">{activeTimer.subject}</strong> ({activeTimer.minutes.toString().padStart(2, '0')}m {activeTimer.seconds.toString().padStart(2, '0')}s)
              </span>
            </div>
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
    </div>
  );
}
