import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '@app/core/data/supabase/supabase.client';
import {
  Conta,
  ContaCreate,
  ContaDetalhada,
  ContaUpdate,
} from '@app/shared/models/conta';
import { FamilyService } from './family.service';

@Injectable({
  providedIn: 'root',
})
export class BillsService {
  private readonly familyService = inject(FamilyService);

  private contasSubject = new BehaviorSubject<ContaDetalhada[]>([]);
  public contas$: Observable<ContaDetalhada[]> =
    this.contasSubject.asObservable();

  /** Chave do mês em cache: `${idFamilia}-${mes}-${ano}`. */
  private cacheMesKey: string | null = null;

  readonly contas = signal<ContaDetalhada[]>([]);
  readonly carregando = signal(false);

  getContasSnapshot(): ContaDetalhada[] {
    return this.contasSubject.getValue();
  }

  /**
   * Busca contas da família filtrando por mês/ano (data_vencimento).
   * Cache em memória por mês — use `forceRefresh` ao trocar de mês ou após importação.
   */
  async buscarPorMes(
    idFamilia: number,
    mes: number,
    ano: number,
    forceRefresh = false,
  ): Promise<ContaDetalhada[]> {
    const key = this.chaveMes(idFamilia, mes, ano);
    if (!forceRefresh && this.cacheMesKey === key) {
      return this.contas();
    }

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
        this.cacheMesKey = null;
        return [];
      }

      const contas = (data ?? []).map((c) => this.normalizarConta(c));
      this.atualizarContas(contas);
      this.cacheMesKey = key;
      return contas;
    } finally {
      this.carregando.set(false);
    }
  }

  async buscarPorId(id: number): Promise<ContaDetalhada | null> {
    const local = this.contas().find((c) => c.id === id);
    if (local) return local;

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
      .single();

    if (error || !data) {
      console.error('Erro ao criar conta:', error?.message);
      return null;
    }

    const criada = this.normalizarConta(data as Record<string, unknown>);
    this.inserirContaNoCacheSeMesmoMes(criada);
    return criada;
  }

  async atualizar(id: number, conta: ContaUpdate): Promise<boolean> {
    const anterior = this.contas().find((c) => c.id === id);
    if (anterior) {
      const mesclada = this.mesclarContaLocal(anterior, conta);
      if (this.pertenceAoMesEmCache(mesclada.data_vencimento, mesclada.id_familia)) {
        this.inserirContaOrdenada(mesclada);
      } else {
        // Vencimento saiu do mês exibido — some da lista local
        this.atualizarContas(this.contas().filter((c) => c.id !== id));
      }
    }

    const { error } = await supabase.from('Contas').update(conta).eq('id', id);

    if (error) {
      console.error('Erro ao atualizar conta:', error.message);
      if (anterior) {
        this.inserirContaOrdenada(anterior);
      }
      return false;
    }

    return true;
  }

  async deletar(id: number): Promise<boolean> {
    const anterior = this.contas().find((c) => c.id === id);
    if (anterior) {
      this.atualizarContas(this.contas().filter((c) => c.id !== id));
    }

    const { error } = await supabase.from('Contas').delete().eq('id', id);

    if (error) {
      console.error('Erro ao deletar conta:', error.message);
      if (anterior) {
        this.inserirContaOrdenada(anterior);
      }
      return false;
    }

    return true;
  }

  /** Toggle otimista: atualiza UI primeiro, sincroniza depois. */
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
      .select(
        `
        *,
        categoria:CategoriasFamilias (
          id,
          nome,
          cor
        )
      `,
      );

    if (error) {
      console.error('Erro ao importar contas fixas:', error.message);
      return [];
    }

    const importadas = (data ?? []).map((c) =>
      this.normalizarConta(c as Record<string, unknown>),
    );
    if (importadas.length) {
      const mescladas = [...this.contas(), ...importadas].sort((a, b) =>
        a.data_vencimento.localeCompare(b.data_vencimento),
      );
      this.atualizarContas(mescladas);
      if (importadas[0]) {
        this.cacheMesKey = this.chaveMes(
          importadas[0].id_familia,
          mesDestino,
          anoDestino,
        );
      }
    }

    return importadas;
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

  private chaveMes(idFamilia: number, mes: number, ano: number): string {
    return `${idFamilia}-${mes}-${ano}`;
  }

  private inserirContaNoCacheSeMesmoMes(conta: ContaDetalhada): void {
    if (this.pertenceAoMesEmCache(conta.data_vencimento, conta.id_familia)) {
      this.inserirContaOrdenada(conta);
      if (!this.cacheMesKey) {
        const [y, m] = conta.data_vencimento.split('-').map(Number);
        this.cacheMesKey = this.chaveMes(conta.id_familia, m, y);
      }
    }
  }

  private pertenceAoMesEmCache(
    dataVencimento: string,
    idFamilia: number,
  ): boolean {
    const [y, m] = String(dataVencimento).slice(0, 10).split('-').map(Number);
    const keyConta = this.chaveMes(idFamilia, m, y);
    return !this.cacheMesKey || this.cacheMesKey === keyConta;
  }

  private mesclarContaLocal(
    anterior: ContaDetalhada,
    patch: ContaUpdate,
  ): ContaDetalhada {
    const mesclada: ContaDetalhada = { ...anterior, ...patch };
    if (patch.id_categoria != null) {
      const cat = this.familyService
        .categorias()
        .find((c) => Number(c.id) === Number(patch.id_categoria));
      if (cat) {
        mesclada.categoria = {
          id: Number(cat.id),
          nome: cat.nome,
          cor: cat.cor,
        };
        mesclada.id_categoria = Number(cat.id);
      }
    }
    return mesclada;
  }

  private inserirContaOrdenada(conta: ContaDetalhada): void {
    const lista = [...this.contas().filter((c) => c.id !== conta.id), conta].sort(
      (a, b) => a.data_vencimento.localeCompare(b.data_vencimento),
    );
    this.atualizarContas(lista);
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
    this.cacheMesKey = null;
    this.atualizarContas([]);
    this.carregando.set(false);
  }

  private atualizarContas(contas: ContaDetalhada[]): void {
    this.contasSubject.next(contas);
    this.contas.set(contas);
  }
}
