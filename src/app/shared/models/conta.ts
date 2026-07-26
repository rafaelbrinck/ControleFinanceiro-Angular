import { CategoriaFamilia } from './familia';

export interface Conta {
  id: number;
  created_at?: string;
  id_familia: number;
  id_criador: number;
  valor: number;
  data_vencimento: string;
  descricao: string;
  id_categoria: number;
  pago: boolean;
  is_fixa: boolean;
}

/** Conta enriquecida com dados de categoria para exibição. */
export interface ContaDetalhada extends Conta {
  categoria?: Pick<CategoriaFamilia, 'id' | 'nome' | 'cor'>;
}

export interface ContaCreate {
  id_familia: number;
  id_criador: number;
  valor: number;
  data_vencimento: string;
  descricao: string;
  id_categoria: number;
  pago?: boolean;
  is_fixa?: boolean;
}

export type ContaUpdate = Partial<
  Omit<ContaCreate, 'id_familia' | 'id_criador'>
> & {
  pago?: boolean;
  is_fixa?: boolean;
};
