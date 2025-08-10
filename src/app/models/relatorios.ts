export interface ClienteResumo {
  cliente_id: number;
  cliente_nome: string;
  total_compras: number;
  total_produtos_vendidos: number;
  produtos: {
    produto_nome: string;
    total_vendido: number;
  }[];
}

export interface ProdutoResumo {
  produto_nome: string;
  total_vendido: number;
}
