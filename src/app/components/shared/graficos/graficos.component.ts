import { Component, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js'; // Importei tipos mais fortes
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { GraficosDataService, Venda } from '../../../service/grafico.service';
import { ClienteResumo, ProdutoResumo } from '../../../models/relatorios';
import { OrcamentoService } from '../../../service/orcamento.service';

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.css'], // Ajustei para .scss se você estiver usando, se for css mantenha .css
})
export class GraficosComponent implements OnInit {
  // Inicializei com dados vazios para evitar erro no template antes do carregamento
  public chartClientesData: ChartData<'bar'> = { labels: [], datasets: [] };
  public chartProdutosData: ChartData<'bar'> = { labels: [], datasets: [] };

  totalOrcamento: number = 0;
  orcamentosFinalizados: number = 0;
  orcamentosCancelados: number = 0;
  orcamentosPendentes: number = 0;
  totalVendas: number = 0;

  // --- A MÁGICA VISUAL (Configurações corrigidas) ---
  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false, // CRUCIAL: Deixa o CSS controlar a altura
    plugins: {
      legend: {
        display: false, // Removemos a legenda padrão pois já tem título no card
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => ` Qtd: ${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#64748b',
          maxTicksLimit: 6, // Limita labels para não sobrepor
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          color: '#94a3b8',
          maxTicksLimit: 5,
          stepSize: 1,
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 6, // Barras arredondadas
        borderSkipped: 'bottom',
      },
    },
  };

  constructor(
    private graficosDataService: GraficosDataService,
    private orcamentoService: OrcamentoService
  ) {}

  ngOnInit(): void {
    // Lógica de Orçamentos (Mantida intacta)
    this.orcamentoService.orcamento$.subscribe((orcamentos) => {
      // Reseta contadores para evitar soma duplicada se o observable emitir de novo
      this.orcamentosCancelados = 0;
      this.orcamentosPendentes = 0;
      this.orcamentosFinalizados = 0;
      this.totalVendas = 0;

      orcamentos.forEach((orcamento) => {
        if (orcamento.status === 'Cancelado') {
          this.orcamentosCancelados++;
        }
        if (orcamento.status === 'Aberto') {
          this.orcamentosPendentes++;
        }
        if (orcamento.status === 'Finalizado') {
          this.orcamentosFinalizados++;
          this.totalVendas += orcamento.valor || 0;
        }
      });
    });

    this.orcamentoService.qtdOrcamentos().subscribe((qtd) => {
      this.totalOrcamento = qtd;
    });

    // Lógica de Vendas e Gráficos
    this.graficosDataService.vendas$.subscribe((vendas) => {
      const clientesResumo = this.organizarPorCliente(vendas);
      const produtosResumo = this.organizarPorProduto(vendas);

      this.prepararGraficoClientes(clientesResumo);
      this.prepararGraficoProdutos(produtosResumo);
    });
  }

  organizarPorCliente(vendas: Venda[]): ClienteResumo[] {
    const mapaClientes = new Map<number, ClienteResumo>();

    vendas.forEach((venda) => {
      let cliente = mapaClientes.get(venda.cliente_id);
      if (!cliente) {
        cliente = {
          cliente_id: venda.cliente_id,
          cliente_nome: venda.cliente_nome,
          total_compras: venda.total_compras,
          total_produtos_vendidos: 0,
          produtos: [],
        };
        mapaClientes.set(venda.cliente_id, cliente);
      }

      cliente.produtos.push({
        produto_nome: venda.produto_nome,
        total_vendido: venda.total_vendido,
      });

      cliente.total_produtos_vendidos += venda.total_vendido;
    });

    return Array.from(mapaClientes.values());
  }

  organizarPorProduto(vendas: Venda[]): ProdutoResumo[] {
    const mapaProdutos = new Map<string, ProdutoResumo>();

    vendas.forEach((venda) => {
      let produto = mapaProdutos.get(venda.produto_nome);
      if (!produto) {
        produto = { produto_nome: venda.produto_nome, total_vendido: 0 };
        mapaProdutos.set(venda.produto_nome, produto);
      }
      produto.total_vendido += venda.total_vendido;
    });

    return Array.from(mapaProdutos.values()).sort(
      (a, b) => b.total_vendido - a.total_vendido
    );
  }

  prepararGraficoClientes(clientes: ClienteResumo[]) {
    const clientesOrdenados = clientes.sort(
      (a, b) => b.total_compras - a.total_compras
    );

    const labels = clientesOrdenados.map((c) =>
      c.cliente_nome ? c.cliente_nome.split(' ')[0] : 'Cliente'
    );
    const data = clientesOrdenados.map((c) => c.total_compras);

    this.chartClientesData = {
      labels,
      datasets: [
        {
          label: 'Compras',
          data,
          // Cor Azul Indigo (Combinando com o tema)
          backgroundColor: '#6366f1',
          hoverBackgroundColor: '#4f46e5',
        },
      ],
    };
  }

  prepararGraficoProdutos(produtos: ProdutoResumo[]) {
    const labels = produtos.map((p) => p.produto_nome);
    const data = produtos.map((p) => p.total_vendido);

    this.chartProdutosData = {
      labels,
      datasets: [
        {
          label: 'Vendas',
          data,
          // Cor Rosa/Roxo (Para diferenciar do outro gráfico)
          backgroundColor: '#ec4899',
          hoverBackgroundColor: '#db2777',
        },
      ],
    };
  }
}
