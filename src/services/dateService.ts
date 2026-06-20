/**
 * Date Service - Manipula datas passadas, presentes e futuras
 */

export class DateService {
  private static DAYS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  private static MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                              'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  static hoje() {
    const now = new Date();
    return {
      data: this.formatDate(now),
      diaSemana: this.getDayName(now),
      hora: this.formatTime(now),
      timestamp: now
    };
  }

  static ontem() {
    const dt = new Date();
    dt.setDate(dt.getDate() - 1);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static amanha() {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static passadoDias(dias: number) {
    const dt = new Date();
    dt.setDate(dt.getDate() - dias);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static futuroDias(dias: number) {
    const dt = new Date();
    dt.setDate(dt.getDate() + dias);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static passadoSemanas(semanas: number) {
    const dt = new Date();
    dt.setDate(dt.getDate() - (semanas * 7));
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static futuroSemanas(semanas: number) {
    const dt = new Date();
    dt.setDate(dt.getDate() + (semanas * 7));
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static passadoMeses(meses: number) {
    const dt = new Date();
    dt.setMonth(dt.getMonth() - meses);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static futuroMeses(meses: number) {
    const dt = new Date();
    dt.setMonth(dt.getMonth() + meses);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static passadoAnos(anos: number) {
    const dt = new Date();
    dt.setFullYear(dt.getFullYear() - anos);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static futuroAnos(anos: number) {
    const dt = new Date();
    dt.setFullYear(dt.getFullYear() + anos);
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  static emAno(ano: number) {
    const now = new Date();
    const dt = new Date(ano, now.getMonth(), now.getDate());
    return {
      data: this.formatDate(dt),
      diaSemana: this.getDayName(dt),
      timestamp: dt
    };
  }

  private static formatDate(date: Date): string {
    const day = date.getDate();
    const month = this.MONTHS_PT[date.getMonth()];
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  private static formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private static getDayName(date: Date): string {
    return this.DAYS_PT[date.getDay()];
  }

  static getContexto(targetDate: Date, now: Date = new Date()): string {
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'hoje';
    if (diffDays === -1) return 'ontem';
    if (diffDays === 1) return 'amanhã';
    if (diffDays > 1) return `daqui a ${diffDays} dias`;
    if (diffDays < -1) return `há ${Math.abs(diffDays)} dias`;
    return '';
  }
}
