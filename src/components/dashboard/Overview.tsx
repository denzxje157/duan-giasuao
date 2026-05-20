import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Zap, Target, BookOpen, Clock, Award, Star, Trophy, Flame, Calendar, PlayCircle } from 'lucide-react';
import { User, Grade } from '../../types';

interface OverviewProps {
  user: User;
  setActiveTab: (tab: string) => void;
}

const StatCard = ({ icon: Icon, label, value, subtext }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        <span className="text-xs font-medium text-slate-400">{subtext}</span>
      </div>
    </div>
  </div>
);

export default function Overview({ user, setActiveTab }: OverviewProps) {
  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Flame} label={user.grade <= 5 ? "Chuỗi chăm chỉ" : "Chuỗi học tập"} value="12" subtext="ngày liên tục" />
        <StatCard icon={Clock} label={user.grade <= 5 ? "Thời gian ở đây" : "Thời gian học"} value="45" subtext="giờ tuần này" />
        <StatCard icon={Target} label={user.grade <= 5 ? "Nhiệm vụ" : "Mục tiêu"} value="8/10" subtext="hoàn thành" />
        <StatCard icon={Trophy} label={user.grade <= 5 ? "Điểm sao" : "Điểm thưởng"} value="2,450" subtext="SP" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-600 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">
                {user.grade <= 5 ? "Cùng học thật vui nhé!" : user.grade >= 10 ? "Hướng tới mục tiêu!" : "Tiếp tục chặng đường!"}
              </h2>
              <p className="text-brand-100 max-w-sm mb-6 leading-relaxed">
                {user.grade <= 5 ? "Rất nhiều điều thú vị đang chờ em khám phá cùng Gia Sư Ảo." : user.grade >= 10 ? "Tập trung cao độ cho các kỳ thi quan trọng sắp tới cùng Gia Sư Ảo." : "Bạn đang làm rất tốt. Hãy tiếp tục khám phá những kiến thức mới cùng Gia Sư Ảo nhé."}
              </p>
              <button 
                onClick={() => setActiveTab('ai')}
                className="bg-white text-brand-600 px-6 py-2.5 rounded-xl font-bold hover:bg-brand-50 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {user.grade <= 5 ? "Hỏi bạn Gia Sư" : "Hỏi AI ngay"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {/* Abstract Shapes */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute right-20 bottom-0 w-48 h-48 bg-brand-500/30 rounded-full blur-2xl translate-y-1/3" />
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 tracking-tight">
              {user.grade <= 5 ? "Tìm nhanh" : "Hành động nhanh"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setActiveTab('library')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">
                  {user.grade <= 5 ? "Tủ sách của em" : "Mở thư viện"}
                </h4>
                <p className="text-sm text-slate-500">
                  {user.grade <= 5 ? "Sách vở và truyện hay" : "Đọc và tải sách SGK các môn"}
                </p>
              </button>

              <button
                onClick={() => setActiveTab('audio')}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 mb-1">
                  {user.grade <= 5 ? "Nghe kể chuyện" : "Nghe bài giảng"}
                </h4>
                <p className="text-sm text-slate-500">
                  {user.grade <= 5 ? "Vừa học vừa nghe" : "Học qua âm thanh tiện lợi"}
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">
                {user.grade <= 5 ? "Thời khóa biểu" : "Lịch học hôm nay"}
              </h3>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="space-y-4">
              {[
                { time: '08:00', title: 'Toán học', desc: 'Giải bài tập phương trình', color: 'bg-brand-500' },
                { time: '10:30', title: 'Ngữ văn', desc: 'Đọc hiểu văn bản', color: 'bg-rose-500' },
                { time: '14:00', title: 'Tiếng Anh', desc: 'Luyện nghe IELTS', color: 'bg-emerald-500' },
              ].map((task, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className="w-12 text-right pt-1 shrink-0">
                    <span className="text-xs font-bold text-slate-500">{task.time}</span>
                  </div>
                  <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${task.color}`} />
                      <h4 className="font-semibold text-sm text-slate-800">{task.title}</h4>
                    </div>
                    <p className="text-xs text-slate-500 ml-4">{task.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
