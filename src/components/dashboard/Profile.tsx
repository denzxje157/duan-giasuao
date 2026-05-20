import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Mail, User as UserIcon, Lock, KeyRound, Save, Activity, UploadCloud, MessageSquare, BookOpen, Key, Bell, Shield, Eye, EyeOff } from 'lucide-react';
import { User } from '../../types';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

export default function Profile({ user, onLogout }: ProfileProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
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
                    <span className="text-4xl font-bold text-slate-400">{user.name.charAt(0)}</span>
                 </div>
                 <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                 </div>
               </div>
               <h3 className="font-bold text-xl text-slate-800">{user.name}</h3>
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
                  <span className="text-xl font-extrabold text-slate-800">1,204</span>
               </div>
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                       <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-700 text-sm">Tài liệu đã đọc</span>
                  </div>
                  <span className="text-xl font-extrabold text-slate-800">45</span>
               </div>
               {user.role === 'admin' && (
                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                         <UploadCloud className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 text-sm">Sách đã nạp (RAG)</span>
                    </div>
                    <span className="text-xl font-extrabold text-slate-800">128</span>
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

              <div className="flex-1" />
              
              <div className="flex gap-4 pt-6 border-t border-slate-100 justify-end">
                <button type="button" onClick={onLogout} className="px-6 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
                  Đăng xuất
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2"
                >
                  {isSaved ? <Activity className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {isSaved ? 'Đã lưu thành công' : 'Lưu thay đổi'}
                </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
}
