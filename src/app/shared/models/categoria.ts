export class Categoria {
  id?: number;
  nome?: string;
  userId?: string;
  tipo?: string;
  categoria_mae?: number | null; // <--- Novo campo
}
