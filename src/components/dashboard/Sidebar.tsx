import React from 'react';
import { Layout, ChevronDown, BookOpen, Library, Trophy, MessageSquare, Headphones, FileText, Target, Settings, User as UserIcon } from 'lucide-react';
import { Grade, User } from '../../types';

interface SidebarProps {
  currentGrade: Grade;
  onGradeChange: (grade: Grade) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
}

const NavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? "bg-brand-500 text-white shadow-md shadow-brand-500/20 font-semibold" 
        : "text-slate-500 hover:bg-slate-100 font-medium"
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm">{label}</span>
  </button>
);

export default function Sidebar({ currentGrade, onGradeChange, activeTab, setActiveTab, user }: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 flex-col gap-6 py-6 px-4 bg-white border-r border-slate-100 h-full">
      <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => setActiveTab('home')}>
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white">
          <Layout className="w-4 h-4" />
        </div>
        <span className="text-lg font-bold text-slate-800 tracking-tight">Gia Sư Ảo</span>
      </div>

      <div className="space-y-1.5 px-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Trình độ</label>
        <div className="relative group">
          <select 
            value={currentGrade}
            onChange={(e) => onGradeChange(parseInt(e.target.value) as Grade)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold appearance-none outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 cursor-pointer text-slate-700"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>Lớp {i+1}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        <NavItem 
          icon={Target} 
          label={currentGrade <= 5 ? "Trang chủ" : "Tổng quan"} 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
        />
        <NavItem 
          icon={Library} 
          label={currentGrade <= 5 ? "Tủ sách" : currentGrade >= 10 ? "Tài liệu học tập" : "Tủ sách tri thức"} 
          active={activeTab === 'library'} 
          onClick={() => setActiveTab('library')} 
        />
        <NavItem 
          icon={MessageSquare} 
          label={currentGrade <= 5 ? "Hỏi Gia Sư" : currentGrade >= 10 ? "Trợ lý AI" : "Gia sư AI"} 
          active={activeTab === 'ai'} 
          onClick={() => setActiveTab('ai')} 
        />
        <NavItem 
          icon={Headphones} 
          label={currentGrade <= 5 ? "Kẻ chuyện" : currentGrade >= 10 ? "Học qua âm thanh" : "Sách nói"} 
          active={activeTab === 'audio'} 
          onClick={() => setActiveTab('audio')} 
        />
        <NavItem 
          icon={Trophy} 
          label={currentGrade <= 5 ? "Huy hiệu" : currentGrade >= 10 ? "Phân tích học tập" : "Thành tích & Tiến độ"} 
          active={activeTab === 'progress'} 
          onClick={() => setActiveTab('progress')} 
        />
        <NavItem 
          icon={UserIcon} 
          label={currentGrade <= 5 ? "Thông tin của em" : "Hồ sơ cá nhân"} 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
        />
        
        {user.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavItem icon={Settings} label="Admin / Cài đặt" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
          </div>
        )}
      </nav>
    </aside>
  );
}
