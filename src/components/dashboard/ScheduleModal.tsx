import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Plus, Edit2, Trash2, Bell, BellOff, Clock, Check, X, BookOpen, AlertCircle, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import { User } from '../../types';

export interface ScheduleItem {
  id: string;
  subject: string;
  topic: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  color: string;
  notify: boolean;
  notifyMinutesBefore: number; // 0, 5, 15, 30
  completed: boolean;
}

const SUBJECT_OPTIONS = [
  "Toán học",
  "Ngữ văn",
  "Tiếng Anh",
  "Vật lí",
  "Hóa học",
  "Sinh học",
  "Lịch sử",
  "Địa lí",
  "Tin học",
  "Công nghệ",
  "Giáo dục Kinh tế và Pháp luật",
  "Khoa học tự nhiên",
  "Tự nhiên và Xã hội",
  "Đạo đức",
  "Khác"
];

const COLOR_OPTIONS = [
  { label: 'Tím', bg: 'bg-brand-500', text: 'text-brand-500', border: 'border-brand-500', light: 'bg-brand-50' },
  { label: 'Xanh ngọc', bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', light: 'bg-emerald-50' },
  { label: 'Hồng', bg: 'bg-rose-500', text: 'text-rose-500', border: 'border-rose-500', light: 'bg-rose-50' },
  { label: 'Cam', bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-500', light: 'bg-amber-50' },
  { label: 'Xanh dương', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', light: 'bg-blue-50' },
  { label: 'Tím đậm', bg: 'bg-purple-500', text: 'text-purple-500', border: 'border-purple-500', light: 'bg-purple-50' },
];

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  schedules: ScheduleItem[];
  onSaveSchedules: (updated: ScheduleItem[]) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  user,
  schedules,
  onSaveSchedules,
  onNavigateToTab
}: ScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [filter, setFilter] = useState<'all' | 'today' | 'completed'>('today');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('Toán học');
  const [customSubject, setCustomSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:00');
  const [color, setColor] = useState('bg-brand-500');
  const [notify, setNotify] = useState(true);
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState(5);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotification = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification("🔔 Đã bật thông báo lịch học!", {
          body: "Gia Sư AI sẽ thông báo nhắc nhở khi đến giờ học môn của bạn.",
          icon: "/favicon.ico"
        });
      }
    }
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setSubject('Toán học');
    setCustomSubject('');
    setTopic('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('08:00');
    setColor('bg-brand-500');
    setNotify(true);
    setNotifyMinutesBefore(5);
    setActiveTab('form');
  };

  const handleOpenEditForm = (item: ScheduleItem) => {
    setEditingId(item.id);
    if (SUBJECT_OPTIONS.includes(item.subject)) {
      setSubject(item.subject);
      setCustomSubject('');
    } else {
      setSubject('Khác');
      setCustomSubject(item.subject);
    }
    setTopic(item.topic);
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setTime(item.time);
    setColor(item.color || 'bg-brand-500');
    setNotify(item.notify ?? true);
    setNotifyMinutesBefore(item.notifyMinutesBefore ?? 5);
    setActiveTab('form');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = subject === 'Khác' ? (customSubject.trim() || 'Môn học') : subject;
    
    if (editingId) {
      const updated = schedules.map(s => s.id === editingId ? {
        ...s,
        subject: finalSubject,
        topic: topic.trim() || 'Học tập & Ôn bài',
        date,
        time,
        color,
        notify,
        notifyMinutesBefore
      } : s);
      onSaveSchedules(updated);
    } else {
      const newItem: ScheduleItem = {
        id: Date.now().toString(),
        subject: finalSubject,
        topic: topic.trim() || 'Học tập & Ôn bài',
        date,
        time,
        color,
        notify,
        notifyMinutesBefore,
        completed: false
      };
      onSaveSchedules([newItem, ...schedules]);
    }
    setActiveTab('list');
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa lịch học này không?")) {
      const updated = schedules.filter(s => s.id !== id);
      onSaveSchedules(updated);
    }
  };

  const handleToggleComplete = (id: string) => {
    const updated = schedules.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    onSaveSchedules(updated);
  };

  const handleToggleNotify = (id: string) => {
    const updated = schedules.map(s => s.id === id ? { ...s, notify: !s.notify } : s);
    onSaveSchedules(updated);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSchedules = schedules.filter(item => {
    if (filter === 'today') return item.date === todayStr;
    if (filter === 'completed') return item.completed;
    return true;
  }).sort((a, b) => {
    const dateTimeA = `${a.date || todayStr} ${a.time}`;
    const dateTimeB = `${b.date || todayStr} ${b.time}`;
    return dateTimeA.localeCompare(dateTimeB);
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm sm:text-lg truncate">
                  Quản lý Lịch học & Đặt lịch
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">Thêm, sửa, đặt giờ nhắc nhở học tập hàng ngày</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-slate-300 hover:text-white shrink-0 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Browser Notification Banner */}
          {notificationPermission !== 'granted' && (
            <div className="bg-amber-50 border-b border-amber-100 p-2.5 px-3.5 sm:p-3 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cho phép thông báo trình duyệt để Gia Sư AI tự động nhắc nhở khi tới giờ học.</span>
              </div>
              <button
                type="button"
                onClick={requestNotification}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 text-xs w-full sm:w-auto"
              >
                <Bell className="w-3.5 h-3.5" /> Bật thông báo
              </button>
            </div>
          )}

          {/* Top Bar / Navigation Tabs */}
          <div className="p-3 px-3.5 sm:p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === 'list'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                📋 Lịch học của tôi ({schedules.length})
              </button>
              <button
                onClick={handleOpenAddForm}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'form' && !editingId
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Thêm lịch mới
              </button>
            </div>

            {activeTab === 'list' && (
              <div className="flex items-center justify-between sm:justify-end gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
                <button
                  onClick={() => setFilter('today')}
                  className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg font-bold transition-all text-center ${
                    filter === 'today' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg font-bold transition-all text-center ${
                    filter === 'all' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg font-bold transition-all text-center ${
                    filter === 'completed' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Đã học
                </button>
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
            {activeTab === 'form' ? (
              /* FORM MODE (ADD / EDIT) */
              <form onSubmit={handleSaveForm} className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                    {editingId ? <Edit2 className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
                    {editingId ? "Chỉnh sửa lịch học" : "Tạo lịch học mới & Nhắc nhở"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Quay lại
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Môn học <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {SUBJECT_OPTIONS.map(subj => (
                        <option key={subj} value={subj}>{subj}</option>
                      ))}
                    </select>

                    {subject === 'Khác' && (
                      <input
                        type="text"
                        placeholder="Nhập tên môn học..."
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        className="mt-2 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    )}
                  </div>

                  {/* Topic / Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nội dung / Ghi chú bài học
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Ôn bài 12, Giải bài tập..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giờ bắt đầu học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Màu thẻ đánh dấu
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        type="button"
                        key={c.bg}
                        onClick={() => setColor(c.bg)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          color === c.bg
                            ? `${c.light} ${c.border} ${c.text} ring-2 ring-emerald-200`
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${c.bg}`} />
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-slate-800">Thông báo nhắc nhở giờ học</h5>
                        <p className="text-[10px] sm:text-[11px] text-slate-500">Phát âm thanh & thông báo khi tới giờ</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setNotify(!notify)}
                      className={`w-11 h-6 rounded-full p-1 transition-all shrink-0 ${notify ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${notify ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {notify && (
                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Nhắc nhở trước:</label>
                      <select
                        value={notifyMinutesBefore}
                        onChange={(e) => setNotifyMinutesBefore(Number(e.target.value))}
                        className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                      >
                        <option value={0}>Đúng giờ học (0 phút)</option>
                        <option value={5}>Trước 5 phút</option>
                        <option value={15}>Trước 15 phút</option>
                        <option value={30}>Trước 30 phút</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> {editingId ? "Cập nhật" : "Lưu lịch học"}
                  </button>
                </div>
              </form>
            ) : (
              /* LIST MODE */
              <div className="space-y-3 sm:space-y-4">
                {filteredSchedules.length === 0 ? (
                  <div className="text-center py-10 sm:py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                    <CalendarIcon className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-700 text-xs sm:text-sm mb-1">Chưa có lịch học nào trong danh sách</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 max-w-sm mx-auto mb-3.5">
                      {filter === 'today' ? "Hôm nay chưa có lịch học nào. Hãy lên kế hoạch ngay!" : "Chưa có dữ liệu lịch học."}
                    </p>
                    <button
                      onClick={handleOpenAddForm}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Thêm lịch học đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3">
                    {filteredSchedules.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 ${
                          item.completed
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Mobile Top Row: Checkbox & Time */}
                        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleToggleComplete(item.id)}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                                item.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 hover:border-emerald-500 bg-white'
                              }`}
                              title={item.completed ? "Đã học xong" : "Đánh dấu đã học"}
                            >
                              {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                            </button>

                            <div className="shrink-0 flex items-center sm:block gap-2 min-w-[55px]">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-800">{item.time}</span>
                              <span className="text-[10px] font-bold text-slate-400 block sm:inline">{item.date || todayStr}</span>
                            </div>
                          </div>

                          {/* Subject Color Pill on Mobile */}
                          <div className="flex items-center gap-1.5 sm:hidden">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.color || 'bg-brand-500'}`} />
                            <span className="text-xs font-bold text-slate-800">{item.subject}</span>
                          </div>
                        </div>

                        {/* Subject & Topic for Desktop / Topic for Mobile */}
                        <div className="flex-1 min-w-0 w-full">
                          <div className="hidden sm:flex items-center gap-2 mb-0.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${item.color || 'bg-brand-500'}`} />
                            <h4 className={`font-extrabold text-xs text-slate-800 truncate ${item.completed ? 'line-through text-slate-400' : ''}`}>
                              {item.subject}
                            </h4>
                            {item.notify && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5" /> Nhắc {item.notifyMinutesBefore}p
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${item.completed ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.topic}
                          </p>
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          {onNavigateToTab && !item.completed && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onNavigateToTab('ai');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all flex items-center gap-1 mr-auto sm:mr-0"
                              title="Hỏi AI môn này"
                            >
                              <BookOpen className="w-3 h-3" /> Học ngay
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleNotify(item.id)}
                            className={`p-1.5 sm:p-2 rounded-xl transition-all ${
                              item.notify
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                            title={item.notify ? "Đã bật nhắc nhở" : "Tắt nhắc nhở"}
                          >
                            {item.notify ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(item)}
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                            title="Sửa lịch học"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all"
                            title="Xóa lịch học"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
