import { Message as StoredMessage } from '../services/chatHistoryService';

export interface ChatHistoryStoredMessage extends Pick<StoredMessage, 'id' | 'role' | 'content' | 'created_at' | 'metadata'> {}

export interface UiMessageShape {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  data?: any;
  conversationId?: string;
  thought?: string;
  thoughtDone?: boolean;
}

export const extractThoughtMetadata = (
  metadata?: Record<string, any>,
  role: 'user' | 'assistant' = 'assistant'
) => {
  const thought = typeof metadata?.thought === 'string' && metadata.thought.length > 0
    ? metadata.thought
    : undefined;

  const thoughtDone = typeof metadata?.thought_done === 'boolean'
    ? metadata.thought_done
    : role === 'assistant'
      ? true
      : undefined;

  return { thought, thoughtDone };
};

export const mapStoredMessageToUiMessage = (
  message: ChatHistoryStoredMessage,
  conversationId: string
): UiMessageShape => {
  const { thought, thoughtDone } = extractThoughtMetadata(message.metadata, message.role);

  return {
    id: message.id,
    type: message.role === 'assistant' ? 'agent' : 'user',
    content: message.content,
    timestamp: new Date(message.created_at),
    conversationId,
    ...(thought !== undefined ? { thought } : {}),
    ...(thoughtDone !== undefined ? { thoughtDone } : {}),
  };
};
