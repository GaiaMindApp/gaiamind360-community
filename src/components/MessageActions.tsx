/**
 * Message Actions Component - Like, Dislike, Copy, Regenerate
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChatHistoryService } from '../services/chatHistoryService';
import { ThumbsUp, ThumbsDown, Copy, RotateCcw } from 'lucide-react';

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  conversationId: string;
  onRegenerate?: (newContent: string) => void;
  isAssistantMessage: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  messageContent,
  conversationId,
  onRegenerate,
  isAssistantMessage
}) => {
  const { t } = useTranslation();
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);
  const [copied, setCopied] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [showLikeThanks, setShowLikeThanks] = useState(false);

  useEffect(() => {
    loadReaction();
  }, [messageId]);

  const loadReaction = async () => {
    try {
      const r = await ChatHistoryService.getReaction(messageId);
      if (r) {
        setReaction(r.reaction as 'like' | 'dislike');
      }
    } catch (error) {
      console.error('Erro ao carregar reação:', error);
    }
  };

  const handleLike = async () => {
    try {
      await ChatHistoryService.addReaction(messageId, 'like');
    } catch {
      // feedback visual mesmo se backend falhar
    }
    setReaction('like');
    setShowLikeThanks(true);
    setTimeout(() => setShowLikeThanks(false), 3000);
  };

  const handleDislike = async () => {
    setShowFeedback(true);
  };

  const submitDislike = async () => {
    try {
      await ChatHistoryService.addReaction(messageId, 'dislike', feedbackReason);
      setReaction('dislike');
      setShowFeedback(false);
      setFeedbackReason('');
    } catch (error) {
      console.error('Erro ao adicionar dislike:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await ChatHistoryService.copyToClipboard(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  // Detect light mode for adaptive styling
  const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');

  const btnBase: React.CSSProperties = {
    padding: '4px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.15s, color 0.15s',
    color: isLight ? '#94A3B8' : '#9ca3af',
  };

  const modalBg   = isLight ? '#FFFFFF'  : '#1f2937';
  const modalBdr  = isLight ? '#E2E8F0'  : '#374151';
  const modalText = isLight ? '#0F172A'  : '#f9fafb';
  const optionClr = isLight ? '#334155'  : '#d1d5db';
  const inputBg   = isLight ? '#F8FAFC'  : '#374151';
  const inputBdr  = isLight ? '#CBD5E1'  : '#4b5563';
  const inputClr  = isLight ? '#0F172A'  : '#f9fafb';
  const cancelBg  = isLight ? '#F1F5F9'  : '#374151';
  const cancelClr = isLight ? '#475569'  : '#d1d5db';

  return (
    <div className="message-actions-bar" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
      {/* Like */}
      <button
        onClick={handleLike}
        style={{
          ...btnBase,
          color: reaction === 'like' ? '#22c55e' : btnBase.color,
        }}
        title={reaction === 'like' ? t('chat.actions.like_title_selected') : t('chat.actions.like_title')}
        aria-label={t('chat.actions.like_title')}
        aria-pressed={reaction === 'like'}
      >
        <ThumbsUp size={16} />
      </button>

      {/* Dislike */}
      <button
        onClick={handleDislike}
        style={{
          ...btnBase,
          color: reaction === 'dislike' ? '#ef4444' : btnBase.color,
        }}
        title={t('chat.actions.dislike_title')}
        aria-label={t('chat.actions.dislike_title')}
        aria-pressed={reaction === 'dislike'}
      >
        <ThumbsDown size={16} />
      </button>

      {/* Copy */}
      <button
        onClick={handleCopy}
        style={btnBase}
        title={t('chat.actions.copy_title')}
        aria-label={t('chat.actions.copy_title')}
      >
        <Copy size={16} />
        {copied && (
          <span style={{ fontSize: '11px', marginLeft: '4px', color: isLight ? '#0E9F6E' : '#22c55e' }}>
            {t('chat.actions.copied')}
          </span>
        )}
      </button>

      {/* Regenerate (only for assistant messages) */}
      {isAssistantMessage && onRegenerate && (
        <button
          onClick={() => onRegenerate(messageContent)}
          style={btnBase}
          title={t('chat.actions.regenerate_title')}
          aria-label={t('chat.actions.regenerate_title')}
        >
          <RotateCcw size={16} />
        </button>
      )}

      {/* Mensagem de agradecimento após like */}
      {showLikeThanks && (
        <span style={{
          fontSize: '12px',
          color: isLight ? '#0E9F6E' : '#22c55e',
          marginLeft: '4px',
          animation: 'fadeIn 0.2s ease',
        }}>
          {t('chat.actions.thank_you')}
        </span>
      )}

      {/* Feedback Modal via Portal */}
      {showFeedback && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowFeedback(false); setFeedbackReason(''); } }}
        >
          <div style={{
            backgroundColor: modalBg,
            border: `1px solid ${modalBdr}`,
            borderRadius: '12px',
            padding: '24px',
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: isLight
              ? '0 8px 32px rgba(0,0,0,0.12)'
              : '0 25px 50px rgba(0,0,0,0.8)',
          }}>
            <h3 id="feedback-modal-title" style={{ color: modalText, fontSize: '16px', fontWeight: 600, marginBottom: '16px', marginTop: 0 }}>
              {t('chat.actions.feedback_title')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {[
                { value: 'incorrect_info',  label: t('chat.actions.feedback_options.incorrect_info') },
                { value: 'confusing',       label: t('chat.actions.feedback_options.confusing') },
                { value: 'not_answered',    label: t('chat.actions.feedback_options.not_answered') },
                { value: 'inappropriate',   label: t('chat.actions.feedback_options.inappropriate') },
              ].map((option) => (
                <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: optionClr }}>
                  <input
                    type="radio"
                    name="feedback"
                    value={option.value}
                    checked={feedbackReason === option.value}
                    onChange={(e) => setFeedbackReason(e.target.value)}
                    style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <textarea
              placeholder={t('chat.actions.additional_comment')}
              value={
                typeof feedbackReason === 'string' &&
                !['incorrect_info', 'confusing', 'not_answered', 'inappropriate'].includes(feedbackReason)
                  ? feedbackReason
                  : ''
              }
              onChange={(e) => setFeedbackReason(e.target.value)}
              style={{
                width: '100%', backgroundColor: inputBg, color: inputClr,
                border: `1px solid ${inputBdr}`, borderRadius: '6px',
                padding: '8px', fontSize: '13px', marginBottom: '16px',
                resize: 'vertical', minHeight: '70px', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowFeedback(false); setFeedbackReason(''); }}
                style={{
                  flex: 1, padding: '8px', backgroundColor: cancelBg,
                  color: cancelClr, border: `1px solid ${modalBdr}`, borderRadius: '6px',
                  cursor: 'pointer', fontSize: '14px',
                }}
              >
                {t('chat.actions.cancel')}
              </button>
              <button
                onClick={submitDislike}
                style={{
                  flex: 1, padding: '8px', backgroundColor: '#dc2626',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '14px',
                }}
              >
                {t('chat.actions.submit')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
