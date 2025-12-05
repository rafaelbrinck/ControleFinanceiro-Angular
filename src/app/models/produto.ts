import { Variacao } from './variacoes';

export class Produto {
  id?: number;
  nome?: string;
  valor?: number;
  categoria?: number;
  qtd_gancho?: number;
  cat?: string;
  idUser?: string;
  variacoes: Variacao[] = [];
}

export class ProdutoOrcamento {
  id?: number;
  nome?: string;
  quantidade: number = 1;
  valor: number = 0;
  variacao?: string;
  qtd_gancho?: number;
}
