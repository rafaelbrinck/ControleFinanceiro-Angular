import { Cliente } from './cliente';
import { ProdutoOrcamento } from './produto';

export class Orcamento {
  id?: number;
  cliente?: Cliente;
  produtos?: ProdutoOrcamento[];
  valorCredito?: number;
  valor?: number;
  status?: 'Aberto' | 'Pago' | 'Finalizado' | 'Cancelado';
  formaPagamento?: 'Pix' | 'Dinheiro' | 'Crédito';
  idUser?: string;
  nomeCliente?: string;
  created_at?: Date;
  updated_at?: Date;
  frete?: number;
  desconto?: number;
}
