import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '@app/core/data/supabase/supabase.client';
import {
  Conta,
  ContaCreate,
  ContaDetalhada,
  ContaUpdate,
} from '@app/shared/models/conta';

@Injectable({
  providedIn: 'root',
})
export class BillsService {
  private contasSubject = new BehaviorSubject<ContaDetalhada[]>([]);
  public contas$: Observable<ContaDetalhada[]> =
    this.contasSubject.asObservable();

  readonly contas = signal<ContaDetalhada[]>([]);
  readonly carregando = signal(false);

  getContasSnapshot(): ContaDetalhada[] {
    return this.contasSubject.getValue();
  }

  /**
   * Busca contas da família filtrando por mês/ano (data_vencimento).
   */
  async buscarPorMes(
    idFamilia: number,
    mes: number,
    ano: number,
  ): Promise<ContaDetalhada[]> {
    this.carregando.set(true);

    try {
      const inicio = this.formatarData(ano, mes, 1);
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = this.formatarData(ano, mes, ultimoDia);

      const { data, error } = await supabase
        .from('Contas')
        .select(
          `
          *,
          categoria:CategoriasFamilias (
            id,
            nome,
            cor
          )
        `,
        )
        .eq('id_familia', idFamilia)
        .gte('data_vencimento', inicio)
        .lte('data_vencimento', fim)
        .order('data_vencimento', { ascending: true });

      if (error) {
        console.error('Erro ao buscar contas do mês:', error.message);
        this.atualizarContas([]);
        return [];
      }

      const contas = (data ?? []).map((c) => this.normalizarConta(c));
      this.atualizarContas(contas);
      return contas;
    } finally {
      this.carregando.set(false);
    }
  }

  async buscarPorId(id: number): Promise<ContaDetalhada | null> {
    const { data, error } = await supabase
      .from('Contas')
      .select(
        `
        *,
        categoria:CategoriasFamilias (
          id,
          nome,
          cor
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Erro ao buscar conta:', error?.message);
      return null;
    }

    return this.normalizarConta(data);
  }

  async criar(conta: ContaCreate): Promise<Conta | null> {
    const payload = {
      ...conta,
      pago: conta.pago ?? false,
      is_fixa: conta.is_fixa ?? false,
    };

    const { data, error } = await supabase
      .from('Contas')
      .insert([payload])
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erro ao criar conta:', error?.message);
      return null;
    }

    return data as Conta;
  }

  async atualizar(id: number, conta: ContaUpdate): Promise<boolean> {
    const { error } = await supabase.from('Contas').update(conta).eq('id', id);

    if (error) {
      console.error('Erro ao atualizar conta:', error.message);
      return false;
    }

    return true;
  }

  async deletar(id: number): Promise<boolean> {
    const { error } = await supabase.from('Contas').delete().eq('id', id);

    if (error) {
      console.error('Erro ao deletar conta:', error.message);
      return false;
    }

    return true;
  }

  async alternarPago(id: number, pago: boolean): Promise<boolean> {
    return this.atualizar(id, { pago });
  }

  /**
   * Busca contas fixas (`is_fixa = true`) do mês imediatamente anterior.
   */
  async buscarContasFixasMesAnterior(
    idFamilia: number,
    mes: number,
    ano: number,
  ): Promise<Conta[]> {
    const { mes: mesAnt, ano: anoAnt } = this.mesAnterior(mes, ano);
    const inicio = this.formatarData(anoAnt, mesAnt, 1);
    const ultimoDia = new Date(anoAnt, mesAnt, 0).getDate();
    const fim = this.formatarData(anoAnt, mesAnt, ultimoDia);

    const { data, error } = await supabase
      .from('Contas')
      .select('*')
      .eq('id_familia', idFamilia)
      .eq('is_fixa', true)
      .gte('data_vencimento', inicio)
      .lte('data_vencimento', fim);

    if (error) {
      console.error('Erro ao buscar contas fixas:', error.message);
      return [];
    }

    return (data ?? []) as Conta[];
  }

  /**
   * Copia contas fixas para o mês/ano vigente, preservando o dia do vencimento.
   */
  async importarContasFixas(
    contasFixas: Conta[],
    mesDestino: number,
    anoDestino: number,
  ): Promise<Conta[]> {
    if (!contasFixas.length) return [];

    const novas: ContaCreate[] = contasFixas.map((c) => ({
      id_familia: c.id_familia,
      id_criador: c.id_criador,
      valor: c.valor,
      descricao: c.descricao,
      id_categoria: c.id_categoria,
      pago: false,
      is_fixa: true,
      data_vencimento: this.ajustarDataParaMes(
        c.data_vencimento,
        mesDestino,
        anoDestino,
      ),
    }));

    const { data, error } = await supabase
      .from('Contas')
      .insert(novas)
      .select('*');

    if (error) {
      console.error('Erro ao importar contas fixas:', error.message);
      return [];
    }

    return (data ?? []) as Conta[];
  }

  /**
   * Ajusta a data de vencimento para o mês/ano alvo, mantendo o dia
   * (ou o último dia do mês se o dia original não existir).
   */
  ajustarDataParaMes(
    dataOriginal: string,
    mes: number,
    ano: number,
  ): string {
    const diaOriginal = Number(String(dataOriginal).slice(8, 10));
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dia = Math.min(diaOriginal || 1, ultimoDia);
    return this.formatarData(ano, mes, dia);
  }

  mesAnterior(mes: number, ano: number): { mes: number; ano: number } {
    if (mes === 1) return { mes: 12, ano: ano - 1 };
    return { mes: mes - 1, ano };
  }

  /** `mes` é 1–12. */
  private formatarData(ano: number, mes: number, dia: number): string {
    const m = String(mes).padStart(2, '0');
    const d = String(dia).padStart(2, '0');
    return `${ano}-${m}-${d}`;
  }

  private normalizarConta(raw: Record<string, unknown>): ContaDetalhada {
    const categoria = raw['categoria'] ?? raw['CategoriasFamilias'];
    return {
      id: Number(raw['id']),
      created_at: raw['created_at'] as string | undefined,
      id_familia: Number(raw['id_familia']),
      id_criador: Number(raw['id_criador']),
      valor: Number(raw['valor'] ?? 0),
      data_vencimento: String(raw['data_vencimento'] ?? '').slice(0, 10),
      descricao: String(raw['descricao'] ?? ''),
      id_categoria: Number(raw['id_categoria']),
      pago: Boolean(raw['pago']),
      is_fixa: Boolean(raw['is_fixa']),
      categoria: (Array.isArray(categoria) ? categoria[0] : categoria) as
        | ContaDetalhada['categoria']
        | undefined,
    };
  }

  /** Limpa cache reativo (ex.: logout / troca de usuário). */
  limparEstado(): void {
    this.atualizarContas([]);
    this.carregando.set(false);
  }

  private atualizarContas(contas: ContaDetalhada[]): void {
    this.contasSubject.next(contas);
    this.contas.set(contas);
  }
}
