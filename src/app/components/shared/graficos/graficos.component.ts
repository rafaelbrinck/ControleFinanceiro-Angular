import { Component, OnInit } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
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
  styleUrls: ['./graficos.component.css'],
})
export class GraficosComponent implements OnInit {
  chartClientesData!: ChartData<'bar'>;
  chartProdutosData!: ChartData<'bar'>;

  totalOrcamento: number = 0;
  orcamentosFinalizados: number = 0;
  orcamentosCancelados: number = 0;
  orcamentosPendentes: number = 0;
  totalVendas: number = 0;

  chartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Relatório de Vendas',
      },
    },
  };

  constructor(
    private graficosDataService: GraficosDataService,
    private orcamentoService: OrcamentoService
  ) {}

  ngOnInit(): void {
    this.orcamentoService.orcamento$.subscribe((orcamentos) => {
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
          label: 'Quantidade total de compras feitas',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
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
          label: 'Quantidade vendida',
          data,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
        },
      ],
    };
  }
}
