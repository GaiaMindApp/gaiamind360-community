import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChatHistoryService, Conversation } from '../services/chatHistoryService';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

interface Props {
  onSelectConversation: (id: string) => void;
  currentConversationId?: string;
  onNewChat: () => void;
  onConversationCreated?: (c: Conversation) => void;
  onTitleUpdate?: (id: string, title: string) => void;
  refreshTrigger?: number;
}

const LS_KEY = 'gaiamind-sidebar-convs';
const saveLocal = (c: Conversation[]) => localStorage.setItem(LS_KEY, JSON.stringify(c));
const loadLocal = (): Conversation[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};

export const ChatHistorySidebar: React.FC<Props> = ({ onSelectConversation, currentConversationId, onNewChat, refreshTrigger }) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [chatToDelete, setChatToDelete] = useState<Conversation | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []); // carrega ao montar
  useEffect(() => { if (refreshTrigger !== undefined) load(); }, [refreshTrigger]);
  useEffect(() => { if (editingId) inputRef.current?.focus(); }, [editingId]);

  const load = async () => {
    try {
      const convs = await ChatHistoryService.listConversations();
      const filtered = Array.isArray(convs) ? convs.filter(c => !c.id.startsWith('temp_')) : [];
      setConversations(filtered);
      saveLocal(filtered);
    } catch {
      setConversations(loadLocal());
    }
  };

  const saveRename = (id: string) => {
    if (!editName.trim()) { setEditingId(null); return; }
    const updated = conversations.map(c => c.id === id ? { ...c, title: editName.trim() } : c);
    setConversations(updated);
    saveLocal(updated);
    setEditingId(null);
    ChatHistoryService.updateTitle(id, editName.trim()).catch(() => {});
  };

  const confirmDelete = async (conv: Conversation) => {
    const updated = conversations.filter(c => c.id !== conv.id);
    setConversations(updated);
    saveLocal(updated);
    setChatToDelete(null);
    if (currentConversationId === conv.id)
      onSelectConversation(updated.length > 0 ? updated[0].id : '');
      
    try { 
      await ChatHistoryService.deleteConversation(conv.id); 
    } catch (err) {
      console.error("Falha ao eliminar conversa do backend:", err);
      load(); // Reverte a lista (rollback) caso a exclusão no backend falhe
    }
  };

  const confirmDeleteAll = async () => {
    const toDelete = [...conversations];
    setConversations([]);
    saveLocal([]);
    localStorage.removeItem(LS_KEY);
    setDeleteAll(false);
    onSelectConversation('');
    
    // Elimina sequencialmente em vez de fazer Promise.all para não sobrecarregar o Rate Limiter do Backend
    for (const c of toDelete) {
      try {
        await ChatHistoryService.deleteConversation(c.id);
      } catch (err) {
        console.error(`Falha ao eliminar conversa ${c.id}:`, err);
      }
    }
    load(); // Força a ressincronização final com a verdade do servidor
  };

  const closeModal = () => { setChatToDelete(null); setDeleteAll(false); };
  const showModal = chatToDelete !== null || deleteAll;

  return (
    <>
      {/* Sidebar */}
      <div style={{ width: '250px', flexShrink: 0 }} className="bg-[#0f172a] text-gray-200 flex flex-col h-screen border-r border-[rgba(26,188,156,0.2)]">

        {/* Novo Chat */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 w-full p-3 bg-transparent border border-[rgba(26,188,156,0.2)] rounded-lg hover:bg-[rgba(26,188,156,0.1)] transition-colors text-sm font-medium text-[rgba(26,188,156,0.9)]"
          >
            <Plus size={16} /> {t('chat.sidebar.new_chat')}
          </button>
        </div>

        {/* Lista — scroll independente */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5"
          style={{
            padding: '0 8px 8px 8px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(26,188,156,0.3) transparent',
          }}
        >
          {conversations.length === 0 && (
            <p className="text-gray-600 text-xs text-center mt-6">{t('chat.sidebar.no_chats')}</p>
          )}
          {conversations.map(conv => {
            const isActive = currentConversationId === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
                className={`group flex items-center justify-between px-2 py-2 rounded-md cursor-pointer text-sm transition-all border-l-[3px] ${
                  isActive
                    ? 'bg-[rgba(26,188,156,0.2)] text-[#1abc9c] border-l-[#1abc9c] font-semibold'
                    : 'hover:bg-[rgba(26,188,156,0.1)] text-gray-300 border-l-transparent hover:border-l-[#1abc9c]'
                }`}
              >
                {editingId === conv.id ? (
                  <div className="flex flex-1 items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveRename(conv.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 min-w-0 bg-gray-600 text-white px-2 py-0.5 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button onClick={() => saveRename(conv.id)} className="text-green-400 hover:text-green-300 shrink-0"><Check size={14} /></button>
                    <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300 shrink-0"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <span className="truncate flex-1">{conv.title || t('chat.sidebar.untitled')}</span>
                    <div className={`flex gap-1 ml-2 shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditName(conv.title || ''); }}
                        className="p-1 text-gray-400 hover:text-white transition-colors rounded"
                        title={t('chat.sidebar.rename')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setChatToDelete(conv); }}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded"
                        title={t('chat.sidebar.delete')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>


      </div>

      {/* Modal — portal no document.body com inline styles para evitar qualquer conflito CSS */}
      {showModal && createPortal(
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#202123',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
              {deleteAll ? t('chat.sidebar.delete_all_confirm') : t('chat.sidebar.delete_chat_confirm')}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '0 0 1.5rem 0', lineHeight: 1.6 }}>
              {deleteAll
                ? t('chat.sidebar.delete_all_subtitle', { count: conversations.length })
                : t('chat.sidebar.delete_chat_subtitle', { title: chatToDelete?.title || t('chat.sidebar.untitled') })
              }
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#d1d5db',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                {t('chat.messages.cancel')}
              </button>
              <button
                onClick={() => deleteAll ? confirmDeleteAll() : confirmDelete(chatToDelete!)}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#dc2626',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {t('chat.sidebar.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
