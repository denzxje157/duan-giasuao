import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Sparkles, User, Bot, Send, Plus, Paperclip, HardDrive, Image as ImageIcon, Library, Mic } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User as UserType } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface AIChatProps {
  user: UserType;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat({ user }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: user.grade <= 5 
        ? `Chào ${user.name}! Mình là bạn Gia Sư của cậu đây. Hôm nay cậu muốn mình giúp bài tập nào hay muốn nghe kể chuyện không?` 
        : `Chào ${user.name}! Mình là Gia sư AI của bạn. Hôm nay bạn cần mình hỗ trợ giải bài tập hay giải thích kiến thức nào không?` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    console.log(`Selected attach option: ${option}`);
    setIsAttachOpen(false);
    // Add logic to handle different attach options here
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setInput("Bài giải chi tiết của bài tập này là gì?");
    } else {
      setIsRecording(true);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('admin_gemini_api_key') || process.env.GEMINI_API_KEY;
      const systemContext = `Bạn là một Gia sư ảo thông minh, thân thiện dành cho học sinh Việt Nam lớp ${user.grade}. Hãy trả lời các câu hỏi về bài học một cách dễ hiểu. Bạn có thể sử dụng markdown format và KaTeX math equations (inline với $ và block với $$).`;
      
      const response = await fetch('/api/chat', {
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
        throw new Error("Lỗi Server");
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      setIsLoading(false); 

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.trim() === 'data: [DONE]') break;
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
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Có chút lỗi kỹ thuật, bạn thử lại sau nhen!" }]);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {user.grade <= 5 ? "Bạn Gia Sư" : "Gia sư AI"}
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-slate-500">Đang hoạt động</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 custom-scrollbar">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-brand-600 shadow-sm'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[75%] p-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-brand-500/10 font-medium' 
                : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm markdown-body'
            }`}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.content}
                </ReactMarkdown>
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-brand-600" />
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm flex gap-2">
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-slate-400 rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-slate-400 rounded-full" />
              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-slate-400 rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="relative">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1 group" ref={attachMenuRef}>
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10">
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
                      className="absolute bottom-full left-0 mb-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden"
                    >
                      <div className="p-2 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleAttachOption('upload')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors"
                        >
                          <Paperclip className="w-4 h-4" />
                          Tải tệp lên
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachOption('drive')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors"
                        >
                          <HardDrive className="w-4 h-4" />
                          Thêm từ Drive
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachOption('image')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachOption('notebooklm')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-colors"
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
                placeholder={isRecording ? "Đang nghe..." : user.grade <= 5 ? "Cậu hỏi mình đi..." : "Hỏi AI về bài học hôm nay..."}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-medium outline-none focus:ring-4 focus:bg-white transition-all text-slate-700 ${isRecording ? 'border-red-300 bg-red-50 focus:ring-red-500/10' : 'focus:ring-brand-500/10 focus:border-brand-500'}`}
              />
              <button
                type="button"
                onClick={toggleRecording}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-md' : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                title={isRecording ? "Dừng ghi âm" : "Hỏi bằng giọng nói"}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 bg-brand-600 text-white rounded-2xl flex items-center justify-center hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:hover:bg-brand-600 shadow-sm shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="mt-3 flex items-center justify-center gap-1.5 opacity-60">
            <Sparkles className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Powered by Gemini
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
