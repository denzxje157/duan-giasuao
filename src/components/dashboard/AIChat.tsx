import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Sparkles, User, Bot, Send, Plus, Menu, Moon, Sun, Pen, Mic, Volume2, VolumeX } from 'lucide-react';
import { User as UserType } from '../../types';
import { fetchChatHistory, fetchChatSessions, deleteChatSession, initSession as initSessionApi, API_BASE_URL, ChatHistoryRow, ChatSessionGroup } from '../../lib/api';
import ChatSidebar from './ChatSidebar';
import DrawingCanvas from './DrawingCanvas';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface AIChatProps {
  user: UserType;
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
  if (text.includes('toán') || text.includes('phép cộng') || text.includes('phép trừ')) return 'Môn Toán';
  if (text.includes('tiếng việt') || text.includes('chính tả') || text.includes('tập đọc')) return 'Môn Tiếng Việt';
  if (text.includes('tiếng anh') || text.includes('english') || text.includes('alphabet')) return 'Môn Tiếng Anh';
  if (text.includes('tự nhiên') || text.includes('xã hội') || text.includes('cây') || text.includes('con vật')) return 'Tự nhiên & Xã hội';
  if (text.includes('ngữ văn') || text.includes('văn học') || text.includes('phân tích')) return 'Ngữ Văn';
  if (text.includes('lịch sử và địa lý')) return 'Lịch sử và Địa lý';
  if (text.includes('khoa học tự nhiên')) return 'Khoa học tự nhiên';
  if (text.includes('khoa học')) return 'Khoa học';
  if (text.includes('tin học')) return 'Tin học';
  if (text.includes('giáo dục công dân')) return 'Giáo dục công dân';
  if (text.includes('giáo dục kinh tế và pháp luật')) return 'Giáo dục kinh tế và pháp luật';
  if (text.includes('địa lý')) return 'Địa lý';
  if (text.includes('lịch sử')) return 'Lịch sử';
  if (text.includes('đạo đức')) return 'Đạo đức';
  if (text.includes('vật lý') || text.includes('điện') || text.includes('lực')) return 'Vật Lý';
  if (text.includes('hóa học') || text.includes('phản ứng')) return 'Hóa Học';
  if (text.includes('sinh học') || text.includes('tế bào')) return 'Sinh Học';
  return 'Môn học';
}

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
  const cleanSubject = subject || 'Toán';
  return `/grade ${grade} /subject ${cleanSubject} /chat ${label}`;
}

