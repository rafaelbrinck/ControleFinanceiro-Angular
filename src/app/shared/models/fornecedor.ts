export class Fornecedor {
  id?: number;
  nome: string = '';
  cnpj?: string = '';
  idUser?: string;
  created_at?: Date;

  // Campo calculado apenas para o Front-end
  totalGasto?: number = 0;
}
