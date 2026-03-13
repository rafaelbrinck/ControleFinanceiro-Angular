import { Cliente } from './cliente';
import { ProdutoOrcamento } from './produto';

export class Orcamento {
  id?: number;
  cliente?: Cliente;
  produtos?: ProdutoOrcamento[];
  valorCredito: number = 0;
  valor: number = 0;
  status?:
    | 'Aberto'
    | 'Pago'
    | 'Finalizado'
    | 'Cancelado'
    | 'Aguardando Pagamento';
  formaPagamento?: 'Pix' | 'Dinheiro' | 'Crédito' | 'Boleto';
  idUser?: string;
  nomeCliente?: string;
  created_at?: Date;
  updated_at?: Date;
  frete: number = 0;
  desconto: number = 0;
  dt_boleto?: Date;
}
