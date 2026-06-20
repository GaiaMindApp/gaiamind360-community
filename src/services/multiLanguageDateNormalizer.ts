/**
 * Multi-Language Date Normalizer
 * Converte perguntas sobre datas de EN, ES, FR para PT
 */

const DATE_MAPPING: Record<string, string> = {
  // English - longer phrases first
  'what day of the week is it today': 'que dia da semana sao hoje',
  'what day of the week': 'que dia da semana',
  'what day will it be tomorrow': 'que dia sera amanha',
  'what day was yesterday': 'que dia foi ontem',
  'what will be the date in': 'qual sera a data em',
  'what was the date': 'qual era a data',
  'what is today\'s date': 'qual e a data de hoje',
  'what is the date': 'qual e a data',
  'what time is it': 'que hora sao',
  'what day will it be': 'que dia sera',
  'what day was': 'que dia foi',
  'what day is': 'que dia e',
  'what will be the date': 'qual sera a data',
  'what day': 'que dia',
  'what time': 'que hora',
  'will it be': 'sera',
  'was it': 'foi',
  'is it': 'e',
  'next week': 'semana que vem',
  'last week': 'semana passada',
  'next month': 'mes que vem',
  'last month': 'mes passado',
  'next year': 'ano que vem',
  'last year': 'ano passado',
  'today': 'hoje',
  'now': 'agora',
  'yesterday': 'ontem',
  'tomorrow': 'amanha',
  'ago': 'atras',
  'in': 'em',
  'day': 'dia',
  'days': 'dias',
  'week': 'semana',
  'weeks': 'semanas',
  'month': 'mes',
  'months': 'meses',
  'year': 'ano',
  'years': 'anos',
  'the date': 'a data',
  'the day': 'o dia',
  'the time': 'a hora',

  // Spanish - longer phrases first
  'que dia de la semana es hoy': 'que dia da semana sao hoje',
  'que dia de la semana': 'que dia da semana',
  'cual es la fecha de hoy': 'qual e a data de hoje',
  'cual era la fecha hace': 'qual era a data ha',
  'cual era la fecha la semana pasada': 'qual era a data semana passada',
  'cual era la fecha el mes pasado': 'qual era a data mes passado',
  'cual era la fecha el ano pasado': 'qual era a data ano passado',
  'cual era la fecha en': 'qual era a data em',
  'cual sera la fecha dentro de': 'qual sera a data em',
  'cual sera la fecha la proxima semana': 'qual sera a data semana que vem',
  'cual sera la fecha el proximo mes': 'qual sera a data mes que vem',
  'cual sera la fecha el proximo ano': 'qual sera a data ano que vem',
  'cual sera la fecha en': 'qual sera a data em',
  'que hora es': 'que hora sao',
  'que dia fue ayer': 'que dia foi ontem',
  'que dia sera manana': 'que dia sera amanha',
  'que dia fue': 'que dia foi',
  'que dia sera': 'que dia sera',
  'que dia es': 'que dia e',
  'que hora': 'que hora',
  'que dia': 'que dia',
  'la proxima semana': 'semana que vem',
  'la semana que viene': 'semana que vem',
  'semana que viene': 'semana que vem',
  'la semana pasada': 'semana passada',
  'semana pasada': 'semana passada',
  'el proximo mes': 'mes que vem',
  'el mes que viene': 'mes que vem',
  'mes que viene': 'mes que vem',
  'el mes pasado': 'mes passado',
  'mes pasado': 'mes passado',
  'el proximo ano': 'ano que vem',
  'proximo ano': 'ano que vem',
  'el ano pasado': 'ano passado',
  'ano pasado': 'ano passado',
  'hoy': 'hoje',
  'ahora': 'agora',
  'ayer': 'ontem',
  'manana': 'amanha',
  'sera': 'sera',
  'fue': 'foi',
  'es': 'e',
  'hace': 'ha',
  'en': 'em',
  'dia': 'dia',
  'dias': 'dias',
  'semana': 'semana',
  'semanas': 'semanas',
  'mes': 'mes',
  'meses': 'meses',
  'ano': 'ano',
  'anos': 'anos',
  'fecha': 'data',
  'la fecha': 'a data',
  'la proxima': 'a proxima',
  'proxima': 'proxima',

  // French - longer phrases first
  'quel jour de la semaine sommes nous aujourd hui': 'que dia da semana sao hoje',
  'quel jour de la semaine': 'que dia da semana',
  'quelle est la date d aujourd hui': 'qual e a data de hoje',
  'quelle etait la date il y a': 'qual era a data ha',
  'quelle etait la date la semaine derniere': 'qual era a data semana passada',
  'quelle etait la date le mois dernier': 'qual era a data mes passado',
  'quelle etait la date l annee derniere': 'qual era a data ano passado',
  'quelle etait la date en': 'qual era a data em',
  'quelle sera la date dans': 'qual sera a data em',
  'quelle sera la date la semaine prochaine': 'qual sera a data semana que vem',
  'quelle sera la date le mois prochain': 'qual sera a data mes que vem',
  'quelle sera la date l annee prochaine': 'qual sera a data ano que vem',
  'quelle sera la date en': 'qual sera a data em',
  'quelle heure est il': 'que hora sao',
  'quel jour etait hier': 'que dia foi ontem',
  'quel jour sera demain': 'que dia sera amanha',
  'quel jour etait': 'que dia foi',
  'quel jour sera': 'que dia sera',
  'quel jour est': 'que dia e',
  'quelle heure': 'que hora',
  'quel jour': 'que dia',
  'la semaine prochaine': 'semana que vem',
  'semaine prochaine': 'semana que vem',
  'la semaine derniere': 'semana passada',
  'semaine derniere': 'semana passada',
  'le mois prochain': 'mes que vem',
  'mois prochain': 'mes que vem',
  'le mois dernier': 'mes passado',
  'mois dernier': 'mes passado',
  'l annee prochaine': 'ano que vem',
  'annee prochaine': 'ano que vem',
  'l annee derniere': 'ano passado',
  'annee derniere': 'ano passado',
  'aujourd hui': 'hoje',
  'maintenant': 'agora',
  'hier': 'ontem',
  'demain': 'amanha',
  'sera': 'sera',
  'etait': 'foi',
  'est': 'e',
  'il y a': 'ha',
  'dans': 'em',
  'jour': 'dia',
  'jours': 'dias',
  'semaine': 'semana',
  'semaines': 'semanas',
  'mois': 'mes',
  'an': 'ano',
  'ans': 'anos',
  'date': 'data',
  'la date': 'a data'
};

export class MultiLanguageDateNormalizer {
  static normalize(question: string): string {
    let normalized = question.toLowerCase();
    
    // Remove accents
    normalized = normalized
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ç/g, 'c')
      .replace(/à/g, 'a').replace(/è/g, 'e').replace(/ù/g, 'u')
      .replace(/ñ/g, 'n').replace(/ü/g, 'u');

    // Apply mapping in order of length (longer first)
    const sortedKeys = Object.keys(DATE_MAPPING).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      if (normalized.includes(key)) {
        normalized = normalized.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), DATE_MAPPING[key]);
      }
    }

    return normalized;
  }

  static isDateQuestion(question: string): boolean {
    const normalized = this.normalize(question);
    const dateKeywords = [
      'que dia', 'que hora', 'hoje', 'agora', 'data', 'horario',
      'ontem', 'amanha', 'proximo', 'proxima', 'passado', 'futuro',
      'semana que vem', 'semana passada', 'mes que vem', 'mes passado',
      'ano que vem', 'ano passado', 'daqui', 'ha', 'em', 'sera', 'foi'
    ];
    return dateKeywords.some(kw => normalized.includes(kw));
  }
}
