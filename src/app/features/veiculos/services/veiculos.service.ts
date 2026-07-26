import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { LoginService } from '@app/core/auth/services/login.service';
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

  readonly veiculos = signal<Veiculo[]>([]);
  readonly veiculoAtivo = signal<Veiculo | null>(null);
  readonly timeline = signal<EventoTimeline[]>([]);
  readonly tiposServico = signal<TipoServico[]>([]);
  readonly resumoMes = signal<ResumoGastosMes>({
    total: 0,
    abastecimentos: 0,
    manutencoes: 0,
    litros: 0,
    mediaLitro: 0,
  });
  readonly relatorio = signal<RelatorioVeiculo | null>(null);
  readonly carregandoRelatorio = signal(false);
  readonly carregando = signal(false);

  constructor(private loginService: LoginService) {}

  limparEstado(): void {
    this.loadsEmAndamento = 0;
    this.veiculosSubject.next([]);
    this.timelineSubject.next([]);
    this.veiculos.set([]);
    this.veiculoAtivo.set(null);
    this.timeline.set([]);
    this.tiposServico.set([]);
    this.carregando.set(false);
    this.resumoMes.set({
      total: 0,
      abastecimentos: 0,
      manutencoes: 0,
      litros: 0,
      mediaLitro: 0,
    });
    this.relatorio.set(null);
    this.carregandoRelatorio.set(false);
  }

  // ─── Veículos ──────────────────────────────────────────────

  async carregarVeiculos(): Promise<Veiculo[]> {
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
        return [];
      }

      const lista = ((data ?? []) as Veiculo[]).map((v) => this.normalizarVeiculo(v));
      this.atualizarVeiculos(lista);

      const ativo = this.veiculoAtivo();
      if (!ativo && lista.length) {
        this.selecionarVeiculo(lista[0].id);
      } else if (ativo && !lista.some((v) => v.id === ativo.id)) {
        this.selecionarVeiculo(lista[0]?.id ?? null);
      } else if (ativo) {
        // Mantém seleção atualizada (ex.: odômetro)
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
      this.atualizarTimeline([]);
      this.resumoMes.set({
        total: 0,
        abastecimentos: 0,
        manutencoes: 0,
        litros: 0,
        mediaLitro: 0,
      });
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

    await this.carregarVeiculos();
    this.selecionarVeiculo((data as Veiculo).id);
    return this.normalizarVeiculo(data as Veiculo);
  }

  async atualizarVeiculo(id: number, payload: VeiculoUpdate): Promise<boolean> {
    const userId = this.loginService.getUserLogado();
    if (!userId) return false;

    const { error } = await supabase
      .from('Veiculos')
      .update(payload)
      .eq('id', id)
      .eq('id_usuario', userId);

    if (error) {
      console.error('Erro ao atualizar veículo:', error.message);
      return false;
    }

    await this.carregarVeiculos();
    return true;
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

    await this.carregarVeiculos();
    return true;
  }

  // ─── Tipos de serviço ──────────────────────────────────────

  async carregarTiposServico(): Promise<TipoServico[]> {
    const { data, error } = await supabase
      .from('TiposServico')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar tipos de serviço:', error.message);
      this.tiposServico.set([]);
      return [];
    }

    const tipos = ((data ?? []) as TipoServico[]).map((t) => ({
      id: Number(t.id),
      nome: String(t.nome ?? ''),
    }));
    this.tiposServico.set(tipos);
    return tipos;
  }

  // ─── Abastecimentos ────────────────────────────────────────

  /** Último R$/L registrado do veículo (para pré-preencher o formulário). */
  async buscarUltimoValorLitro(idVeiculo: number): Promise<number | null> {
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
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  }

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

    return this.normalizarAbastecimento(data as Record<string, unknown>);
  }

  async deletarAbastecimento(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('Abastecimentos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir abastecimento:', error.message);
      return false;
    }
    return true;
  }

  // ─── Manutenções ───────────────────────────────────────────

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
        // Rollback para não deixar manutenção órfã sem serviços
        await supabase.from('Manutencoes').delete().eq('id', idManutencao);
        return null;
      }
    }

    return this.normalizarManutencao(data as Record<string, unknown>);
  }

  async deletarManutencao(id: number): Promise<boolean> {
    const { error: erroServicos } = await supabase
      .from('Manutencao_Servicos')
      .delete()
      .eq('id_manutencao', id);

    if (erroServicos) {
      console.error('Erro ao limpar serviços:', erroServicos.message);
      return false;
    }

    const { error } = await supabase.from('Manutencoes').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir manutenção:', error.message);
      return false;
    }
    return true;
  }

  // ─── Timeline + resumo do mês ──────────────────────────────

  async carregarTimelineEResumo(
    idVeiculo: number,
    mes: number,
    ano: number,
  ): Promise<EventoTimeline[]> {
    this.beginLoad();
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
            servicos:Manutencao_Servicos (
              id_manutencao,
              id_tipo_servico,
              valor_servico,
              tipo_servico:TiposServico ( id, nome )
            )
          `,
          )
          .eq('id_veiculo', idVeiculo)
          .gte('data', inicio)
          .lte('data', fim)
          .order('data', { ascending: false })
          .order('odometro', { ascending: false }),
      ]);

      if (absRes.error) {
        console.error('Erro abastecimentos:', absRes.error.message);
      }
      if (manRes.error) {
        console.error('Erro manutenções:', manRes.error.message);
      }

      const abastecimentos = (absRes.data ?? []).map((a) =>
        this.normalizarAbastecimento(a as Record<string, unknown>),
      );
      const manutencoes = (manRes.data ?? []).map((m) =>
        this.normalizarManutencao(m as Record<string, unknown>),
      );

      const eventos: EventoTimeline[] = [
        ...abastecimentos.map((a) => this.mapAbastecimento(a)),
        ...manutencoes.map((m) => this.mapManutencao(m)),
      ].sort((a, b) => {
        const byDate = b.data.localeCompare(a.data);
        if (byDate !== 0) return byDate;
        return (b.odometro || 0) - (a.odometro || 0);
      });

      this.atualizarTimeline(eventos);
      this.calcularResumoMes(abastecimentos, manutencoes);
      return eventos;
    } finally {
      this.endLoad();
    }
  }

  /**
   * Relatório analítico do veículo (consumo médio + gastos por categoria)
   * para um mês/ano específico.
   */
  async carregarRelatorio(
    idVeiculo: number,
    mes: number,
    ano: number,
  ): Promise<RelatorioVeiculo> {
    this.carregandoRelatorio.set(true);
    try {
      const inicio = this.formatarData(ano, mes, 1);
      const fim = this.formatarData(ano, mes, new Date(ano, mes, 0).getDate());

      const [absRes, manRes] = await Promise.all([
        supabase
          .from('Abastecimentos')
          .select('*')
          .eq('id_veiculo', idVeiculo)
          .order('odometro', { ascending: true })
          .order('data', { ascending: true }),
        supabase
          .from('Manutencoes')
          .select(
            `
            *,
            servicos:Manutencao_Servicos (
              id_manutencao,
              id_tipo_servico,
              valor_servico,
              tipo_servico:TiposServico ( id, nome )
            )
          `,
          )
          .eq('id_veiculo', idVeiculo)
          .order('data', { ascending: true }),
      ]);

      if (absRes.error) {
        console.error('Erro relatório combustível:', absRes.error.message);
      }
      if (manRes.error) {
        console.error('Erro relatório manutenção:', manRes.error.message);
      }

      const todosAbs = (absRes.data ?? []).map((a) =>
        this.normalizarAbastecimento(a as Record<string, unknown>),
      );
      const todasMan = (manRes.data ?? []).map((m) =>
        this.normalizarManutencao(m as Record<string, unknown>),
      );

      const absPeriodo = todosAbs.filter((a) =>
        this.dentroDoPeriodo(a.data, inicio, fim),
      );
      const manPeriodo = todasMan.filter((m) =>
        this.dentroDoPeriodo(m.data, inicio, fim),
      );

      const combustivel = this.montarRelatorioCombustivel(
        todosAbs,
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
      return relatorio;
    } finally {
      this.carregandoRelatorio.set(false);
    }
  }

  private montarRelatorioCombustivel(
    todosAbs: Abastecimento[],
    absPeriodo: Abastecimento[],
    inicio: string | null,
    fim: string | null,
  ): RelatorioCombustivel {
    const totalGasto = absPeriodo.reduce((s, a) => s + a.valor_total, 0);
    const totalLitros = absPeriodo.reduce((s, a) => s + a.litros, 0);
    const mediaPrecoLitro = totalLitros > 0 ? totalGasto / totalLitros : 0;

    const trechos = this.calcularTrechosConsumo(todosAbs).filter((t) => {
      if (!inicio || !fim) return true;
      // Trecho pertence ao período se a data do abastecimento final está no intervalo
      return t.ate >= inicio && t.ate <= fim;
    });

    const kmTotal = trechos.reduce((s, t) => s + t.km, 0);
    const litrosTrechos = trechos.reduce((s, t) => s + t.litros, 0);
    const custoTrechos = trechos.reduce(
      (s, t) => s + t.custoPorKm * t.km,
      0,
    );

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

  /**
   * Trechos válidos: abastecimento com tanque cheio + anterior existente.
   * km/L = (odômetro atual - anterior) / litros do abastecimento atual.
   */
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

  private dentroDoPeriodo(
    data: string,
    inicio: string | null,
    fim: string | null,
  ): boolean {
    const d = String(data).slice(0, 10);
    if (inicio && d < inicio) return false;
    if (fim && d > fim) return false;
    return true;
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
    const servicosRaw = raw['servicos'];
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
        const tipo = s['tipo_servico'];
        return {
          id_manutencao: Number(s['id_manutencao']),
          id_tipo_servico: Number(s['id_tipo_servico']),
          valor_servico: Number(s['valor_servico'] ?? 0),
          tipo_servico: (Array.isArray(tipo) ? tipo[0] : tipo) as
            | { id: number; nome: string }
            | undefined,
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

  private atualizarTimeline(eventos: EventoTimeline[]): void {
    this.timelineSubject.next(eventos);
    this.timeline.set(eventos);
  }
}
