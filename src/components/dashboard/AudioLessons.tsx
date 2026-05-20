import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Headphones, Play, Pause, SkipForward, SkipBack, Sparkles, Volume2, Music, Search } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Grade } from '../../types';

interface AudioLessonsProps {
  currentGrade: Grade;
}

export default function AudioLessons({ currentGrade }: AudioLessonsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState<number | null>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const mockAudioLessons = [
    { title: "Tóm tắt Lịch sử Việt Nam (Phần 1)", subject: "Lịch sử", duration: "15:20" },
    { title: "Cách nhớ nhanh bảng tuần hoàn", subject: "Hóa học", duration: "08:45" },
    { title: "Ngữ pháp Tiếng Anh cơ bản: Thì hiện tại đơn", subject: "Tiếng Anh", duration: "12:10" },
    { title: "Định lý Pythagoras và ứng dụng", subject: "Toán học", duration: "10:30" }
  ];

  const filteredLessons = mockAudioLessons.filter(lesson => 
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lesson.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTogglePlay = async () => {
    if (audioUrl) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là một giáo viên có giọng đọc truyền cảm. Hãy tóm tắt ngắn gọn các kiến thức trọng tâm của học sinh lớp ${currentGrade} Việt Nam và đưa ra lời khích lệ học sinh bắt đầu ngày mới thật năng lượng. Độ dài khoảng 200 chữ.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsPlaying(true);
        // We'll let the audio element handle the actual play call via a useEffect or direct ref
      }
    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setAudioUrl(null);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 pb-20">
      <audio 
        ref={audioRef} 
        src={audioUrl || undefined} 
        onEnded={handleEnded} 
        autoPlay={isPlaying}
      />

      {/* Sidebar: List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bài giảng..."
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium"
          />
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 overflow-y-auto shadow-sm space-y-2">
          {filteredLessons.map((lesson, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentTrack(idx);
                // In a real app we'd load correct audio here. For now we use the generated one.
              }}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                currentTrack === idx 
                  ? 'bg-brand-50 border-brand-200' 
                  : 'bg-white border-transparent hover:border-slate-200'
              }`}
            >
              <h4 className={`font-semibold text-sm mb-1 ${currentTrack === idx ? 'text-brand-700' : 'text-slate-800'}`}>
                {lesson.title}
              </h4>
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                <span>{lesson.subject}</span>
                <span>{lesson.duration}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main player area */}
      <div className="w-full md:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Abstract background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-100 rounded-full blur-[80px] transition-all duration-1000 ${isPlaying ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`} />
        </div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center mb-8 relative border-4 border-brand-50">
             {isPlaying && (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: 'linear' }} className="absolute inset-[-4px] rounded-full border-4 border-brand-500 border-t-transparent" />
             )}
            <Headphones className="w-12 h-12 text-brand-500" />
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {isLoading ? "Đang chuẩn bị nội dung..." : (currentTrack !== null ? filteredLessons[currentTrack]?.title : 'Chọn một bài giảng')}
          </h2>
          <p className="text-sm font-semibold text-slate-500 mb-10">
            {currentTrack !== null ? filteredLessons[currentTrack]?.subject : 'Gia Sư Ảo Audio'}
          </p>

          <div className="w-full space-y-8">
             {/* Progress bar mock */}
             <div className="w-full h-1.5 bg-slate-100 rounded-full relative overflow-hidden">
               <motion.div 
                 className="absolute left-0 top-0 bottom-0 bg-brand-500"
                 initial={{ width: 0 }}
                 animate={{ width: isPlaying ? '100%' : '0%' }}
                 transition={{ duration: isPlaying ? 60 : 0, ease: 'linear' }}
               />
             </div>

             <div className="flex items-center justify-center gap-6">
               <button className="text-slate-400 hover:text-slate-700 transition-colors">
                 <SkipBack className="w-6 h-6" />
               </button>
               <button 
                 onClick={handleTogglePlay}
                 disabled={isLoading}
                 className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all"
               >
                 {isLoading ? (
                   <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                 ) : isPlaying ? (
                   <Pause className="w-8 h-8" />
                 ) : (
                   <Play className="w-8 h-8 ml-1" />
                 )}
               </button>
               <button className="text-slate-400 hover:text-slate-700 transition-colors">
                 <SkipForward className="w-6 h-6" />
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