export default function AIChat({ user }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const usedVoiceRef = useRef(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState<ChatHistoryRow[]>([]);
  const [sessionGroups, setSessionGroups] = useState<ChatSessionGroup[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [currentView, setCurrentView] = useState<'selection' | 'chat'>('selection');
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
  
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`ai_chat_session_${user.id || user.email}`);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenSuggestionLabelsRef = useRef<Set<string>>(new Set());
  const historyUserId = user.id || user.email;
  const subjectSections = useMemo(() => getSubjectSectionsByGrade(Number(user.grade || 1)), [user.grade]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTheme = window.localStorage.getItem('giasuao_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setIsDarkMode(savedTheme === 'dark');
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

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (user.isGuest) return;

      try {
        setIsHistoryLoading(true);
        const data = await fetchChatHistory();
        console.log('Dữ liệu lịch sử lấy về:', data);
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        setHistoryRows(rows);

        if (rows.length > 0) {
          const mappedMessages: Message[] = rows.map((row: any) => ({
            id: row.id || `${row.role}-${Math.random()}`,
            role: row.role === 'user' ? 'user' : 'assistant',
            content: row.content,
            status: 'completed',
          }));
          setMessages(mappedMessages);
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
  }, [user.isGuest]);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      if (user.isGuest) return;
      try {
        setIsHistoryLoading(true);
        const data = await fetchChatSessions();
        if (!cancelled) setSessionGroups(data || []);
      } catch (error) {
        console.error('Failed to load chat sessions', error);
      } finally {
        if (!cancelled) setIsHistoryLoading(false);
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [user.isGuest, historyRows]);

  useEffect(() => {
    if (!historyUserId || !sessionId || user.isGuest) return;
    localStorage.setItem(`ai_chat_session_${historyUserId}`, sessionId);
  }, [historyUserId, sessionId, user.isGuest]);

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
        const initData = await initSessionApi(sessionId || undefined, String(user.grade || ''), subjectName);
        if (initData?.new_session_id) {
          newSessionId = initData.new_session_id;
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
      if (historyUserId) {
        localStorage.setItem(`ai_chat_session_${historyUserId}`, newSessionId);
      }

      setSidebarOpen(false);
      setCurrentView('chat');

      await sendMessage(
        `Chào Gia sư, mình muốn học môn ${subjectName}. Hãy chào học sinh theo lớp ${user.grade} thật thân thiện và đưa ra 4 lựa chọn học tập ngắn gọn cho môn này.`,
        { hiddenUserMessage: true, overrideSubject: subjectName }
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
        const initData = await initSessionApi(sessionId || undefined, String(user.grade || ''), 'Môn học');
        if (initData?.new_session_id) {
          newSessionId = initData.new_session_id;
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
      if (historyUserId) {
        localStorage.setItem(`ai_chat_session_${historyUserId}`, newSessionId);
      }

      setSidebarOpen(false);
      setCurrentView('chat');

      await sendMessage(msg, { overrideSubject: 'Môn học' });
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
    try {
      setIsHistoryLoading(true);
      const rows = await fetchChatHistory(targetSessionId === 'no-session' ? undefined : targetSessionId);
      console.log('Dữ liệu lịch sử theo session:', rows);
      const mappedMessages: Message[] = (rows || []).map((row: any) => ({
        id: row.id || `${row.role}-${Math.random()}`,
        role: row.role === 'user' ? 'user' : 'assistant',
        content: row.content,
        status: 'completed',
      }));
      if (mappedMessages.length > 0) {
        setMessages(mappedMessages);
        const firstUserMsg = mappedMessages.find(m => m.role === 'user');
        if (firstUserMsg) {
          setSelectedSubject(inferSubjectFromText(firstUserMsg.content));
        } else {
          setSelectedSubject('Môn học');
        }
      }
      handleNavigation('chat');
      setSidebarOpen(false);
      if (targetSessionId !== 'no-session') {
        setSessionId(targetSessionId);
      }
      resetSuggestionMemory();
    } catch (e) {
      console.error('Không thể mở lịch sử phiên học', e);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteSession = async (targetSessionId: string) => {
    try {
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

  const submitMessage = async (userMsg: string, options?: { hiddenUserMessage?: boolean; overrideSubject?: string }) => {
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
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
        },
        body: JSON.stringify({
          question: userMsg,
          session_id: sessionId || undefined,
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
                    const existingSuggestions = newMessages[lastIndex]?.suggestions;
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: newMessages[lastIndex].content + textChunk
                    };
                    if (existingSuggestions) {
                      newMessages[lastIndex].suggestions = existingSuggestions;
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

      setMessages(prev => prev.map(msg => {
        if (msg.id !== assistantMessageId) return msg;
        return {
          ...msg,
          content: fullAssistantText,
          status: 'completed',
          suggestions: finalSuggestions,
        };
      }));

      if (usedVoiceRef.current) {
        const textToSpeak = extractAnswerFromMarkers(fullAssistantText);
        
        const autoPlayVietnamese = () => {
          if (!autoVoiceEnabled) return;
          const cleanText = convertMathToVietnameseSpeech(textToSpeak.replace(/[*#_]/g, ''));
          const audioElement = document.getElementById('ai-tts-player') as HTMLAudioElement;
          if (!audioElement) return;

          // Group sentences into chunks of ~200 characters to prevent TTS stuttering on newlines
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
          
          let currentSentence = 0;
          const preloadedAudios: { [key: number]: HTMLAudioElement } = {};

          const preloadChunk = (index: number) => {
            if (index >= sentences.length) return;
            const chunk = sentences[index].trim();
            if (!chunk || preloadedAudios[index]) return;
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(chunk)}`;
            audio.load();
            preloadedAudios[index] = audio;
          };

          const playNext = () => {
            if (currentSentence >= sentences.length) {
              audioElement.onended = null;
              return;
            }
            const chunk = sentences[currentSentence].trim();
            if (!chunk) {
              currentSentence++;
              playNext();
              return;
            }

            // Preload the next chunk to eliminate network delay
            preloadChunk(currentSentence + 1);

            const url = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(chunk)}`;
            audioElement.src = url;
            audioElement.onended = () => {
              currentSentence++;
              playNext();
            };
            audioElement.play().catch((err) => {
              if (err.name === 'AbortError') return; // Stop sequence quietly if interrupted
              console.error("Audio play failed:", err);
              // Try next chunk if this one fails for other reasons (e.g., network)
              currentSentence++;
              playNext();
            });
          };

          preloadChunk(0);
          playNext();
        };

        autoPlayVietnamese();
        usedVoiceRef.current = false;
      }

      try {
        const refreshed = await fetchChatHistory();
        setHistoryRows(refreshed || []);
      } catch (e) {
        console.error('Không thể tải lại danh sách lịch sử', e);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: "Có chút lỗi kỹ thuật, bạn thử lại sau nhen!" }]);
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText: string, options?: { hiddenUserMessage?: boolean; overrideSubject?: string }) => {
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
        try {
          const refreshed = await fetchChatHistory();
          setHistoryRows(refreshed || []);
        } catch (e) {
          // ignore
        }
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

  // Reusable hook for a future Visual Prompting button or any preset prompt source
  const handlePresetPrompt = async (promptText: string) => {
    await sendMessage(promptText);
  };

  const handleSuggestionClick = async (label: string) => {
    const command = commandFromSuggestion(label, user.grade || 12, selectedSubject);
    setInput(command);
    await sendMessage(command);
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
              <form onSubmit={handleGeneralChat} className="mx-auto flex max-w-[800px] gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm focus-within:border-brand-500/50">
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
          <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6">
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
                <div className={`max-w-[min(780px,100%)] min-w-0 ${msg.role === 'user' ? 'text-white font-medium' : 'text-[var(--text-primary)]'}`}>
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
                            <MessageContent content={answerPart || ''} />
                          </div>

                          {/* Nút Đọc To (Speaker) */}
                          {msg.status === 'completed' && answerPart && (
                            <div className="mt-1 flex items-center justify-start">
                              <button
                                onClick={() => {
                                  const cleanText = convertMathToVietnameseSpeech(answerPart.replace(/[*#_]/g, ''));
                                  const audioElement = document.getElementById('ai-tts-player') as HTMLAudioElement;
                                  if (!audioElement) return;

                                  // Group sentences into chunks of ~200 characters to prevent TTS stuttering on newlines
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
                                  
                                  let currentSentence = 0;
                                  const preloadedAudios: { [key: number]: HTMLAudioElement } = {};

                                  const preloadChunk = (index: number) => {
                                    if (index >= sentences.length) return;
                                    const chunk = sentences[index].trim();
                                    if (!chunk || preloadedAudios[index]) return;
                                    const audio = new Audio();
                                    audio.preload = 'auto';
                                    audio.src = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(chunk)}`;
                                    audio.load();
                                    preloadedAudios[index] = audio;
                                  };

                                  const playNext = () => {
                                    if (currentSentence >= sentences.length) {
                                      audioElement.onended = null;
                                      return;
                                    }
                                    const chunk = sentences[currentSentence].trim();
                                    if (!chunk) {
                                      currentSentence++;
                                      playNext();
                                      return;
                                    }

                                    // Preload the next chunk to eliminate network delay
                                    preloadChunk(currentSentence + 1);

                                    const url = `${API_BASE_URL}/api/tts?text=${encodeURIComponent(chunk)}`;
                                    audioElement.src = url;
                                    audioElement.onended = () => {
                                      currentSentence++;
                                      playNext();
                                    };
                                    audioElement.play().catch((err) => {
                                      if (err.name === 'AbortError') return; // Stop sequence quietly if interrupted
                                      console.error("Audio play failed:", err);
                                      currentSentence++;
                                      playNext();
                                    });
                                  };

                                  preloadChunk(0);
                                  playNext();
                                }}
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
                                <div className={`mt-3 text-sm font-bold ${quizResults[msg.id] ? 'text-green-400' : 'text-red-400'}`}>
                                  {quizResults[msg.id] ? '✨ Chính xác! Điểm kinh nghiệm +10 EXP' : '❌ Sai rồi, thử lại ở câu sau nhé!'}
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
            <button
              onClick={() => {
                const newState = !autoVoiceEnabled;
                setAutoVoiceEnabled(newState);
                
                const audioElement = document.getElementById('ai-tts-player') as HTMLAudioElement;
                if (!newState && audioElement) {
                  // Stop audio immediately when toggled off
                  audioElement.pause();
                  audioElement.removeAttribute('src');
                  audioElement.load();
                } else if (newState && audioElement && !audioElement.src) {
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
            <form onSubmit={handleSend} className="mx-auto flex w-full max-w-[800px] items-center gap-2 rounded-[24px] border border-white/10 bg-white/5 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
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
              <div className="absolute bottom-[80px] right-4 left-4 md:left-auto md:w-[600px] z-50 animate-in slide-in-from-bottom-4">
                <DrawingCanvas 
                  onClose={() => setIsDrawingMode(false)} 
                  onSave={handleDrawingSave}
                  isDarkMode={isDarkMode}
                />
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
