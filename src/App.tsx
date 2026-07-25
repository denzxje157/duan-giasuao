/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import LandingPage from './components/LandingPage.tsx';
import { User, Grade } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [previewGrade, setPreviewGrade] = useState<Grade | undefined>(undefined);
  const [showGuestExpiredModal, setShowGuestExpiredModal] = useState(false);

  useEffect(() => {
    // Check for saved user data
    const savedUser = localStorage.getItem('virtual_tutor_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (!parsed.id || parsed.id === 'guest') {
          parsed.id = crypto.randomUUID();
          localStorage.setItem('virtual_tutor_user', JSON.stringify(parsed));
        }
        setUser(parsed);
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user?.isGuest && user.guestStartTime) {
      const MAX_GUEST_TIME = 30 * 60 * 1000; // 30 minutes for smooth testing/demo
      const checkSession = () => {
        if (Date.now() - user.guestStartTime! >= MAX_GUEST_TIME) {
          setShowGuestExpiredModal(true);
        }
      };
      checkSession();
      const interval = setInterval(checkSession, 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleOpenLogin = () => {
      handleLogout();
      setShowLogin(true);
    };
    window.addEventListener('open-login-prompt', handleOpenLogin);
    return () => window.removeEventListener('open-login-prompt', handleOpenLogin);
  }, []);

  const handleLogin = (userData: { id?: string; name: string; email: string; grade: Grade; role: 'student' | 'admin' }) => {
    const newUser: User = { ...userData };
    setUser(newUser);
    localStorage.setItem('virtual_tutor_user', JSON.stringify(newUser));
  };

  const handleGuestLogin = () => {
    const guestUser: User = {
      id: crypto.randomUUID(),
      name: 'Khách',
      email: '',
      grade: 12,
      role: 'student',
      isGuest: true,
      guestStartTime: Date.now()
    };
    setUser(guestUser);
    localStorage.setItem('virtual_tutor_user', JSON.stringify(guestUser));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout failed", e);
    }
    setUser(null);
    setShowLogin(false);
    localStorage.removeItem('virtual_tutor_user');
  };

  const handleGuestExpiredConfirm = () => {
    setShowGuestExpiredModal(false);
    handleLogout();
    setShowLogin(true);
  };

  const handleGradeChange = async (grade: Grade) => {
    if (user) {
      const updatedUser = { ...user, grade };
      setUser(updatedUser);
      localStorage.setItem('virtual_tutor_user', JSON.stringify(updatedUser));

      if (!user.isGuest && user.id) {
        try {
          await supabase.from('profiles').update({ grade }).eq('id', user.id);
        } catch (e) {
          console.error("Failed to update profile grade in db:", e);
        }
      }
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('virtual_tutor_user', JSON.stringify(updatedUser));
  };

  const getThemeLevel = (grade?: Grade) => {
    if (!grade) return 'high';
    if (grade >= 1 && grade <= 5) return 'primary';
    if (grade >= 6 && grade <= 9) return 'middle';
    return 'high';
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-level', getThemeLevel(user ? user.grade : previewGrade));
  }, [user?.grade, previewGrade]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-[#5A5A40] border-t-transparent rounded-full shadow-xl"
        />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#F5F5F0] selection:bg-[#5A5A40] selection:text-white overflow-x-hidden"
    >
      <AnimatePresence>
        {showGuestExpiredModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600 text-3xl">
                ⏱️
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hết giờ học thử</h3>
              <p className="text-slate-600 mb-6 font-medium">Thời gian 3 phút trải nghiệm đã kết thúc. Vui lòng đăng ký tài khoản để tiếp tục trò chuyện cùng Gia sư nhé!</p>
              <button 
                onClick={handleGuestExpiredConfirm}
                className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/30"
              >
                Đăng ký ngay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!user ? (
          showLogin ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Added a back button or way to return to landing? Login component usually takes full screen and could have a close button or we just wrap it with a back button. Let's just pass a prop if we want, or add a back button here */}
              <div className="relative">
                <button 
                  onClick={() => setShowLogin(false)}
                  className="absolute top-4 left-4 z-50 text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-1 bg-white/50 backdrop-blur px-3 py-1.5 rounded-full"
                >
                  &larr; Về trang chủ
                </button>
                <Login onLogin={handleLogin} onGradeSelect={setPreviewGrade} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <LandingPage onLoginClick={() => setShowLogin(true)} onGuestLogin={handleGuestLogin} />
            </motion.div>
          )
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Dashboard 
              user={user}
              onLogout={handleLogout}
              onGradeChange={handleGradeChange}
              onUserUpdate={handleUserUpdate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
