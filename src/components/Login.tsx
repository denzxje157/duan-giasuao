import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, ArrowRight, Mail, Lock, User as UserIcon, ChevronDown, AlertCircle } from 'lucide-react';
import { Grade } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (userData: { name: string; email: string; grade: Grade; role: 'student' | 'admin' }) => void;
  onGradeSelect?: (grade: Grade) => void;
}

export default function Login({ onLogin, onGradeSelect }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState<Grade>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLogin && onGradeSelect) {
      onGradeSelect(grade);
    } else if (onGradeSelect) {
        onGradeSelect(12); // Fallback to High School default for simple login view
    }
  }, [grade, isLogin, onGradeSelect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (email.trim() && password.trim()) {
      const isExpectedAdmin = email === 'admin@giasuao.com';
      const role = isExpectedAdmin ? 'admin' : 'student';
      
      try {
        if (isLogin) {
          // Attempt Login via Supabase
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });

          if (error) {
            setError(error.message || 'Đăng nhập thất bại');
            setIsLoading(false);
            return; // stop here, do not navigate
          }

          if (!data || !data.user) {
            setError('Đăng nhập thất bại');
            setIsLoading(false);
            return; // stop here, do not navigate
          }

          // Successful login -> proceed to onLogin/navigation
          onLogin({ name: role === 'admin' ? 'Administrator' : 'Học sinh', email, grade, role });
        } else {
          if (!name.trim() && !isExpectedAdmin) {
            throw new Error("Vui lòng nhập họ và tên");
          }
          
          // Attempt Signup via Supabase
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                grade: grade,
                role: role
              }
            }
          });

          if (error) {
            setError(error.message || 'Đăng ký thất bại');
            setIsLoading(false);
            return; // stop here, do not navigate
          }

          // Successful signup -> proceed
          onLogin({ name: isExpectedAdmin ? 'Administrator' : name, email, grade, role });
        }
      } catch (err: any) {
        // On unexpected exception, show error and abort navigation
        setError(err?.message || 'Đã có lỗi xảy ra. Hãy thử lại.');
        setIsLoading(false);
        return;
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotEmail.trim()) {
      setForgotMsg('Vui lòng nhập email hợp lệ');
      return;
    }
    try {
      setIsLoading(true);
      // call API via fetch to /forgot-password
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) throw new Error('Không thể gửi yêu cầu');
      setForgotMsg('Nếu tồn tại tài khoản, email đặt lại mật khẩu đã được gửi.');
    } catch (err: any) {
      setForgotMsg(err.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-slate-300/30 rounded-full blur-3xl pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-white rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col md:flex-row overflow-hidden relative z-10"
      >
        {/* Left branding */}
        <div className="md:w-1/2 bg-brand-500 p-12 text-white flex flex-col justify-between relative overflow-hidden hidden md:flex">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight">Gia Sư Ảo</span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold leading-[1.2] mb-6">
              Học tập thông minh <br /> cùng AI.
            </h1>
            <p className="text-brand-100 text-lg max-w-md">
              Môi trường học tập được cá nhân hóa, đồng hành cùng bạn mọi lúc mọi nơi từ lớp 1 đến 12.
            </p>
          </div>
          
          <div className="relative z-10">
            <p className="text-sm text-brand-200 font-medium tracking-wide">© 2026 Gia Sư Ảo AI</p>
          </div>
        </div>

        {/* Right Form */}
        <div className="md:w-1/2 p-8 sm:p-12 w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {isLogin ? 'Đăng nhập vào trạm' : 'Bắt đầu hành trình'}
            </h2>
            <p className="text-slate-500">
              {isLogin ? 'Chào mừng bạn quay trở lại với Gia Sư Ảo.' : 'Tạo tài khoản để cá nhân hóa việc học.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-xs font-semibold text-slate-600 block pl-1">Họ và tên</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      required={!isLogin}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800 disabled:opacity-50"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block pl-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@school.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800 disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block pl-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800 disabled:opacity-50"
                  disabled={isLoading}
                />
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-brand-600 hover:underline">Quên mật khẩu?</button>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-semibold text-slate-600 block pl-1">Bạn đang học lớp mấy?</label>
                  <div className="relative">
                    <select
                      value={grade}
                      onChange={(e) => setGrade(Number(e.target.value) as Grade)}
                      disabled={isLoading}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800 appearance-none disabled:opacity-50"
                    >
                      {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as Grade[]).map((g) => (
                        <option key={g} value={g}>Lớp {g}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 group active:scale-[0.98] transition-all shadow-xl shadow-brand-600/20 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {showForgot && (
            <div className="mt-6 p-4 border border-slate-100 rounded-xl bg-slate-50">
              <h3 className="font-semibold mb-2">Quên mật khẩu</h3>
              <form onSubmit={handleForgotSubmit} className="space-y-2">
                <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Nhập email của bạn" className="w-full p-3 rounded-xl border" />
                <div className="flex gap-2">
                  <button type="submit" disabled={isLoading} className="bg-brand-600 text-white px-4 py-2 rounded-xl">Gửi</button>
                  <button type="button" onClick={() => { setShowForgot(false); setForgotMsg(null); }} className="px-4 py-2 rounded-xl border">Đóng</button>
                </div>
                {forgotMsg && <p className="text-sm text-slate-600 mt-2">{forgotMsg}</p>}
              </form>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {isLogin ? "Bạn chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-brand-600 font-bold hover:underline"
              >
                {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
