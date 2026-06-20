import { describe, expect, test } from 'vitest';
import { mapStoredMessageToUiMessage } from './chatMessageUiMapper';

describe('chatMessageUiMapper', () => {
  test('preserves stored thought metadata when loading history', () => {
    const message = {
      id: 'msg-1',
      role: 'assistant' as const,
      content: 'Resposta final',
      created_at: '2026-06-07T12:00:00.000Z',
      metadata: {
        thought: 'Analisando o contexto do utilizador',
        thought_done: true,
      },
    };

    expect(mapStoredMessageToUiMessage(message, 'conv-1')).toEqual(
      expect.objectContaining({
        id: 'msg-1',
        type: 'agent',
        content: 'Resposta final',
        conversationId: 'conv-1',
        thought: 'Analisando o contexto do utilizador',
        thoughtDone: true,
      })
    );
  });

  test('treats assistant messages without thought metadata as completed historical responses', () => {
    const message = {
      id: 'msg-2',
      role: 'assistant' as const,
      content: 'Resposta final',
      created_at: '2026-06-07T12:01:00.000Z',
      metadata: {},
    };

    expect(mapStoredMessageToUiMessage(message, 'conv-1')).toEqual(
      expect.objectContaining({
        id: 'msg-2',
        type: 'agent',
        content: 'Resposta final',
        conversationId: 'conv-1',
        thoughtDone: true,
      })
    );
    expect(mapStoredMessageToUiMessage(message, 'conv-1').thought).toBeUndefined();
  });
});
