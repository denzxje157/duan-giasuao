import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Sparkles, User, Bot, Send, Plus, Menu, Moon, Sun, Pen, Mic, Volume2, VolumeX } from 'lucide-react';
import { User as UserType } from '../../types';
import { fetchChatHistory, fetchChatSessions, deleteChatSession, initSession as initSessionApi, API_BASE_URL, ChatHistoryRow, ChatSessionGroup, ChatSessionItem } from '../../lib/api';
import ChatSidebar from './ChatSidebar';
import DrawingCanvas from './DrawingCanvas';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useStudyTracker } from '../../hooks/useStudyTracker';

interface AIChatProps {
  user: UserType;
  onGradeChange?: (grade: any) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'completed';
  suggestions?: SuggestionItem[];
  imageUrl?: string;
}

interface SuggestionItem {
  type: string;
  label: string;
}

type SubjectCard = { key: string; label: string; icon: string; color: string };

const saveGuestMessageAndSession = (
  sessionId: string,
  messages: Message[],
  grade: string,
  subject: string,
  oldSessionId?: string | null
) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`ai_chat_guest_messages_${sessionId}`, JSON.stringify(messages));
  if (oldSessionId && oldSessionId !== sessionId) {
    localStorage.removeItem(`ai_chat_guest_messages_${oldSessionId}`);
  }

  const localSessionsStr = localStorage.getItem('ai_chat_guest_sessions');
  let groups: ChatSessionGroup[] = [];
  if (localSessionsStr) {
    try {
      groups = JSON.parse(localSessionsStr);
    } catch (e) {}
  }

  // 1. DEDUPLICATE: Remove any existing session item with either sessionId or oldSessionId from ALL groups/subjects
  groups.forEach(g => {
    g.subjects.forEach(s => {
      s.sessions = s.sessions.filter(sess => 
        sess.session_id !== sessionId && 
        sess.session_id !== oldSessionId
      );
    });
  });

  // 2. Clean up empty subject groups & grade groups
  groups.forEach(g => {
    g.subjects = g.subjects.filter(s => s.sessions.length > 0);
  });
  groups = groups.filter(g => g.subjects.length > 0);

  // 3. Find/create the correct target grade & subject group
  const gradeLabel = `Lớp ${grade}`;
  let gradeGroup = groups.find(g => g.grade === gradeLabel);
  if (!gradeGroup) {
    gradeGroup = { grade: gradeLabel, subjects: [] };
    groups.push(gradeGroup);
  }

  let subjectGroup = gradeGroup.subjects.find(s => s.subject === subject);
  if (!subjectGroup) {
    subjectGroup = { subject, sessions: [] };
    gradeGroup.subjects.push(subjectGroup);
  }

  // 4. Create/update the session item
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const firstUserMsg = messages.find(m => m.role === 'user');
  
  let inferredTitle = 'Cuộc trò chuyện mới';
  if (firstUserMsg) {
    const text = firstUserMsg.content;
    if (text.includes("Chào Gia sư, mình muốn học môn")) {
      const match = text.match(/môn\s+([^\.]+)/);
      inferredTitle = match ? `Học môn ${match[1].trim()}` : "Học môn mới";
    } else {
      inferredTitle = text.slice(0, 30);
    }
  }

  const sessionItem: ChatSessionItem = {
    session_id: sessionId,
    title: inferredTitle,
    subject: subject,
    grade: gradeLabel,
    updated_at: new Date().toISOString(),
    last_message: lastAssistantMsg ? lastAssistantMsg.content : ''
  };

  subjectGroup.sessions.unshift(sessionItem);

  localStorage.setItem('ai_chat_guest_sessions', JSON.stringify(groups));
};
type SubjectSection = { title: string; items: SubjectCard[] };

