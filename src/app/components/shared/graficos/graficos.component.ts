import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms'; // <-- Importado para o filtro de datas
import { GraficosDataService, Venda } from '../../../service/grafico.service';
import { ClienteResumo, ProdutoResumo } from '../../../models/relatorios';
import { OrcamentoService } from '../../../service/orcamento.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-graficos',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule, RouterLink], // <-- Adicionado FormsModule
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
  orcamentosAbertos: number = 0;
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

  aplicarFiltro() {
    // 1. Filtra Orçamentos pelo período
    const orcamentosFiltrados = this.todosOrcamentos.filter((o) => {
      // Tenta pegar o updated_at, se não tiver, pega o created_at
      const dataOrc = o.updated_at
        ? String(o.updated_at).substring(0, 10)
        : o.created_at
          ? String(o.created_at).substring(0, 10)
          : null;

      if (!dataOrc) return true; // Se não tiver data de jeito nenhum, deixa passar

      return (
        (!this.dataInicio || dataOrc >= this.dataInicio) &&
        (!this.dataFim || dataOrc <= this.dataFim)
      );
    });

    // Reseta contadores
    this.orcamentosAbertos = 0;
    this.orcamentosCancelados = 0;
    this.orcamentosPendentes = 0;
    this.orcamentosFinalizados = 0;
    this.totalVendas = 0;
    this.totalOrcamento = orcamentosFiltrados.length;

    orcamentosFiltrados.forEach((orcamento) => {
      if (orcamento.status === 'Cancelado') this.orcamentosCancelados++;
      if (orcamento.status === 'Aguardando Pagamento')
        this.orcamentosPendentes++;
      if (orcamento.status === 'Aberto') {
        this.orcamentosAbertos++;
      }
      if (orcamento.status === 'Finalizado') {
        this.orcamentosFinalizados++;
        this.totalVendas += orcamento.valor || 0;
      }
    });

    // A MÁGICA AQUI: Gera o gráfico de Clientes direto da lista de Orçamentos filtrada
    this.prepararGraficoClientesCorrigido(orcamentosFiltrados);

    // 2. Filtra Vendas (Agora APENAS para o Gráfico de Produtos)
    const vendasFiltradas = this.todasVendas.filter((v) => {
      const dataVenda = (v as any).updated_at
        ? String((v as any).updated_at).substring(0, 10)
        : null;
      if (!dataVenda) return false;

      return (
        (!this.dataInicio || dataVenda >= this.dataInicio) &&
        (!this.dataFim || dataVenda <= this.dataFim)
      );
    });

    const produtosResumo = this.organizarPorProduto(vendasFiltradas);
    this.prepararGraficoProdutos(produtosResumo);
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

  // --- MÉTODOS DE ORGANIZAÇÃO DE GRÁFICOS (Mantidos) ---

  prepararGraficoClientesCorrigido(orcamentos: any[]) {
    // Pegamos apenas os orçamentos que viraram vendas (Finalizados)
    const orcamentosFinalizados = orcamentos.filter(
      (o) => o.status === 'Finalizado',
    );

    // Usamos um Map para agrupar as compras por Cliente
    const mapaClientes = new Map<
      number,
      { nome: string; qtdPedidos: number }
    >();

    orcamentosFinalizados.forEach((orc) => {
      const id = orc.idCliente;
      // Puxa o nome do cliente que já vem junto do orçamento
      const nome = orc.cliente?.nome || 'Cliente ' + id;

      if (!mapaClientes.has(id)) {
        mapaClientes.set(id, { nome: nome, qtdPedidos: 0 });
      }

      // Adiciona exatamente 1 pedido, independente de quantos produtos tem dentro dele!
      mapaClientes.get(id)!.qtdPedidos += 1;
    });

    // Ordena do cliente que comprou mais vezes para o que comprou menos
    const clientesOrdenados = Array.from(mapaClientes.values()).sort(
      (a, b) => b.qtdPedidos - a.qtdPedidos,
    );

    const labels = clientesOrdenados.map((c) => c.nome.split(' ')[0]); // Pega só o primeiro nome
    const data = clientesOrdenados.map((c) => c.qtdPedidos);

    this.chartClientesData = {
      labels,
      datasets: [
        {
          label: 'Total de Compras (Pedidos)',
          data,
          backgroundColor: '#6366f1',
          hoverBackgroundColor: '#4f46e5',
        },
      ],
    };
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
