import { Component, DestroyRef, OnInit } from '@angular/core';
import { Transacao } from '@app/shared/models/transacao';
import { Relatorio } from '@app/shared/models/relatorio';
import { Categoria } from '@app/shared/models/categoria';
import { TransacaoService } from '@app/core/services/transacao.service';
import { CategoriaService } from '@app/core/services/categoria.service';
import { Router } from '@angular/router';
import { LoginService } from '@app/core/auth/services/login.service';
import { supabase } from '@app/core/data/supabase/supabase.client';
import { CommonModule, NgClass } from '@angular/common';
import { ClientesService } from '@app/core/services/clientes.service';
import { ProdutosService } from '@app/core/services/produtos.service';
import { OrcamentoService } from '@app/core/services/orcamento.service';
import { VariacoesService } from '@app/core/services/variacoes.service';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GraficosComponent } from '@app/shared/components/graficos/graficos.component';
import { GraficosDataService } from '@app/core/services/grafico.service';
import { FornecedoresService } from '@app/core/services/fornecedores.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgClass, CommonModule, GraficosComponent, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  relatorio = new Relatorio(0, 0, 0);
  listaTransacoes: Transacao[] = [];
  categorias: Categoria[] = [];

  mostrarCategorias: boolean = false;
  mostrarDetalhes: boolean = false;
  tipoDetalhe: 'Entrada' | 'Saida' | undefined;

  // Filtro de Datas Centralizado
  dataInicio: string = '';
  dataFim: string = '';

  // KPIs de Operação (O "Pulso" do Negócio)
  kpiOrcamentos = {
    abertos: 0,
    pendentes: 0,
    vencidos: 0,
    valorAReceber: 0,
  };

  constructor(
    private transacaoService: TransacaoService,
    private categoriaService: CategoriaService,
    private clienteService: ClientesService,
    private produtoService: ProdutosService,
    private orcamentoService: OrcamentoService,
    private variacoesService: VariacoesService,
    private router: Router,
    private loginService: LoginService,
    private graficoService: GraficosDataService,
    private fornecedoresService: FornecedoresService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    this.definirMesAtualComoPadrao();
    const userId = this.loginService.getUserLogado();

    if (userId) {
      await this.carregarSistema();
    }

    await this.carregarRelatorioViaEdge();

    // Monitorização de Orçamentos para KPIs da Home
    this.orcamentoService.orcamento$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((orcamentos) => {
        this.calcularKpisOrcamento(orcamentos);
      });

    this.categoriaService.categorias$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => {
        this.categorias = cats;
      });

    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((transacoes) => {
        transacoes.forEach((t) => {
          const cat = this.categorias.find((c) => c.id === t.categoria);
          t.cat = cat ? cat.nome : 'Sem Categoria';
        });
        this.listaTransacoes = transacoes;
      });
  }

  definirMesAtualComoPadrao() {
    const data = new Date();
    const primeiroDia = new Date(data.getFullYear(), data.getMonth(), 1);
    const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0);
    this.dataInicio = this.formatarDataParaInput(primeiroDia);
    this.dataFim = this.formatarDataParaInput(ultimoDia);
  }

  formatarDataParaInput(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  calcularKpisOrcamento(orcamentos: any[]) {
    const hojeStr = new Date().toISOString().substring(0, 10);

    const filtrados = orcamentos.filter((o) => {
      const data = o.updated_at
        ? String(o.updated_at).substring(0, 10)
        : String(o.created_at).substring(0, 10);
      return (
        (!this.dataInicio || data >= this.dataInicio) &&
        (!this.dataFim || data <= this.dataFim)
      );
    });

    this.kpiOrcamentos = {
      abertos: filtrados.filter((o) => o.status === 'Aberto').length,
      pendentes: filtrados.filter((o) => o.status === 'Aguardando Pagamento')
        .length,
      vencidos: filtrados.filter(
        (o) =>
          o.status === 'Aguardando Pagamento' &&
          o.dt_boleto &&
          String(o.dt_boleto) < hojeStr,
      ).length,
      valorAReceber: filtrados
        .filter(
          (o) => o.status === 'Aguardando Pagamento' || o.status === 'Aberto',
        )
        .reduce((acc, curr) => acc + (curr.valor || 0), 0),
    };
  }

  async aplicarFiltro() {
    await this.carregarRelatorioViaEdge();
    this.calcularKpisOrcamento(this.orcamentoService.getOrcamentosSnapshot());
  }

  async carregarRelatorioViaEdge() {
    try {
      const idUser = this.loginService.getUserLogado();
      const { data, error } = await supabase.functions.invoke(
        'relatorio-filtrado',
        {
          body: {
            userId: idUser,
            dataInicio: this.dataInicio,
            dataFim: this.dataFim,
          },
        },
      );
      if (!error) {
        this.relatorio.entradas = data.entradas;
        this.relatorio.saidas = data.saidas;
        this.relatorio.resultado = data.resultado;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Métodos de UI e Navegação
  exibirDetalhes(tipo: 'Entrada' | 'Saida') {
    if (this.tipoDetalhe === tipo && this.mostrarDetalhes) {
      this.fecharDetalhes();
    } else {
      this.tipoDetalhe = tipo;
      this.mostrarDetalhes = true;
    }
  }

  fecharDetalhes() {
    this.tipoDetalhe = undefined;
    this.mostrarDetalhes = false;
    this.mostrarCategorias = false;
  }

  get transacoesFiltradas(): Transacao[] {
    return this.listaTransacoes.filter(
      (t) =>
        t.tipo === this.tipoDetalhe &&
        (!this.dataInicio || t.data! >= this.dataInicio) &&
        (!this.dataFim || t.data! <= this.dataFim),
    );
  }

  navegarParaCategorias() {
    this.router.navigate(['/form-categoria']);
  }

  navegarParaOrcamentos() {
    this.router.navigate(['/lista-orcamentos']);
  }

  async carregarSistema() {
    // Cria pequenas rotinas assíncronas para cada serviço
    const loadTransacoes = async () => {
      const res = await firstValueFrom(this.transacaoService.transacoes$);
      if (res.length === 0) await this.transacaoService.carregarTransacoes();
    };

    const loadCategorias = async () => {
      const res = await firstValueFrom(this.categoriaService.categorias$);
      if (res.length === 0) await this.categoriaService.carregarCategorias();
    };

    const loadOrcamentos = async () => {
      const res = await firstValueFrom(this.orcamentoService.orcamento$);
      if (res.length === 0) await this.orcamentoService.carregarOrcamentos();
    };

    const loadVendas = async () => {
      const res = await firstValueFrom(this.graficoService.vendas$);
      if (res.length === 0) await this.graficoService.carregarDados();
    };

    // Executa todas ao mesmo tempo (em paralelo)
    await Promise.all([
      loadTransacoes(),
      loadCategorias(),
      loadOrcamentos(),
      loadVendas(),
    ]);
  }
}
