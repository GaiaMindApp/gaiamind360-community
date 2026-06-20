/**
 * Chat Title Generator Service
 * Gera títulos automáticos baseado na primeira pergunta
 */

export class ChatTitleGenerator {
  /**
   * Gera título a partir da primeira pergunta
   * Extrai as primeiras palavras significativas
   */
  static generateTitle(firstMessage: string): string {
    if (!firstMessage || firstMessage.trim().length === 0) {
      return 'Novo Chat';
    }

    // Remover pontuação e normalizar
    let title = firstMessage
      .trim()
      .replace(/[?!.,:;]/g, '')
      .split('\n')[0]; // Pegar apenas primeira linha

    // Limitar a 50 caracteres
    if (title.length > 50) {
      title = title.substring(0, 50).trim() + '...';
    }

    // Capitalizar primeira letra
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return title;
  }

  /**
   * Valida se título é válido (não vazio, não "Sem título")
   */
  static isValidTitle(title: string | null | undefined): boolean {
    if (!title) return false;
    const trimmed = title.trim();
    return trimmed.length > 0 && trimmed !== 'Sem título';
  }
}
