import {
  Component,
  DestroyRef,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { OrcamentoService } from '@app/core/services/orcamento.service';
import { TransacaoService } from '@app/core/services/transacao.service';
import { RouterLink } from '@angular/router';
import { Orcamento } from '@app/shared/models/orcamento';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [CommonModule, NgChartsModule, RouterLink],
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.css'],
})
export class GraficosComponent implements OnInit, OnChanges {
  @Input() dataInicio: string = '';
  @Input() dataFim: string = '';

  // Gráficos de Vendas e BI
  public chartCategoriasData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [],
  };
  public chartClientesQtdData: ChartData<'pie'> = { labels: [], datasets: [] };
  public chartClientesValorData: ChartData<'bar'> = {
    labels: [],
    datasets: [],
  };

  // NOVO: Gráfico de Fornecedores
  public chartFornecedoresData: ChartData<'bar'> = { labels: [], datasets: [] };

  // KPIs
  taxaConversao: number = 0;
  ticketMedio: number = 0;
  orcamentosVencidos: number = 0;
  totalOrcamento: number = 0;
  orcamentosFinalizados: number = 0;
  totalVendas: number = 0;

  todosOrcamentos: Orcamento[] = [];
  todasTransacoes: any[] = [];

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
    },
  };

  public pieOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
  };

  constructor(
    private orcamentoService: OrcamentoService,
    private transacaoService: TransacaoService,
    private destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.orcamentoService.orcamento$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.todosOrcamentos = data;
        this.processarBI();
      });

    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.todasTransacoes = data;
        this.processarBI();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataInicio'] || changes['dataFim']) {
      this.processarBI();
    }
  }

  processarBI() {
    const hoje = new Date().toISOString().substring(0, 10);

    const orcFiltrados = this.todosOrcamentos.filter((o) => {
      const d = (o.updated_at || o.created_at || '')
        .toString()
        .substring(0, 10);
      return (
        (!this.dataInicio || d >= this.dataInicio) &&
        (!this.dataFim || d <= this.dataFim)
      );
    });

    const transFiltradas = this.todasTransacoes.filter((t) => {
      return (
        (!this.dataInicio || t.data! >= this.dataInicio) &&
        (!this.dataFim || t.data! <= this.dataFim)
      );
    });

    // Cálculos KPIs
    this.totalOrcamento = orcFiltrados.length;
    this.orcamentosFinalizados = orcFiltrados.filter(
      (o) => o.status === 'Finalizado',
    ).length;
    this.totalVendas = orcFiltrados
      .filter((o) => o.status === 'Finalizado')
      .reduce((a, b) => a + (b.valor || 0), 0);
    this.taxaConversao =
      this.totalOrcamento > 0
        ? (this.orcamentosFinalizados / this.totalOrcamento) * 100
        : 0;
    this.ticketMedio =
      this.orcamentosFinalizados > 0
        ? this.totalVendas / this.orcamentosFinalizados
        : 0;
    this.orcamentosVencidos = orcFiltrados.filter(
      (o) =>
        o.status === 'Aguardando Pagamento' &&
        o.dt_boleto &&
        String(o.dt_boleto) < hoje,
    ).length;

    // Gerar Gráficos
    this.prepararGraficoCategorias(transFiltradas);
    this.prepararGraficosClientes(orcFiltrados);
    this.prepararGraficoFornecedores(transFiltradas);
  }

  prepararGraficoCategorias(transacoes: any[]) {
    const despesas = transacoes.filter((t) => t.tipo === 'Saida');
    const mapa = new Map<string, number>();
    despesas.forEach((d) => {
      const cat = d.cat || 'Outros';
      mapa.set(cat, (mapa.get(cat) || 0) + d.valor);
    });

    this.chartCategoriasData = {
      labels: Array.from(mapa.keys()),
      datasets: [
        {
          data: Array.from(mapa.values()),
          backgroundColor: [
            '#ef4444',
            '#f97316',
            '#f59e0b',
            '#84cc16',
            '#06b6d4',
            '#6366f1',
            '#d946ef',
          ],
        },
      ],
    };
  }

  prepararGraficoFornecedores(transacoes: any[]) {
    const despesasComForn = transacoes.filter(
      (t) => t.tipo === 'Saida' && t.fornecedor_id,
    );
    const mapa = new Map<string, number>();

    despesasComForn.forEach((t) => {
      const nome = t.fornecedor_nome || 'Empresa não identificada';
      mapa.set(nome, (mapa.get(nome) || 0) + (t.valor || 0));
    });

    const ordenados = Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    this.chartFornecedoresData = {
      labels: ordenados.map((x) => x[0].split(' ')[0]), // Pega o primeiro nome da empresa
      datasets: [
        {
          label: 'R$',
          data: ordenados.map((x) => x[1]),
          backgroundColor: '#1e293b', // Black Slate para Fornecedores
          borderRadius: 6,
        },
      ],
    };
  }

  prepararGraficosClientes(orcamentos: any[]) {
    const fechados = orcamentos.filter((o) => o.status === 'Finalizado');
    const mapaQtd = new Map<string, number>();
    const mapaValor = new Map<string, number>();

    fechados.forEach((o) => {
      const nome = o.cliente?.nome?.split(' ')[0] || 'Desconhecido';
      mapaQtd.set(nome, (mapaQtd.get(nome) || 0) + 1);
      mapaValor.set(nome, (mapaValor.get(nome) || 0) + (o.valor || 0));
    });

    const ordenadosQtd = Array.from(mapaQtd.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    this.chartClientesQtdData = {
      labels: ordenadosQtd.map((x) => x[0]),
      datasets: [
        {
          data: ordenadosQtd.map((x) => x[1]),
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ec4899',
            '#8b5cf6',
          ],
        },
      ],
    };

    const ordenadosValor = Array.from(mapaValor.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    this.chartClientesValorData = {
      labels: ordenadosValor.map((x) => x[0]),
      datasets: [
        {
          label: 'R$',
          data: ordenadosValor.map((x) => x[1]),
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#f59e0b',
            '#ec4899',
            '#8b5cf6',
          ],
          borderRadius: 4,
        },
      ],
    };
  }
}
