import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, X } from 'lucide-react';
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
  const title = (session.title || '').trim() || (session.last_message || '').trim().slice(0, 30) || 'Cuộc trò chuyện mới';
  const subject = (session.subject || 'Môn học').trim();
  const gradeLabel = (session.grade || '').replace(/^Lớp\s*/i, '').trim();
  if (gradeLabel) {
    return `${title} (${subject} ${gradeLabel})`;
  }
  return `${title} (${subject})`;
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
    <div className={`group flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${theme === 'dark' ? (active ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10') : (active ? 'border-zinc-300 bg-zinc-100' : 'border-zinc-200 bg-white hover:bg-zinc-50')}`}>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <div className={`truncate text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{getSessionDisplayTitle(session)}</div>
      </button>
      <button type="button" onClick={onDelete} className={`opacity-70 transition-opacity hover:opacity-100 ${theme === 'dark' ? 'text-white/70' : 'text-zinc-500'}`} title="Xóa hội thoại">
        <Trash2 className="h-4 w-4" />
      </button>
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

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -240 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 lg:relative lg:z-auto lg:block flex flex-col overflow-hidden border-r border-white/10 bg-[#131314] text-white"
        style={{ width: open ? 240 : 0, minWidth: open ? 240 : 0, flexShrink: 0 }}
      >
        <div className="flex items-center justify-between gap-1 border-b border-white/10 px-2 py-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex-1 rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-black hover:bg-zinc-200"
          >
            + Chat mới
          </button>
          <button type="button" onClick={onClose} className="lg:hidden rounded-lg border border-white/10 p-1.5 text-white/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto px-1 py-1">
          {flatSessions.length === 0 && (
            <p className="px-1 py-2 text-xs text-white/40">Chưa có hội thoại.</p>
          )}
          {flatSessions.map((session) => (
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
      </motion.aside>
    </>
  );
}
