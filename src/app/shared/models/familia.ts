export interface UsuarioFamilia {
  id: string;
  username?: string;
  data_criacao?: string;
  logo?: string | null;
  nome?: string | null;
  qrcode_pix?: string | null;
}

export interface Familia {
  id: number;
  created_at?: string;
  nome: string;
  adm_id: string;
}

export interface FamiliaCreate {
  nome: string;
  adm_id: string;
}

export interface MembroFamilia {
  id: number;
  created_at?: string;
  id_membro: string;
  id_familia: number;
  role: string;
}

/** Membro com dados do usuário (join com `usuarios`). */
export interface MembroFamiliaDetalhado extends MembroFamilia {
  usuario?: Pick<UsuarioFamilia, 'id' | 'nome' | 'qrcode_pix' | 'logo' | 'username'>;
}

export type RoleMembroFamilia = 'admin' | 'membro';

export interface MembroFamiliaCreate {
  id_membro: string;
  id_familia: number;
  role: RoleMembroFamilia | string;
}

export interface MembroFamiliaUpdate {
  role?: RoleMembroFamilia | string;
}

export interface CategoriaFamilia {
  id: number;
  created_at?: string;
  nome: string;
  cor: string;
  id_familia: number;
}

export interface CategoriaFamiliaCreate {
  nome: string;
  cor: string;
  id_familia: number;
}

export interface CategoriaFamiliaUpdate {
  nome?: string;
  cor?: string;
}
