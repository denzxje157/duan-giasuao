import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X, SquarePen, Menu } from 'lucide-react';
import { ChatSessionGroup, ChatSessionItem } from '../../lib/api';

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRunLoadTest: () => void;
  groupedSessions: ChatSessionGroup[];
  activeSessionId?: string | null;
  theme: 'light' | 'dark';
}

function getSessionDisplayTitle(session: ChatSessionItem): string {
  const subject = (session.subject || '').trim();
  const title = (session.title || '').trim() || (session.last_message || '').trim().slice(0, 30) || 'Cuộc trò chuyện mới';
  return subject && subject !== 'Môn học' ? `${subject} - ${title}` : title;
}

function SessionButton({
  session,
  active,
  onSelect,
  onDelete,
  theme,
}: {
  session: ChatSessionItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  theme: 'light' | 'dark';
}) {
  return (
    <div className={`group relative flex items-center rounded-full transition-colors ${theme === 'dark' ? (active ? 'bg-[#1e1e1e]' : 'hover:bg-[#1e1e1e]') : (active ? 'bg-zinc-200' : 'hover:bg-zinc-100')}`}>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 pl-4 pr-10 py-2.5 text-left">
        <div className={`truncate text-sm ${theme === 'dark' ? 'text-white/90' : 'text-zinc-800'}`}>{getSessionDisplayTitle(session)}</div>
      </button>
      <div className={`absolute right-2 opacity-0 transition-opacity group-hover:opacity-100 ${active ? 'opacity-100' : ''}`}>
        <button type="button" onClick={onDelete} className={`rounded-full p-1.5 transition-colors ${theme === 'dark' ? 'text-white/70 hover:bg-white/10 hover:text-red-400' : 'text-zinc-500 hover:bg-black/5 hover:text-red-500'}`} title="Xóa hội thoại">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ChatSidebar({
  open,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  groupedSessions,
  activeSessionId,
  theme,
}: ChatSidebarProps) {
  const flatSessions = groupedSessions
    .flatMap((gradeGroup) => gradeGroup.subjects)
    .flatMap((subjectGroup) => subjectGroup.sessions)
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));

  // Group by time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const timeGroups: { label: string; sessions: ChatSessionItem[] }[] = [
    { label: 'Hôm nay', sessions: [] },
    { label: 'Hôm qua', sessions: [] },
    { label: '7 ngày trước', sessions: [] },
    { label: '30 ngày trước', sessions: [] },
    { label: 'Cũ hơn', sessions: [] },
  ];

  flatSessions.forEach(s => {
    const d = new Date(s.updated_at || Date.now());
    if (d >= today) timeGroups[0].sessions.push(s);
    else if (d >= yesterday) timeGroups[1].sessions.push(s);
    else if (d >= sevenDaysAgo) timeGroups[2].sessions.push(s);
    else if (d >= thirtyDaysAgo) timeGroups[3].sessions.push(s);
    else timeGroups[4].sessions.push(s);
  });

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -280 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className={`max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[110] lg:relative lg:z-auto lg:block flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#1e1e1f] text-white border-white/10' : 'bg-zinc-50 text-zinc-900 border-black/10'} border-r`}
        style={{ width: open ? 280 : 0, minWidth: open ? 280 : 0, flexShrink: 0 }}
      >
        <div className="flex h-14 items-center justify-between px-3 py-2">
          <button type="button" onClick={onClose} className="rounded-full p-2 text-white/70 hover:bg-white/10 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 lg:hidden"></div>
        </div>

        <div className="px-3 pb-2 pt-1">
          <button
            type="button"
            onClick={onNewChat}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${theme === 'dark' ? 'hover:bg-[#2c2c2d]' : 'hover:bg-zinc-200'}`}
          >
            <SquarePen className="h-5 w-5 opacity-70" />
            <span className="opacity-90">Cuộc trò chuyện mới</span>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4 custom-scrollbar">
          {flatSessions.length === 0 && (
            <p className="px-1 py-2 text-xs opacity-50">Chưa có hội thoại.</p>
          )}
          {timeGroups.map((group, idx) => group.sessions.length > 0 && (
            <div key={idx} className="space-y-1">
              <h3 className="px-4 pb-2 pt-3 text-xs font-semibold opacity-50">{group.label}</h3>
              {group.sessions.map((session) => (
                <SessionButton
                  key={session.session_id}
                  session={session}
                  active={activeSessionId === session.session_id}
                  onSelect={() => onSelectSession(session.session_id)}
                  onDelete={() => onDeleteSession(session.session_id)}
                  theme={theme}
                />
              ))}
            </div>
          ))}
        </div>
      </motion.aside>
    </>
  );
}
