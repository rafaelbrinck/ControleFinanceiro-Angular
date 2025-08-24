export class VariacoesDTO {
  id?: number;
  idUser?: string;
  idProd?: number;
  variacao?: string;
  valor?: number;
  created_at?: Date;
}

export class Variacao {
  variacao?: string;
  valor?: number;
}
