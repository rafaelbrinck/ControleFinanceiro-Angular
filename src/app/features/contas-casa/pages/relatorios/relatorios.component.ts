import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, ChartData } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ContaDetalhada } from '@app/shared/models/conta';
import { MembroFamiliaDetalhado } from '@app/shared/models/familia';
import { BillsService } from '../../services/bills.service';
import { FamilyService } from '../../services/family.service';

interface GastoPorCategoria {
  idCategoria: number;
  nome: string;
  cor: string;
  total: number;
}

interface GastoPorMembro {
  idMembro: number;
  nome: string;
  total: number;
}

interface TotalMensal {
  mes: number;
  ano: number;
  label: string;
  total: number;
}

@Component({
  selector: 'app-relatorios-contas-casa',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink, NgChartsModule],
  templateUrl: './relatorios.component.html',
  styleUrl: './relatorios.component.scss',
})
export class RelatoriosComponent implements OnInit {
  private readonly familyService = inject(FamilyService);
  private readonly billsService = inject(BillsService);

  private readonly nomesMeses = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];

  private readonly nomesMesesCompletos = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  readonly mes = signal(new Date().getMonth() + 1);
  readonly ano = signal(new Date().getFullYear());
  /** Histórico bruto dos últimos 6 meses (client-side). */
  readonly contasHistorico = signal<ContaDetalhada[]>([]);
  readonly mesesPeriodo = signal<{ mes: number; ano: number }[]>([]);
  readonly carregando = signal(false);

  readonly familia = this.familyService.familiaAtual;
  readonly membros = this.familyService.membros;
  readonly carregandoFamilia = this.familyService.carregando;

  readonly labelMesAno = computed(
    () => `${this.nomesMesesCompletos[this.mes() - 1]} ${this.ano()}`,
  );

  /** Contas do mês de referência — filtro em memória. */
  readonly contasDoMes = computed(() =>
    this.filtrarContasDoMes(
      this.contasHistorico(),
      this.mes(),
      this.ano(),
    ),
  );

  readonly totalGastosMes = computed(() =>
    this.calcularTotalMes(this.contasDoMes()),
  );

  readonly cotaIdealPorMembro = computed(() => {
    const qtd = this.membros().length;
    if (qtd <= 0) return 0;
    return this.totalGastosMes() / qtd;
  });

  readonly gastosPorCategoria = computed(() =>
    this.agruparPorCategoria(this.contasDoMes()),
  );

  readonly gastosPorMembro = computed(() =>
    this.agruparPagosPorMembro(this.contasDoMes(), this.membros()),
  );

  readonly evolucaoSemestral = computed(() =>
    this.agruparTotaisPorMes(
      this.contasHistorico(),
      this.mesesPeriodo(),
    ),
  );

  readonly top5Despesas = computed(() =>
    [...this.contasDoMes()]
      .sort((a, b) => (b.valor || 0) - (a.valor || 0))
      .slice(0, 5),
  );

  readonly chartCategoriasData = computed<ChartData<'doughnut'>>(() => {
    const grupos = this.gastosPorCategoria();
    return {
      labels: grupos.map((g) => g.nome),
      datasets: [
        {
          data: grupos.map((g) => g.total),
          backgroundColor: grupos.map((g) => g.cor),
          borderWidth: 0,
        },
      ],
    };
  });

  readonly chartEvolucaoData = computed<ChartData<'bar'>>(() => {
    const series = this.evolucaoSemestral();
    return {
      labels: series.map((s) => s.label),
      datasets: [
        {
          label: 'Total gasto',
          data: series.map((s) => s.total),
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    };
  });

  readonly chartAcertoData = computed<ChartData<'bar'>>(() => {
    const grupos = this.gastosPorMembro();
    return {
      labels: grupos.map((g) => g.nome.split(' ')[0] || g.nome),
      datasets: [
        {
          label: 'Desembolsado',
          data: grupos.map((g) => g.total),
          backgroundColor: [
            '#10b981',
            '#3b82f6',
            '#f59e0b',
            '#ec4899',
            '#8b5cf6',
            '#06b6d4',
          ],
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    };
  });

  readonly doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
  };

  readonly barOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 10 },
          callback: (value) =>
            typeof value === 'number'
              ? value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  maximumFractionDigits: 0,
                })
              : value,
        },
      },
    },
  };

  async ngOnInit(): Promise<void> {
    await this.familyService.carregarFamiliaDoUsuario();
    if (this.familia()) {
      await this.carregarDados();
    }
  }

  async mesAnterior(): Promise<void> {
    if (this.mes() === 1) {
      this.mes.set(12);
      this.ano.update((a) => a - 1);
    } else {
      this.mes.update((m) => m - 1);
    }
    await this.carregarDados();
  }

  async mesSeguinte(): Promise<void> {
    if (this.mes() === 12) {
      this.mes.set(1);
      this.ano.update((a) => a + 1);
    } else {
      this.mes.update((m) => m + 1);
    }
    await this.carregarDados();
  }

  private async carregarDados(): Promise<void> {
    const familia = this.familia();
    if (!familia) return;

    this.carregando.set(true);
    try {
      const intervalo = this.billsService.intervaloUltimosMeses(
        this.mes(),
        this.ano(),
        6,
      );
      this.mesesPeriodo.set(intervalo.meses);

      const contas = await this.billsService.buscarPorPeriodo(
        familia.id,
        intervalo.dataInicio,
        intervalo.dataFim,
      );
      this.contasHistorico.set(contas);
    } finally {
      this.carregando.set(false);
    }
  }

  /** Total do mês — soma em memória. */
  calcularTotalMes(contas: ContaDetalhada[]): number {
    return contas.reduce((acc, c) => acc + (c.valor || 0), 0);
  }

  /** Agrupa e soma valores por categoria. */
  agruparPorCategoria(contas: ContaDetalhada[]): GastoPorCategoria[] {
    const mapa = new Map<number, GastoPorCategoria>();

    for (const conta of contas) {
      const id = Number(conta.id_categoria) || 0;
      const atual = mapa.get(id);
      if (atual) {
        atual.total += conta.valor || 0;
      } else {
        mapa.set(id, {
          idCategoria: id,
          nome: conta.categoria?.nome || 'Sem categoria',
          cor: conta.categoria?.cor || '#94a3b8',
          total: conta.valor || 0,
        });
      }
    }

    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }

  /** Agrupa valores pagos por membro (`pago_por`). */
  agruparPagosPorMembro(
    contas: ContaDetalhada[],
    membros: MembroFamiliaDetalhado[],
  ): GastoPorMembro[] {
    const nomePorId = new Map(
      membros.map((m) => [m.id, this.nomeMembro(m)] as const),
    );
    const mapa = new Map<number, number>();

    for (const conta of contas) {
      if (!conta.pago || conta.pago_por == null) continue;
      const id = Number(conta.pago_por);
      mapa.set(id, (mapa.get(id) || 0) + (conta.valor || 0));
    }

    // Inclui membros sem desembolso para o gráfico de acerto ficar completo
    for (const membro of membros) {
      if (!mapa.has(membro.id)) {
        mapa.set(membro.id, 0);
      }
    }

    return Array.from(mapa.entries())
      .map(([idMembro, total]) => ({
        idMembro,
        nome: nomePorId.get(idMembro) || `Membro #${idMembro}`,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }

  nomeMembro(membro: MembroFamiliaDetalhado): string {
    return (
      membro.usuario?.nome ||
      membro.usuario?.username ||
      'Usuário sem nome'
    );
  }

  private filtrarContasDoMes(
    contas: ContaDetalhada[],
    mes: number,
    ano: number,
  ): ContaDetalhada[] {
    const prefixo = `${ano}-${String(mes).padStart(2, '0')}`;
    return contas.filter((c) =>
      String(c.data_vencimento).startsWith(prefixo),
    );
  }

  private agruparTotaisPorMes(
    contas: ContaDetalhada[],
    meses: { mes: number; ano: number }[],
  ): TotalMensal[] {
    return meses.map(({ mes, ano }) => {
      const doMes = this.filtrarContasDoMes(contas, mes, ano);
      return {
        mes,
        ano,
        label: `${this.nomesMeses[mes - 1]}/${String(ano).slice(2)}`,
        total: this.calcularTotalMes(doMes),
      };
    });
  }
}
