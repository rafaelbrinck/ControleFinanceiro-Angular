import { Injectable, computed, signal } from '@angular/core';
import { LoginService } from '@app/core/auth/services/login.service';
import { supabase } from '@app/core/data/supabase/supabase.client';
import {
  DadosEmpresa,
  DadosEmpresaPayload,
} from '@app/shared/models/dados-empresa';

const COLUNAS_EMPRESA =
  'user_id, created_at, nome, cnpj, razao_social, email_contato, telefone_contato, slogan, endereco_completo';

@Injectable({
  providedIn: 'root',
})
export class DadosEmpresaService {
  readonly empresa = signal<DadosEmpresa | null>(null);
  readonly carregando = signal(false);
  readonly temEmpresa = computed(() => !!this.empresa());

  private cachePronto = false;
  private fetchPromise: Promise<DadosEmpresa | null> | null = null;

  constructor(private loginService: LoginService) {}

  getSnapshot(): DadosEmpresa | null {
    return this.empresa();
  }

  async carregar(forceRefresh = false): Promise<DadosEmpresa | null> {
    if (!forceRefresh && this.cachePronto) {
      return this.empresa();
    }

    if (this.fetchPromise && !forceRefresh) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.buscarNoBanco();
    try {
      return await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  async salvar(payload: DadosEmpresaPayload): Promise<DadosEmpresa | null> {
    const userId = this.loginService.getUserLogado();
    if (!userId) {
      return null;
    }

    this.carregando.set(true);
    const registro = {
      user_id: userId,
      nome: payload.nome.trim(),
      cnpj: payload.cnpj.trim(),
      razao_social: payload.razao_social.trim(),
      email_contato: payload.email_contato.trim(),
      telefone_contato: payload.telefone_contato.trim(),
      slogan: payload.slogan.trim(),
      endereco_completo: payload.endereco_completo.trim(),
    };

    const { data, error } = await supabase
      .from('dados_empresa')
      .upsert(registro, { onConflict: 'user_id' })
      .select(COLUNAS_EMPRESA)
      .single();

    this.carregando.set(false);

    if (error) {
      console.error('Erro ao salvar dados da empresa:', error.message);
      return null;
    }

    const empresa = (data as DadosEmpresa) ?? {
      ...registro,
      created_at: this.empresa()?.created_at,
    };
    this.empresa.set(empresa);
    this.cachePronto = true;
    return empresa;
  }

  nomeArquivoOrcamento(
    numero?: number | null,
    nomeCliente?: string | null,
  ): string {
    const nome = this.slugNome(nomeCliente || 'Cliente');
    const id = String(numero ?? 0).padStart(3, '0');
    return `${nome}_Orcamento_${id}.pdf`;
  }

  limparEstado(): void {
    this.empresa.set(null);
    this.carregando.set(false);
    this.cachePronto = false;
    this.fetchPromise = null;
  }

  private async buscarNoBanco(): Promise<DadosEmpresa | null> {
    const userId = this.loginService.getUserLogado();
    if (!userId) {
      this.empresa.set(null);
      this.cachePronto = true;
      return null;
    }

    this.carregando.set(true);
    const { data, error } = await supabase
      .from('dados_empresa')
      .select(COLUNAS_EMPRESA)
      .eq('user_id', userId)
      .maybeSingle();

    this.carregando.set(false);

    if (error) {
      console.error('Erro ao carregar dados da empresa:', error.message);
      this.empresa.set(null);
      this.cachePronto = true;
      return null;
    }

    this.empresa.set((data as DadosEmpresa | null) ?? null);
    this.cachePronto = true;
    return this.empresa();
  }

  private slugNome(nome: string): string {
    const slug = nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');

    return slug || 'Empresa';
  }
}
