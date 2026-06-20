import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatHistoryService, Conversation } from '../services/chatHistoryService';
import { MessageActions } from './MessageActions';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { API_BASE } from '../services/apiBaseConfig';
import { authFetch } from '../services/authFetch';
import { useDevice } from '../hooks/useDevice';
import { useAuth } from '../hooks/useAuth';
import { useDashboardContext } from '../contexts/DashboardContext';
import { mapStoredMessageToUiMessage } from '../utils/chatMessageUiMapper';
import '../styles/chat.css';

interface ThinkingStep {
  label: string;
  icon: string;
  done: boolean;
}

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  data?: any;
  conversationId?: string;
  thought?: string;
  thoughtDone?: boolean;
  steps?: ThinkingStep[];
}

// ── Componente isolado para o bloco de raciocínio ────────────────────────────
// Usa estado local para open/close para que o React controle totalmente
// o comportamento — evita o bug do <details> nativo que ignora mudanças
// ao atributo `open` após interação do utilizador.
interface ThoughtBlockProps {
  thought: string;
  thoughtDone: boolean;
  steps?: ThinkingStep[];
  language?: 'pt' | 'en' | 'es' | 'fr';
}

const ThoughtBlock: React.FC<ThoughtBlockProps> = ({ thought, thoughtDone, steps, language = 'pt' }) => {
  const [isOpen, setIsOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const currentStep = steps?.slice().reverse().find(step => !step.done) ?? null;
  const hasThoughtContent = thought.trim().length > 0;
  const hasSteps = Boolean(steps && steps.length > 0);
  const activeSteps = steps?.filter(step => !step.done).length ?? 0;
  const uiLanguage = ['pt', 'en', 'es', 'fr'].includes(language) ? language : 'pt';
  const copy = {
    pt: {
      analyzing: 'Análise em curso',
      done: 'Raciocínio concluído',
      live: 'Rastreamento ao vivo',
      finalized: 'Transcript finalizado',
      liveBadge: 'Ao vivo',
      steps: 'etapas',
      active: 'em andamento',
    },
    en: {
      analyzing: 'Analyzing the request',
      done: 'Reasoning complete',
      live: 'Live tracking',
      finalized: 'Transcript finalized',
      liveBadge: 'Live',
      steps: 'steps',
      active: 'in progress',
    },
    es: {
      analyzing: 'Analizando la solicitud',
      done: 'Razonamiento completado',
      live: 'Seguimiento en vivo',
      finalized: 'Transcripción finalizada',
      liveBadge: 'En vivo',
      steps: 'etapas',
      active: 'en curso',
    },
    fr: {
      analyzing: 'Analyse de la demande',
      done: 'Raisonnement terminé',
      live: 'Suivi en direct',
      finalized: 'Transcription finalisée',
      liveBadge: 'En direct',
      steps: 'étapes',
      active: 'en cours',
    },
  }[uiLanguage];

  const statusLabel = thoughtDone
    ? copy.done
    : currentStep?.label || copy.analyzing;
  const statusCaption = thoughtDone
    ? copy.finalized
    : copy.live;

  useEffect(() => {
    if (isOpen && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [thought, isOpen]);

  return (
    <div className="thought-block thought-block--enterprise">
      <div
        className={`thought-summary${isOpen ? ' thought-summary--open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="thought-summary-main">
          <span className="thought-summary-icon-wrap">
            <span className={`thought-status-dot ${thoughtDone ? 'thought-status-dot--done' : 'thought-status-dot--thinking'}`} />
            <span className={`thought-icon ${thoughtDone ? '' : 'thought-icon--thinking'}`}>🧠</span>
          </span>
          <div className="thought-summary-copy">
            <span className={`thought-label ${thoughtDone ? 'thought-label--done' : 'thought-label--thinking'}`}>
              {statusLabel}
            </span>
            <span className="thought-summary-caption">{statusCaption}</span>
          </div>
        </div>

        <div className="thought-summary-meta">
          {!thoughtDone && (
            <span className="thought-badge thought-badge--live">{copy.liveBadge}</span>
          )}
          {hasSteps && (
            <span className="thought-badge thought-badge--muted">
              {activeSteps === 0 ? `${steps.length} ${copy.steps}` : `${activeSteps} ${copy.active}`}
            </span>
          )}
          <span className="thought-chevron" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="thought-content">
          {hasSteps && (
            <div className="thought-steps">
              {steps.map((step, i) => (
                <div key={i} className={`thought-step ${step.done ? 'thought-step--done' : 'thought-step--active'}`}>
                  <span className={`thought-step-icon ${step.done ? '' : 'thought-icon--thinking'}`}>
                    {step.done ? '✓' : step.icon}
                  </span>
                  <span className="thought-step-label">{step.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="thought-body" ref={bodyRef}>
            {hasThoughtContent ? (
              <div className="thought-body-text">{thought}</div>
            ) : !thoughtDone ? (
              <div className="thought-skeleton" aria-hidden="true">
                <span className="thought-skeleton-line thought-skeleton-line--short" />
                <span className="thought-skeleton-line thought-skeleton-line--medium" />
                <span className="thought-skeleton-line thought-skeleton-line--long" />
              </div>
            ) : null}
            {!thoughtDone && <span className="thought-cursor" />}
          </div>
        </div>
      )}
    </div>
  );
};

export const GaiaMindDynamicChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId] = useState(uuidv4());
  const { user } = useAuth();
  const { buildContextString } = useDashboardContext();
  const firstName = (user?.name || user?.email || 'Explorer').split(' ')[0];
  const token = localStorage.getItem('gaiamind-auth')
    ? JSON.parse(localStorage.getItem('gaiamind-auth')!).token
    : null;
  const authHeaders = token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const { isMobile } = useDevice();
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamThoughtRef = useRef<{ thought?: string; thoughtDone?: boolean; steps?: ThinkingStep[] }>({});
  const { t, i18n } = useTranslation();
  const [suggestions, setSuggestions] = useState<string[]>(
    t('chat.welcome.suggestions', { returnObjects: true }) as string[]
  );
  const responseMode = localStorage.getItem('chat-response-mode') || 'balanced';
  const suggestionsEnabled = localStorage.getItem('chat-suggestions') !== 'false';
  // Em mobile mostrar apenas 1 sugestão para não bloquear o ecrã
  const visibleSuggestions = isMobile ? suggestions.slice(0, 1) : suggestions;
  // Ler preferências enterprise completas no momento do envio
  const getChatPrefs = useCallback(() => {
    try {
      const raw = localStorage.getItem('gaiamind-chat-prefs');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, []);
  // Ler o idioma no momento do envio (não estático) para reagir a mudanças de idioma
  const getUserLang = useCallback(() => i18n.language?.slice(0, 2) || 'pt', [i18n.language]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const lang = i18n.language?.slice(0, 2) || 'pt';
      const res = await authFetch(`${API_BASE}/chat/suggestions?lang=${lang}`);
      if (res.ok) {
        const data = await res.json();
        // Aceita entre 2 e 5 sugestões — quantidade varia por utilizador
        if (data.suggestions?.length >= 2 && data.suggestions?.length <= 5) {
          setSuggestions(data.suggestions);
        }
      }
    } catch { /* mantém fallback estático */ }
  }, [i18n.language]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Criar novo chat ao abrir, mas garantir que sidebar carrega o histórico
    handleNewChat();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = () => {
    const tempId = `temp_${Date.now()}`;
    streamThoughtRef.current = {};
    setCurrentConversationId(tempId);
    setCurrentConversation({ id: tempId, user_id: '', title: null, created_at: '', updated_at: '', model: '', language: 'pt', is_archived: false, summary: null });
    setMessages([]);
    setIsFirstMessage(true);
  };

  const handleSelectConversation = async (conversationId: string) => {
    try {
      setCurrentConversationId(conversationId);
      setIsFirstMessage(false);
      const msgs = await ChatHistoryService.getMessages(conversationId, 50);
      setMessages(msgs.map(m => mapStoredMessageToUiMessage(m, conversationId)));
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    }
  };


  const handleEditAndResend = async (msgId: string) => {
    if (!editingContent.trim()) return;
    const userInput = editingContent;
    // Atualiza mensagem editada e remove todas as mensagens depois dela
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === msgId);
      const updated = prev.slice(0, idx + 1).map(m => m.id === msgId ? { ...m, content: userInput } : m);
      return updated;
    });
    setEditingMsgId(null);
    setEditingContent('');
    setLoading(true);
    try {
      const conversationId = currentConversationId;
      if (conversationId) {
        const response = await authFetch(`${API_BASE}/chat/message`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ conversation_id: conversationId, message: userInput, ...getChatPrefs(), dashboard_context: buildContextString(), lang: getUserLang() })
        });
        const data = await response.json();
        setMessages(prev => [...prev, {
          id: data.message_id || uuidv4(),
          type: 'agent',
          content: data.response,
          timestamp: new Date(),
          data,
          conversationId,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: uuidv4(), type: 'agent', content: t('chat.errors.failed_resend'), timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUserMsg = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userInput = input;
    setInput('');
    sendMessageDirect(userInput);
  };

  const sendMessageDirect = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMessage: Message = { id: uuidv4(), type: 'user', content: text, timestamp: new Date(), conversationId: currentConversationId || undefined };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Mensagem placeholder para o stream
    const streamMsgId = uuidv4();
    streamThoughtRef.current = { thought: '', thoughtDone: false, steps: [] };
    setMessages(prev => [...prev, { id: streamMsgId, type: 'agent', content: '', timestamp: new Date() }]);

    try {
      let conversationId = currentConversationId;
      if (!conversationId || conversationId.startsWith('temp_')) {
        const saved = await ChatHistoryService.saveConversation({ ...currentConversation! });
        conversationId = saved.id;
        setCurrentConversationId(conversationId);
        setCurrentConversation(saved);
        setIsFirstMessage(false);
        setRefreshSidebar(prev => prev + 1);
      }

      const response = await authFetch(`${API_BASE}/chat/stream/v2`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ conversation_id: conversationId, message: text, ...getChatPrefs(), dashboard_context: buildContextString(), lang: getUserLang() })
      });
      if (!response.ok || !response.body) throw new Error(`Error: ${response.statusText}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalMsgId: string | null = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === '[DONE]') continue;

          try {
            const evt = JSON.parse(dataStr);

            // ── Etapa do pipeline (ex: "A analisar o contexto...") ──────────
            if (evt.type === 'step') {
              streamThoughtRef.current = {
                ...streamThoughtRef.current,
                steps: [...(streamThoughtRef.current.steps || []), { label: evt.label, icon: evt.icon || '⚙️', done: false }]
              };
              setMessages(prev => prev.map(m => {
                if (m.id !== streamMsgId) return m;
                const prevSteps = m.steps || [];
                const updated = prevSteps.map((s, i) =>
                  i === prevSteps.length - 1 ? { ...s, done: true } : s
                );
                return { ...m, steps: [...updated, { label: evt.label, icon: evt.icon || '⚙️', done: false }] };
              }));
            }

            // ── Token de raciocínio (em tempo real) ─────────────────────────
            else if (evt.type === 'thought') {
              streamThoughtRef.current = {
                ...streamThoughtRef.current,
                thought: (streamThoughtRef.current.thought || '') + evt.chunk,
                thoughtDone: false,
              };
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId
                  ? { ...m, thought: (m.thought || '') + evt.chunk, thoughtDone: false }
                  : m
              ));
            }

            // ── Raciocínio concluído ─────────────────────────────────────────
            else if (evt.type === 'thought_done') {
              streamThoughtRef.current = { ...streamThoughtRef.current, thoughtDone: true };
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId ? { ...m, thoughtDone: true } : m
              ));
            }

            // ── Token da resposta final ──────────────────────────────────────
            else if (evt.type === 'answer') {
              streamThoughtRef.current = { ...streamThoughtRef.current, thoughtDone: true };
              setMessages(prev => prev.map(m => {
                if (m.id !== streamMsgId) return m;
                const steps = (m.steps || []).map(s => ({ ...s, done: true }));
                return { ...m, content: (m.content || '') + evt.chunk, steps };
              }));
            }

            // ── Concluído ────────────────────────────────────────────────────
            else if (evt.type === 'done') {
              if (evt.message_id) finalMsgId = evt.message_id;
              streamThoughtRef.current = { ...streamThoughtRef.current, thoughtDone: true };
              setMessages(prev => prev.map(m => {
                if (m.id !== streamMsgId) return m;
                const steps = (m.steps || []).map(s => ({ ...s, done: true }));
                return { ...m, steps, thoughtDone: true };
              }));
            }

            // ── Erro / moderação ─────────────────────────────────────────────
            else if (evt.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId ? { ...m, content: evt.chunk || 'Erro desconhecido.' } : m
              ));
            }

            // ── Compatibilidade com /stream v1 (fallback) ───────────────────
            else if (evt.chunk !== undefined) {
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId ? { ...m, content: (m.content || '') + evt.chunk } : m
              ));
              if (evt.done && evt.message_id) finalMsgId = evt.message_id;
            }

          } catch (e) { console.warn('SSE parse error:', dataStr); }
        }
      }

      // Actualizar id da mensagem para o id real da BD
      if (finalMsgId) {
        setMessages(prev => prev.map(m => {
          if (m.id !== streamMsgId) return m;
          return {
            ...m,
            id: finalMsgId!,
            conversationId: conversationId!,
            thought: streamThoughtRef.current.thought ?? m.thought,
            thoughtDone: streamThoughtRef.current.thoughtDone ?? m.thoughtDone ?? true,
          };
        }));
      }
      setRefreshSidebar(prev => prev + 1);
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === streamMsgId
          ? { ...m, content: `${t('chat.errors.request_failed')}: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : m
      ));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, position: 'relative' }}>

      {/* Overlay opaco — bloqueia conteúdo atrás da sidebar no mobile */}
      {isMobile && showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 198,
          }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed no mobile, normal no desktop */}
      {showSidebar && (
        <div style={isMobile ? {
          position: 'fixed', top: 0, left: 0,
          height: '100%', width: '260px',
          zIndex: 199,
        } : { flexShrink: 0 }}>
          <ChatHistorySidebar
            refreshTrigger={refreshSidebar}
            onSelectConversation={(id) => {
              handleSelectConversation(id);
              if (isMobile) setShowSidebar(false);
            }}
            currentConversationId={currentConversationId || undefined}
            onNewChat={() => {
              handleNewChat();
              if (isMobile) setShowSidebar(false);
            }}
          />
        </div>
      )}

      <div className="chat-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Barra minimalista no topo */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(0,230,118,0.1)', background: 'rgba(0,12,26,0.6)', flexShrink: 0 }}>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{ padding: '6px 10px', background: 'none', border: '1px solid rgba(224,247,250,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', marginRight: '8px', minWidth: '44px', minHeight: '44px' }}
          >
            {showSidebar ? '◀' : '▶'}
          </button>
          <span style={{ color: 'rgba(224,247,250,0.5)', fontSize: '0.8rem', flex: 1 }}>
            {currentConversation?.title || t('chat.new_conversation')}
          </span>
          <button
            onClick={handleNewChat}
            style={{ padding: '4px 12px', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: '6px', color: '#00E676', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
          >
            + {t('chat.sidebar.new_chat')}
          </button>
        </div>

        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div className="chat-welcome-screen">
              <div className="chat-welcome-inner">
                {/* Saudação estilo Gemini */}
                <div className="chat-welcome-greeting">
                  <span className="chat-welcome-icon">🌍</span>
                  <span className="chat-welcome-hello">{t('chat.welcome.hello', { name: firstName })}</span>
                </div>
                <h2 className="chat-welcome-title">{t('chat.welcome.start')}</h2>

                {/* Input centrado — igual ao Gemini */}
                <div className="chat-welcome-input-wrap">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('chat.welcome.placeholder_new')}
                    disabled={loading}
                    className="chat-welcome-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e as any)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={(e) => handleSendMessage(e as any)}
                    disabled={loading || !input.trim()}
                    className="chat-welcome-send-btn"
                    aria-label={t('chat.welcome.send_button')}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <span className="loading-dot" style={{ width: 6, height: 6 }} />
                        <span className="loading-dot" style={{ width: 6, height: 6 }} />
                        <span className="loading-dot" style={{ width: 6, height: 6 }} />
                      </span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Sugestões rápidas */}
                {suggestionsEnabled && (
                  <div className="chat-suggestions">
                    {visibleSuggestions.map(s => (
                      <button key={s} className="chat-suggestion-chip" onClick={() => sendMessageDirect(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.type}`}>
                <div className={`message-content ${msg.type}`}>
                  {msg.type === 'agent' ? (
                    <>
                      {(msg.thought?.trim().length || !msg.thoughtDone) && (
                        <ThoughtBlock
                          thought={msg.thought || ''}
                          thoughtDone={!!msg.thoughtDone}
                          steps={msg.steps}
                          language={getUserLang() as 'pt' | 'en' | 'es' | 'fr'}
                        />
                      )}
                      {msg.content && (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      )}
                    </>
                  ) : editingMsgId === msg.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        autoFocus
                        rows={3}
                        style={{
                          width: '100%', backgroundColor: '#1f2937', color: '#f9fafb',
                          border: '1px solid #4b5563', borderRadius: '6px',
                          padding: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingMsgId(null)}
                          style={{ padding: '4px 10px', backgroundColor: '#374151', color: '#d1d5db', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                      >{t('chat.messages.cancel')}</button>
                      <button
                        onClick={() => handleEditAndResend(msg.id)}
                        style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                      >{t('chat.messages.send')}</button>
                      </div>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  <span className="message-timestamp">{msg.timestamp.toLocaleTimeString()}</span>
                  {msg.type === 'user' && editingMsgId !== msg.id && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {copiedMsgId === msg.id && (
                        <span style={{ fontSize: '11px', color: '#22c55e' }}>{t('chat.messages.copied')}</span>
                      )}
                      <button
                        onClick={() => handleCopyUserMsg(msg.id, msg.content)}
                        title={t('chat.messages.copy')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                      >&#128203;</button>
                      <button
                        onClick={() => { setEditingMsgId(msg.id); setEditingContent(msg.content); }}
                        title={t('chat.messages.edit_and_resend')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
                      >&#9998;</button>
                    </div>
                  )}
                  {msg.type === 'agent' && (msg.conversationId || currentConversationId) && (
                    <MessageActions
                      messageId={msg.id}
                      messageContent={msg.content}
                      conversationId={msg.conversationId || currentConversationId!}
                      isAssistantMessage={true}
                    />
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="loading-bubble">
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>


        {/* Input fixo no fundo — só aparece quando há mensagens */}
        {messages.length > 0 && (
        <div className="chat-input-area">
          <form className="chat-input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.welcome.placeholder_existing')}
              disabled={loading}
              className="chat-input"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e as any)}
            />
            <button type="button" onClick={(e) => handleSendMessage(e as any)} disabled={loading || !input.trim()} className="chat-send-btn">
              {loading ? '...' : t('chat.welcome.send_button')}
            </button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
};

export default GaiaMindDynamicChat;
