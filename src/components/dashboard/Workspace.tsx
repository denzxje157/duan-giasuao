import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Sparkles, User, Bot, Maximize2, Minimize2, Settings, ArrowLeft, Mic, Volume2, Wand2, Timer, Play, Pause, RotateCcw, BookOpen, Plus, Paperclip, HardDrive, Image as ImageIcon, Library } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User as UserType } from '../../types';
import { uploadDocument, API_BASE_URL } from '../../lib/api';

// Markdown & Math
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Demo PDF implementation
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface WorkspaceProps {
  user: UserType;
  setActiveTab?: (tab: string) => void;
  config?: {
    url: string;
    title: string;
    grade: string | number;
    subject: string;
  } | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Workspace({ user, setActiveTab, config }: WorkspaceProps) {
  // Theme is handled globally via CSS variables and brand classes
  const theme = { bg: 'bg-brand-600', text: 'text-brand-600', border: 'border-brand-200', light: 'bg-brand-50' };

  const pdfUrl = config?.url || "";
  const displayTitle = config?.title || "Chương 2: Hàm số bậc nhất và bậc hai";
  const displayGrade = config?.grade || user.grade;


  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: user.grade <= 5 
        ? `Chào ${user.name}! Mình là bạn Gia Sư. Trong lúc đọc truyện hay học bài, có gì khó hiểu cậu cứ hỏi mình nhé!` 
        : `Chào ${user.name}! Mình là Gia sư AI. Trong quá trình đọc sách, nếu có đoạn nào chưa hiểu hoặc cần giải đáp, bạn cứ hỏi mình nhé.\n\nVí dụ về công thức Toán: Hãy thử hỏi mình về phương trình bậc 2 hoặc công thức tính diện tích.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Pomodoro State
  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const [showTimerSettings, setShowTimerSettings] = useState(false);

  // STT State
  const [isRecording, setIsRecording] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      // Auto switch mode
      if (timerMode === 'work') {
        setTimerMode('break');
        setTimeLeft(BREAK_TIME);
      } else {
        setTimerMode('work');
        setTimeLeft(WORK_TIME);
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, timerMode]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerMode === 'work' ? WORK_TIME : BREAK_TIME);
  };
  const switchTimerMode = (mode: 'work' | 'break') => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // TTS Logic
  const handleTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      window.speechSynthesis.speak(utterance);
    }
  };

  // STT Logic Map
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
        // Mock recording end after 3 seconds
        setTimeout(() => {
            setIsRecording(false);
            handleSend(undefined, "Thầy giải thích lại đoạn này được không?");
        }, 3000);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setIsAttachOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAttachOption = (option: string) => {
    if (option === 'upload') {
      setIsAttachOpen(false);
      fileInputRef.current?.click();
      return;
    }

    console.log(`Selected attach option: ${option}`);
    setIsAttachOpen(false);
    // Add logic handling for each option here
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      const grade = String(user.grade || 1);
      const result = await uploadDocument(file, grade.toString(), user.id);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Đã tải tệp **${file.name}** lên backend thành công. Trạng thái: ${result?.data?.status || result?.status || 'processing'}.`
        }
      ]);
    } catch (error: any) {
      console.error('Upload file failed', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Không thể tải tệp lên backend: ${error?.message || 'lỗi không xác định'}`
        }
      ]);
    } finally {
      setIsUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleSend = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = customMsg ?? input.trim();
    if (!userMsg || isLoading) return;

    setInput('');
    setIsAttachOpen(false);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('admin_gemini_api_key') || process.env.GEMINI_API_KEY;
      const systemContext = "You are a helpful AI tutor for students. You should use markdown and KaTeX formatted math equations when explaining math. Wrap inline math with single $ and block math with double $$. Output only the response in Vietnamese.";
      
      const chatUrl = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/chat` : '/api/chat';
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMsg }],
          systemContext
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi kết nối từ server");
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setIsLoading(false); // Stop bouncy dots, start text streaming

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') {
              break;
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: newMessages[lastIndex].content + data.text
                    };
                    return newMessages;
                  });
                }
                if (data.error) {
                    console.error("Stream error", data.error);
                }
              } catch (e) {
                // Ignore parse errors from incomplete chunks
              }
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra kết nối với AI.' }]);
      setIsLoading(false);
    }
  };

  const handleExplainSimpler = () => {
    handleSend(undefined, "Thầy ơi em chưa hiểu lắm, thầy có thể lấy ví dụ đời thường để giải thích đơn giản hơn cho em được không?");
  };

  return (
    <div className={`flex w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50' : 'h-full'} overflow-hidden transition-all duration-300`}>
      
      {/* Left Pane: PDF Viewer */}
      <div className="flex-1 border-r border-slate-200 bg-slate-100/50 flex flex-col relative overflow-hidden">
        {/* PDF Header */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 w-full">
          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <button 
                onClick={() => setActiveTab?.('library')}
                className="text-slate-400 hover:text-brand-600 transition-colors mr-2"
                title="Trở về thư viện"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className={`px-2 py-1 ${theme.light} ${theme.text} text-xs font-bold rounded hidden sm:inline-block`}>{config?.subject || 'Toán học'} {displayGrade}</span>
            <span className="font-semibold text-sm text-slate-700 truncate max-w-[200px] md:max-w-xs">{displayTitle}</span>
          </div>

          <div className="flex gap-3 relative items-center">
            {/* Timer Widget */}
            <div className="relative">
              <button 
                onClick={() => setShowTimerSettings(!showTimerSettings)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isTimerRunning ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'} font-bold text-sm shadow-sm hover:shadow-md transition-all`}
              >
                <Timer className="w-4 h-4" />
                <span className="hidden sm:inline-block tabular-nums">{formatTime(timeLeft)}</span>
              </button>

              <AnimatePresence>
                {showTimerSettings && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-0 sm:left-0 sm:right-auto mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 text-sm">Pomodoro</h4>
                      <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                        <button onClick={() => switchTimerMode('work')} className={`px-2 py-1 text-xs font-bold rounded transition-colors ${timerMode === 'work' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Học</button>
                        <button onClick={() => switchTimerMode('break')} className={`px-2 py-1 text-xs font-bold rounded transition-colors ${timerMode === 'break' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Nghỉ</button>
                      </div>
                    </div>
                    <div className="text-3xl font-black text-center tabular-nums text-slate-800 my-4">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={toggleTimer} className={`flex-1 py-2 font-bold rounded-lg flex items-center justify-center gap-1 transition-colors ${isTimerRunning ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}>
                         {isTimerRunning ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4" />}
                         {isTimerRunning ? 'Tạm dừng' : 'Bắt đầu'}
                       </button>
                       <button onClick={resetTimer} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg shrink-0 transition-colors">
                         <RotateCcw className="w-4 h-4" />
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 flex shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 relative bg-slate-200">
          {pdfUrl && pdfUrl.trim() !== "" ? (
            pdfUrl.includes("drive.google.com") ? (
              <iframe 
                src={pdfUrl} 
                className="w-full h-full border-0" 
                allow="autoplay"
                title={displayTitle}
              />
            ) : (
              <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
                <Viewer 
                  fileUrl={pdfUrl} 
                  plugins={[defaultLayoutPluginInstance]} 
                />
              </Worker>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 p-8 text-center bg-slate-50">
              <BookOpen className="w-16 h-16 text-slate-300" />
              <div>
                <h3 className="text-lg font-bold text-slate-600 mb-1">Không tìm thấy file PDF</h3>
                <p className="text-sm">Tài liệu này chưa có liên kết PDF hợp lệ. Nếu đây là tài liệu cá nhân, vui lòng tải lên lại.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: AI Chat */}
      <div className="w-[450px] shrink-0 bg-white flex flex-col h-full right-pane-chat shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 w-full sm:w-[450px]">
        {/* Chat Header */}
        <div className="h-14 border-b border-slate-100 flex items-center px-4 shrink-0 justify-between bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.text} ${theme.light}`}>
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Gia sư AI</span>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 custom-scrollbar">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? `${theme.bg} text-white shadow-md` : `bg-white border ${theme.border} ${theme.text} shadow-sm`
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[85%] p-4 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? `${theme.bg} text-white rounded-2xl rounded-tr-sm shadow-md font-medium` 
                  : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm markdown-body overflow-hidden'
              }`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div>
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {/* Knowledge Context Mock */}
                    {(i === 0 || msg.content.includes('phương trình') || msg.content.includes('Gia sư')) && (
                      <div className="mt-4 space-y-3">
                        <button 
                          onClick={() => {
                            // Tự động nhảy đến trang và highlight (Mock logic)
                            const pageNum = 15;
                            console.log(`Nhảy tới trang ${pageNum} và highlight...`);
                            alert(`[Demo] Đã nhảy tới trang ${pageNum} và vùng kiến thức liên quan.`);
                          }}
                          className="w-full text-left p-2.5 bg-brand-50/50 hover:bg-brand-50 border border-brand-100 rounded-lg flex items-start gap-2 transition-colors group"
                        >
                          <BookOpen className="w-4 h-4 text-brand-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-semibold text-brand-700 leading-tight">
                            <span className="block mb-0.5">Trích dẫn: Trang 15, Toán học {user.grade}</span>
                            <span className="font-medium text-brand-500 opacity-80">(Bấm để đi đến trang & highlight)</span>
                          </span>
                        </button>
                        
                        <div className="flex flex-col gap-1.5">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Gợi ý mở rộng:</span>
                           <button onClick={() => handleSend(undefined, 'Tại sao công thức này lại đúng?')} className="text-left text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline bg-white border border-slate-100 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all truncate">Tại sao công thức này lại đúng?</button>
                           <button onClick={() => handleSend(undefined, 'Cho mình ví dụ thực tế được không?')} className="text-left text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline bg-white border border-slate-100 px-3 py-2 rounded-lg shadow-sm hover:shadow-md transition-all truncate">Cho mình ví dụ thực tế được không?</button>
                        </div>
                      </div>
                    )}
                    {/* TTS & Explain Simpler Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                       <button onClick={() => handleTTS(msg.content)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition-colors">
                         <Volume2 className="w-3.5 h-3.5" /> Nghe đọc
                       </button>
                       <button onClick={handleExplainSimpler} className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.light} hover:opacity-80 ${theme.text} rounded-lg text-xs font-semibold transition-all`}>
                         <Wand2 className="w-3.5 h-3.5" /> Giải thích đơn giản hơn
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full bg-white border ${theme.border} shadow-sm flex items-center justify-center shrink-0`}>
                <Bot className={`w-4 h-4 ${theme.text}`} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm flex gap-2">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className={`w-2 h-2 ${theme.bg} opacity-50 rounded-full`} />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={`w-2 h-2 ${theme.bg} opacity-50 rounded-full`} />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={`w-2 h-2 ${theme.bg} opacity-50 rounded-full`} />
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1 group z-20 overflow-visible" ref={attachMenuRef}>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelected} />
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setIsAttachOpen(!isAttachOpen)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isAttachOpen ? 'bg-brand-100 text-brand-600 rotate-45' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title="Thêm đính kèm"
                >
                  <Plus className="w-5 h-5 transition-transform" />
                </button>

                <AnimatePresence>
                  {isAttachOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden z-50 pointer-events-auto"
                    >
                      <div className="p-2 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleAttachOption('upload')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors pointer-events-auto"
                        >
                          <Paperclip className="w-4 h-4" />
                          {isUploadingFile ? 'Đang tải...' : 'Tải tệp lên'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachOption('drive')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors pointer-events-auto"
                        >
                          <HardDrive className="w-4 h-4" />
                          Thêm từ Drive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachOption('image')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors pointer-events-auto"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachOption('notebooklm')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors pointer-events-auto"
                        >
                          <Library className="w-4 h-4" />
                          NotebookLM
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder={isRecording ? "Đang nghe..." : user.grade <= 5 ? "Cậu hỏi mình đi..." : "Hỏi AI về nội dung trang này..."}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium outline-none focus:ring-4 focus:bg-white transition-all text-slate-700 ${isRecording ? 'border-red-300 bg-red-50 focus:ring-red-500/10' : 'focus:ring-brand-500/10 focus:border-brand-500'}`}
              />
              <button
                type="button"
                onClick={toggleRecording}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                  isRecording ? 'bg-red-500 text-white animate-pulse shadow-md' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                }`}
                title={isRecording ? "Dừng ghi âm" : "Hỏi bằng giọng nói"}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`w-12 h-12 ${theme.bg} text-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-3 flex items-center justify-center gap-1.5 opacity-60">
            <Sparkles className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {isRecording ? "Đang thu âm..." : "Hỗ trợ công thức Toán học & Giọng nói"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
