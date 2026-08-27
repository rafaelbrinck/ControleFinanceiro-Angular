export interface DadosEmpresa {
  user_id: string;
  created_at?: string;
  nome: string;
  cnpj: string;
  razao_social: string;
  email_contato: string;
  telefone_contato: string;
  slogan: string;
  endereco_completo: string;
}

export type DadosEmpresaPayload = Omit<DadosEmpresa, 'user_id' | 'created_at'>;
