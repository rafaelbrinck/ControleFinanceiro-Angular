export type TipoJornada = 'Entrada' | 'Saida';

export class Jornada {
  id?: string;
  created_at?: string;
  tipo?: TipoJornada;
  id_user?: string;
}

export interface ResumoDiaJornada {
  minutos: number;
  label: string;
}

export interface TopDiaJornada {
  data: string; // yyyy-MM-dd
  minutos: number;
  label: string;
}