function getSubjectSectionsByGrade(grade: number): SubjectSection[] {
  if (grade === 1 || grade === 2) {
    return [
      {
        title: 'Môn học chính',
        items: [
          { key: 'toan', label: 'Toán', icon: '🔢', color: 'bg-amber-100 border-amber-300 text-amber-800' },
          { key: 'tieng-viet', label: 'Tiếng Việt', icon: '📖', color: 'bg-sky-100 border-sky-300 text-sky-800' },
          { key: 'tieng-anh', label: 'Tiếng Anh', icon: '🇬🇧', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
          { key: 'tnxh', label: 'Tự nhiên và Xã hội', icon: '🌱', color: 'bg-rose-100 border-rose-300 text-rose-800' },
          { key: 'dao-duc', label: 'Đạo đức', icon: '💛', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
        ],
      },
    ];
  }

  if (grade === 3) {
    return [
      {
        title: 'Môn học chính',
        items: [
          { key: 'toan', label: 'Toán', icon: '🔢', color: 'bg-amber-100 border-amber-300 text-amber-800' },
          { key: 'tieng-viet', label: 'Tiếng Việt', icon: '📖', color: 'bg-sky-100 border-sky-300 text-sky-800' },
          { key: 'tieng-anh', label: 'Tiếng Anh', icon: '🇬🇧', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
          { key: 'tnxh', label: 'Tự nhiên và Xã hội', icon: '🌱', color: 'bg-rose-100 border-rose-300 text-rose-800' },
          { key: 'tin-hoc', label: 'Tin học', icon: '💻', color: 'bg-violet-100 border-violet-300 text-violet-800' },
          { key: 'dao-duc', label: 'Đạo đức', icon: '💛', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
        ],
      },
    ];
  }

  if (grade === 4 || grade === 5) {
    return [
      {
        title: 'Môn học chính',
        items: [
          { key: 'toan', label: 'Toán', icon: '🔢', color: 'bg-amber-100 border-amber-300 text-amber-800' },
          { key: 'tieng-viet', label: 'Tiếng Việt', icon: '📖', color: 'bg-sky-100 border-sky-300 text-sky-800' },
          { key: 'tieng-anh', label: 'Tiếng Anh', icon: '🇬🇧', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
          { key: 'khoa-hoc', label: 'Khoa học', icon: '🔬', color: 'bg-cyan-100 border-cyan-300 text-cyan-800' },
          { key: 'ls-dl', label: 'Lịch sử và Địa lý', icon: '🗺️', color: 'bg-orange-100 border-orange-300 text-orange-800' },
          { key: 'tin-hoc', label: 'Tin học', icon: '💻', color: 'bg-violet-100 border-violet-300 text-violet-800' },
          { key: 'dao-duc', label: 'Đạo đức', icon: '💛', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
        ],
      },
    ];
  }

  if (grade >= 6 && grade <= 9) {
    return [
      {
        title: 'Môn học THCS',
        items: [
          { key: 'toan', label: 'Toán', icon: '📐', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
          { key: 'ngu-van', label: 'Ngữ văn', icon: '📚', color: 'bg-orange-100 border-orange-300 text-orange-800' },
          { key: 'tieng-anh', label: 'Tiếng Anh', icon: '🇬🇧', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
          { key: 'khtn', label: 'Khoa học tự nhiên', icon: '🧪', color: 'bg-cyan-100 border-cyan-300 text-cyan-800' },
          { key: 'ls-dl', label: 'Lịch sử và Địa lý', icon: '🗺️', color: 'bg-amber-100 border-amber-300 text-amber-800' },
          { key: 'tin-hoc', label: 'Tin học', icon: '💻', color: 'bg-violet-100 border-violet-300 text-violet-800' },
          { key: 'gdcd', label: 'Giáo dục công dân', icon: '⚖️', color: 'bg-lime-100 border-lime-300 text-lime-800' },
        ],
      },
    ];
  }

  return [
    {
      title: 'Nhóm Bắt buộc (Cốt lõi)',
      items: [
        { key: 'toan', label: 'Toán', icon: '📐', color: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
        { key: 'ngu-van', label: 'Ngữ văn', icon: '📚', color: 'bg-orange-100 border-orange-300 text-orange-800' },
        { key: 'tieng-anh', label: 'Tiếng Anh', icon: '🇬🇧', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
        { key: 'lich-su', label: 'Lịch sử', icon: '🏛️', color: 'bg-amber-100 border-amber-300 text-amber-800' },
      ],
    },
    {
      title: 'Nhóm Tự nhiên (Khối A, B)',
      items: [
        { key: 'vat-ly', label: 'Vật lý', icon: '⚛️', color: 'bg-cyan-100 border-cyan-300 text-cyan-800' },
        { key: 'hoa-hoc', label: 'Hóa học', icon: '🧪', color: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800' },
        { key: 'sinh-hoc', label: 'Sinh học', icon: '🧬', color: 'bg-lime-100 border-lime-300 text-lime-800' },
        { key: 'tin-hoc', label: 'Tin học', icon: '💻', color: 'bg-violet-100 border-violet-300 text-violet-800' },
      ],
    },
    {
      title: 'Nhóm Xã hội (Khối C, D)',
      items: [
        { key: 'dia-ly', label: 'Địa lý', icon: '🌍', color: 'bg-teal-100 border-teal-300 text-teal-800' },
        { key: 'gdktpl', label: 'Giáo dục kinh tế và pháp luật', icon: '⚖️', color: 'bg-rose-100 border-rose-300 text-rose-800' },
      ],
    },
  ];
}

function inferSubjectFromText(content: string): string {
  const text = (content || '').toLowerCase();
  if (text.includes('toán') || text.includes('phép cộng') || text.includes('phép trừ')) return 'Toán';
  if (text.includes('tiếng việt') || text.includes('chính tả') || text.includes('tập đọc')) return 'Tiếng Việt';
  if (text.includes('tiếng anh') || text.includes('english') || text.includes('alphabet')) return 'Tiếng Anh';
  if (text.includes('tự nhiên') || text.includes('xã hội') || text.includes('cây') || text.includes('con vật')) return 'Tự nhiên và Xã hội';
  if (text.includes('ngữ văn') || text.includes('văn học') || text.includes('phân tích')) return 'Ngữ văn';
  if (text.includes('lịch sử và địa lý')) return 'Lịch sử và Địa lý';
  if (text.includes('khoa học tự nhiên')) return 'Khoa học tự nhiên';
  if (text.includes('khoa học')) return 'Khoa học';
  if (text.includes('tin học')) return 'Tin học';
  if (text.includes('giáo dục công dân')) return 'Giáo dục công dân';
  if (text.includes('giáo dục kinh tế và pháp luật')) return 'Giáo dục kinh tế và pháp luật';
  if (text.includes('địa lý')) return 'Địa lý';
  if (text.includes('lịch sử')) return 'Lịch sử';
  if (text.includes('đạo đức')) return 'Đạo đức';
  if (text.includes('vật lý') || text.includes('điện') || text.includes('lực')) return 'Vật lý';
  if (text.includes('hóa học') || text.includes('phản ứng')) return 'Hóa học';
  if (text.includes('sinh học') || text.includes('tế bào')) return 'Sinh học';
  return 'Môn học';
}

const MessageContent = ({ content, isStreaming }: { content: string; isStreaming?: boolean }) => {
  return (
    <div className="prose prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-flex items-center ml-1">
          <span className="inline-block w-2 h-4 bg-brand-500 animate-pulse align-middle rounded-sm" />
        </span>
      )}
    </div>
  );
};

export const convertMathToVietnameseSpeech = (text: string) => {
  let spoken = text;
  
  // Dọn dẹp dấu ngoặc LaTeX rỗng và dấu ngoặc đơn rỗng trước khi xử lý toán học
  spoken = spoken.replace(/\\\(\s*\\\)/g, ' ');
  spoken = spoken.replace(/\\\[\s*\\\]/g, ' ');
  spoken = spoken.replace(/\(\s*\)/g, ' ');
  spoken = spoken.replace(/\[\s*\]/g, ' ');
  spoken = spoken.replace(/\{\s*\}/g, ' ');

  // Toán học cơ bản & cấp 3
  spoken = spoken.replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1 phần $2');
  spoken = spoken.replace(/\\widehat{([^}]+)}/g, 'góc $1');
  spoken = spoken.replace(/\^\\circ/g, ' độ ');
  spoken = spoken.replace(/\^2/g, ' bình phương ');
  spoken = spoken.replace(/\^3/g, ' lập phương ');
  spoken = spoken.replace(/\^{([^}]+)}/g, ' mũ $1 ');
  spoken = spoken.replace(/\^([0-9a-zA-Z])/g, ' mũ $1 ');
  spoken = spoken.replace(/\\sqrt{([^}]+)}/g, ' căn bậc hai của $1 ');
  spoken = spoken.replace(/\\vec{([^}]+)}/g, ' véc tơ $1 ');
  spoken = spoken.replace(/\\overrightarrow{([^}]+)}/g, ' véc tơ $1 ');
  spoken = spoken.replace(/\\int/g, ' tích phân ');
  spoken = spoken.replace(/\\sum/g, ' tổng sigma ');
  spoken = spoken.replace(/\\lim/g, ' lim ');
  spoken = spoken.replace(/\\infty/g, ' vô cùng ');
  
  // Ký hiệu Hy Lạp phổ biến
  spoken = spoken.replace(/\\Delta/g, ' đen ta ');
  spoken = spoken.replace(/\\pi/g, ' pi ');
  spoken = spoken.replace(/\\alpha/g, ' an pha ');
  spoken = spoken.replace(/\\beta/g, ' bê ta ');
  spoken = spoken.replace(/\\gamma/g, ' gam ma ');
  spoken = spoken.replace(/\\Omega/g, ' ô mê ga ');
  
  // Phép toán
  spoken = spoken.replace(/\\times/g, ' nhân ');
  spoken = spoken.replace(/\\cdot/g, ' nhân ');
  spoken = spoken.replace(/\\div/g, ' chia ');
  spoken = spoken.replace(/\\le/g, ' nhỏ hơn hoặc bằng ');
  spoken = spoken.replace(/\\ge/g, ' lớn hơn hoặc bằng ');
  spoken = spoken.replace(/\\neq/g, ' khác ');
  spoken = spoken.replace(/\\approx/g, ' xấp xỉ ');
  spoken = spoken.replace(/\\pm/g, ' cộng trừ ');
  
  // Vật lí & Hoá học
  spoken = spoken.replace(/m\/s\^2/g, ' mét trên giây bình phương ');
  spoken = spoken.replace(/m\/s/g, ' mét trên giây ');
  spoken = spoken.replace(/kg\/m\^3/g, ' ki lô gam trên mét khối ');
  spoken = spoken.replace(/_2O/g, ' hai o '); // H2O -> H hai O
  spoken = spoken.replace(/_2/g, ' hai '); // CO2 -> C O hai
  spoken = spoken.replace(/_3/g, ' ba '); // CaCO3
  spoken = spoken.replace(/_4/g, ' bốn '); // H2SO4
  spoken = spoken.replace(/_{([^}]+)}/g, ' $1 '); // Các chỉ số dưới khác
  
  // Xử lý đạo hàm: y', y'', f'(x), y′ (chữ prime unicode), y’ (curly quote), \prime
  spoken = spoken.replace(/\^\\prime/g, ' phẩy ');
  spoken = spoken.replace(/\\prime/g, ' phẩy ');
  spoken = spoken.replace(/\^{'}/g, ' phẩy ');
  spoken = spoken.replace(/([a-zA-Z])\s*['’′]{2}/g, ' $1 hai phẩy ');
  spoken = spoken.replace(/([a-zA-Z])\s*['’′]/g, ' $1 phẩy ');
  
  // Dọn dẹp ký tự thừa của LaTeX
  spoken = spoken.replace(/\$/g, '');
  spoken = spoken.replace(/\\/g, '');
  spoken = spoken.replace(/[{}]/g, ' ');
  
  // Xóa các khoảng trắng thừa
  spoken = spoken.replace(/\s+/g, ' ').trim();
  
  return spoken;
};

function extractAnswerFromMarkers(content: string): string {
  let answer = content;
  const match = content.match(/\[ANSWER\]([\s\S]*?)(?:\[END_ANSWER\]|$)/i);
  if (match && match[1]) {
    answer = match[1].trim();
  }
  // Remove [QUIZ] block from the visible answer
  answer = answer.replace(/\[QUIZ\][\s\S]*?(?:\[END_QUIZ\]|$)/ig, '').trim();
  // Remove [SUGGESTIONS] block from the visible answer
  answer = answer.replace(/\[SUGGESTIONS\][\s\S]*?(?:\[END_SUGGESTIONS\]|$)/ig, '').trim();
  return answer;
}

function extractQuizFromMarkers(content: string): { question: string, options: string[], answer: number } | null {
  const match = content.match(/\[QUIZ\]([\s\S]*?)(?:\[END_QUIZ\]|$)/i);
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractSuggestionsFromMarkers(content: string): SuggestionItem[] {
  const match = content.match(/\[SUGGESTIONS\]([\s\S]*?)(?:\[END_SUGGESTIONS\]|$)/i);
  if (!match || !match[1]) {
    return [];
  }

  return match[1]
    .match(/\{[\s\S]*?\}/g)
    ?.map((entry) => {
      try {
        const parsed = JSON.parse(entry);
        if (parsed && typeof parsed === 'object' && parsed.label) {
          return { type: String(parsed.type || 'general'), label: String(parsed.label) };
        }
      } catch {
        return null;
      }
      return null;
    })
    .filter((item): item is SuggestionItem => Boolean(item)) || [];
}

function commandFromSuggestion(label: string, grade: string | number, subject?: string | null): string {
  return label;
}

export default function AIChat({ user, onGradeChange }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const usedVoiceRef = useRef(false);
  const activeAudioSeqRef = useRef<number>(0);
  const activeAudioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentPlayingAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentPlayingAudioRef.current) {
      try {
        currentPlayingAudioRef.current.pause();
        currentPlayingAudioRef.current.src = "";
        currentPlayingAudioRef.current.load();
      } catch (e) {
        console.warn("Error pausing playing audio:", e);
      }
      currentPlayingAudioRef.current = null;
    }
    activeAudioQueueRef.current.forEach((audio) => {
      try {
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        audio.src = "";
        audio.load();
      } catch (e) {
        // ignore
      }
    });
    activeAudioQueueRef.current = [];
  };

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<ChatHistoryRow[]>([]);
  const [sessionGroups, setSessionGroups] = useState<ChatSessionGroup[]>([]);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('giasuao_voice_gender');
      return (saved === 'male' || saved === 'female') ? saved : 'female';
    }
    return 'female';
  });
  const [speechRate, setSpeechRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('giasuao_speech_rate');
      if (!saved || saved === '1.5') {
        localStorage.setItem('giasuao_speech_rate', '1.2');
        return 1.2;
      }
      return parseFloat(saved);
    }
    return 1.2;
  });
  const [availableLocalVoices, setAvailableLocalVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLocalVoiceURI, setSelectedLocalVoiceURI] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('giasuao_local_voice_uri') || '';
    }
    return '';
  });
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [currentView, setCurrentView] = useState<'selection' | 'chat'>('selection');
  const [selectedHistoryGrade, setSelectedHistoryGrade] = useState<string | null>(null);
  const lastGradeRef = useRef(user.grade);
  const restoreSessionGradeRef = useRef<number | null>(null);
  const skipLoadHistoryRef = useRef<string | null>(null);
  const sessionGroupsRef = useRef<ChatSessionGroup[]>([]);
  useEffect(() => {
    sessionGroupsRef.current = sessionGroups;
  }, [sessionGroups]);
  useEffect(() => {
    if (user.grade !== lastGradeRef.current) {
      lastGradeRef.current = user.grade;
      
      if (restoreSessionGradeRef.current === Number(user.grade)) {
        // Skip resetting session because we are deliberately restoring a session from this grade
        restoreSessionGradeRef.current = null;
        return;
      }
      
      setCurrentView('selection');
      setSessionId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`ai_chat_session_${user.id || user.email}`);
      }
      setMessages([]);
      setSelectedHistoryGrade(null);
    }
  }, [user.grade, user.id, user.email]);
  const [generalInput, setGeneralInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              setAttachedImage(ev.target.result as string);
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };
  const [subjectLoadingKey, setSubjectLoadingKey] = useState<string | null>(null);
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(true);
  const [voiceEngine, setVoiceEngine] = useState<'api' | 'local'>('local'); // Default to local (instant) for Hackathon demo!

  const playVoiceSequence = (textToSpeak: string) => {
    activeAudioSeqRef.current++;
    const seqId = activeAudioSeqRef.current;

    if (typeof window === 'undefined') return;

    stopAllAudio();

    const cleanText = convertMathToVietnameseSpeech(textToSpeak.replace(/[*#_]/g, ''));

    // Check if local Vietnamese voice is available
    const localVoices = 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
    const hasLocalViVoice = localVoices.some(v => v.lang.toLowerCase().includes('vi'));

    // Check voiceEngine selection
    if (voiceEngine === 'local' && 'speechSynthesis' in window && hasLocalViVoice) {
      // Direct instant local speech
      const rawSentences = cleanText.split(/([.!?\n]+)/);
      const chunks: string[] = [];
      let currentChunk = "";

      for (let i = 0; i < rawSentences.length; i++) {
        const item = rawSentences[i];
        if (!item) continue;
        currentChunk += item;
        if (/[.!?\n]/.test(item) || currentChunk.length > 150) {
          const trimmed = currentChunk.trim();
          if (trimmed) {
            chunks.push(trimmed);
          }
          currentChunk = "";
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      if (chunks.length === 0) return;

      let currentLocalIndex = 0;
      const playNextLocal = () => {
        if (seqId !== activeAudioSeqRef.current) return;
        if (currentLocalIndex >= chunks.length) return;

        const chunkText = chunks[currentLocalIndex];
        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.lang = 'vi-VN';
        
        const voices = window.speechSynthesis.getVoices();
        const viVoices = voices.filter(v => v.lang.toLowerCase().includes('vi'));
        let viVoice = null;

        // If selectedLocalVoiceURI is set and matches current gender setting, use it.
        if (selectedLocalVoiceURI) {
          const matchedVoice = viVoices.find(v => v.voiceURI === selectedLocalVoiceURI);
          if (matchedVoice) {
            const nameLower = matchedVoice.name.toLowerCase();
            const isMaleVoice = nameLower.includes('nam') || nameLower.includes('male') || nameLower.includes('hung');
            const targetMale = voiceGender === 'male';
            if (isMaleVoice === targetMale) {
              viVoice = matchedVoice;
            }
          }
        }

        // If no voice is found or it's gender-mismatched, find one matching the requested gender.
        if (!viVoice && viVoices.length > 0) {
          if (voiceGender === 'male') {
            viVoice = viVoices.find(v => {
              const nameLower = v.name.toLowerCase();
              return nameLower.includes('nam') || nameLower.includes('male') || nameLower.includes('hung');
            }) || viVoices.find(v => v.name.toLowerCase().includes('an')) || viVoices[0];
          } else {
            viVoice = viVoices.find(v => {
              const nameLower = v.name.toLowerCase();
              return nameLower.includes('hoaimy') || nameLower.includes('female') || nameLower.includes('linh');
            }) || viVoices[0];
          }
        }

        if (viVoice) {
          utterance.voice = viVoice;
        }
        utterance.rate = speechRate;
        
        utterance.onend = () => {
          if (seqId !== activeAudioSeqRef.current) return;
          currentLocalIndex++;
          playNextLocal();
        };

        utterance.onerror = (e) => {
          if (e.error !== 'interrupted') {
            console.warn("SpeechSynthesis utterance error in local queue:", e);
          }
          if (seqId !== activeAudioSeqRef.current) return;
          currentLocalIndex++;
          playNextLocal();
        };

        window.speechSynthesis.speak(utterance);
      };

      playNextLocal();
    } else {
      // API (FPT/Zalo) primary audio queue with sequential loading & retry logic (NO fallback to Web Speech to prevent voice switching)
      const rawSentences = cleanText.match(/[^.!?\n]+[.!?\n]+/g) || [cleanText];
      const sentences: string[] = [];
      let currentGroup = "";
      for (const s of rawSentences) {
        if (currentGroup.length + s.length > 200 && currentGroup.length > 0) {
          sentences.push(currentGroup.trim());
          currentGroup = s;
        } else {
          currentGroup += " " + s;
        }
      }
      if (currentGroup.trim()) sentences.push(currentGroup.trim());

      if (sentences.length === 0) return;

      const audioElements = new Array<HTMLAudioElement | null>(sentences.length).fill(null);
      let currentSentence = 0;

      const stopQueue = () => {
        stopAllAudio();
      };

      const getAudioForIndex = (index: number, retryCount = 0): HTMLAudioElement => {
        if (audioElements[index]) {
          return audioElements[index]!;
        }

        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(sentences[index].trim())}&gender=${voiceGender}`;
        audio.playbackRate = speechRate;
        
        let hasError = false;
        audio.onerror = (e) => {
          console.warn(`Audio chunk ${index} failed to load (attempt ${retryCount + 1}).`, e);
          
          if (retryCount < 2) {
            // Remove this audio from the queue and retry creating a new one
            const idx = activeAudioQueueRef.current.indexOf(audio);
            if (idx > -1) activeAudioQueueRef.current.splice(idx, 1);
            
            audioElements[index] = null;
            setTimeout(() => {
              if (seqId === activeAudioSeqRef.current) {
                const retryAudio = getAudioForIndex(index, retryCount + 1);
                // If it has become the active sentence, try playing it
                if (index === currentSentence) {
                  currentPlayingAudioRef.current = retryAudio;
                  retryAudio.play().catch((err) => {
                    console.warn(`Retry play failed for chunk ${index}`, err);
                  });
                }
              }
            }, 1000);
          } else {
            hasError = true;
            if (index === currentSentence) {
              console.error(`All retry attempts failed for chunk ${index}. Skipping to next.`);
              currentSentence++;
              playNext();
            }
          }
        };

        (audio as any)._hasError = () => hasError;

        audioElements[index] = audio;
        activeAudioQueueRef.current.push(audio);
        return audio;
      };

      const preloadNext = () => {
        const nextIndex = currentSentence + 1;
        if (nextIndex < sentences.length) {
          getAudioForIndex(nextIndex); // Triggers background load for next chunk
        }
      };

      const playNext = () => {
        if (seqId !== activeAudioSeqRef.current) {
          stopQueue();
          return;
        }
        if (currentSentence >= sentences.length) {
          stopQueue();
          return;
        }

        const currentAudio = getAudioForIndex(currentSentence);
        
        // If it already failed, skip to next immediately
        if ((currentAudio as any)._hasError && (currentAudio as any)._hasError()) {
          console.warn(`Skipping chunk ${currentSentence} because it failed to load previously.`);
          currentSentence++;
          playNext();
          return;
        }

        currentPlayingAudioRef.current = currentAudio;
        currentAudio.playbackRate = speechRate;

        // Preload next chunk in parallel while playing current
        preloadNext();

        currentAudio.onended = () => {
          if (seqId !== activeAudioSeqRef.current) return;
          currentPlayingAudioRef.current = null;
          currentSentence++;
          playNext();
        };

        currentAudio.play().catch((err) => {
          if (err.name === 'AbortError' && seqId !== activeAudioSeqRef.current) {
            return;
          }
          console.warn(`Play failed for chunk ${currentSentence}. Skipping to next.`, err);
          currentPlayingAudioRef.current = null;
          currentSentence++;
          playNext();
        });
      };

      // Start playing
      playNext();
    }
  };

  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`ai_chat_session_${user.id || user.email}`);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenSuggestionLabelsRef = useRef<Set<string>>(new Set());
  const historyUserId = user.id || user.email;
  const subjectSections = useMemo(() => getSubjectSectionsByGrade(Number(user.grade || 1)), [user.grade]);

  useStudyTracker(user, selectedSubject || 'Trò chuyện AI');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('giasuao_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadLocalVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const vi = voices.filter(v => v.lang.toLowerCase().includes('vi'));
        setAvailableLocalVoices(vi);
        if (vi.length > 0) {
          setSelectedLocalVoiceURI(prev => {
            if (prev && vi.some(v => v.voiceURI === prev)) return prev;
            localStorage.setItem('giasuao_local_voice_uri', vi[0].voiceURI);
            return vi[0].voiceURI;
          });
        } else {
          // If no local Vietnamese voice is found, fallback to API
          setVoiceEngine('api');
        }
      };

      loadLocalVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadLocalVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadLocalVoices);
    } else {
      setVoiceEngine('api');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSidebarState = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    syncSidebarState();
    window.addEventListener('resize', syncSidebarState);
    return () => window.removeEventListener('resize', syncSidebarState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('giasuao_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const lastUserIdRef = useRef<string | null>(null);
  // Load active session from localStorage when user session details resolve
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUserId = user.id || user.email;
    if (currentUserId !== lastUserIdRef.current) {
      lastUserIdRef.current = currentUserId;
      const key = `ai_chat_session_${currentUserId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        setSessionId(stored);
      } else {
        setSessionId(null);
      }
    }
  }, [user.id, user.email]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!sessionId) {
        setMessages([]);
        return;
      }

      if (skipLoadHistoryRef.current === sessionId) {
        // Skip loading history for newly created local session to avoid resetting the stream
        skipLoadHistoryRef.current = null;
        return;
      }

      if (user.isGuest) {
        const storedMessages = localStorage.getItem(`ai_chat_guest_messages_${sessionId}`);
        if (storedMessages) {
          try {
            const parsed = JSON.parse(storedMessages);
            setMessages(parsed);
            
            // Prefer session subject from sessionGroupsRef
            const allSessions = sessionGroupsRef.current.flatMap(g => g.subjects.flatMap(s => s.sessions));
            const targetSession = allSessions.find(s => s.session_id === sessionId);
            if (targetSession && targetSession.subject && targetSession.subject !== 'Môn học') {
              setSelectedSubject(targetSession.subject);
            } else {
              const firstUserMsg = parsed.find((m: any) => m.role === 'user');
              if (firstUserMsg) {
                setSelectedSubject(inferSubjectFromText(firstUserMsg.content));
              } else {
                setSelectedSubject('Môn học');
              }
            }
            setCurrentView('chat');
          } catch (e) {
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
        return;
      }

      try {
        setIsHistoryLoading(true);
        // Fetch only current active session's messages
        const data = await fetchChatHistory(sessionId);
        console.log('Dữ liệu lịch sử lấy về:', data);
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        if (rows.length > 0) {
          const mappedMessages: Message[] = rows.map((row: any) => ({
            id: row.id || `${row.role}-${Math.random()}`,
            role: row.role === 'user' ? 'user' : 'assistant',
            content: row.content,
            imageUrl: row.imageUrl,
            status: 'completed',
          }));
          setMessages(mappedMessages);

          // Prefer session subject from sessionGroupsRef
          const allSessions = sessionGroupsRef.current.flatMap(g => g.subjects.flatMap(s => s.sessions));
          const targetSession = allSessions.find(s => s.session_id === sessionId);
          if (targetSession && targetSession.subject && targetSession.subject !== 'Môn học') {
            setSelectedSubject(targetSession.subject);
          } else {
            const firstUserMsg = mappedMessages.find(m => m.role === 'user');
            if (firstUserMsg) {
              setSelectedSubject(inferSubjectFromText(firstUserMsg.content));
            } else {
              setSelectedSubject('Môn học');
            }
          }
          setCurrentView('chat');
        } else {
          // Only redirect to selection if there are no messages currently displayed.
          // This prevents redirecting while a stream is in progress (messages may not be in DB yet).
          setMessages(prev => {
            if (prev.length === 0) {
              setCurrentView('selection');
            }
            return prev.length === 0 ? [] : prev;
          });
        }
      } catch (error) {
        console.error('Failed to load chat history', error);
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [user.isGuest, sessionId]);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      if (user.isGuest) {
        const localSessions = localStorage.getItem('ai_chat_guest_sessions');
        if (localSessions) {
          try {
            setSessionGroups(JSON.parse(localSessions));
          } catch (e) {
            setSessionGroups([]);
          }
        } else {
          setSessionGroups([]);
        }
        return;
      }
      try {
        const data = await fetchChatSessions();
        if (!cancelled) {
          setSessionGroups(data || []);
        }
      } catch (error) {
        console.error('Failed to load chat sessions', error);
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [user.isGuest, sidebarRefreshTrigger]);

  useEffect(() => {
    if (!historyUserId) return;
    if (sessionId) {
      localStorage.setItem(`ai_chat_session_${historyUserId}`, sessionId);
    } else {
      localStorage.removeItem(`ai_chat_session_${historyUserId}`);
    }
  }, [historyUserId, sessionId]);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      usedVoiceRef.current = true;
    };
    recognition.start();
  };

  const buildImplicitLearningContext = (subject: string) => {
    if (!subject) return undefined;
    const grade = Number(user.grade || 1);
    const bookSet = grade <= 5 ? 'Kết nối tri thức Tiểu học' : grade <= 9 ? 'Kết nối tri thức THCS' : 'Kết nối tri thức THPT';
    return `Bối cảnh học tập bắt buộc: Học sinh lớp ${grade}, môn ${subject}. Sử dụng ngôn ngữ phù hợp lứa tuổi lớp ${grade}. Tài liệu mặc định: Bộ sách ${bookSet}.`;
  };

  const handleSelectSubject = async (subjectName: string, subjectKey?: string) => {
    if (subjectLoadingKey) return;
    if (subjectKey) setSubjectLoadingKey(subjectKey);

    try {
      setSelectedSubject(subjectName);
      setMessages([]);
      seenSuggestionLabelsRef.current = new Set();

      let newSessionId = sessionId;
      try {
        const initData = await initSessionApi(undefined, String(user.grade || ''), subjectName);
        const returnedSessionId = initData?.new_session_id || (initData as any)?.data?.new_session_id;
        if (returnedSessionId) {
          newSessionId = returnedSessionId;
        } else if (!newSessionId && typeof crypto !== 'undefined' && crypto.randomUUID) {
          newSessionId = crypto.randomUUID();
        } else if (!newSessionId) {
          newSessionId = String(Date.now());
        }
      } catch (err) {
        console.warn("Could not init session on backend, falling back to local session ID", err);
        if (!newSessionId) {
          newSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
        }
      }
      setSessionId(newSessionId);
      skipLoadHistoryRef.current = newSessionId;
      if (historyUserId) {
        localStorage.setItem(`ai_chat_session_${historyUserId}`, newSessionId);
      }

      setSidebarOpen(false);
      setCurrentView('chat');

      await sendMessage(
        `Chào Gia sư, mình là ${user.name || 'học sinh'}, học sinh lớp ${user.grade}. Mình muốn học môn ${subjectName}. Hãy chào mình thật thân thiện, cá nhân hóa theo tên của mình và đưa ra 4 lựa chọn học tập ngắn gọn cho môn này.`,
        { hiddenUserMessage: true, overrideSubject: subjectName, sessionIdOverride: newSessionId }
      );
    } finally {
      setSubjectLoadingKey(null);
    }
  };

  const handlePickSubject = async (subjectLabel: string) => {
    const clean = subjectLabel.replace(/\s+[\p{Emoji_Presentation}\p{Extended_Pictographic}]+/gu, '').trim();
    await handleSelectSubject(clean, subjectLabel);
  };

  const handleGeneralChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!generalInput.trim() || subjectLoadingKey) return;
    
    const msg = generalInput.trim();
    setGeneralInput('');
    setSubjectLoadingKey('general-chat');
    
    try {
      setSelectedSubject('Môn học');
      setMessages([]);
      seenSuggestionLabelsRef.current = new Set();

      let newSessionId = sessionId;
      try {
        const initData = await initSessionApi(undefined, String(user.grade || ''), 'Môn học');
        const returnedSessionId = initData?.new_session_id || (initData as any)?.data?.new_session_id;
        if (returnedSessionId) {
          newSessionId = returnedSessionId;
        } else if (!newSessionId && typeof crypto !== 'undefined' && crypto.randomUUID) {
          newSessionId = crypto.randomUUID();
        } else if (!newSessionId) {
          newSessionId = String(Date.now());
        }
      } catch (err) {
        console.warn("Could not init session on backend, falling back to local session ID", err);
        if (!newSessionId) {
          newSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
        }
      }
      setSessionId(newSessionId);
      skipLoadHistoryRef.current = newSessionId;
      if (historyUserId) {
        localStorage.setItem(`ai_chat_session_${historyUserId}`, newSessionId);
      }

      setSidebarOpen(false);
      setCurrentView('chat');

      await sendMessage(msg, { overrideSubject: 'Môn học', sessionIdOverride: newSessionId });
    } finally {
      setSubjectLoadingKey(null);
    }
  };

  const handleNavigation = (view: 'selection' | 'chat') => {
    setCurrentView(view);
  };

  const handleNewChat = () => {
    const newSession = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    setSessionId(newSession);
    skipLoadHistoryRef.current = newSession;
    setSelectedSubject(null);
    setMessages([]);
    setInput('');
    handleNavigation('selection');
    seenSuggestionLabelsRef.current = new Set();
    setSidebarOpen(false);
    if (historyUserId) {
      localStorage.setItem(`ai_chat_session_${historyUserId}`, newSession);
    }
  };

  const resetSuggestionMemory = () => {
    seenSuggestionLabelsRef.current = new Set();
  };

  const handleOpenSessionHistory = async (targetSessionId: string) => {
    if (targetSessionId === 'no-session') return;
    
    // Find session in sessionGroups to see its grade
    const allSessions = sessionGroups.flatMap(g => g.subjects.flatMap(s => s.sessions));
    const targetSession = allSessions.find(s => s.session_id === targetSessionId);
    if (targetSession && targetSession.grade) {
      const gradeNum = parseInt(targetSession.grade.replace('Lớp', '').trim());
      if (!isNaN(gradeNum) && gradeNum !== Number(user.grade)) {
        restoreSessionGradeRef.current = gradeNum;
        if (onGradeChange) {
          onGradeChange(gradeNum);
        }
      }
    }

    if (targetSession && targetSession.subject) {
      setSelectedSubject(targetSession.subject);
    }

    setSessionId(targetSessionId);
    setSidebarOpen(false);
    resetSuggestionMemory();
  };
 
  const handleDeleteSession = async (targetSessionId: string) => {
    try {
      if (user.isGuest) {
        localStorage.removeItem(`ai_chat_guest_messages_${targetSessionId}`);
        const localSessionsStr = localStorage.getItem('ai_chat_guest_sessions');
        if (localSessionsStr) {
          try {
            let groups: ChatSessionGroup[] = JSON.parse(localSessionsStr);
            groups = groups.map((gradeGroup) => ({
              ...gradeGroup,
              subjects: gradeGroup.subjects.map((subjectGroup) => ({
                ...subjectGroup,
                sessions: subjectGroup.sessions.filter(session => session.session_id !== targetSessionId),
              })).filter(subjectGroup => subjectGroup.sessions.length > 0),
            })).filter(gradeGroup => gradeGroup.subjects.length > 0);
            localStorage.setItem('ai_chat_guest_sessions', JSON.stringify(groups));
            setSessionGroups(groups);
          } catch (e) {}
        }
        if (sessionId === targetSessionId) {
          handleNewChat();
        }
        return;
      }

      await deleteChatSession(targetSessionId);
      setSessionGroups(prev => prev.map((gradeGroup) => ({
        ...gradeGroup,
        subjects: gradeGroup.subjects.map((subjectGroup) => ({
          ...subjectGroup,
          sessions: subjectGroup.sessions.filter(session => session.session_id !== targetSessionId),
        })).filter(subjectGroup => subjectGroup.sessions.length > 0),
      })).filter(gradeGroup => gradeGroup.subjects.length > 0));
 
      if (sessionId === targetSessionId) {
        handleNewChat();
      }
    } catch (e) {
      console.error('Không thể xóa hội thoại', e);
    }
  };

  const submitMessage = async (
    userMsg: string,
    options?: { hiddenUserMessage?: boolean; overrideSubject?: string; sessionIdOverride?: string | null }
  ) => {
    if (!userMsg.trim() || isLoading) return;
    
    const activeSubject = options?.overrideSubject || selectedSubject;
    if (!activeSubject) {
      handleNavigation('selection');
      return;
    }

    setInput('');
    const currentImage = attachedImage;
    setAttachedImage(null);
    setIsDrawingMode(false);

    if (!options?.hiddenUserMessage) {
      setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: userMsg, imageUrl: currentImage || undefined }]);
    }
    setIsLoading(true);

    try {
      const apiKey = localStorage.getItem('admin_gemini_api_key') || process.env.GEMINI_API_KEY;
      
      const chatUrl = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/chat` : '/api/chat';
      const activeSessionId = options?.sessionIdOverride !== undefined ? options.sessionIdOverride : sessionId;
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          question: userMsg,
          session_id: activeSessionId || undefined,
          user_id: historyUserId || undefined,
          grade: String(user.grade || ''),
          subject: activeSubject || undefined,
          learning_context: buildImplicitLearningContext(activeSubject),
          model_name: selectedModel,
          image_data: currentImage || undefined,
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi Server");
      }

      const assistantMessageId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '', status: 'streaming', suggestions: [] }]);
      setIsLoading(false); 

      let fullAssistantText = '';
      let detectedSessionId = sessionId;

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            const sessionMatch = line.match(/\[SESSION_ID:([^\]]+)\]/);
            if (sessionMatch) {
              detectedSessionId = sessionMatch[1];
              // Mark this session as "skip load history" so the useEffect doesn't
              // redirect back to selection screen when DB hasn't saved messages yet.
              skipLoadHistoryRef.current = sessionMatch[1];
              setSessionId(sessionMatch[1]);
              continue;
            }

            if (line.trim() === 'data: [DONE]') break;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                const textChunk = data.chunk || data.text || '';
                if (textChunk) {
                  fullAssistantText += textChunk;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    if (lastIndex >= 0 && newMessages[lastIndex]) {
                      const existingSuggestions = newMessages[lastIndex].suggestions;
                      newMessages[lastIndex] = {
                        ...newMessages[lastIndex],
                        content: (newMessages[lastIndex].content || '') + textChunk
                      };
                      if (existingSuggestions) {
                        newMessages[lastIndex].suggestions = existingSuggestions;
                      }
                    }
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

      const parsedSuggestions = extractSuggestionsFromMarkers(fullAssistantText)
        .filter(item => {
          const key = item.label.trim().toLowerCase();
          if (seenSuggestionLabelsRef.current.has(key)) return false;
          seenSuggestionLabelsRef.current.add(key);
          return true;
        });

      const fallbackSuggestions = parsedSuggestions.length > 0 ? parsedSuggestions : getDefaultSuggestionsForSubject(selectedSubject || '');
      const finalSuggestions = fallbackSuggestions.length > 0 ? fallbackSuggestions : [];

      let updatedMsgs: Message[] = [];
      setMessages(prev => {
        const newMsgs: Message[] = prev.map(msg => {
          if (msg.id !== assistantMessageId) return msg;
          return {
            ...msg,
            content: fullAssistantText,
            status: 'completed' as const,
            suggestions: finalSuggestions,
          };
        });
        updatedMsgs = newMsgs;
        return newMsgs;
      });

      if (user.isGuest) {
        saveGuestMessageAndSession(detectedSessionId || 'guest', updatedMsgs, String(user.grade || ''), activeSubject || 'Môn học', activeSessionId);
      }

      if (usedVoiceRef.current) {
        const textToSpeak = extractAnswerFromMarkers(fullAssistantText);
        if (autoVoiceEnabled) {
          playVoiceSequence(textToSpeak);
        }
        usedVoiceRef.current = false;
      }

      setSidebarRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: "Có chút lỗi kỹ thuật, bạn thử lại sau nhen!" }]);
      setIsLoading(false);
    }
  };

  const sendMessage = async (
    messageText: string,
    options?: { hiddenUserMessage?: boolean; overrideSubject?: string; sessionIdOverride?: string | null }
  ) => {
    await submitMessage(messageText, options);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await sendMessage(input.trim());
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const form = new FormData();
      form.append('file', f);
      form.append('grade', String(user.grade || '1'));

      const uploadUrl = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/upload` : '/api/upload';
      const resp = await fetch(uploadUrl, { method: 'POST', body: form });
      const data = await resp.json();
      if (data?.status === 'success') {
        const filename = f.name;
        setMessages(prev => [...prev, 
          { id: `upl-u-${Date.now()}`, role: 'user', content: `Đã tải lên tài liệu: ${filename}` },
          { 
            id: `upl-a-${Date.now()}`, 
            role: 'assistant', 
            content: `Cô/Thầy đã nhận được tài liệu **${filename}**. Hệ thống đã đọc và ghi nhớ nội dung. Em có muốn cô/thầy giải thích đề mẫu này, hướng dẫn giải hay tạo một đề thi/bài tập tương tự để luyện tập không?`, 
            status: 'completed',
            suggestions: [
              { type: 'general', label: 'Giải thích đề mẫu này' },
              { type: 'general', label: 'Hướng dẫn mình cách giải' },
              { type: 'general', label: 'Tạo đề thi tương tự' }
            ]
          }
        ]);
        setSidebarRefreshTrigger(prev => prev + 1);
      } else {
        setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: 'Không thể tải lên tệp, bạn thử lại nhé.' }]);
      }
    } catch (err) {
      console.error('Upload failed', err);
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: 'Có lỗi khi tải file lên, thử lại sau nhé.' }]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrawingSave = (dataUrl: string) => {
    setAttachedImage(dataUrl);
    setIsDrawingMode(false);
  };

  // Reusable hook for a future Visual Prompting button or any preset prompt source
  const handlePresetPrompt = async (promptText: string) => {
    await sendMessage(promptText);
  };

  const handleSuggestionClick = async (label: string) => {
    // Always send suggestion as a message in the CURRENT session (no new session, no navigation)
    // This mirrors Gemini/ChatGPT behavior: clicking a suggestion chip continues the same chat
    await submitMessage(label, {
      // Pass current subject so submitMessage doesn't redirect to selection screen
      overrideSubject: selectedSubject || 'Môn học',
    });
  };

  const handleGoogleAntigravityTest = async () => {
    await handlePresetPrompt('Google Antigravity Test: Hãy trả lời thật ngắn gọn 3 gạch đầu dòng về cách giải phương trình bậc hai.');
  };

  const handleRunLocustLoadTest = async () => {
    const command = 'locust -f locustfile.py --host=http://127.0.0.1:8000';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
      }
    } catch {
      console.info(command);
    }
  };

  const currentThemeVars = isDarkMode
    ? { '--bg-primary': '#131314', '--text-primary': '#f3f4f6', '--panel-primary': '#1e1e1e', '--muted-primary': '#9ca3af' }
    : { '--bg-primary': '#f7f7f7', '--text-primary': '#111111', '--panel-primary': '#ffffff', '--muted-primary': '#6b7280' };

  const themeClassName = isDarkMode ? 'dark' : 'light';

  const getDefaultSuggestionsForSubject = (subjectName: string): SuggestionItem[] => {
    const normalized = (subjectName || '').toLowerCase();
    if (normalized.includes('toán')) {
      return [
        { type: 'exercise', label: 'Làm thêm 1 bài Toán' },
        { type: 'theory', label: 'Ôn lại công thức liên quan' },
        { type: 'resource', label: 'Xem ví dụ tương tự trong sách' },
      ];
    }
    if (normalized.includes('văn')) {
      return [
        { type: 'exercise', label: 'Phân tích thêm 1 đoạn văn' },
        { type: 'theory', label: 'Ôn lại ý chính bài học' },
        { type: 'resource', label: 'Xem dàn ý mẫu' },
      ];
    }
    if (normalized.includes('anh')) {
      return [
        { type: 'exercise', label: 'Luyện thêm 1 câu tương tự' },
        { type: 'theory', label: 'Ôn lại từ vựng trọng tâm' },
        { type: 'resource', label: 'Xem mẫu hội thoại' },
      ];
    }
    return [
      { type: 'exercise', label: 'Làm thêm 1 bài liên quan' },
      { type: 'theory', label: 'Ôn lại lý thuyết chính' },
      { type: 'resource', label: 'Xem tài liệu tham khảo' },
    ];
  };

  const renderContent = () => {
    try {
      if (currentView === 'selection') {
        return (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto border-b border-white/10 px-5 py-4 custom-scrollbar">
              {/* Lịch sử lớp học đã tham gia */}
              {sessionGroups && sessionGroups.length > 0 && (
                <div className="mb-6 bg-white/5 rounded-2xl p-5 border border-white/10">
                  <p className="mb-3 text-sm font-bold text-brand-400 flex items-center gap-2">
                    🎓 Lớp học đã tham gia của em:
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sessionGroups.map((g) => {
                      const isSelected = selectedHistoryGrade === g.grade;
                      return (
                        <button
                          key={g.grade}
                          type="button"
                          onClick={() => setSelectedHistoryGrade(isSelected ? null : g.grade)}
                          className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          {g.grade}
                        </button>
                      );
                    })}
                  </div>

                  {selectedHistoryGrade && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 animate-fadeIn">
                      <p className="text-xs text-zinc-400 mb-3 font-semibold">Môn học đã chọn học trong {selectedHistoryGrade}:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {sessionGroups.find(g => g.grade === selectedHistoryGrade)?.subjects.map((sub) => {
                          const mostRecentSession = sub.sessions[0];
                          return (
                            <button
                              key={sub.subject}
                              type="button"
                              onClick={() => {
                                const gradeNum = parseInt(selectedHistoryGrade.replace('Lớp', '').trim());
                                if (!isNaN(gradeNum)) {
                                  restoreSessionGradeRef.current = gradeNum;
                                  if (onGradeChange) {
                                    onGradeChange(gradeNum);
                                  }
                                }
                                if (mostRecentSession) {
                                  handleOpenSessionHistory(mostRecentSession.session_id);
                                }
                              }}
                              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-2.5 text-left text-xs font-bold transition-all"
                            >
                              <span className="truncate">{sub.subject}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="mb-3 text-sm font-bold">Chọn môn học để bắt đầu phiên mới:</p>
              <div className="space-y-4">
                {subjectSections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted-primary)]">{section.title}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {section.items.map((subject) => {
                        const subjectId = `${subject.label} ${subject.icon}`;
                        const isLoading = subjectLoadingKey === subjectId;
                        return (
                          <button
                            key={subject.key}
                            type="button"
                            onClick={() => handlePickSubject(subjectId)}
                            disabled={Boolean(subjectLoadingKey)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${isDarkMode ? 'border-white/10 bg-[#131314] hover:bg-white/10 text-white' : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900'}`}
                          >
                            {isLoading ? (
                              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              <span className="text-base leading-none">{subject.icon}</span>
                            )}
                            <span className="truncate text-[14px]">{isLoading ? 'Đang khởi tạo...' : subject.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Thanh nhập trò chuyện tự do */}
            <div className="p-4 bg-[var(--bg-primary)]">
              <form onSubmit={handleGeneralChat} className="mx-auto flex max-w-[1000px] gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm focus-within:border-brand-500/50">
                <input
                  type="text"
                  value={generalInput}
                  onChange={(e) => setGeneralInput(e.target.value)}
                  placeholder="Hoặc nhập câu hỏi bất kỳ tại đây..."
                  disabled={Boolean(subjectLoadingKey)}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--muted-primary)] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!generalInput.trim() || Boolean(subjectLoadingKey)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {subjectLoadingKey === 'general-chat' ? (
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4 -ml-0.5" />
                  )}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-center gap-1.5 opacity-60">
                <Sparkles className="h-3 w-3 text-[var(--muted-primary)]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-primary)]">Powered by Gemini</span>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 custom-scrollbar md:px-6" style={{ maxWidth: '100%' }}>
          <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white text-black' : 'bg-white/5 border border-white/10 text-white'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[min(950px,100%)] min-w-0 ${msg.role === 'user' ? 'text-white font-medium' : 'text-[var(--text-primary)]'}`}>
                  {msg.role === 'user' ? (
                    <div className="flex flex-col gap-2 items-end">
                      {msg.imageUrl && (
                        <div className="rounded-2xl border-4 border-white/20 overflow-hidden max-w-xs shadow-md">
                          <img src={msg.imageUrl} alt="Đính kèm" className="w-full h-auto bg-white" />
                        </div>
                      )}
                      <div className="whitespace-pre-wrap rounded-2xl bg-white/10 px-4 py-3 text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const answerPart = extractAnswerFromMarkers(msg.content);
                      const suggestions = msg.status === 'completed' ? extractSuggestionsFromMarkers(msg.content) : [];
                      const quiz = msg.status === 'completed' ? extractQuizFromMarkers(msg.content) : null;

                      return (
                        <div className="flex w-full flex-col gap-4">
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {msg.status === 'streaming' && !answerPart ? (
                              <div className="flex items-center gap-2 text-zinc-400 font-normal py-1">
                                <span className="text-xs uppercase tracking-wider animate-pulse">Gia sư đang soạn câu trả lời</span>
                                <div className="flex gap-1.5 items-center">
                                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              </div>
                            ) : (
                              <MessageContent content={answerPart || ''} isStreaming={msg.status === 'streaming'} />
                            )}
                          </div>

                          {/* Nút Đọc To (Speaker) */}
                          {msg.status === 'completed' && answerPart && (
                            <div className="mt-1 flex items-center justify-start">
                              <button
                                onClick={() => playVoiceSequence(answerPart)}
                                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-brand-400 transition-colors hover:bg-white/10 hover:text-brand-300"
                                title="Đọc câu trả lời"
                              >
                                <Volume2 className="h-4 w-4" />
                                Đọc to
                              </button>
                            </div>
                          )}
                          
                          {/* Render Quiz if exists */}
                          {quiz && (
                            <div className="mt-2 bg-white/10 rounded-xl p-4 border border-white/20">
                              <p className="font-bold mb-3 text-sm">🤔 Trắc nghiệm nhanh: {quiz.question}</p>
                              <div className="grid gap-2">
                                {quiz.options.map((opt, idx) => {
                                  const isSelected = quizAnswers[msg.id] === idx;
                                  const isSubmitted = quizResults[msg.id] !== undefined;
                                  const isCorrectOption = idx === quiz.answer;
                                  
                                  let btnClass = isDarkMode ? "border-white/20 hover:bg-white/10 text-white" : "border-zinc-200 hover:bg-zinc-100 text-zinc-900";
                                  if (isSubmitted) {
                                    if (isCorrectOption) btnClass = "bg-green-500 border-green-500 text-white";
                                    else if (isSelected) btnClass = "bg-red-500 border-red-500 text-white";
                                    else btnClass = "border-white/20 opacity-50";
                                  } else if (isSelected) {
                                    btnClass = "bg-brand-500 border-brand-500 text-white";
                                  }

                                  return (
                                    <button
                                      key={idx}
                                      disabled={isSubmitted}
                                      onClick={() => {
                                        setQuizAnswers(prev => ({ ...prev, [msg.id]: idx }));
                                        setQuizResults(prev => ({ ...prev, [msg.id]: idx === quiz.answer }));
                                      }}
                                      className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${btnClass}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                              {quizResults[msg.id] !== undefined && (
                                <div className="space-y-2.5 mt-3">
                                  <div className={`text-sm font-bold ${quizResults[msg.id] ? 'text-green-400' : 'text-red-400'}`}>
                                    {quizResults[msg.id] ? '✨ Chính xác! Điểm kinh nghiệm +10 EXP' : '❌ Sai rồi!'}
                                  </div>
                                  {(quiz as any).explanation && (
                                    <div className="text-[13px] bg-white/5 border border-white/10 rounded-xl p-3 text-zinc-300 font-normal leading-relaxed">
                                      💡 <b>Giải thích từ Cô:</b> {(quiz as any).explanation}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {(suggestions.length > 0 ? suggestions : getDefaultSuggestionsForSubject(selectedSubject || '')).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {(suggestions.length > 0 ? suggestions : getDefaultSuggestionsForSubject(selectedSubject || '')).map((sug, i) => {
                                let icon = '💡';
                                if (sug.type === 'exercise') icon = '📝';
                                if (sug.type === 'theory') icon = '📚';
                                if (sug.type === 'resource') icon = '🔗';
                                if (sug.type === 'image') icon = '🖼️';
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleSuggestionClick(sug.label)}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isDarkMode ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100'}`}
                                  >
                                    <span>{icon}</span>
                                    <span>{sug.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </motion.div>
            ))}

            {messages.length === 0 && currentView === 'chat' && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-[var(--muted-primary)]">
                Chưa có tin nhắn trong phiên này. Hãy nhập câu hỏi đầu tiên của bạn.
              </div>
            )}

            {isLoading && (
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="h-2 w-2 rounded-full bg-white/40" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-2 w-2 rounded-full bg-white/40" />
                  <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-2 w-2 rounded-full bg-white/40" />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      return (
        <div className="p-6 text-sm text-red-400">
          Có lỗi khi render giao diện chat. Vui lòng thử lại.
        </div>
      );
    }
  };

  return (
    <div
      className={`${themeClassName} relative flex h-[calc(100vh-140px)] w-full max-w-full overflow-hidden rounded-none border border-transparent shadow-none`}
      style={currentThemeVars as React.CSSProperties}
    >
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelectSession={handleOpenSessionHistory}
        onDeleteSession={handleDeleteSession}
        onRunLoadTest={handleRunLocustLoadTest}
        groupedSessions={sessionGroups}
        activeSessionId={sessionId}
        theme={isDarkMode ? 'dark' : 'light'}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSidebarOpen((prev) => !prev)} className="rounded-xl border border-white/10 p-2 text-[var(--text-primary)]">
              <Menu className="h-5 w-5" />
            </button>
            <div className="rounded-xl bg-white/5 p-2 text-[var(--text-primary)]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold">Gia sư AI</div>
              <div className="text-xs text-[var(--muted-primary)]">Canvas tối giản, cá nhân hóa theo lớp học</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const newState = !autoVoiceEnabled;
                  setAutoVoiceEnabled(newState);
                  
                  activeAudioSeqRef.current++; // Stop any ongoing sequence
                  stopAllAudio();
                  
                  const audioElement = document.getElementById('ai-tts-player') as HTMLAudioElement;
                  if (newState && audioElement) {
                     audioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
                     audioElement.play().catch(()=> {});
                  }
                }}
                className={`flex items-center gap-2 rounded-xl border border-white/10 px-3 py-1.5 text-sm font-medium transition-colors ${autoVoiceEnabled ? 'bg-brand-500/20 text-brand-300' : 'bg-white/5 text-[var(--muted-primary)]'}`}
                title={autoVoiceEnabled ? 'Đang bật tự động đọc' : 'Đã tắt tự động đọc'}
              >
                {autoVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {autoVoiceEnabled ? 'Bật giọng nói' : 'Tắt giọng nói'}
              </button>
              {autoVoiceEnabled && (
                <>
                  <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5" title="Chọn bộ máy phát thanh">
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceEngine('api');
                        activeAudioSeqRef.current++;
                        stopAllAudio();
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${voiceEngine === 'api' ? 'bg-brand-600 text-white shadow-sm' : 'text-[var(--muted-primary)] hover:text-white'}`}
                      title="Giọng đọc Zalo/FPT chất lượng cao (Trễ 2-3s)"
                    >
                      AI 🌟
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceEngine('local');
                        activeAudioSeqRef.current++;
                        stopAllAudio();
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${voiceEngine === 'local' ? 'bg-brand-600 text-white shadow-sm' : 'text-[var(--muted-primary)] hover:text-white'}`}
                      title="Giọng đọc nhanh của thiết bị (Không trễ)"
                    >
                      Nhanh ⚡
                    </button>
                  </div>

                  <div className="flex rounded-xl border border-white/10 bg-white/5 p-0.5" title="Chọn giới tính giọng đọc">
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceGender('female');
                        localStorage.setItem('giasuao_voice_gender', 'female');
                        activeAudioSeqRef.current++;
                        stopAllAudio();
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${voiceGender === 'female' ? 'bg-brand-600 text-white shadow-sm' : 'text-[var(--muted-primary)] hover:text-white'}`}
                    >
                      Nữ 👩
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVoiceGender('male');
                        localStorage.setItem('giasuao_voice_gender', 'male');
                        activeAudioSeqRef.current++;
                        stopAllAudio();
                      }}
                      className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${voiceGender === 'male' ? 'bg-brand-600 text-white shadow-sm' : 'text-[var(--muted-primary)] hover:text-white'}`}
                    >
                      Nam 👨
                    </button>
                  </div>

                  <div className="hidden sm:flex rounded-xl border border-white/10 bg-white/5 p-0.5" title="Chọn tốc độ đọc">
                    {[1.0, 1.2, 1.5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          setSpeechRate(rate);
                          localStorage.setItem('giasuao_speech_rate', String(rate));
                          if (currentPlayingAudioRef.current) {
                            currentPlayingAudioRef.current.playbackRate = rate;
                          }
                        }}
                        className={`rounded-lg px-2 py-1 text-xs font-bold transition-all ${speechRate === rate ? 'bg-brand-600 text-white shadow-sm' : 'text-[var(--muted-primary)] hover:text-white'}`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {voiceEngine === 'local' && availableLocalVoices.length > 0 && (
                    <select
                      value={selectedLocalVoiceURI}
                      onChange={(e) => {
                        setSelectedLocalVoiceURI(e.target.value);
                        localStorage.setItem('giasuao_local_voice_uri', e.target.value);
                      }}
                      className="hidden md:block rounded-xl border border-white/10 bg-[#1e1e1f] px-2 py-1 text-xs font-medium text-[var(--text-primary)] focus:outline-none max-w-[110px] truncate"
                      title="Chọn giọng đọc thiết bị"
                    >
                      {availableLocalVoices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name.replace(/Microsoft|Google/g, '').trim()}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/10"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Đang hoạt động</span>
            </div>
            <button
              onClick={() => setCurrentView('selection')}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-[var(--text-primary)] transition-colors hover:bg-white/10"
              title="Đổi môn học"
            >
              <Pen className="h-4 w-4" />
            </button>
          </div>
        </div>

        {renderContent()}

        {currentView === 'chat' && (
          <div className="sticky bottom-0 z-10 border-t border-white/10 bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-4 py-4 backdrop-blur-md">
            <form onSubmit={handleSend} className="mx-auto flex w-full max-w-[1000px] items-center gap-2 rounded-[24px] border border-white/10 bg-white/5 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                disabled={isLoading}
                placeholder={attachedImage ? "Hình vẽ đã đính kèm. Thêm câu hỏi..." : selectedSubject ? `Đặt câu hỏi môn ${selectedSubject}...` : 'Hãy chọn môn học để bắt đầu phiên mới...'}
                className="min-w-0 flex-1 rounded-[20px] border-0 bg-transparent px-4 py-3.5 text-sm font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--muted-primary)] resize-none"
              />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  
                  // Unlock audio context on first user interaction
                  const audioElement = document.getElementById('ai-tts-player') as HTMLAudioElement;
                  if (audioElement && !audioElement.src) {
                     audioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
                     audioElement.play().catch(()=> {});
                  }

                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) return alert('Trình duyệt không hỗ trợ Voice Tutor!');
                  if ((window as any).recognitionInstance) {
                    (window as any).recognitionInstance.stop();
                  }
                  const recognition = new SpeechRecognition();
                  recognition.lang = 'vi-VN';
                  recognition.continuous = true;
                  recognition.interimResults = true;
                  (window as any).recognitionInstance = recognition;
                  
                  let currentInput = input;
                  
                  recognition.onstart = () => setIsListening(true);
                  recognition.onend = () => setIsListening(false);
                  recognition.onerror = () => setIsListening(false);
                  
                  recognition.onresult = (e: any) => {
                    let final = '';
                    let interim = '';
                    for (let i = e.resultIndex; i < e.results.length; ++i) {
                      if (e.results[i].isFinal) final += e.results[i][0].transcript;
                      else interim += e.results[i][0].transcript;
                    }
                    if (final) {
                      currentInput = currentInput + (currentInput ? ' ' : '') + final;
                      setInput(currentInput + (interim ? ' ' + interim : ''));
                      usedVoiceRef.current = true;
                    } else if (interim) {
                      setInput(currentInput + (currentInput ? ' ' : '') + interim);
                    }
                  };
                  
                  recognition.start();
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  if ((window as any).recognitionInstance) {
                    (window as any).recognitionInstance.stop();
                  }
                  setIsListening(false);
                }}
                onPointerLeave={(e) => {
                  e.preventDefault();
                  if ((window as any).recognitionInstance) {
                    (window as any).recognitionInstance.stop();
                  }
                  setIsListening(false);
                }}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] transition-all select-none ${isListening ? 'bg-red-500 text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/5 border border-white/10 text-[var(--text-primary)] hover:bg-white/10'}`}
                title="Bấm và giữ để nói"
              >
                <Mic className="h-5 w-5" />
              </button>
              <button
                type="submit"
                disabled={(!input.trim() && !attachedImage) || isLoading || !selectedSubject}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600"
              >
                <Send className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setIsDrawingMode(!isDrawingMode)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-[var(--text-primary)] transition-colors hover:bg-white/10" title="Bảng nháp">
                <Pen className="h-5 w-5" />
              </button>
              <button type="button" onClick={handleFileButtonClick} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-[var(--text-primary)] transition-colors hover:bg-white/10" title="Đính kèm">
                <Plus className="h-5 w-5" />
              </button>
              <input ref={fileInputRef} onChange={handleFileSelected} type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" className="hidden" />
            </form>
            {isDrawingMode && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-[600px] animate-in zoom-in-95 duration-200">
                  <DrawingCanvas 
                    onCancel={() => setIsDrawingMode(false)} 
                    onCapture={handleDrawingSave}
                  />
                </div>
              </div>
            )}
            <div className="mt-3 flex items-center justify-center gap-1.5 opacity-60">
              <Sparkles className="h-3 w-3 text-[var(--muted-primary)]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-primary)]">Powered by Gemini</span>
            </div>
            {/* Hidden Audio Player for TTS Auto-play */}
            <audio id="ai-tts-player" className="hidden" preload="auto" />
          </div>
        )}
      </div>
    </div>
  );
}
