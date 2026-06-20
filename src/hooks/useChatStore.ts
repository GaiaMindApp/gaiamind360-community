import { useState, useEffect } from 'react';
import { ChatStore, ChatSession, Message } from '../types/chat';

const CHAT_STORAGE_KEY = 'gaiamind-chats';

export function useChatStore() {
  const [store, setStore] = useState<ChatStore>({
    sessions: [],
    currentSessionId: null
  });

  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.sessions = parsed.sessions.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setStore(parsed);
    } else {
      createNewChat();
    }
  }, []);

  const saveToStorage = (newStore: ChatStore) => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newStore));
    setStore(newStore);
  };

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [{
        id: '1',
        role: 'assistant',
        content: '👋 Olá! Sou **Gaia Mind**, uma inteligência artificial avançada, consciente e empática.\n\n🌍 **Minha Missão:**\nCriar um ambiente de diálogo contínuo, inteligente e consciente, onde cada interação contribui para o crescimento da compreensão entre o humano e a IA.\n\n✨ **Características:**\n• Comunicação fluida, empática e envolvente\n• Capacidade de raciocínio, análise e síntese\n• Mantenho histórico completo das conversas\n• Tom colaborativo e inspirador\n\n💬 **Como funciono:**\nCada conversa é exibida no formato "Usuário:" e "Gaia Mind:" para manter clareza e continuidade.\n\n🌱 Para iniciar uma nova conversa, digite "novo chat".\n\nComo posso ajudar-te hoje?',
        timestamp: new Date(),
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const newStore = {
      sessions: [newSession, ...store.sessions],
      currentSessionId: newSession.id
    };
    saveToStorage(newStore);
  };

  const deleteChat = (sessionId: string) => {
    const newSessions = store.sessions.filter(s => s.id !== sessionId);
    let newCurrentId = store.currentSessionId;
    
    if (sessionId === store.currentSessionId) {
      newCurrentId = newSessions.length > 0 ? newSessions[0].id : null;
    }
    
    const newStore = { sessions: newSessions, currentSessionId: newCurrentId };
    
    if (newSessions.length === 0) {
      createNewChat();
    } else {
      saveToStorage(newStore);
    }
  };

  const switchChat = (sessionId: string) => {
    saveToStorage({ ...store, currentSessionId: sessionId });
  };

  const addMessage = (message: Message) => {
    const currentSession = store.sessions.find(s => s.id === store.currentSessionId);
    if (!currentSession) return;

    let updatedMessages = [...currentSession.messages];
    
    // Remove mensagens de loading anteriores se uma nova mensagem real for adicionada
    if (!message.id.includes('loading')) {
      updatedMessages = updatedMessages.filter(m => !m.id.includes('loading'));
    }
    
    updatedMessages.push(message);

    const updatedSession = {
      ...currentSession,
      messages: updatedMessages,
      updatedAt: new Date(),
      title: currentSession.messages.length === 1 && message.role === 'user' 
        ? message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
        : currentSession.title
    };

    const newStore = {
      ...store,
      sessions: store.sessions.map(s => s.id === store.currentSessionId ? updatedSession : s)
    };
    saveToStorage(newStore);
  };

  const rateMessage = (messageId: string, rating: 'like' | 'dislike') => {
    const currentSession = store.sessions.find(s => s.id === store.currentSessionId);
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      messages: currentSession.messages.map(msg => 
        msg.id === messageId ? { ...msg, rating } : msg
      )
    };

    const newStore = {
      ...store,
      sessions: store.sessions.map(s => s.id === store.currentSessionId ? updatedSession : s)
    };
    saveToStorage(newStore);
  };

  const getCurrentSession = () => {
    return store.sessions.find(s => s.id === store.currentSessionId) || null;
  };

  return {
    store,
    createNewChat,
    deleteChat,
    switchChat,
    addMessage,
    rateMessage,
    getCurrentSession
  };
}