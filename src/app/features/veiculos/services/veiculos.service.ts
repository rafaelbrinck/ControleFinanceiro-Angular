import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { LoginService } from '@app/core/auth/services/login.service';
import { AlertaService } from '@app/core/services/alerta.service';
import {
  Abastecimento,
  AbastecimentoCreate,
  EventoTimeline,
  GastoPorCategoria,
  ManutencaoCreate,
  ManutencaoDetalhada,
  RelatorioCombustivel,
  RelatorioManutencao,
  RelatorioVeiculo,
  ResumoGastosMes,
  TipoServico,
  TrechoConsumo,
  Veiculo,
  VeiculoCreate,
  VeiculoUpdate,
} from '@app/shared/models/veiculo';

const TIMELINE_PAGE_SIZE = 20;
/** Lookback máximo de abastecimentos para cálculo de consumo (km/L). */
const RELATORIO_ABS_LOOKBACK = 80;

interface ContextoMes {
  idVeiculo: number;
  mes: number;
  ano: number;
}

@Injectable({
  providedIn: 'root',
})
export class VeiculosService {
  private veiculosSubject = new BehaviorSubject<Veiculo[]>([]);
  public veiculos$: Observable<Veiculo[]> = this.veiculosSubject.asObservable();

  private timelineSubject = new BehaviorSubject<EventoTimeline[]>([]);
  public timeline$: Observable<EventoTimeline[]> =
    this.timelineSubject.asObservable();

  private loadsEmAndamento = 0;
  private veiculosCachePronto = false;
  private tiposCachePronto = false;
  private ultimoValorLitroCache = new Map<number, number>();
  /** Temps cancelados pelo usuário antes do insert concluir. */
  private tempsCancelados = new Set<number>();
  /** Sequência para descartar respostas stale de loads concorrentes. */
  private loadTimelineSeq = 0;
  private loadRelatorioSeq = 0;

  /** Eventos do mês (cache local para paginação sem reconsultar o banco). */
  private timelineMesCompleta: EventoTimeline[] = [];
  private absMesCache: Abastecimento[] = [];
  private manMesCache: ManutencaoDetalhada[] = [];
  private contextoMes: ContextoMes | null = null;
  private timelineVisiveis = 0;

