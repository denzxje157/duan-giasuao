import React, { useState } from 'react';
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
import { useStudyTracker } from '../hooks/useStudyTracker.ts';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onGradeChange: (grade: Grade) => void;
}

export default function Dashboard({ user, onLogout, onGradeChange }: DashboardProps) {
  const [activeTab, setActiveTab] = useState(user.role === 'admin' ? 'admin' : 'library');
  
  useStudyTracker(user, activeTab === 'ai' ? 'Trò chuyện AI' : activeTab === 'quiz' ? 'Luyện tập' : 'Chung');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Overview user={user} setActiveTab={setActiveTab} />;
      case 'ai':
        return <AIChat user={user} />;
      case 'library':
        return <Library currentGrade={user.grade} setActiveTab={setActiveTab} user={user} />;
      case 'workspace':
        return <Workspace user={user} setActiveTab={setActiveTab} />;
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
    </div>
  );
}
