import { Cliente } from './cliente';
import { Produto } from './produto';

export class Orcamento {
  id?: number;
  cliente?: Cliente;
  produtos?: [Produto];
  valorTotal?: number;
  status?: 'Aberto' | 'Pago' | 'Finalizado';
  formaPagamento?: 'Pix' | 'Dinheiro' | 'Crédito';
  idUser?: string;
}
