import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, ChevronRight, Download, Upload, CheckCircle2, File, Library, Trash2, Edit2, Loader2, BookMarked, GraduationCap } from 'lucide-react';
import { Textbook, Grade, User } from '../../types';
import { TEXTBOOKS_DATA } from '../../data/textbooks';
import { supabase } from '../../lib/supabase';

interface LibraryProps {
  currentGrade: Grade;
  setActiveTab?: (tab: string) => void;
  onOpenWorkspace?: (config: {url: string, title: string, grade: string | number, subject: string}) => void;
  user: User;
}

export default function LibraryComponent({ currentGrade, setActiveTab, onOpenWorkspace, user }: LibraryProps) {

  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Textbook | null>(null);
  
  // Tabs for System vs Personal
  const [activeSubTab, setActiveSubTab] = useState<'system' | 'personal'>('system');

  // Personal Docs State
  const [personalDocs, setPersonalDocs] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('giasuao_library_personal');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [systemDocs, setSystemDocs] = useState<Textbook[]>(() => {
    try {
      const cached = localStorage.getItem('giasuao_library_system');
      if (cached) return JSON.parse(cached);
    } catch {}
    return TEXTBOOKS_DATA;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      const isValidUUID = user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);

      if (!isValidUUID) {
        setPersonalDocs([]);
        const system = [...TEXTBOOKS_DATA];
        setSystemDocs(system);
        setIsLoading(false);
        return;
      }
      try {
        const [personalRes, systemRes, chatRes] = await Promise.all([
          supabase.from('documents').select('*').eq('user_id', user.id),
          supabase.from('documents').select('*').is('user_id', null),
          supabase.from('chat_history').select('content, id, timestamp').eq('user_id', user.id)
        ]);
        
        const personal = personalRes.data || [];
        const system = systemRes.data || [];
        
        const chatImages: any[] = [];
        if (chatRes.data) {
          chatRes.data.forEach(msg => {
            if (msg.content) {
              const match = msg.content.match(/!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+)\)/);
              if (match) {
                chatImages.push({
                  id: msg.id || Math.random().toString(),
                  title: `Ảnh từ đoạn chat`,
                  status: 'ready',
                  date: new Date(msg.timestamp || Date.now()).toLocaleDateString('en-GB'),
                  subject: 'Tài liệu Chat',
                  pdf_url: match[1]
                });
              }
            }
          });
        }
        
        const finalPersonal = [
          ...personal.map(d => ({
            id: d.id,
            title: d.name || 'Tài liệu không tên',
            status: 'ready',
            date: new Date(d.created_at || Date.now()).toLocaleDateString('en-GB'),
            subject: d.subject || 'Khác',
            pdf_url: d.pdf_url
          })),
          ...chatImages
        ];

        setPersonalDocs(finalPersonal);
        localStorage.setItem('giasuao_library_personal', JSON.stringify(finalPersonal));

        const mappedSystemDocs = system.map(d => {
          // Normalize names for matching
          const dbName = (d.name || d.title || d.subject || '').toLowerCase().replace(/\.pdf$/, '').trim();
          
          // Find the matching book in TEXTBOOKS_DATA to get its Google Drive PDF URL
          const matchingLocalBook = TEXTBOOKS_DATA.find(
             local => (local.title || local.name || local.subject || '').toLowerCase().replace(/\.pdf$/, '').trim() === dbName
          );

          return {
            id: d.id,
            title: d.name ? d.name.replace(/\.pdf$/i, '') : 'Sách giáo khoa',
            subject: d.subject || 'Khác',
            grade: Number(d.grade) || currentGrade,
            series: 'Kết nối tri thức',
            thumbnail: d.thumbnail_url || '',
            pages: matchingLocalBook?.pages || 100,
            size: matchingLocalBook?.size || 'N/A',
            pdf_url: matchingLocalBook?.pdf_url || d.pdf_url
          };
        });
        
        // We only use the mappedSystemDocs now because they represent the unified books 
        // (Supabase metadata + Google Drive content)
        const finalSystem = [...mappedSystemDocs];
        setSystemDocs(finalSystem);
        localStorage.setItem('giasuao_library_system', JSON.stringify(finalSystem));
      } catch (err) {
        console.error('Error fetching docs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDocs();
  }, [user.id, currentGrade]);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const subjects = ['Tất cả', 'Toán', 'Tiếng Việt', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lí', 'Tin học', 'Khoa học tự nhiên', 'Lịch sử và Địa lí', 'Tự nhiên và Xã hội', 'Giáo dục công dân', 'Đạo đức', 'Công nghệ'];

  const filteredBooks = systemDocs.filter(book => {
    if (book.grade !== currentGrade) return false;

    if (selectedSubject !== 'Tất cả' && book.subject !== selectedSubject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!book.title.toLowerCase().includes(q) && !book.subject.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleUploadClick = () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadSuccess(true);
          setPersonalDocs(prev => [{
            id: Math.random().toString(),
            title: `Tài liệu mới ${prev.length + 1}.pdf`,
            status: 'analyzing', // Initially analyzing
            date: new Date().toLocaleDateString('en-GB'),
            subject: 'Khác'
          }, ...prev]);
          setTimeout(() => setUploadSuccess(false), 3000); // clear success after 3s
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const deleteDoc = (id: string) => {
    setPersonalDocs(prev => prev.filter(doc => doc.id !== id));
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-50 p-1 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => { setActiveSubTab('system'); setSelectedBook(null); }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'system' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sách Hệ Thống
          </button>
          <button 
            onClick={() => { setActiveSubTab('personal'); setSelectedBook(null); }}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeSubTab === 'personal' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tài Liệu Cá Nhân
          </button>
        </div>

        <div className="relative w-full md:w-[350px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sách, tài liệu..."
            className="w-full bg-slate-50 border border-slate-200 hover:border-brand-300 focus:border-brand-500 rounded-xl py-2.5 pl-11 pr-4 text-sm outline-none transition-all font-medium text-slate-700"
          />
        </div>
      </div>

      {activeSubTab === 'system' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {subjects.map(sub => (
                <button
                  key={sub}
                  onClick={() => { setSelectedBook(null); setSelectedSubject(sub); }}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedSubject === sub 
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            </div>
          </div>

          {/* Render System Books */}
          <AnimatePresence mode="wait">
            {selectedBook ? (
              <motion.div
                key="book-details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-[32px] overflow-hidden border border-slate-200 shadow-xl"
              >
                <div className="grid md:grid-cols-12 max-h-[800px]">
                  <div className="md:col-span-5 bg-slate-50 p-8 md:p-12 relative flex items-center justify-center">
                    <button 
                      onClick={() => setSelectedBook(null)}
                      className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-all z-20"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="w-full max-w-[300px] aspect-[3/4] bg-white rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden relative group">
                        <div className="absolute top-4 right-4 w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10 group-hover:scale-110 transition-transform">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                      {selectedBook.thumbnail ? (
                        <img src={selectedBook.thumbnail} alt={selectedBook.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-16 h-16 text-slate-300" />
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg shadow-md">{selectedBook.series}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="md:col-span-7 p-8 md:p-12 space-y-8 overflow-y-auto">
                    <div>
                      <h2 className="text-3xl font-bold text-slate-800 mb-4">{selectedBook.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">Lớp {selectedBook.grade}</span>
                        <span className="px-3 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-md">{selectedBook.subject}</span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-md">{selectedBook.pages} Trang</span>
                      </div>
                    </div>

                    <p className="text-slate-600 leading-relaxed font-medium">
                      {selectedBook.description || "Cuốn sách cung cấp đầy đủ kiến thức theo khung chương trình của Bộ Giáo dục và Đào tạo."}
                    </p>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Mục lục bài học</h4>
                      <div className="grid gap-3">
                        {selectedBook.chapters?.map((chapter, i) => (
                          <div key={i} className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-brand-200 transition-all cursor-pointer group">
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition-colors mb-1">{chapter.title}</span>
                            {chapter.description && <span className="text-xs text-slate-500 font-medium">{chapter.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      <button 
                        onClick={() => onOpenWorkspace ? onOpenWorkspace({
                          url: selectedBook.pdf_url || "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf",
                          title: selectedBook.title,
                          grade: selectedBook.grade,
                          subject: selectedBook.subject
                        }) : setActiveTab?.('workspace')}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all shadow-md"
                      >
                        <BookOpen className="w-5 h-5" />
                        Đọc sách trực tuyến
                      </button>
                      <button 
                        onClick={() => selectedBook.pdf_url ? window.open(selectedBook.pdf_url, '_blank') : alert('Chưa có bản PDF')}
                        className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Tải PDF
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="books-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
              >
                {filteredBooks.map((book) => (
                  <motion.div
                    key={book.id}
                    whileHover={{ y: -8 }}
                    onClick={() => setSelectedBook(book)}
                    className="bg-white rounded-[24px] p-5 shadow-sm hover:shadow-xl border border-slate-100 hover:border-brand-200 transition-all duration-300 cursor-pointer group flex flex-col"
                  >
                    <div className="aspect-[3/4] bg-slate-50 rounded-xl mb-5 relative overflow-hidden flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                       <div className="absolute top-4 right-4 w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] border-2 border-white z-10 opacity-0 group-hover:opacity-100 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                         <GraduationCap className="w-4 h-4 text-white" />
                       </div>
                      {book.thumbnail ? (
                        <img fetchPriority="high" decoding="async" src={book.thumbnail} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 ease-out" />
                      ) : (
                        <BookOpen className="w-10 h-10 text-slate-300 group-hover:scale-110 group-hover:text-brand-400 transition-all duration-300" />
                      )}
                      {book.isNew && (
                        <div className="absolute top-2 left-2 bg-brand-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                          Mới
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    </div>
                    
                    <h4 className="text-[17px] font-extrabold text-slate-800 mb-1.5 line-clamp-2 group-hover:text-brand-600 transition-colors">{book.title}</h4>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-4 mt-auto">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-500">{book.series}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>Lớp {book.grade}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                      <span className="text-xs font-bold text-brand-600 transition-colors">Xem chi tiết</span>
                      <ChevronRight className="w-4 h-4 text-brand-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}

                {filteredBooks.length === 0 && (
                  <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center">
                      <Library className="w-8 h-8 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-700">Chưa tìm thấy cuốn sách nào</h3>
                      <p className="text-sm text-slate-500 font-medium">Bạn thử đổi bộ sách hoặc tìm kiếm lại nhé.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeSubTab === 'personal' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-brand-50 border border-brand-100 p-6 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-brand-900 mb-2">Kho tài liệu của riêng bạn</h2>
              <p className="text-sm font-medium text-brand-700 max-w-xl">
                Tải lên đề thi, tài liệu tham khảo, bài giảng dạng PDF để AI tự động học và trở thành gia sư riêng để giải đáp mọi thắc mắc.
              </p>
            </div>
            
            <div className="relative z-10 w-full max-w-[240px]">
              <div className="relative group/upload">
                <button 
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md group-hover/upload:-translate-y-1 ${
                    uploadSuccess 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {uploadSuccess ? (
                    <><CheckCircle2 className="w-5 h-5" /> Thành công</>
                  ) : isUploading ? (
                    <><motion.div animate={{rotate: 360}} transition={{repeat: Infinity, duration: 1, ease: 'linear'}}><Loader2 className="w-5 h-5"/></motion.div> {uploadProgress}%</>
                  ) : (
                    <><Upload className="w-5 h-5" /> Tải tài liệu lên</>
                  )}
                </button>
                {/* Upload Progress Bar */}
                {isUploading && (
                  <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-brand-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-800"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Background elements */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-brand-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {personalDocs.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase())).map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    if (!doc.pdf_url) return;
                    if (doc.pdf_url.startsWith('data:image')) {
                      const win = window.open();
                      if (win) {
                        win.document.write(`
                          <html>
                            <head><title>Hình ảnh chi tiết</title></head>
                            <body style="margin: 0; background: #000; display: flex; align-items: center; justify-content: center; height: 100vh;">
                              <img src="${doc.pdf_url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                            </body>
                          </html>
                        `);
                        win.document.close();
                      }
                    } else if (onOpenWorkspace) {
                      onOpenWorkspace({
                        url: doc.pdf_url,
                        title: doc.title || 'Tài liệu',
                        grade: currentGrade,
                        subject: doc.subject || 'Tài liệu Cá Nhân'
                      });
                    } else {
                      window.open(doc.pdf_url, '_blank');
                    }
                  }}
                  className="bg-white border text-left border-slate-200 shadow-sm hover:shadow-md hover:border-brand-300 rounded-2xl p-4 transition-all flex flex-col group cursor-pointer"
                >
                  <div className="aspect-[3/4] bg-slate-50 flex items-center justify-center rounded-xl mb-4 relative overflow-hidden group-hover:bg-slate-100 transition-colors">
                    <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    {doc.pdf_url && (doc.pdf_url.startsWith('data:image/') || doc.pdf_url.match(/\.(jpeg|jpg|gif|png)$/i)) ? (
                      <img src={doc.pdf_url} alt={doc.title} className="w-full h-full object-cover" />
                    ) : (
                      <File className="w-12 h-12 text-slate-300 group-hover:text-brand-300 transition-colors" />
                    )}
                    {doc.status === 'analyzing' ? (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Đang phân tích
                      </div>
                    ) : (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        Sẵn sàng
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-base leading-tight mb-1 truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mb-4">{doc.subject} • {doc.date}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                      Đổi tên
                    </button>
                    <button onClick={() => deleteDoc(doc.id)} className="w-10 h-10 flex shrink-0 items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {personalDocs.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4">
                  <File className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700">Chưa có tài liệu nào</h3>
                <p className="text-sm font-medium text-slate-500">Tải lên các tài liệu để bắt đầu nhé.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