  readonly veiculos = signal<Veiculo[]>([]);
  readonly veiculoAtivo = signal<Veiculo | null>(null);
  readonly timeline = signal<EventoTimeline[]>([]);
  readonly timelineTemMais = signal(false);
  readonly tiposServico = signal<TipoServico[]>([]);
  readonly resumoMes = signal<ResumoGastosMes>(this.resumoVazio());
  readonly relatorio = signal<RelatorioVeiculo | null>(null);
  readonly carregandoRelatorio = signal(false);
  readonly carregando = signal(false);
  readonly carregandoMaisTimeline = signal(false);

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService,
  ) {}

  limparEstado(): void {
    this.loadsEmAndamento = 0;
    this.veiculosCachePronto = false;
    this.tiposCachePronto = false;
    this.ultimoValorLitroCache.clear();
    this.tempsCancelados.clear();
    this.loadTimelineSeq += 1;
    this.loadRelatorioSeq += 1;
    this.resetCacheMes();
    this.veiculosSubject.next([]);
    this.timelineSubject.next([]);
    this.veiculos.set([]);
    this.veiculoAtivo.set(null);
    this.timeline.set([]);
    this.timelineTemMais.set(false);
    this.tiposServico.set([]);
    this.carregando.set(false);
    this.resumoMes.set(this.resumoVazio());
    this.relatorio.set(null);
    this.carregandoRelatorio.set(false);
    this.carregandoMaisTimeline.set(false);
  }

  // ─── Veículos (cache em memória) ───────────────────────────

  /**
   * Lista veículos do usuário. Usa cache local; passe `forceRefresh`
   * para forçar nova consulta ao Supabase.
   */
  async carregarVeiculos(forceRefresh = false): Promise<Veiculo[]> {
    if (this.veiculosCachePronto && !forceRefresh) {
      return this.veiculos();
    }

    const userId = this.loginService.getUserLogado();
    if (!userId) return [];

    this.beginLoad();
    try {
      const { data, error } = await supabase
        .from('Veiculos')
        .select('*')
        .eq('id_usuario', userId)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao listar veículos:', error.message);
        this.atualizarVeiculos([]);
        this.veiculosCachePronto = false;
        return [];
      }

      const lista = ((data ?? []) as Veiculo[]).map((v) =>
        this.normalizarVeiculo(v),
      );
      this.atualizarVeiculos(lista);
      this.veiculosCachePronto = true;

      const ativo = this.veiculoAtivo();
      if (!ativo && lista.length) {
        this.selecionarVeiculo(lista[0].id);
      } else if (ativo && !lista.some((v) => v.id === ativo.id)) {
        this.selecionarVeiculo(lista[0]?.id ?? null);
      } else if (ativo) {
        this.selecionarVeiculo(ativo.id);
      }

      return lista;
    } finally {
      this.endLoad();
    }
  }

  selecionarVeiculo(id: number | null): void {
    if (id == null) {
      this.veiculoAtivo.set(null);
      this.resetCacheMes();
      this.atualizarTimelineVisivel([]);
      this.resumoMes.set(this.resumoVazio());
      this.relatorio.set(null);
      return;
    }
    const veiculo = this.veiculos().find((v) => v.id === id) ?? null;
    this.veiculoAtivo.set(veiculo);
  }

  async criarVeiculo(
    payload: Omit<VeiculoCreate, 'id_usuario'>,
  ): Promise<Veiculo | null> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('Veiculos')
      .insert([{ ...payload, id_usuario: userId }])
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erro ao criar veículo:', error?.message);
      return null;
    }

    const criado = this.normalizarVeiculo(data as Veiculo);
    this.atualizarVeiculos([...this.veiculos(), criado].sort((a, b) =>
      a.nome.localeCompare(b.nome),
    ));
    this.veiculosCachePronto = true;
    this.selecionarVeiculo(criado.id);
    return criado;
  }

  async atualizarVeiculo(id: number, payload: VeiculoUpdate): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return false;

    const anterior = this.veiculos().find((v) => v.id === id);
    if (anterior) {
      this.patchVeiculoLocal(id, payload);
    }

    const { error } = await supabase
      .from('Veiculos')
      .update(payload)
      .eq('id', id)
      .eq('id_usuario', userId);

    if (error) {
      console.error('Erro ao atualizar veículo:', error.message);
      if (anterior) {
        this.patchVeiculoLocal(id, anterior);
      }
      return false;
    }

    return true;
  }

  /** Atualiza odômetro só em memória (ex.: após registro otimista). */
  patchOdometroLocal(id: number, odometro: number): void {
    this.patchVeiculoLocal(id, { odometro_base: odometro });
  }

  async deletarVeiculo(id: number): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return false;

    const { error } = await supabase
      .from('Veiculos')
      .delete()
      .eq('id', id)
      .eq('id_usuario', userId);

    if (error) {
      console.error('Erro ao excluir veículo:', error.message);
      return false;
    }

    const restante = this.veiculos().filter((v) => v.id !== id);
    this.atualizarVeiculos(restante);
    if (this.veiculoAtivo()?.id === id) {
      this.selecionarVeiculo(restante[0]?.id ?? null);
    }
    return true;
  }

  // ─── Tipos de serviço (cache em memória) ───────────────────

  async carregarTiposServico(forceRefresh = false): Promise<TipoServico[]> {
    if (this.tiposCachePronto && !forceRefresh) {
      return this.tiposServico();
    }

    const { data, error } = await supabase
      .from('TiposServico')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar tipos de serviço:', error.message);
      this.tiposServico.set([]);
      this.tiposCachePronto = false;
      return [];
    }

    const tipos = ((data ?? []) as TipoServico[]).map((t) => ({
      id: Number(t.id),
      nome: String(t.nome ?? ''),
    }));
    this.tiposServico.set(tipos);
    this.tiposCachePronto = true;
    return tipos;
  }

  // ─── Abastecimentos ────────────────────────────────────────

  /**
   * Último R$/L: cache → timeline do mês → Supabase (1 linha).
   */
  async buscarUltimoValorLitro(idVeiculo: number): Promise<number | null> {
    const cached = this.ultimoValorLitroCache.get(idVeiculo);
    if (cached != null && cached > 0) return cached;

    const daTimeline = this.timelineMesCompleta.find(
      (e) =>
        e.tipo === 'abastecimento' &&
        (e.raw as Abastecimento).id_veiculo === idVeiculo,
    );
    if (daTimeline) {
      const valor = Number((daTimeline.raw as Abastecimento).valor_litro);
      if (Number.isFinite(valor) && valor > 0) {
        this.ultimoValorLitroCache.set(idVeiculo, valor);
        return valor;
      }
    }

    const { data, error } = await supabase
      .from('Abastecimentos')
      .select('valor_litro')
      .eq('id_veiculo', idVeiculo)
      .order('data', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar último valor/litro:', error.message);
      return null;
    }

    const valor = Number(data?.valor_litro);
    if (Number.isFinite(valor) && valor > 0) {
      this.ultimoValorLitroCache.set(idVeiculo, valor);
      return valor;
    }
    return null;
  }

  /**
   * UI otimista: atualiza timeline/resumo imediatamente e persiste em background.
   * Retorna o evento temporário; o id real é sincronizado após o insert.
   */
  async registrarAbastecimentoOtimista(
    payload: AbastecimentoCreate,
  ): Promise<{ ok: boolean; evento?: EventoTimeline }> {
    const tempId = -Date.now();
    const temp: Abastecimento = {
      id: tempId,
      id_veiculo: payload.id_veiculo,
      data: payload.data,
      odometro: payload.odometro,
      valor_total: payload.valor_total,
      valor_litro: payload.valor_litro,
      litros: payload.litros,
      completou_tanque: payload.completou_tanque ?? false,
      posto_combustivel: payload.posto_combustivel ?? null,
    };

    const evento = this.mapAbastecimento(temp);
    if (this.eventoPertenceAoContextoAtual(evento)) {
      this.absMesCache = [temp, ...this.absMesCache];
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
    }
    this.ultimoValorLitroCache.set(payload.id_veiculo, payload.valor_litro);

    const veiculo = this.veiculoAtivo();
    const odometroAnterior = Number(veiculo?.odometro_base || 0);
    if (veiculo && payload.odometro > odometroAnterior) {
      this.patchOdometroLocal(veiculo.id, payload.odometro);
    }

    void this.persistirAbastecimentoEmBackground(
      payload,
      tempId,
      odometroAnterior,
    );

    return { ok: true, evento };
  }

  private async persistirAbastecimentoEmBackground(
    payload: AbastecimentoCreate,
    tempId: number,
    odometroAnterior: number,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('Abastecimentos')
      .insert([
        {
          ...payload,
          completou_tanque: payload.completou_tanque ?? false,
        },
      ])
      .select('*')
      .single();

    // Usuário excluiu o item otimista enquanto o insert rodava
    if (this.tempsCancelados.has(tempId)) {
      this.tempsCancelados.delete(tempId);
      if (data?.id != null) {
        await supabase.from('Abastecimentos').delete().eq('id', data.id);
      }
      return;
    }

    if (error || !data) {
      console.error('Erro ao criar abastecimento:', error?.message);
      this.absMesCache = this.absMesCache.filter((a) => a.id !== tempId);
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
      if (payload.odometro > odometroAnterior) {
        this.patchOdometroLocal(payload.id_veiculo, odometroAnterior);
      }
      this.alertaService.erro(
        'Sincronização',
        'Não foi possível salvar o abastecimento. A UI foi revertida.',
      );
      return;
    }

    const real = this.normalizarAbastecimento(data as Record<string, unknown>);
    this.substituirEventoTemp(`abs-${tempId}`, this.mapAbastecimento(real));
    this.absMesCache = this.absMesCache.map((a) =>
      a.id === tempId ? real : a,
    );

    if (payload.odometro > odometroAnterior) {
      void this.persistirOdometroNoBanco(payload.id_veiculo, payload.odometro);
    }

    this.invalidarRelatorioSeMesmoVeiculo(payload.id_veiculo, payload.data);
  }

  /** @deprecated Prefira `registrarAbastecimentoOtimista`. */
  async criarAbastecimento(
    payload: AbastecimentoCreate,
  ): Promise<Abastecimento | null> {
    const { data, error } = await supabase
      .from('Abastecimentos')
      .insert([
        {
          ...payload,
          completou_tanque: payload.completou_tanque ?? false,
        },
      ])
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erro ao criar abastecimento:', error?.message);
      return null;
    }

    const criado = this.normalizarAbastecimento(data as Record<string, unknown>);
    this.ultimoValorLitroCache.set(payload.id_veiculo, criado.valor_litro);
    return criado;
  }

  async deletarAbastecimento(id: number): Promise<boolean> {
    // Item ainda não sincronizado: cancela o persist e remove só da UI
    if (id < 0) {
      this.tempsCancelados.add(id);
      this.absMesCache = this.absMesCache.filter((a) => a.id !== id);
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
      return true;
    }

    const removido = this.absMesCache.find((a) => a.id === id);
    if (removido) {
      this.absMesCache = this.absMesCache.filter((a) => a.id !== id);
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
    }

    const { error } = await supabase
      .from('Abastecimentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir abastecimento:', error.message);
      if (removido) {
        this.absMesCache = [removido, ...this.absMesCache];
        this.reconstruirTimelineDoCache();
        this.recalcularResumoDoCache();
      }
      return false;
    }

    this.invalidarRelatorioAtual();
    return true;
  }

  // ─── Manutenções ───────────────────────────────────────────

  async registrarManutencaoOtimista(
    payload: ManutencaoCreate,
  ): Promise<{ ok: boolean; evento?: EventoTimeline }> {
    const tempId = -Date.now();
    const tipos = this.tiposServico();
    const temp: ManutencaoDetalhada = {
      id: tempId,
      id_veiculo: payload.id_veiculo,
      data: payload.data,
      odometro: payload.odometro,
      valor_total: payload.valor_total,
      oficina: payload.oficina ?? null,
      observacoes: payload.observacoes ?? null,
      servicos: payload.servicos.map((s) => ({
        id_manutencao: tempId,
        id_tipo_servico: s.id_tipo_servico,
        valor_servico: s.valor_servico,
        tipo_servico: {
          id: s.id_tipo_servico,
          nome:
            tipos.find((t) => t.id === s.id_tipo_servico)?.nome || 'Serviço',
        },
      })),
    };

    const evento = this.mapManutencao(temp);
    if (this.eventoPertenceAoContextoAtual(evento)) {
      this.manMesCache = [temp, ...this.manMesCache];
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
    }

    const veiculo = this.veiculoAtivo();
    const odometroAnterior = Number(veiculo?.odometro_base || 0);
    if (veiculo && payload.odometro > odometroAnterior) {
      this.patchOdometroLocal(veiculo.id, payload.odometro);
    }

    void this.persistirManutencaoEmBackground(
      payload,
      tempId,
      odometroAnterior,
    );

    return { ok: true, evento };
  }

  private async persistirManutencaoEmBackground(
    payload: ManutencaoCreate,
    tempId: number,
    odometroAnterior: number,
  ): Promise<void> {
    const { servicos, ...manutencao } = payload;

    const { data, error } = await supabase
      .from('Manutencoes')
      .insert([manutencao])
      .select('*')
      .single();

    if (this.tempsCancelados.has(tempId)) {
      this.tempsCancelados.delete(tempId);
      if (data?.id != null) {
        const idReal = Number(data.id);
        await supabase
          .from('Manutencao_Servicos')
          .delete()
          .eq('id_manutencao', idReal);
        await supabase.from('Manutencoes').delete().eq('id', idReal);
      }
      return;
    }

    if (error || !data) {
      console.error('Erro ao criar manutenção:', error?.message);
      this.rollbackManutencaoTemp(tempId, payload, odometroAnterior);
      this.alertaService.erro(
        'Sincronização',
        'Não foi possível salvar a manutenção. A UI foi revertida.',
      );
      return;
    }

    const idManutencao = Number((data as ManutencaoDetalhada).id);

    if (servicos?.length) {
      const linhas = servicos.map((s) => ({
        id_manutencao: idManutencao,
        id_tipo_servico: s.id_tipo_servico,
        valor_servico: s.valor_servico,
      }));

      const { error: erroServicos } = await supabase
        .from('Manutencao_Servicos')
        .insert(linhas);

      if (erroServicos) {
        console.error('Erro ao vincular serviços:', erroServicos.message);
        await supabase.from('Manutencoes').delete().eq('id', idManutencao);
        this.rollbackManutencaoTemp(tempId, payload, odometroAnterior);
        this.alertaService.erro(
          'Sincronização',
          'Não foi possível salvar os serviços. A UI foi revertida.',
        );
        return;
      }
    }

    // Cancelado entre insert da OS e dos serviços
    if (this.tempsCancelados.has(tempId)) {
      this.tempsCancelados.delete(tempId);
      await supabase
        .from('Manutencao_Servicos')
        .delete()
        .eq('id_manutencao', idManutencao);
      await supabase.from('Manutencoes').delete().eq('id', idManutencao);
      return;
    }

    const tipos = this.tiposServico();
    const real: ManutencaoDetalhada = {
      ...this.normalizarManutencao(data as Record<string, unknown>),
      servicos: servicos.map((s) => ({
        id_manutencao: idManutencao,
        id_tipo_servico: s.id_tipo_servico,
        valor_servico: s.valor_servico,
        tipo_servico: {
          id: s.id_tipo_servico,
          nome:
            tipos.find((t) => t.id === s.id_tipo_servico)?.nome || 'Serviço',
        },
      })),
    };

    this.substituirEventoTemp(`man-${tempId}`, this.mapManutencao(real));
    this.manMesCache = this.manMesCache.map((m) =>
      m.id === tempId ? real : m,
    );

    if (payload.odometro > odometroAnterior) {
      void this.persistirOdometroNoBanco(payload.id_veiculo, payload.odometro);
    }

    this.invalidarRelatorioSeMesmoVeiculo(payload.id_veiculo, payload.data);
  }

  private rollbackManutencaoTemp(
    tempId: number,
    payload: ManutencaoCreate,
    odometroAnterior: number,
  ): void {
    this.manMesCache = this.manMesCache.filter((m) => m.id !== tempId);
    this.reconstruirTimelineDoCache();
    this.recalcularResumoDoCache();
    if (payload.odometro > odometroAnterior) {
      this.patchOdometroLocal(payload.id_veiculo, odometroAnterior);
    }
  }

  /** @deprecated Prefira `registrarManutencaoOtimista`. */
  async criarManutencao(
    payload: ManutencaoCreate,
  ): Promise<ManutencaoDetalhada | null> {
    const { servicos, ...manutencao } = payload;

    const { data, error } = await supabase
      .from('Manutencoes')
      .insert([manutencao])
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erro ao criar manutenção:', error?.message);
      return null;
    }

    const idManutencao = Number((data as ManutencaoDetalhada).id);

    if (servicos?.length) {
      const linhas = servicos.map((s) => ({
        id_manutencao: idManutencao,
        id_tipo_servico: s.id_tipo_servico,
        valor_servico: s.valor_servico,
      }));

      const { error: erroServicos } = await supabase
        .from('Manutencao_Servicos')
        .insert(linhas);

      if (erroServicos) {
        console.error('Erro ao vincular serviços:', erroServicos.message);
        await supabase.from('Manutencoes').delete().eq('id', idManutencao);
        return null;
      }
    }

    return this.normalizarManutencao(data as Record<string, unknown>);
  }

  async deletarManutencao(id: number): Promise<boolean> {
    if (id < 0) {
      this.tempsCancelados.add(id);
      this.manMesCache = this.manMesCache.filter((m) => m.id !== id);
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
      return true;
    }

    const removida = this.manMesCache.find((m) => m.id === id);
    if (removida) {
      this.manMesCache = this.manMesCache.filter((m) => m.id !== id);
      this.reconstruirTimelineDoCache();
      this.recalcularResumoDoCache();
    }

    const { error: erroServicos } = await supabase
      .from('Manutencao_Servicos')
      .delete()
      .eq('id_manutencao', id);

    if (erroServicos) {
      console.error('Erro ao limpar serviços:', erroServicos.message);
      if (removida) {
        this.manMesCache = [removida, ...this.manMesCache];
        this.reconstruirTimelineDoCache();
        this.recalcularResumoDoCache();
      }
      return false;
    }

    const { error } = await supabase.from('Manutencoes').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir manutenção:', error.message);
      if (removida) {
        this.manMesCache = [removida, ...this.manMesCache];
        this.reconstruirTimelineDoCache();
        this.recalcularResumoDoCache();
      }
      return false;
    }

    this.invalidarRelatorioAtual();
    return true;
  }

  // ─── Timeline + resumo do mês ──────────────────────────────

  /**
   * Carrega gastos do mês (escopo Dashboard) + monta timeline paginada.
   * Manutenções vêm com join `Manutencao_Servicos` + `TiposServico` (sem N+1).
   * Cache: não reconsulta se o mesmo mês/veículo já estiver em memória.
   */
  async carregarTimelineEResumo(
    idVeiculo: number,
    mes: number,
    ano: number,
    forceRefresh = false,
  ): Promise<EventoTimeline[]> {
    const mesmoContexto =
      this.contextoMes?.idVeiculo === idVeiculo &&
      this.contextoMes?.mes === mes &&
      this.contextoMes?.ano === ano;

    if (mesmoContexto && !forceRefresh) {
      this.publicarPaginaTimeline(
        Math.max(this.timelineVisiveis, TIMELINE_PAGE_SIZE),
      );
      return this.timeline();
    }

    this.beginLoad();
    const seq = ++this.loadTimelineSeq;
    try {
      const inicio = this.formatarData(ano, mes, 1);
      const fim = this.formatarData(ano, mes, new Date(ano, mes, 0).getDate());

      const [absRes, manRes] = await Promise.all([
        supabase
          .from('Abastecimentos')
          .select('*')
          .eq('id_veiculo', idVeiculo)
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: false })
          .order('odometro', { ascending: false }),
        supabase
          .from('Manutencoes')
          .select(
            `
            *,
            Manutencao_Servicos (
              id_manutencao,
              id_tipo_servico,
              valor_servico,
              TiposServico ( id, nome )
            )
          `,
          )
          .eq('id_veiculo', idVeiculo)
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: false })
          .order('odometro', { ascending: false }),
      ]);

      // Resposta stale (usuário trocou mês/veículo enquanto carregava)
      if (seq !== this.loadTimelineSeq) {
        return this.timeline();
      }

      if (absRes.error) {
        console.error('Erro abastecimentos:', absRes.error.message);
      }
      if (manRes.error) {
        console.error('Erro manutenções:', manRes.error.message);
      }

      this.absMesCache = (absRes.data ?? []).map((a) =>
        this.normalizarAbastecimento(a as Record<string, unknown>),
      );
      this.manMesCache = (manRes.data ?? []).map((m) =>
        this.normalizarManutencao(m as Record<string, unknown>),
      );

      const eventos = this.montarEventosMes(
        this.absMesCache,
        this.manMesCache,
      );

      this.contextoMes = { idVeiculo, mes, ano };
      this.timelineMesCompleta = eventos;
      this.relatorioCacheValido = false;
      this.recalcularResumoDoCache();
      this.publicarPaginaTimeline(TIMELINE_PAGE_SIZE);

      const ultimoAbs = this.absMesCache[0];
      if (ultimoAbs?.valor_litro > 0) {
        this.ultimoValorLitroCache.set(idVeiculo, ultimoAbs.valor_litro);
      }

      return this.timeline();
    } finally {
      if (seq === this.loadTimelineSeq) {
        this.endLoad();
      } else {
        this.loadsEmAndamento = Math.max(0, this.loadsEmAndamento - 1);
        this.carregando.set(this.loadsEmAndamento > 0);
      }
    }
  }

  /** Expõe mais itens da timeline já cacheada (sem nova ida ao banco). */
  carregarMaisTimeline(): void {
    if (!this.timelineTemMais() || this.carregandoMaisTimeline()) return;
    this.carregandoMaisTimeline.set(true);
    try {
      this.publicarPaginaTimeline(this.timelineVisiveis + TIMELINE_PAGE_SIZE);
    } finally {
      this.carregandoMaisTimeline.set(false);
    }
  }

  /**
   * Relatório do mês: totais filtrados no servidor.
   * Consumo (km/L) usa lookback limitado de abastecimentos (não o histórico inteiro).
   */
  async carregarRelatorio(
    idVeiculo: number,
    mes: number,
    ano: number,
    forceRefresh = false,
  ): Promise<RelatorioVeiculo> {
    const inicio = this.formatarData(ano, mes, 1);
    const fim = this.formatarData(ano, mes, new Date(ano, mes, 0).getDate());

    const atual = this.relatorio();
    if (
      !forceRefresh &&
      atual &&
      this.contextoMes?.idVeiculo === idVeiculo &&
      this.contextoMes?.mes === mes &&
      this.contextoMes?.ano === ano &&
      this.relatorioCacheValido
    ) {
      return atual;
    }

    this.carregandoRelatorio.set(true);
    const seq = ++this.loadRelatorioSeq;
    try {
      const [absPeriodoRes, absLookbackRes, manRes] = await Promise.all([
        supabase
          .from('Abastecimentos')
          .select('*')
          .eq('id_veiculo', idVeiculo)
          .gte('data', inicio)
          .lte('data', fim)
          .order('odometro', { ascending: true })
          .order('data', { ascending: true }),
        supabase
          .from('Abastecimentos')
          .select('*')
          .eq('id_veiculo', idVeiculo)
          .lte('data', fim)
          .order('odometro', { ascending: false })
          .order('data', { ascending: false })
          .limit(RELATORIO_ABS_LOOKBACK),
        supabase
          .from('Manutencoes')
          .select(
            `
            *,
            Manutencao_Servicos (
              id_manutencao,
              id_tipo_servico,
              valor_servico,
              TiposServico ( id, nome )
            )
          `,
          )
          .eq('id_veiculo', idVeiculo)
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: true }),
      ]);

      if (seq !== this.loadRelatorioSeq) {
        return (
          this.relatorio() ?? {
            combustivel: {
              totalGasto: 0,
              totalLitros: 0,
              mediaPrecoLitro: 0,
              qtdAbastecimentos: 0,
              consumoMedioKmL: null,
              custoMedioPorKm: null,
              melhorConsumo: null,
              piorConsumo: null,
              trechos: [],
              kmPercorridosEstimados: 0,
            },
            manutencao: {
              totalGasto: 0,
              qtdServicos: 0,
              qtdManutencoes: 0,
              porCategoria: [],
            },
            totalGeral: 0,
          }
        );
      }

      if (absPeriodoRes.error) {
        console.error('Erro relatório combustível:', absPeriodoRes.error.message);
      }
      if (absLookbackRes.error) {
        console.error('Erro lookback combustível:', absLookbackRes.error.message);
      }
      if (manRes.error) {
        console.error('Erro relatório manutenção:', manRes.error.message);
      }

      const absPeriodo = (absPeriodoRes.data ?? []).map((a) =>
        this.normalizarAbastecimento(a as Record<string, unknown>),
      );
      const lookback = (absLookbackRes.data ?? [])
        .map((a) => this.normalizarAbastecimento(a as Record<string, unknown>))
        .reverse();
      const manPeriodo = (manRes.data ?? []).map((m) =>
        this.normalizarManutencao(m as Record<string, unknown>),
      );

      const combustivel = this.montarRelatorioCombustivel(
        lookback,
        absPeriodo,
        inicio,
        fim,
      );
      const manutencao = this.montarRelatorioManutencao(manPeriodo);

      const relatorio: RelatorioVeiculo = {
        combustivel,
        manutencao,
        totalGeral: combustivel.totalGasto + manutencao.totalGasto,
      };
      this.relatorio.set(relatorio);
      this.relatorioCacheValido = true;
      return relatorio;
    } finally {
      if (seq === this.loadRelatorioSeq) {
        this.carregandoRelatorio.set(false);
      }
    }
  }

  private relatorioCacheValido = false;

  // ─── Helpers de estado local ───────────────────────────────

  private publicarPaginaTimeline(qtd: number): void {
    this.timelineVisiveis = Math.min(qtd, this.timelineMesCompleta.length);
    const pagina = this.timelineMesCompleta.slice(0, this.timelineVisiveis);
    this.atualizarTimelineVisivel(pagina);
    this.timelineTemMais.set(
      this.timelineVisiveis < this.timelineMesCompleta.length,
    );
  }

  private montarEventosMes(
    abastecimentos: Abastecimento[],
    manutencoes: ManutencaoDetalhada[],
  ): EventoTimeline[] {
    return [
      ...abastecimentos.map((a) => this.mapAbastecimento(a)),
      ...manutencoes.map((m) => this.mapManutencao(m)),
    ].sort((a, b) => {
      const byDate = b.data.localeCompare(a.data);
      if (byDate !== 0) return byDate;
      return (b.odometro || 0) - (a.odometro || 0);
    });
  }

  /** Atualiza odômetro no banco sem reaplicar patch otimista (já feito). */
  private async persistirOdometroNoBanco(
    id: number,
    odometro: number,
  ): Promise<void> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return;

    const { error } = await supabase
      .from('Veiculos')
      .update({ odometro_base: odometro })
      .eq('id', id)
      .eq('id_usuario', userId);

    if (error) {
      console.error('Erro ao sincronizar odômetro:', error.message);
    }
  }

  private reconstruirTimelineDoCache(): void {
    this.timelineMesCompleta = this.montarEventosMes(
      this.absMesCache,
      this.manMesCache,
    );
    this.publicarPaginaTimeline(
      Math.max(this.timelineVisiveis, TIMELINE_PAGE_SIZE),
    );
  }

  private eventoPertenceAoContextoAtual(evento: EventoTimeline): boolean {
    if (!this.contextoMes) return false;
    const raw = evento.raw as Abastecimento | ManutencaoDetalhada;
    if (raw.id_veiculo !== this.contextoMes.idVeiculo) return false;
    const [y, m] = evento.data.split('-').map(Number);
    return y === this.contextoMes.ano && m === this.contextoMes.mes;
  }

  private substituirEventoTemp(
    idTemp: string,
    eventoReal: EventoTimeline,
  ): void {
    this.timelineMesCompleta = this.timelineMesCompleta.map((e) =>
      e.id === idTemp ? eventoReal : e,
    );
    this.publicarPaginaTimeline(
      Math.max(this.timelineVisiveis, TIMELINE_PAGE_SIZE),
    );
  }

  private removerEventoTemp(id: string): void {
    this.timelineMesCompleta = this.timelineMesCompleta.filter(
      (e) => e.id !== id,
    );
    this.publicarPaginaTimeline(
      Math.max(this.timelineVisiveis, TIMELINE_PAGE_SIZE),
    );
  }

  private recalcularResumoDoCache(): void {
    this.calcularResumoMes(this.absMesCache, this.manMesCache);
  }

  private resetCacheMes(): void {
    this.contextoMes = null;
    this.timelineMesCompleta = [];
    this.absMesCache = [];
    this.manMesCache = [];
    this.timelineVisiveis = 0;
    this.timelineTemMais.set(false);
    this.relatorioCacheValido = false;
  }

  private invalidarRelatorioAtual(): void {
    this.relatorioCacheValido = false;
  }

  private invalidarRelatorioSeMesmoVeiculo(
    idVeiculo: number,
    data: string,
  ): void {
    if (!this.contextoMes || this.contextoMes.idVeiculo !== idVeiculo) {
      this.relatorioCacheValido = false;
      return;
    }
    const [y, m] = data.split('-').map(Number);
    if (y === this.contextoMes.ano && m === this.contextoMes.mes) {
      this.relatorioCacheValido = false;
    }
  }

  private patchVeiculoLocal(id: number, patch: Partial<Veiculo>): void {
    const lista = this.veiculos().map((v) =>
      v.id === id ? { ...v, ...patch } : v,
    );
    this.atualizarVeiculos(lista);
    if (this.veiculoAtivo()?.id === id) {
      this.veiculoAtivo.set(lista.find((v) => v.id === id) ?? null);
    }
  }

  private resumoVazio(): ResumoGastosMes {
    return {
      total: 0,
      abastecimentos: 0,
      manutencoes: 0,
      litros: 0,
      mediaLitro: 0,
    };
  }

  private montarRelatorioCombustivel(
    lookback: Abastecimento[],
    absPeriodo: Abastecimento[],
    inicio: string | null,
    fim: string | null,
  ): RelatorioCombustivel {
    const totalGasto = absPeriodo.reduce((s, a) => s + a.valor_total, 0);
    const totalLitros = absPeriodo.reduce((s, a) => s + a.litros, 0);
    const mediaPrecoLitro = totalLitros > 0 ? totalGasto / totalLitros : 0;

    const trechos = this.calcularTrechosConsumo(lookback).filter((t) => {
      if (!inicio || !fim) return true;
      return t.ate >= inicio && t.ate <= fim;
    });

    const kmTotal = trechos.reduce((s, t) => s + t.km, 0);
    const litrosTrechos = trechos.reduce((s, t) => s + t.litros, 0);
    const custoTrechos = trechos.reduce((s, t) => s + t.custoPorKm * t.km, 0);

    const consumoMedioKmL =
      litrosTrechos > 0 ? kmTotal / litrosTrechos : null;
    const custoMedioPorKm = kmTotal > 0 ? custoTrechos / kmTotal : null;

    let melhor: TrechoConsumo | null = null;
    let pior: TrechoConsumo | null = null;
    for (const t of trechos) {
      if (!melhor || t.kmPorLitro > melhor.kmPorLitro) melhor = t;
      if (!pior || t.kmPorLitro < pior.kmPorLitro) pior = t;
    }

    return {
      totalGasto,
      totalLitros,
      mediaPrecoLitro,
      qtdAbastecimentos: absPeriodo.length,
      consumoMedioKmL,
      custoMedioPorKm,
      melhorConsumo: melhor,
      piorConsumo: pior,
      trechos,
      kmPercorridosEstimados: kmTotal,
    };
  }

  private calcularTrechosConsumo(lista: Abastecimento[]): TrechoConsumo[] {
    const ordenados = [...lista].sort((a, b) => {
      const byOdo = a.odometro - b.odometro;
      if (byOdo !== 0) return byOdo;
      return a.data.localeCompare(b.data);
    });

    const trechos: TrechoConsumo[] = [];
    for (let i = 1; i < ordenados.length; i++) {
      const atual = ordenados[i];
      const anterior = ordenados[i - 1];
      if (!atual.completou_tanque) continue;

      const km = atual.odometro - anterior.odometro;
      if (km <= 0 || atual.litros <= 0) continue;

      const kmPorLitro = km / atual.litros;
      const custoPorKm =
        atual.valor_total > 0 && km > 0 ? atual.valor_total / km : 0;

      trechos.push({
        de: anterior.data,
        ate: atual.data,
        km,
        litros: atual.litros,
        kmPorLitro,
        custoPorKm,
      });
    }
    return trechos;
  }

  private montarRelatorioManutencao(
    manutencoes: ManutencaoDetalhada[],
  ): RelatorioManutencao {
    const mapa = new Map<number, GastoPorCategoria>();
    let totalGasto = 0;
    let qtdServicos = 0;

    for (const man of manutencoes) {
      totalGasto += Number(man.valor_total || 0);
      for (const s of man.servicos ?? []) {
        qtdServicos += 1;
        const id = Number(s.id_tipo_servico);
        const nome = s.tipo_servico?.nome || 'Outros';
        const valor = Number(s.valor_servico || 0);
        const atual = mapa.get(id);
        if (atual) {
          atual.total += valor;
          atual.quantidade += 1;
        } else {
          mapa.set(id, {
            id_tipo_servico: id,
            nome,
            total: valor,
            percentual: 0,
            quantidade: 1,
          });
        }
      }
    }

    const totalCategorias = [...mapa.values()].reduce(
      (s, c) => s + c.total,
      0,
    );
    const porCategoria = [...mapa.values()]
      .map((c) => ({
        ...c,
        percentual:
          totalCategorias > 0 ? (c.total / totalCategorias) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalGasto,
      qtdServicos,
      qtdManutencoes: manutencoes.length,
      porCategoria,
    };
  }

  private calcularResumoMes(
    abastecimentos: Abastecimento[],
    manutencoes: ManutencaoDetalhada[],
  ): void {
    const totalAbs = abastecimentos.reduce(
      (s, a) => s + Number(a.valor_total || 0),
      0,
    );
    const totalMan = manutencoes.reduce(
      (s, m) => s + Number(m.valor_total || 0),
      0,
    );
    const litros = abastecimentos.reduce(
      (s, a) => s + Number(a.litros || 0),
      0,
    );
    const mediaLitro = litros > 0 ? totalAbs / litros : 0;

    this.resumoMes.set({
      total: totalAbs + totalMan,
      abastecimentos: totalAbs,
      manutencoes: totalMan,
      litros,
      mediaLitro,
    });
  }

  private mapAbastecimento(a: Abastecimento): EventoTimeline {
    return {
      id: `abs-${a.id}`,
      tipo: 'abastecimento',
      data: String(a.data).slice(0, 10),
      odometro: Number(a.odometro || 0),
      valor_total: Number(a.valor_total || 0),
      titulo: a.completou_tanque ? 'Tanque cheio' : 'Abastecimento',
      subtitulo: a.posto_combustivel
        ? `${a.posto_combustivel} · ${Number(a.litros).toFixed(1)} L`
        : `${Number(a.litros).toFixed(1)} L · R$ ${Number(a.valor_litro).toFixed(2)}/L`,
      refId: a.id,
      raw: a,
    };
  }

  private mapManutencao(m: ManutencaoDetalhada): EventoTimeline {
    const nomes =
      m.servicos
        ?.map((s) => s.tipo_servico?.nome)
        .filter(Boolean)
        .join(', ') || 'Serviço';

    return {
      id: `man-${m.id}`,
      tipo: 'manutencao',
      data: String(m.data).slice(0, 10),
      odometro: Number(m.odometro || 0),
      valor_total: Number(m.valor_total || 0),
      titulo: 'Manutenção',
      subtitulo: m.oficina ? `${nomes} · ${m.oficina}` : nomes,
      refId: m.id,
      raw: m,
    };
  }

  private normalizarVeiculo(raw: Veiculo | Record<string, unknown>): Veiculo {
    const r = raw as Record<string, unknown>;
    return {
      id: Number(r['id']),
      id_usuario: String(r['id_usuario'] ?? ''),
      nome: String(r['nome'] ?? ''),
      tipo: String(r['tipo'] ?? 'outro'),
      marca: (r['marca'] as string | null) ?? null,
      modelo: (r['modelo'] as string | null) ?? null,
      placa: (r['placa'] as string | null) ?? null,
      ano: r['ano'] != null ? Number(r['ano']) : null,
      odometro_base:
        r['odometro_base'] != null ? Number(r['odometro_base']) : null,
    };
  }

  private normalizarAbastecimento(
    raw: Record<string, unknown>,
  ): Abastecimento {
    return {
      id: Number(raw['id']),
      id_veiculo: Number(raw['id_veiculo']),
      data: String(raw['data'] ?? '').slice(0, 10),
      odometro: Number(raw['odometro'] ?? 0),
      valor_total: Number(raw['valor_total'] ?? 0),
      valor_litro: Number(raw['valor_litro'] ?? 0),
      litros: Number(raw['litros'] ?? 0),
      completou_tanque: Boolean(raw['completou_tanque']),
      posto_combustivel: (raw['posto_combustivel'] as string | null) ?? null,
    };
  }

  private normalizarManutencao(
    raw: Record<string, unknown>,
  ): ManutencaoDetalhada {
    const servicosRaw =
      raw['Manutencao_Servicos'] ?? raw['servicos'] ?? raw['manutencao_servicos'];
    const lista = Array.isArray(servicosRaw) ? servicosRaw : [];

    return {
      id: Number(raw['id']),
      id_veiculo: Number(raw['id_veiculo']),
      data: String(raw['data'] ?? '').slice(0, 10),
      odometro: Number(raw['odometro'] ?? 0),
      valor_total: Number(raw['valor_total'] ?? 0),
      oficina: (raw['oficina'] as string | null) ?? null,
      observacoes: (raw['observacoes'] as string | null) ?? null,
      servicos: lista.map((s: Record<string, unknown>) => {
        const tipo =
          s['TiposServico'] ?? s['tipo_servico'] ?? s['tipos_servico'];
        const tipoNorm = (Array.isArray(tipo) ? tipo[0] : tipo) as
          | { id: number; nome: string }
          | undefined;
        return {
          id_manutencao: Number(s['id_manutencao']),
          id_tipo_servico: Number(s['id_tipo_servico']),
          valor_servico: Number(s['valor_servico'] ?? 0),
          tipo_servico: tipoNorm
            ? { id: Number(tipoNorm.id), nome: String(tipoNorm.nome ?? '') }
            : undefined,
        };
      }),
    };
  }

  private formatarData(ano: number, mes: number, dia: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  private beginLoad(): void {
    this.loadsEmAndamento += 1;
    this.carregando.set(true);
  }

  private endLoad(): void {
    this.loadsEmAndamento = Math.max(0, this.loadsEmAndamento - 1);
    this.carregando.set(this.loadsEmAndamento > 0);
  }

  private atualizarVeiculos(lista: Veiculo[]): void {
    this.veiculosSubject.next(lista);
    this.veiculos.set(lista);
  }

  private atualizarTimelineVisivel(eventos: EventoTimeline[]): void {
    this.timelineSubject.next(eventos);
    this.timeline.set(eventos);
  }
}
