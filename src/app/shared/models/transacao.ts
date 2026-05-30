export class Transacao {
  id?: number;
  nome?: string;
  valor?: number;
  tipo?: string;
  categoria?: number;
  cat?: string;
  data?: Date | string;
  idUser?: string;

  // Chaves Estrangeiras (IDs no banco)
  cartao_id?: number | null;
  fornecedor_id?: number | null;

  // Propriedades visuais para a tabela (Front-end)
  cartao_nome?: string | null;
  fornecedor_nome?: string | null;
}
