import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Mail, User as UserIcon, Lock, KeyRound, Save, Activity, UploadCloud, MessageSquare, BookOpen, Key, Bell, Shield, Eye, EyeOff, Settings, BrainCircuit } from 'lucide-react';
import { User } from '../../types';
import { supabase } from '../../lib/supabase';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
}

export default function Profile({ user, onLogout, onUserUpdate }: ProfileProps) {
  // Unpack settings from user.name (e.g. Name|goal:30|style:practice|notif:true)
  const nameParts = user.name.split('|');
  const initialName = nameParts[0].trim();
  let initialGoal = '30';
  let initialStyle = 'practice';
  let initialNotif = true;

  for (let i = 1; i < nameParts.length; i++) {
    const part = nameParts[i].trim();
    if (part.startsWith('goal:')) {
      initialGoal = part.replace('goal:', '');
    } else if (part.startsWith('style:')) {
      initialStyle = part.replace('style:', '');
    } else if (part.startsWith('notif:')) {
      initialNotif = part.replace('notif:', '') === 'true';
    }
  }

  const [name, setName] = useState(initialName);
  const [dailyGoal, setDailyGoal] = useState(initialGoal);
  const [learningStyle, setLearningStyle] = useState(initialStyle);
  const [notifications, setNotifications] = useState(initialNotif);
  const [showTrackerWidget, setShowTrackerWidget] = useState(() => localStorage.getItem('study_tracker_enabled_mobile') === 'true');

  useEffect(() => {
    const handleToggle = () => {
      setShowTrackerWidget(localStorage.getItem('study_tracker_enabled_mobile') === 'true');
    };
    window.addEventListener('study-tracker-widget-toggle', handleToggle);
    return () => window.removeEventListener('study-tracker-widget-toggle', handleToggle);
  }, []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stats, setStats] = useState({ questionsCount: 0, docsCount: 0 });

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user.isGuest || !user.id) return;
      try {
        const [historyRes, docsRes] = await Promise.all([
          supabase
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
        ]);
        setStats({
          questionsCount: historyRes.count || 0,
          docsCount: docsRes.count || 0
        });
      } catch (err) {
        console.error("Error fetching user stats:", err);
      }
    };
    fetchUserStats();
  }, [user.id, user.isGuest]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanGoal = dailyGoal && !isNaN(Number(dailyGoal)) && Number(dailyGoal) > 0 ? dailyGoal : '30';
      const packedParts = [name];
      packedParts.push(`goal:${cleanGoal}`);
      packedParts.push(`style:${learningStyle}`);
      packedParts.push(`notif:${notifications}`);
      
      // Keep status:locked if it was already in name
      const hasLocked = nameParts.some(p => p.trim() === 'status:locked');
      if (hasLocked) {
        packedParts.push('status:locked');
      }

      const packedName = packedParts.join('|');

      if (!user.isGuest && user.id) {
        // Update Supabase profiles
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: packedName })
          .eq('id', user.id);

        if (error) throw error;

        // Change password if filled
        if (newPassword) {
          if (!currentPassword) {
            alert("Vui lòng nhập mật khẩu hiện tại để thay đổi mật khẩu mới.");
            setIsSaving(false);
            return;
          }
          const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
          if (authError) throw authError;
          alert("Thay đổi mật khẩu thành công!");
          setCurrentPassword('');
          setNewPassword('');
        }
      }

      // Update global React & LocalStorage state
      if (onUserUpdate) {
        onUserUpdate({
          ...user,
          name: packedName
        });
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật hồ sơ: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Hồ sơ cá nhân</h2>
           <p className="text-slate-500 font-medium">Quản lý thông tin tài khoản và xem thống kê hoạt động.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          {/* Avatar Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-brand-500 to-brand-500 z-0" />
             <div className="relative z-10 pt-10">
               <div className="w-24 h-24 rounded-full mx-auto bg-white p-1 shadow-xl mb-4 relative cursor-pointer">
                 <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    <span className="text-4xl font-bold text-slate-400">{name.charAt(0)}</span>
                 </div>
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                 </div>
               </div>
               <h3 className="font-bold text-xl text-slate-800">{name}</h3>
               <p className="text-sm font-medium text-slate-500 mb-4">{user.email}</p>
               
               <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                 {user.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                 {user.role === 'admin' ? 'Quản trị viên' : `Học sinh Lớp ${user.grade}`}
               </div>
             </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
             <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-brand-500" /> Thống kê hoạt động
             </h4>
             <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                       <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Câu hỏi đã hỏi</span>
                  </div>
                  <span className="text-xl font-extrabold text-slate-800">{user.isGuest ? 0 : stats.questionsCount}</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                       <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Tài liệu đã đọc</span>
                  </div>
                  <span className="text-xl font-extrabold text-slate-800">{user.isGuest ? 0 : stats.docsCount}</span>
               </div>
               {user.role === 'admin' && (
                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                         <UploadCloud className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">Sách hệ thống</span>
                    </div>
                    <span className="text-xl font-extrabold text-slate-800">12</span>
                 </div>
               )}
             </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
           <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 flex flex-col h-full">
              <h3 className="font-bold text-xl text-slate-800 mb-2 border-b border-slate-100 pb-4 flex items-center gap-2">
                 <UserIcon className="w-5 h-5 text-slate-400" /> Cập nhật Thông tin
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Họ và tên</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none font-medium text-slate-500 cursor-not-allowed opacity-80"
                    />
                  </div>
                </div>
              </div>

              {/* Personalization Section */}
              <div className="pt-6 border-t border-slate-100 space-y-6">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                   <Settings className="w-5 h-5 text-slate-400" /> Cá nhân hóa học tập
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Daily Goal */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block">Mục tiêu học tập hàng ngày</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {['15', '30', '45', '60'].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setDailyGoal(time)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                            dailyGoal === time 
                              ? 'bg-brand-600 text-white border-brand-600 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-200'
                          }`}
                        >
                          {time} phút
                        </button>
                      ))}

                      {/* Custom input */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          placeholder="Tự chọn"
                          value={!['15', '30', '45', '60'].includes(dailyGoal) ? dailyGoal : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setDailyGoal(val);
                          }}
                          className={`w-20 py-2.5 px-3 rounded-xl text-xs font-bold border outline-none text-center transition-all ${
                            !['15', '30', '45', '60'].includes(dailyGoal) && dailyGoal
                              ? 'bg-brand-600 text-white border-brand-600 placeholder-white/70 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 placeholder-slate-400 focus:border-brand-300'
                          }`}
                        />
                        <span className="text-xs font-semibold text-slate-500">phút</span>
                      </div>
                    </div>
                  </div>

                  {/* Notifications Toggle */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block">Thông báo & Nhắc nhở</label>
                    <button
                      type="button"
                      onClick={() => setNotifications(!notifications)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                        notifications 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{notifications ? 'Bật nhắc nhở học tập hàng ngày' : 'Tắt nhắc nhở'}</span>
                      <Bell className={`w-4 h-4 ${notifications ? 'text-emerald-600 fill-emerald-600/10' : 'text-slate-400'}`} />
                    </button>
                  </div>

                  {/* Study Tracker Widget Toggle */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-700 block">Bảng "Đã học" di động</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !showTrackerWidget;
                        setShowTrackerWidget(nextVal);
                        localStorage.setItem('study_tracker_enabled_mobile', String(nextVal));
                        window.dispatchEvent(new Event('study-tracker-widget-toggle'));
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                        showTrackerWidget 
                          ? 'bg-brand-50 text-brand-700 border-brand-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{showTrackerWidget ? 'Đang hiện Widget Theo dõi' : 'Đang ẩn Widget Theo dõi'}</span>
                      <BrainCircuit className={`w-4 h-4 ${showTrackerWidget ? 'text-brand-600' : 'text-slate-400'}`} />
                    </button>
                  </div>
                </div>

                {/* Learning Style */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 block">Phong cách học tập</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'theory', name: 'Lý thuyết', desc: 'Học sâu qua bản chất khái niệm, định nghĩa và ví dụ cặn kẽ.', icon: BookOpen, color: 'text-amber-500 bg-amber-50 border-amber-100' },
                      { id: 'practice', name: 'Thực hành', desc: 'Học qua bài tập, câu hỏi gợi mở theo phương pháp Socratic.', icon: Activity, color: 'text-brand-500 bg-brand-50 border-brand-100' },
                      { id: 'concise', name: 'Ngắn gọn', desc: 'Học nhanh qua tóm tắt cô đọng và gạch đầu dòng trực tiếp.', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' }
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setLearningStyle(style.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                          learningStyle === style.id 
                            ? 'border-brand-500 ring-2 ring-brand-500/10 bg-brand-50/20' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.color}`}>
                          <style.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{style.name}</div>
                          <div className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">{style.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Password section */}
              {!user.isGuest && (
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                     <KeyRound className="w-5 h-5 text-slate-400" /> Đổi mật khẩu
                  </h3>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 block">Mật khẩu hiện tại</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-12 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                           {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 block">Mật khẩu mới</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input 
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-12 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1" />
              
              <div className="flex gap-4 pt-6 border-t border-slate-100 justify-end mt-8">
                <button type="button" onClick={onLogout} className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
                  Đăng xuất
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2"
                >
                  {isSaving ? <Activity className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isSaved ? 'Đã lưu thành công' : isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
}
