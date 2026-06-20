/**
 * Simple Query Handler - Respostas rápidas para perguntas simples
 */

export class SimpleQueryHandler {
  static canHandle(query: string): boolean {
    const q = query.toLowerCase();
    return (
      q.includes('que dia') ||
      q.includes('que hora') ||
      q.includes('hoje') ||
      q.includes('agora') ||
      q.includes('data') ||
      q.includes('horário')
    );
  }

  static handle(query: string): string {
    const now = new Date();
    const q = query.toLowerCase();

    // Dia da semana
    if (q.includes('que dia') || q.includes('dia da semana')) {
      const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const day = days[now.getDay()];
      const date = now.toLocaleDateString('pt-BR');
      return `Hoje é **${day}**, ${date}`;
    }

    // Hora
    if (q.includes('que hora') || q.includes('horário')) {
      const time = now.toLocaleTimeString('pt-BR');
      return `Agora são **${time}**`;
    }

    // Data completa
    if (q.includes('data') || q.includes('hoje')) {
      const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const day = days[now.getDay()];
      const date = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `Hoje é **${date}**`;
    }

    return null;
  }
}
