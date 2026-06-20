/**
 * Multi Question Parser - Separa múltiplas perguntas
 */

export class MultiQuestionParser {
  static separarPerguntas(input: string): string[] {
    // Divide por "?", ";" ou "."
    const partes = input
      .split(/[\?;.]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    return partes;
  }

  static ehPerguntaMultipla(input: string): boolean {
    const perguntas = this.separarPerguntas(input);
    return perguntas.length > 1;
  }
}
