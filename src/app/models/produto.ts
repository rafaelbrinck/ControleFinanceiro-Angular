export class Produto {
  id?: number;
  nome?: string;
  valor?: number;
  categoria?: number;
  cat?: string;
  idUser?: string;
}

export class ProdutoOrcamento {
  id?: number;
  nome?: string;
  quantidade: number = 1;
  valor: number = 0;
}
