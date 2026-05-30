export class Cartao {
  id?: number;
  nome: string = '';
  limite: number = 0;
  dia_pagamento: number = 1;
  id_user?: string;
  created_at?: Date;

  faturaAtual?: number = 0;
  limiteDisponivel?: number = 0;
  percentualUso?: number = 0;
}
