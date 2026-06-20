/**
 * GaiaMind Date Handler - Responde perguntas sobre datas
 */

import { DateService } from './dateService';
import { MultiQuestionParser } from './multiQuestionParser';

interface PerguntaResposta {
  pergunta: string;
  resposta: string;
}

export class GaiaMindDateHandler {
  static canHandle(input: string): boolean {
    const keywords = [
      'que dia', 'que hora', 'hoje', 'agora', 'data', 'horário',
      'ontem', 'amanhã', 'próximo', 'próxima', 'passado', 'futuro',
      'semana que vem', 'semana passada', 'mês que vem', 'mês passado',
      'ano que vem', 'ano passado', 'daqui', 'há', 'em'
    ];
    return keywords.some(kw => input.toLowerCase().includes(kw));
  }

  static responder(input: string): string {
    const perguntas = MultiQuestionParser.separarPerguntas(input);
    const respostas: PerguntaResposta[] = perguntas.map(pergunta => ({
      pergunta,
      resposta: this.responderUma(pergunta)
    }));

    if (respostas.length === 1) {
      return respostas[0].resposta;
    }

    return respostas
      .map((r, i) => `**${i + 1}️⃣ ${r.pergunta}?**\n${r.resposta}`)
      .join('\n\n');
  }

  private static responderUma(pergunta: string): string {
    const p = pergunta.toLowerCase();

    // Hoje
    if (p.includes('hoje') || (p.includes('que dia') && !p.includes('ontem') && !p.includes('amanhã'))) {
      const h = DateService.hoje();
      return `Hoje é **${h.diaSemana}, ${h.data}**`;
    }

    // Hora
    if (p.includes('que hora') || p.includes('qual hora') || p.includes('qual é a hora')) {
      const h = DateService.hoje();
      return `Agora são **${h.hora}**`;
    }

    // Ontem
    if (p.includes('ontem')) {
      const d = DateService.ontem();
      return `Ontem foi **${d.diaSemana}, ${d.data}**`;
    }

    // Amanhã
    if (p.includes('amanhã')) {
      const d = DateService.amanha();
      return `Amanhã será **${d.diaSemana}, ${d.data}**`;
    }

    // Daqui a X dias/semanas/meses/anos
    const futuroMatch = p.match(/daqui\s+(?:a\s+)?(\d+)\s+(dia|dias|semana|semanas|mês|meses|ano|anos)/);
    if (futuroMatch) {
      const valor = parseInt(futuroMatch[1]);
      const unidade = futuroMatch[2];
      let d: any;

      if (unidade.includes('dia')) d = DateService.futuroDias(valor);
      else if (unidade.includes('semana')) d = DateService.futuroSemanas(valor);
      else if (unidade.includes('mês')) d = DateService.futuroMeses(valor);
      else if (unidade.includes('ano')) d = DateService.futuroAnos(valor);

      return `Daqui a ${valor} ${unidade} será **${d.diaSemana}, ${d.data}**`;
    }

    // Há X dias/semanas/meses/anos
    const passadoMatch = p.match(/há\s+(\d+)\s+(dia|dias|semana|semanas|mês|meses|ano|anos)/);
    if (passadoMatch) {
      const valor = parseInt(passadoMatch[1]);
      const unidade = passadoMatch[2];
      let d: any;

      if (unidade.includes('dia')) d = DateService.passadoDias(valor);
      else if (unidade.includes('semana')) d = DateService.passadoSemanas(valor);
      else if (unidade.includes('mês')) d = DateService.passadoMeses(valor);
      else if (unidade.includes('ano')) d = DateService.passadoAnos(valor);

      return `Há ${valor} ${unidade} foi **${d.diaSemana}, ${d.data}**`;
    }

    // Em X dias/semanas/meses/anos
    const emMatch = p.match(/em\s+(\d+)\s+(dia|dias|semana|semanas|mês|meses|ano|anos)/);
    if (emMatch) {
      const valor = parseInt(emMatch[1]);
      const unidade = emMatch[2];
      let d: any;

      if (unidade.includes('dia')) d = DateService.futuroDias(valor);
      else if (unidade.includes('semana')) d = DateService.futuroSemanas(valor);
      else if (unidade.includes('mês')) d = DateService.futuroMeses(valor);
      else if (unidade.includes('ano')) d = DateService.futuroAnos(valor);

      return `Em ${valor} ${unidade} será **${d.diaSemana}, ${d.data}**`;
    }

    // Semana passada
    if (p.includes('semana passada')) {
      const d = DateService.passadoSemanas(1);
      return `Semana passada foi **${d.diaSemana}, ${d.data}**`;
    }

    // Semana que vem
    if (p.includes('semana que vem') || p.includes('próxima semana')) {
      const d = DateService.futuroSemanas(1);
      return `Semana que vem será **${d.diaSemana}, ${d.data}**`;
    }

    // Mês passado
    if (p.includes('mês passado')) {
      const d = DateService.passadoMeses(1);
      return `Mês passado foi **${d.diaSemana}, ${d.data}**`;
    }

    // Mês que vem
    if (p.includes('mês que vem') || p.includes('próximo mês')) {
      const d = DateService.futuroMeses(1);
      return `Mês que vem será **${d.diaSemana}, ${d.data}**`;
    }

    // Ano passado
    if (p.includes('ano passado')) {
      const d = DateService.passadoAnos(1);
      return `Ano passado foi **${d.diaSemana}, ${d.data}**`;
    }

    // Ano que vem
    if (p.includes('ano que vem') || p.includes('próximo ano')) {
      const d = DateService.futuroAnos(1);
      return `Ano que vem será **${d.diaSemana}, ${d.data}**`;
    }

    // Em YYYY
    const anoMatch = p.match(/em\s+(\d{4})/);
    if (anoMatch) {
      const ano = parseInt(anoMatch[1]);
      const d = DateService.emAno(ano);
      return `Em ${ano} será **${d.diaSemana}, ${d.data}**`;
    }

    // Apenas YYYY
    const anoOnlyMatch = p.match(/(\d{4})/);
    if (anoOnlyMatch) {
      const ano = parseInt(anoOnlyMatch[1]);
      const now = new Date();
      if (ano !== now.getFullYear()) {
        const d = DateService.emAno(ano);
        return `Em ${ano} será **${d.diaSemana}, ${d.data}**`;
      }
    }

    return 'Desculpe, não consegui identificar a pergunta sobre data/hora.';
  }
}
