import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms'; // <-- Importado para o filtro de datas
import { GraficosDataService, Venda } from '../../../service/grafico.service';
import { ClienteResumo, ProdutoResumo } from '../../../models/relatorios';
import { OrcamentoService } from '../../../service/orcamento.service';

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule], // <-- Adicionado FormsModule
  templateUrl: './graficos.component.html',
  styleUrls: ['./graficos.component.css'],
})
export class GraficosComponent implements OnInit {
  public chartClientesData: ChartData<'bar'> = { labels: [], datasets: [] };
  public chartProdutosData: ChartData<'bar'> = { labels: [], datasets: [] };

  totalOrcamento: number = 0;
  orcamentosFinalizados: number = 0;
  orcamentosCancelados: number = 0;
  orcamentosPendentes: number = 0;
  totalVendas: number = 0;

  // Variáveis do Filtro de Datas
  dataInicio: string = '';
  dataFim: string = '';

  // Guardam os dados originais para não precisar bater no banco toda hora
  todosOrcamentos: any[] = [];
  todasVendas: Venda[] = [];

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context) => ` Qtd/Valor: ${context.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: '#64748b',
          maxTicksLimit: 6,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', maxTicksLimit: 5, stepSize: 1 },
      },
    },
    elements: {
      bar: { borderRadius: 6, borderSkipped: 'bottom' },
    },
  };

  constructor(
    private graficosDataService: GraficosDataService,
    private orcamentoService: OrcamentoService,
  ) {}

  ngOnInit(): void {
    this.definirMesAtualComoPadrao();

    // Carrega e guarda os Orçamentos originais
    this.orcamentoService.orcamento$.subscribe((orcamentos) => {
      this.todosOrcamentos = orcamentos;
      this.aplicarFiltro(); // Aplica o filtro logo que os dados chegam
    });

    // Carrega e guarda as Vendas originais
    this.graficosDataService.vendas$.subscribe((vendas) => {
      this.todasVendas = vendas;
      this.aplicarFiltro(); // Aplica o filtro logo que os dados chegam
    });
  }

  // --- MÉTODOS DE DATA E FILTRO ---

  definirMesAtualComoPadrao() {
    const dataAtual = new Date();
    const primeiroDia = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      1,
    );
    const ultimoDia = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth() + 1,
      0,
    );

    this.dataInicio = this.formatarDataParaInput(primeiroDia);
    this.dataFim = this.formatarDataParaInput(ultimoDia);
  }

  formatarDataParaInput(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  aplicarFiltro() {
    // 1. Filtra Orçamentos
    const orcamentosFiltrados = this.todosOrcamentos.filter((o) => {
      // Ajuste 'created_at' para o nome exato do seu campo de data no banco, se necessário
      const dataOrc = o.updated_at ? String(o.updated_at).substring(0, 10) : '';
      return (
        (!this.dataInicio || dataOrc >= this.dataInicio) &&
        (!this.dataFim || dataOrc <= this.dataFim)
      );
    });

    // Reseta contadores
    this.orcamentosCancelados = 0;
    this.orcamentosPendentes = 0;
    this.orcamentosFinalizados = 0;
    this.totalVendas = 0;
    this.totalOrcamento = orcamentosFiltrados.length; // Usa o tamanho da lista filtrada

    orcamentosFiltrados.forEach((orcamento) => {
      if (orcamento.status === 'Cancelado') {
        this.orcamentosCancelados++;
      }
      // Incluído o "Aguardando Pagamento" junto com os abertos
      if (
        orcamento.status === 'Aberto' ||
        orcamento.status === 'Aguardando Pagamento'
      ) {
        this.orcamentosPendentes++;
      }
      if (orcamento.status === 'Finalizado') {
        this.orcamentosFinalizados++;
        this.totalVendas += orcamento.valor || 0;
      }
    });

    // 2. Filtra Vendas para os Gráficos
    const vendasFiltradas = this.todasVendas.filter((v) => {
      // Ajuste 'created_at' se a sua view/tabela de vendas usar outro campo de data
      const dataVenda = (v as any).created_at
        ? String((v as any).created_at).substring(0, 10)
        : '';
      // Se a query não trouxer data, deixamos passar para não quebrar o gráfico
      if (!dataVenda) return true;

      return (
        (!this.dataInicio || dataVenda >= this.dataInicio) &&
        (!this.dataFim || dataVenda <= this.dataFim)
      );
    });

    // Recalcula os gráficos com os dados filtrados
    const clientesResumo = this.organizarPorCliente(vendasFiltradas);
    const produtosResumo = this.organizarPorProduto(vendasFiltradas);

    this.prepararGraficoClientes(clientesResumo);
    this.prepararGraficoProdutos(produtosResumo);
  }

  // --- MÉTODOS DE ORGANIZAÇÃO DE GRÁFICOS (Mantidos) ---

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
      (a, b) => b.total_vendido - a.total_vendido,
    );
  }

  prepararGraficoClientes(clientes: ClienteResumo[]) {
    const clientesOrdenados = clientes.sort(
      (a, b) => b.total_compras - a.total_compras,
    );
    const labels = clientesOrdenados.map((c) =>
      c.cliente_nome ? c.cliente_nome.split(' ')[0] : 'Cliente',
    );
    const data = clientesOrdenados.map((c) => c.total_compras);

    this.chartClientesData = {
      labels,
      datasets: [
        {
          label: 'Compras',
          data,
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
          backgroundColor: '#ec4899',
          hoverBackgroundColor: '#db2777',
        },
      ],
    };
  }
}
