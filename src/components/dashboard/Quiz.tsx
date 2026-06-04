import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, BookOpen, Layers, Sparkles, CheckCircle, XCircle, ArrowRight, RefreshCw, Star, Upload } from 'lucide-react';
import { User } from '../../types';
import { API_BASE_URL } from '../../lib/api';
import { useStudyTracker } from '../../hooks/useStudyTracker';
import { supabase } from '../../lib/supabase';

interface QuizProps {
  user: User;
}

export default function Quiz({ user }: QuizProps) {
  const [activeTab, setActiveTab] = useState<'generator' | 'flashcards'>('generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getInferredSubject = (topicStr: string) => {
    const t = topicStr.toLowerCase();
    if (t.includes('toán') || t.includes('đạo hàm') || t.includes('hình học') || t.includes('tích phân') || t.includes('số học') || t.includes('phương trình')) return 'Toán';
    if (t.includes('tiếng việt') || t.includes('văn học') || t.includes('tác phẩm') || t.includes('bài thơ')) return 'Tiếng Việt';
    if (t.includes('anh') || t.includes('english') || t.includes('grammar') || t.includes('vocabulary')) return 'Tiếng Anh';
    if (t.includes('lý') || t.includes('vật lý') || t.includes('lực') || t.includes('quang học')) return 'Khoa học';
    if (t.includes('tin học') || t.includes('máy tính') || t.includes('programming') || t.includes('code')) return 'Tin học';
    if (t.includes('đạo đức') || t.includes('gdcd')) return 'Đạo đức';
    if (t.includes('lịch sử') || t.includes('địa lý')) return 'Lịch sử và Địa lý';
    return 'Luyện tập';
  };

  useStudyTracker(user, topic ? getInferredSubject(topic) : 'Luyện tập');
  
  // Quiz states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState('Trung bình');
  const [numQuestions, setNumQuestions] = useState(10);
  const [quizData, setQuizData] = useState<any[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);

  // Flashcard states
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flashcardsData, setFlashcardsData] = useState<any[]>([]);

  // Mock Data
  const mockQuiz = [
    {
      question: 'Đạo hàm của hàm số y = x^3 - 3x + 2 là gì?',
      options: ['y\' = 3x^2 - 3', 'y\' = x^2 - 3x', 'y\' = 3x^2 + 3', 'y\' = x^3 - 3'],
      correctAnswer: 0,
      explanation: 'Áp dụng công thức đạo hàm cơ bản: (x^n)\' = n.x^(n-1). Đạo hàm của x^3 là 3x^2, đạo hàm của -3x là -3. Hằng số 2 có đạo hàm bằng 0.'
    },
    {
      question: 'Tìm tập xác định của hàm số y = log(x-2)',
      options: ['D = R', 'D = (2; +∞)', 'D = [2; +∞)', 'D = R \\ {2}'],
      correctAnswer: 1,
      explanation: 'Hàm số logarit có nghĩa khi biểu thức dưới dấu logarit lớn hơn 0. Do đó x - 2 > 0 hay x > 2.'
    }
  ];

  const mockFlashcards = [
    { front: 'Đạo hàm của sin(x)', back: 'cos(x)' },
    { front: 'Thể tích hình cầu', back: 'V = (4/3)πR^3' },
    { front: 'Định lý Vi-et (Tổng 2 nghiệm)', back: 'x1 + x2 = -b/a' }
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    
    try {
      if (activeTab === 'generator') {
        const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/generate-quiz` : '/api/generate-quiz';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            difficulty,
            num_questions: numQuestions,
            grade: String(user.grade),
            file_content: fileContent
          })
        });
        const data = await res.json();
        if (data.status === 'success' && data.data && data.data.length > 0) {
          setQuizData(data.data);
          setCurrentQuestionIndex(0);
          setScore(0);
          setSelectedAnswer(null);
          setShowExplanation(false);
          setQuizFinished(false);
        } else {
          alert("Không thể tạo bài tập lúc này, vui lòng thử lại!");
        }
      } else {
        const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/generate-flashcards` : '/api/generate-flashcards';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            grade: String(user.grade),
            file_content: fileContent
          })
        });
        const data = await res.json();
        if (data.status === 'success' && data.data && data.data.length > 0) {
          setFlashcardsData(data.data);
          setCurrentCardIndex(0);
          setIsFlipped(false);
        } else {
          alert("Không thể tạo flashcards lúc này, vui lòng thử lại!");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối tới máy chủ.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('grade', String(user.grade));
    if (user.id && !user.isGuest) {
      formData.append('user_id', user.id);
    }

    try {
      const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/upload` : '/api/upload';
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.content) {
        if (data.data.content.startsWith('Error:')) {
          alert(`Không thể đọc được file PDF này: ${data.data.content}\nVui lòng kiểm tra lại file đã tải lên.`);
        } else {
          setFileContent(data.data.content);
          if (!topic) setTopic(`Dựa trên file: ${file.name}`);

          // Save to guest docs if guest
          if (user.isGuest || !user.id) {
            const key = `virtual_tutor_guest_docs_${user.id || 'guest'}`;
            const docItem = {
              id: data.data.id || Math.random().toString(),
              title: data.data.name || file.name,
              status: 'ready',
              date: new Date().toLocaleDateString('en-GB'),
              subject: 'Khác',
              pdf_url: data.data.pdf_url || ''
            };
            const current = localStorage.getItem(key);
            const parsed = current ? JSON.parse(current) : [];
            parsed.unshift(docItem);
            localStorage.setItem(key, JSON.stringify(parsed));
          }

          alert(`Tải file thành công! AI sẽ dựa vào nội dung file để tạo câu hỏi.`);
        }
      } else {
        alert("Lỗi khi xử lý file!");
      }
    } catch (err) {
      console.error("Lỗi upload file:", err);
      alert("Lỗi kết nối khi tải file!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showExplanation || quizData.length === 0) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    if (index === quizData[currentQuestionIndex]?.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const saveQuizScore = async (finalScore: number) => {
    if (user.isGuest || !user.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const url = import.meta.env.DEV ? `${API_BASE_URL.replace(/\/$/, '')}/api/user/add-sp` : '/api/user/add-sp';
      const spEarned = finalScore * 10;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sp_amount: spEarned })
      });
      console.log(`Successfully synced ${spEarned} SP to backend database.`);
    } catch (err) {
      console.error("Failed to sync quiz SP to backend database:", err);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
      saveQuizScore(score);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-brand-500" />
            Luyện Tập & Thử Thách
          </h1>
          <p className="text-slate-500 mt-1">
            {user.grade <= 5 
              ? "Làm bài kiểm tra vui và lật thẻ bài ma thuật để nhận sao nhé!"
              : "Hệ thống AI tự động sinh đề trắc nghiệm và thẻ học tập Flashcard theo yêu cầu của bạn."}
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'generator' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Sparkles className="w-4 h-4" /> Đề trắc nghiệm AI
          </button>
          <button 
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'flashcards' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Layers className="w-4 h-4" /> Thẻ học tập Flashcards
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'generator' && (
          <motion.div 
            key="generator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Left: Input & Generate */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-fit">
              <h3 className="font-bold text-slate-800 mb-4 text-lg">Khởi tạo bài test</h3>
              <p className="text-sm text-slate-500 mb-4">Nhập một chủ đề cụ thể hoặc dán một đoạn văn bản, AI sẽ quét và tự động sinh ra bộ câu hỏi dành riêng cho bạn.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chủ đề hoặc Nội dung bài học</label>
                  <div className="relative">
                    <textarea 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="VD: Đạo hàm hàm số lượng giác..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none h-32"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <input 
                        type="file" 
                        id="quizFile" 
                        className="hidden" 
                        accept=".pdf,.jpg,.jpeg,.png,.txt"
                        onChange={handleFileUpload}
                      />
                      <label 
                        htmlFor="quizFile" 
                        className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-brand-600 cursor-pointer transition-colors"
                        title="Tải tài liệu lên"
                      >
                        {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </label>
                    </div>
                  </div>
                  {fileContent && (
                    <div className="mt-2 text-xs text-brand-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Đã nhận diện dữ liệu từ file
                    </div>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Độ khó</label>
                    <select 
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700"
                    >
                      <option value="Dễ">Dễ (Nhận biết)</option>
                      <option value="Trung bình">Trung bình (Thông hiểu)</option>
                      <option value="Khó">Khó (Vận dụng)</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Số câu</label>
                    <select 
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-slate-700"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim()}
                  className="w-full mt-4 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Tạo đề ngay
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Quiz Interface */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* Quiz Header */}
                {!quizFinished && quizData.length > 0 && (
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-black">
                        {currentQuestionIndex + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Câu hỏi {currentQuestionIndex + 1}/{quizData.length || 1}</h4>
                        <div className="w-48 h-2 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-brand-500 transition-all duration-500 ease-out"
                            style={{ width: `${quizData.length ? ((currentQuestionIndex) / quizData.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-bold text-sm">
                      <Star className="w-4 h-4 fill-orange-500" /> Điểm: {score * 10}
                    </div>
                  </div>
                )}

                {/* Quiz Body */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  {quizFinished ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
                      <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center relative">
                        <Star className="w-12 h-12 text-orange-500 fill-orange-500" />
                      </div>
                      
                      <div>
                        <h2 className="text-2xl font-black text-slate-800">Hoàn thành bài luyện tập!</h2>
                        <p className="text-slate-500 mt-2 font-semibold">Bạn đạt được {score}/{quizData.length} câu đúng ({score * 10} điểm)</p>
                      </div>

                      <div className="max-w-md bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <p className="text-slate-600 font-semibold leading-relaxed">
                          {score === quizData.length 
                            ? "🎉 Tuyệt hảo! Bạn đã trả lời đúng tất cả các câu hỏi. Xuất sắc!"
                            : score >= quizData.length * 0.8
                            ? "🌟 Tuyệt vời! Bạn nắm rất vững kiến thức chủ đề này."
                            : score >= quizData.length * 0.5
                            ? "👍 Khá tốt! Hãy ôn lại các câu trả lời chưa đúng để nắm chắc hơn nhé."
                            : "💪 Cố gắng lên! Đọc thêm tài liệu và luyện tập lại để cải thiện kết quả."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                        <button
                          onClick={() => {
                            // Làm lại bài này
                            setCurrentQuestionIndex(0);
                            setScore(0);
                            setSelectedAnswer(null);
                            setShowExplanation(false);
                            setQuizFinished(false);
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" /> Làm lại
                        </button>
                        <button
                          onClick={() => {
                            // Tạo đề khác
                            setQuizData([]);
                            setCurrentQuestionIndex(0);
                            setScore(0);
                            setSelectedAnswer(null);
                            setShowExplanation(false);
                            setQuizFinished(false);
                          }}
                          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" /> Làm đề mới
                        </button>
                      </div>
                    </div>
                  ) : quizData.length > 0 ? (
                    <>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-8 leading-relaxed">
                          {quizData[currentQuestionIndex]?.question}
                        </h2>
                        
                        <div className="space-y-3">
                          {quizData[currentQuestionIndex]?.options?.map((opt: string, i: number) => {
                            let btnClass = "bg-white border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50";
                            let icon = null;
                            
                            if (showExplanation) {
                              if (i === quizData[currentQuestionIndex].correctAnswer) {
                                btnClass = "bg-emerald-50 border-emerald-500 text-emerald-800";
                                icon = <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
                              } else if (i === selectedAnswer) {
                                btnClass = "bg-red-50 border-red-500 text-red-800 opacity-70";
                                icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
                              } else {
                                btnClass = "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
                              }
                            } else if (selectedAnswer === i) {
                              btnClass = "bg-brand-50 border-brand-500 text-brand-800 shadow-sm";
                            }

                            return (
                              <button
                                key={i}
                                disabled={showExplanation}
                                onClick={() => handleAnswerSelect(i)}
                                className={`w-full text-left p-4 border-2 rounded-xl transition-all font-semibold flex items-center justify-between gap-4 ${btnClass}`}
                              >
                                <span className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded bg-white shadow-sm flex items-center justify-center text-xs text-slate-500 shrink-0">
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  {opt}
                                </span>
                                {icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation Area */}
                      <AnimatePresence>
                        {showExplanation && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 pt-6 border-t border-slate-100"
                          >
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6">
                              <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-2 text-sm">
                                <BrainCircuit className="w-5 h-5" />
                                Gia sư AI giải thích:
                              </h4>
                              <p className="text-indigo-900/80 text-sm leading-relaxed font-medium">
                                {quizData[currentQuestionIndex]?.explanation}
                              </p>
                            </div>
                            <button 
                              onClick={handleNextQuestion}
                              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                            >
                              {currentQuestionIndex < quizData.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">Nhập chủ đề ở cột bên trái và bấm "Tạo đề ngay" để bắt đầu luyện tập nhé!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'flashcards' && (
          <motion.div 
            key="flashcards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center max-w-2xl mx-auto"
          >
            <div className="w-full flex items-center justify-between mb-8">
              <h3 className="font-bold text-slate-800">Bộ thẻ: Công thức Đạo hàm cơ bản</h3>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                {flashcardsData.length > 0 ? currentCardIndex + 1 : 0} / {flashcardsData.length}
              </span>
            </div>
            
            {/* Input Form cho Flashcards */}
            <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 flex gap-2 w-full">
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Nhập chủ đề tạo thẻ (vd: Công thức Lượng giác)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                />
                <input 
                  type="file" 
                  id="flashcardFile" 
                  className="hidden" 
                  accept=".pdf,.jpg,.jpeg,.png,.txt"
                  onChange={handleFileUpload}
                />
                <label 
                  htmlFor="flashcardFile" 
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-purple-600 cursor-pointer transition-colors flex items-center justify-center shrink-0"
                  title="Tải tài liệu lên"
                >
                  {isUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </label>
              </div>
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto justify-center"
              >
                {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Tạo
              </button>
            </div>
            {fileContent && (
              <div className="text-xs text-purple-600 font-medium flex items-center gap-1 mb-4">
                <CheckCircle className="w-3 h-3" /> Đã nhận diện dữ liệu từ file để tạo thẻ
              </div>
            )}

            {/* Flashcard Component */}
            <div 
              className="w-full aspect-[4/3] sm:aspect-[16/9] perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                className="w-full h-full relative cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
              >
                {/* Front */}
                <div 
                  className="absolute inset-0 bg-white border-2 border-slate-200 shadow-lg rounded-3xl flex flex-col items-center justify-center p-8 hover:border-purple-300 transition-colors"
                  style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                >
                  <span className="absolute top-6 left-6 text-slate-300 font-bold uppercase tracking-widest text-xs">Câu hỏi</span>
                  <BookOpen className="w-12 h-12 text-slate-200 mb-6" />
                  <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 text-center leading-tight">
                    {flashcardsData.length > 0 ? flashcardsData[currentCardIndex]?.front : 'Nhập chủ đề ở ô Tìm kiếm và tạo thẻ nhé!'}
                  </h2>
                  <p className="absolute bottom-6 text-slate-400 text-sm font-medium animate-pulse">Bấm để lật thẻ</p>
                </div>

                {/* Back */}
                <div 
                  className="absolute inset-0 bg-purple-600 shadow-lg rounded-3xl flex flex-col items-center justify-center p-8 border border-purple-500"
                  style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <span className="absolute top-6 left-6 text-purple-300 font-bold uppercase tracking-widest text-xs">Đáp án</span>
                  <Sparkles className="w-12 h-12 text-purple-300 mb-6" />
                  <h2 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight">
                    {flashcardsData.length > 0 ? flashcardsData[currentCardIndex]?.back : 'Chưa có thẻ nào'}
                  </h2>
                </div>
              </motion.div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-12 w-full justify-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                  setTimeout(() => setCurrentCardIndex(prev => Math.max(0, prev - 1)), 150);
                }}
                disabled={currentCardIndex === 0}
                className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <ArrowRight className="w-6 h-6 rotate-180" />
              </button>
              
              <button 
                className="px-8 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
              >
                <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-purple-500 group-hover:rotate-180 transition-all duration-500" /> Trộn thẻ
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                  setTimeout(() => setCurrentCardIndex(prev => Math.min(flashcardsData.length - 1, prev + 1)), 150);
                }}
                disabled={currentCardIndex === flashcardsData.length - 1 || flashcardsData.length === 0}
                className="w-14 h-14 rounded-full bg-purple-600 border border-purple-500 flex items-center justify-center text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
