import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, UploadCloud, Save, CheckCircle2, ShieldAlert, FileText, X, Activity, AlertTriangle, Settings2, Users, Database, LayoutDashboard, Search, Lock, Unlock, KeyRound, Shield, Edit2, Trash2, Bot, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { uploadDocument, getAdminDocuments, reprocessDocument, deleteDocument } from '../../lib/api';

interface BookUpload {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

const usageData = [
  { name: 'T2', usage: 4000, errors: 24 },
  { name: 'T3', usage: 3000, errors: 13 },
  { name: 'T4', usage: 2000, errors: 48 },
  { name: 'T5', usage: 2780, errors: 39 },
  { name: 'T6', usage: 1890, errors: 48 },
  { name: 'T7', usage: 2390, errors: 38 },
  { name: 'CN', usage: 3490, errors: 43 },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'aiConfig' | 'rag' | 'users'>('overview');

  // AI Config State
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('Bạn là một Gia sư ảo thông minh, thân thiện dành cho học sinh Việt Nam. Hãy xưng là "Cô" và gọi học sinh là "em/con".');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // RAG Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<BookUpload[]>([]);
  const [uploadGrade, setUploadGrade] = useState<number>(10);
  const [uploadSubject, setUploadSubject] = useState('Toán học');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // RAG Chunks Data State
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [chunkSearchQuery, setChunkSearchQuery] = useState('');

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  
  // Stats State
  const [stats, setStats] = useState({ totalDocs: 0, totalUsers: 0 });

  // Documents List State
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [ragSubTab, setRagSubTab] = useState<'docs' | 'chunks'>('docs');

  // Load Admin Data on Mount
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setIsUsersLoading(true);
        // Load profiles
        const { data: profiles } = await supabase.from('profiles').select('*');
        if (profiles) {
          setUsersList(profiles.map(p => {
            let status = 'active';
            const nameParts = (p.full_name || '').split('|');
            for (const part of nameParts) {
              if (part.trim() === 'status:locked') {
                status = 'locked';
              }
            }
            return {
              id: p.id,
              name: nameParts[0].trim() || p.email?.split('@')[0] || 'Người dùng',
              email: p.email || 'N/A',
              grade: p.grade || 1,
              role: p.role || 'student',
              status: status
            };
          }));
        }

        // Load document metrics
        const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        setStats({ totalDocs: docsCount || 0, totalUsers: usersCount || 0 });
      } catch (err) {
        console.error("Admin fetch error", err);
      } finally {
        setIsUsersLoading(false);
      }
    };

    fetchAdminData();
    fetchAIConfigs();
    fetchRAGChunks();
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const res = await getAdminDocuments();
      if (res && res.status === 'success' && res.data) {
        setDocumentsList(res.data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleReprocessDoc = async (docId: string) => {
    try {
      setDocumentsList(prev => prev.map(d => d.id === docId ? { ...d, status: 'processing' } : d));
      const res = await reprocessDocument(docId);
      if (res && res.status === 'success') {
        alert("Đã bắt đầu xử lý lại tài liệu!");
        fetchDocuments();
      }
    } catch (err: any) {
      alert(`Lỗi khi xử lý lại tài liệu: ${err.message || err}`);
      fetchDocuments();
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này và tất cả các đoạn văn bản bóc tách liên quan không?")) return;
    try {
      const res = await deleteDocument(docId);
      if (res && res.status === 'success') {
        setDocumentsList(prev => prev.filter(d => d.id !== docId));
        fetchRAGChunks();
        setStats(prev => ({ ...prev, totalDocs: Math.max(0, prev.totalDocs - 1) }));
      }
    } catch (err: any) {
      alert(`Lỗi khi xóa tài liệu: ${err.message || err}`);
    }
  };

  // Fetch configs from Backend API
  const fetchAIConfigs = async () => {
    try {
      const response = await fetch('/api/admin/configs');
      const res = await response.json();
      if (res && res.status === 'success' && res.data) {
        res.data.forEach((row: any) => {
          if (row.key_name === 'gemini_api_key') setApiKey(row.key_value);
          else if (row.key_name === 'system_prompt') setSystemPrompt(row.key_value);
          else if (row.key_name === 'temperature') setTemperature(parseFloat(row.key_value) || 0.7);
          else if (row.key_name === 'max_tokens') setMaxTokens(parseInt(row.key_value) || 2048);
        });
      }
    } catch (err) {
      console.error("Error fetching configs:", err);
    }
  };

  // Fetch actual RAG chunks from Supabase
  const fetchRAGChunks = async () => {
    try {
      setIsLoadingChunks(true);
      const { data, error } = await supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          document_id,
          documents (
            name,
            grade,
            subject
          )
        `)
        .order('id', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        setExtractedData(data.map((chunk: any) => ({
          id: chunk.id,
          content: chunk.content,
          file: chunk.documents?.name || 'Tài liệu không tên',
          subject: chunk.documents?.subject || 'Khác',
          grade: chunk.documents?.grade || 'N/A',
          document_id: chunk.document_id
        })));
      }
    } catch (err) {
      console.error("Error loading chunks:", err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Save AI Configs to Backend
  const handleSaveAIConfig = async () => {
    setIsSavingConfig(true);
    try {
      const configs = [
        { key_name: 'gemini_api_key', key_value: apiKey },
        { key_name: 'system_prompt', key_value: systemPrompt },
        { key_name: 'temperature', key_value: String(temperature) },
        { key_name: 'max_tokens', key_value: String(maxTokens) }
      ];

      for (const config of configs) {
        await fetch('/api/admin/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save AI configs:", err);
      alert("Lỗi khi lưu cấu hình!");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Upload actual document to RAG pipeline
  const handleFiles = async (files: File[]) => {
    const newUploads = files.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      progress: 10,
      status: 'uploading' as const,
      fileObj: f
    }));

    setUploads(prev => [...newUploads.map(({ id, name, progress, status }) => ({ id, name, progress, status })), ...prev]);

    for (const up of newUploads) {
      try {
        setUploads(prev => prev.map(u => u.id === up.id ? { ...u, progress: 40 } : u));
        
        // uploadDocument(file, grade, userId?, subject?)
        const res = await uploadDocument(up.fileObj, String(uploadGrade), undefined, uploadSubject);
        
        if (res && res.status === 'success') {
          setUploads(prev => prev.map(u => u.id === up.id ? { ...u, progress: 100, status: 'completed' } : u));
          fetchRAGChunks();
          fetchDocuments();
          
          // Update docs count
          const { count: docsCount } = await supabase.from('documents').select('*', { count: 'exact', head: true });
          setStats(prev => ({ ...prev, totalDocs: docsCount || 0 }));
        } else {
          throw new Error("Upload failed");
        }
      } catch (err) {
        console.error("Upload failed for file:", up.name, err);
        setUploads(prev => prev.map(u => u.id === up.id ? { ...u, status: 'error', progress: 100 } : u));
      }
    }
  };

  // Edit RAG text chunk in Supabase
  const handleEditChunk = async (chunkId: string) => {
    try {
      const { error } = await supabase
        .from('document_chunks')
        .update({ content: editValue })
        .eq('id', chunkId);

      if (error) throw error;

      setExtractedData(prev => prev.map(c => c.id === chunkId ? { ...c, content: editValue } : c));
      setEditingContent(null);
    } catch (err: any) {
      alert(`Lỗi khi sửa chunk: ${err.message || err}`);
    }
  };

  // Delete RAG text chunk from Supabase
  const handleDeleteChunk = async (chunkId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đoạn văn bản này khỏi CSDL Vector RAG không?")) return;
    try {
      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .eq('id', chunkId);

      if (error) throw error;

      setExtractedData(prev => prev.filter(c => c.id !== chunkId));
    } catch (err: any) {
      alert(`Lỗi khi xóa chunk: ${err.message || err}`);
    }
  };

  // Lock or Unlock a user
  const handleToggleLockUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'locked' : 'active';
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
      if (!profile) return;

      const parts = (profile.full_name || '').split('|');
      const cleanParts = parts.filter((p: string) => !p.trim().startsWith('status:'));
      if (newStatus === 'locked') {
        cleanParts.push('status:locked');
      }

      const packedName = cleanParts.join('|');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: packedName })
        .eq('id', userId);

      if (error) throw error;

      setUsersList(prev => prev.map(user => user.id === userId ? { ...user, status: newStatus } : user));
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái người dùng: ${err.message || err}`);
    }
  };

  // Promote user to admin role
  const handlePromoteAdmin = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn nâng cấp học viên này lên làm Quản trị viên không?")) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;

      setUsersList(prev => prev.map(user => user.id === userId ? { ...user, role: 'admin' } : user));
    } catch (err: any) {
      alert(`Lỗi nâng cấp Admin: ${err.message || err}`);
    }
  };

  // Reset user password via forgot-password API
  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`Hệ thống sẽ gửi email hướng dẫn tạo lại mật khẩu mới cho tài khoản ${email}. Xác nhận gửi?`)) return;
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!response.ok) throw new Error("API reset failed");
      alert("Đã gửi email khôi phục mật khẩu thành công!");
    } catch (err: any) {
      alert(`Lỗi reset mật khẩu: ${err.message || err}`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const mockErrors = [
    { id: '1', time: '10:23 AM 13/05/2026', type: 'UploadFailed', message: 'Tệp VậtLý12.pdf quá giới hạn 50MB không thể tiền xử lý RAG.' },
    { id: '2', time: '09:15 AM 13/05/2026', type: 'API_Error', message: 'Gemini Rate limit exceeded. Cảnh báo quá tải AI.' },
    { id: '3', time: '14:20 PM 12/05/2026', type: 'DatabaseError', message: 'Timeout khi truy vấn vector search cho môn Lịch sử 11.' },
  ];

  const filteredChunks = extractedData.filter(chunk => 
    chunk.content.toLowerCase().includes(chunkSearchQuery.toLowerCase()) ||
    chunk.file.toLowerCase().includes(chunkSearchQuery.toLowerCase()) ||
    chunk.subject.toLowerCase().includes(chunkSearchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Quản trị Hệ thống</h1>
        <p className="text-slate-500 font-medium">Trung tâm điều khiển AI, dữ liệu giảng dạy và người dùng.</p>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: 'overview', label: 'Theo dõi hệ thống', icon: LayoutDashboard },
          { id: 'aiConfig', label: 'Cấu hình AI', icon: Settings2 },
          { id: 'rag', label: 'Kho dữ liệu (RAG)', icon: Database },
          { id: 'users', label: 'Học viên', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id 
                ? 'bg-brand-600 text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Statistics Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Hiệu suất RAG & LLM</h3>
                  <p className="text-xs text-slate-500">Theo dõi lượt sử dụng và lỗi (7 ngày qua)</p>
                </div>
              </div>
              <div className="flex gap-4">
                 <div className="text-right">
                   <div className="text-2xl font-bold text-slate-800">{stats.totalDocs}</div>
                   <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tài liệu RAG</div>
                 </div>
                 <div className="w-px bg-slate-100" />
                 <div className="text-right">
                   <div className="text-2xl font-bold text-slate-800 flex items-center justify-end gap-1">{stats.totalUsers}</div>
                   <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Học viên</div>
                 </div>
              </div>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  />
                  <Area type="monotone" dataKey="usage" name="Lượt dùng" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                  <Area type="monotone" dataKey="errors" name="Lỗi" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorErrors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <ShieldAlert className="w-5 h-5 text-amber-500" />
                 Nhật ký lỗi (Error Log)
               </h3>
               <button className="text-sm font-bold text-brand-600 hover:text-brand-700">Xem tất cả</button>
            </div>
            <div className="divide-y divide-slate-100 border-t border-slate-100">
               {mockErrors.map(err => (
                 <div key={err.id} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-slate-800">{err.type}</span>
                        <span className="text-xs font-semibold text-slate-400">{err.time}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">{err.message}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'aiConfig' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Cấu hình & Persona Gia sư AI</h3>
                <p className="text-xs text-slate-500">Thiết lập kết nối, tính cách và thông số cho mô hình</p>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400" />
                  Gemini API Key (Xoay vòng xoay khóa tự động)
                </label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-mono text-sm outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all"
                  />
                </div>
                <p className="text-xs font-medium text-slate-500">Hệ thống sẽ dùng key này thay cho key mặc định trong biến môi trường.</p>
              </div>

              {/* System Prompt (Persona) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-slate-400" />
                  Tính cách (System Prompt)
                </label>
                <textarea 
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium outline-none focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all resize-none"
                />
              </div>

              {/* Params */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Độ sáng tạo (Temperature)</label>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{temperature}</span>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Chính xác & Khách quan (0.0)</span>
                    <span>Linh hoạt & Ngẫu hứng (2.0)</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Độ dài câu trả lời tối đa (Max Tokens)</label>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{maxTokens}</span>
                  </div>
                  <input 
                    type="range" min="256" max="8192" step="256" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleSaveAIConfig}
                  disabled={isSavingConfig}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isSavingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : isSaved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {isSaved ? 'Đã lưu cấu hình' : isSavingConfig ? 'Đang lưu cấu hình...' : 'Cập nhật cấu hình hiện tại'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rag' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:col-span-1">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Cổng nạp Sách & Tài liệu</h3>
                <p className="text-xs text-slate-500">Tải lên hàng loạt PDF/Ảnh</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Lớp</label>
                  <select 
                    value={uploadGrade}
                    onChange={(e) => setUploadGrade(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={g}>Lớp {g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Môn học</label>
                  <select 
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm font-medium outline-none"
                  >
                    {['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Tự nhiên và Xã hội', 'Ngữ văn', 'Lịch sử và Địa lý', 'Khoa học tự nhiên', 'Khoa học', 'Tin học', 'Giáo dục công dân', 'Giáo dục kinh tế và pháp luật', 'Địa lý', 'Lịch sử', 'Đạo đức', 'Vật lý', 'Hóa học', 'Sinh học'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer group ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-700 mb-1">Kéo thả file vào đây</h4>
                <p className="text-xs font-medium text-slate-400">Hỗ trợ PDF, PNG (Tối đa 50MB/file)</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept=".pdf,image/*"
                  onChange={handleChange} 
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">Tiến trình tải lên hệ thống</h4>
                <div className="space-y-2">
                  <AnimatePresence>
                    {uploads.map(file => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"
                        key={file.id}
                      >
                        <FileText className={`w-6 h-6 shrink-0 ${file.status === 'completed' ? 'text-emerald-500' : file.status === 'error' ? 'text-red-500' : 'text-brand-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <h5 className="text-xs font-bold text-slate-700 truncate">{file.name}</h5>
                            <span className="text-[10px] font-bold text-slate-500">{file.status === 'error' ? 'Lỗi' : `${Math.round(file.progress)}%`}</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full ${file.status === 'completed' ? 'bg-emerald-500' : file.status === 'error' ? 'bg-red-500' : 'bg-brand-500'}`}
                              animate={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {uploads.length === 0 && (
                      <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-xs text-slate-400 font-medium">Chưa có file nào đang tải</span>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-2 flex flex-col h-[700px]">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-500" /> Quản lý tài liệu & bóc tách (RAG)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Theo dõi các tài liệu sách giáo khoa đã nạp hoặc chỉnh sửa các đoạn văn bản bóc tách.</p>
                </div>
                
                {ragSubTab === 'chunks' && (
                  <div className="relative w-full sm:w-64 shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Tìm đoạn văn bản..."
                      value={chunkSearchQuery}
                      onChange={(e) => setChunkSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Sub tabs switcher */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setRagSubTab('docs')}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                    ragSubTab === 'docs'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Danh sách tài liệu ({documentsList.length})
                </button>
                <button
                  onClick={() => setRagSubTab('chunks')}
                  className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
                    ragSubTab === 'chunks'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Đoạn văn bản bóc tách ({filteredChunks.length})
                </button>
              </div>
            </div>

            {ragSubTab === 'docs' && (
              <div className="flex-1 overflow-y-auto">
                {isLoadingDocs ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="text-sm font-medium">Đang tải danh sách tài liệu...</span>
                  </div>
                ) : documentsList.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <span className="text-sm font-medium">Chưa có tài liệu nào được nạp vào RAG.</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tài liệu</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Môn học - Lớp</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {documentsList.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileText className="w-8 h-8 text-brand-500 shrink-0" />
                              <div className="max-w-[280px] sm:max-w-[350px]">
                                <div className="font-bold text-sm text-slate-800 truncate" title={doc.name}>
                                  {doc.name}
                                </div>
                                {doc.pdf_url && (
                                  <a
                                    href={doc.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-0.5 inline-flex"
                                  >
                                    <span>Tải tài liệu gốc</span>
                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">
                              {doc.subject || 'Khác'}
                            </span>
                            <span className="ml-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md text-xs font-bold">
                              Lớp {doc.grade || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {doc.status === 'ready' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Sẵn sàng
                              </span>
                            ) : doc.status === 'processing' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang phân tách...
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Lỗi xử lý
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleReprocessDoc(doc.id)}
                                disabled={doc.status === 'processing'}
                                className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg disabled:opacity-40"
                                title="Phân tách lại (Auto-Split & Embed)"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Xóa tài liệu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {ragSubTab === 'chunks' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isLoadingChunks ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="text-sm font-medium">Đang tải danh sách chunks...</span>
                  </div>
                ) : filteredChunks.map(chunk => (
                  <div key={chunk.id} className="border border-slate-200 rounded-xl p-4 hover:border-brand-300 transition-colors bg-white group shadow-sm hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold line-clamp-1 max-w-[200px]">{chunk.file}</span>
                        <span className="px-2 py-1 bg-brand-50 text-brand-600 rounded text-xs font-bold">{chunk.subject} - Lớp {chunk.grade}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingContent(chunk.id); setEditValue(chunk.content); }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded" title="Sửa chunk">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteChunk(chunk.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Xóa chunk">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {editingContent === chunk.id ? (
                      <div className="space-y-3">
                        <textarea 
                          value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-brand-500 min-h-[100px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingContent(null)} className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                          <button onClick={() => handleEditChunk(chunk.id)} className="px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg">Lưu lại</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{chunk.content}</p>
                    )}
                  </div>
                ))}
                {!isLoadingChunks && filteredChunks.length === 0 && (
                  <div className="text-center py-20 text-slate-400">
                    <Database className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <span className="text-sm">Không tìm thấy đoạn văn bản RAG nào.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Users className="w-5 h-5 text-brand-500" /> Quản lý Học sinh & Phân quyền
               </h3>
               <p className="text-xs text-slate-500 mt-1 font-medium">Khóa tài khoản, gửi email khôi phục mật khẩu hoặc nâng quyền Admin.</p>
            </div>
            <div className="relative w-full sm:w-72 shrink-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                  type="text" 
                  placeholder="Tìm kiếm Email, Họ tên..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
               />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {isUsersLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="text-sm font-medium">Đang tải danh sách học viên...</span>
              </div>
            ) : (
              <table className="w-full min-w-[800px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Người dùng</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Lớp</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Vai trò</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 bg-brand-500">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-800">{u.name}</div>
                            <div className="text-xs font-medium text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">Lớp {u.grade}</span>
                      </td>
                      <td className="px-6 py-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-md text-xs font-bold">
                            <Shield className="w-3.5 h-3.5" /> Quản trị viên
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">
                            <Users className="w-3.5 h-3.5" /> Học viên
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.status === 'active' ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" /> Hoạt động
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                             <div className="w-2 h-2 rounded-full bg-red-500" /> Đã khóa
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                         {u.status === 'active' ? (
                           <button 
                              onClick={() => handleToggleLockUser(u.id, u.status)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Khóa tài khoản">
                             <Lock className="w-4 h-4" />
                           </button>
                         ) : (
                           <button 
                              onClick={() => handleToggleLockUser(u.id, u.status)}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Mở khóa">
                             <Unlock className="w-4 h-4" />
                           </button>
                         )}
                         <button 
                            onClick={() => handleResetPassword(u.email)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Mật khẩu">
                           <KeyRound className="w-4 h-4" />
                         </button>
                         {u.role !== 'admin' && (
                           <button 
                             onClick={() => handlePromoteAdmin(u.id)}
                             className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Nâng cấp Admin">
                             <Shield className="w-4 h-4" />
                           </button>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isUsersLoading && usersList.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
              <div className="py-20 text-center">
                <span className="text-sm font-medium text-slate-500">Không tìm thấy người dùng phù hợp.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
