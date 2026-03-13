import { Component, OnInit } from '@angular/core';
import { Transacao } from '../../models/trasacao';
import { Relatorio } from '../../models/relatorio';
import { Categoria } from '../../models/categoria';
import { TransacaoService } from '../../service/transacao.service';
import { CategoriaService } from '../../service/categoria.service';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { supabase } from '../../supabase';
import { CommonModule, NgClass } from '@angular/common';
import { ClientesService } from '../../service/clientes.service';
import { ProdutosService } from '../../service/produtos.service';
import { OrcamentoService } from '../../service/orcamento.service';
import { VariacoesService } from '../../service/variacoes.service';
import { firstValueFrom } from 'rxjs';
import { GraficosComponent } from '../shared/graficos/graficos.component';
import { GraficosDataService } from '../../service/grafico.service';
import { FornecedoresService } from '../../service/fornecedores.service';
import { FormsModule } from '@angular/forms'; // <-- Importante para o [(ngModel)] funcionar

@Component({
  selector: 'app-home',
  imports: [NgClass, CommonModule, GraficosComponent, FormsModule], // <-- Adicionado FormsModule
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  relatorio = new Relatorio(0, 0, 0);
  listaTransacoes: Transacao[] = [];

  mostrarCategorias: boolean = false;
  categorias: Categoria[] = [];

  mostrarDetalhes: boolean = false;
  tipoDetalhe: 'Entrada' | 'Saida' | undefined;

  // Variáveis para o filtro de datas
  dataInicio: string = '';
  dataFim: string = '';

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
  ) {}

  async ngOnInit(): Promise<void> {
    this.definirMesAtualComoPadrao();

    const userId = this.loginService.getUserLogado();

    if (userId) {
      await this.carregarSistema();
    }
    await this.carregarRelatorioViaEdge();
    this.categoriaService.categorias$.subscribe((cats) => {
      this.categorias = cats;
    });

    this.transacaoService.transacoes$.subscribe((transacoes) => {
      transacoes.forEach((transacao) => {
        const categoria = this.categorias.find(
          (cat) => cat.id === transacao.categoria,
        );
        transacao.cat = categoria ? categoria.nome : 'Categoria não encontrada';
      });
      this.listaTransacoes = transacoes;
    });
  }

  // --- MÉTODOS DE DATA ---

  definirMesAtualComoPadrao() {
    const dataAtual = new Date();
    // Primeiro dia do mês atual
    const primeiroDia = new Date(
      dataAtual.getFullYear(),
      dataAtual.getMonth(),
      1,
    );
    // Último dia do mês atual
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
    return `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD exigido pelo input type="date"
  }

  async aplicarFiltro() {
    // Quando o usuário muda as datas na tela, chama a edge function novamente
    await this.carregarRelatorioViaEdge();
  }

  // --- RESTANTE DOS MÉTODOS ---

  exibirDetalhes(tipo: 'Entrada' | 'Saida') {
    if (this.tipoDetalhe === tipo && this.mostrarDetalhes) {
      this.fecharDetalhes();
      return;
    } else {
      this.tipoDetalhe = tipo;
      this.mostrarDetalhes = true;
    }
  }

  exibirCategorias() {
    this.mostrarCategorias = !this.mostrarCategorias;
  }

  fecharDetalhes() {
    this.tipoDetalhe = undefined;
    this.mostrarDetalhes = false;
    this.mostrarCategorias = false;
  }

  get transacoesFiltradas(): Transacao[] {
    return this.listaTransacoes.filter((transacao) => {
      const isTipoCorreto = transacao.tipo === this.tipoDetalhe;
      // Compara as datas (string com string YYYY-MM-DD funciona perfeitamente)
      const isDentroDoPeriodo =
        (!this.dataInicio || transacao.data! >= this.dataInicio) &&
        (!this.dataFim || transacao.data! <= this.dataFim);

      return isTipoCorreto && isDentroDoPeriodo;
    });
  }

  async carregarRelatorioViaEdge() {
    try {
      const idUser = this.loginService.getUserLogado();
      const { data, error } = await supabase.functions.invoke(
        'relatorio-filtrado',
        {
          body: {
            userId: idUser,
            dataInicio: this.dataInicio, // Agora passamos as datas
            dataFim: this.dataFim,
          },
        },
      );

      if (error) {
        console.error('Erro da função:', error);
        alert(
          'Erro ao carregar relatório via função: ' +
            (error.message || JSON.stringify(error)),
        );
        return;
      }
      this.relatorio.entradas = data.entradas;
      this.relatorio.saidas = data.saidas;
      this.relatorio.resultado = data.resultado;
    } catch (e) {
      console.error('Erro inesperado:', e);
    }
  }

  navegarParaCategorias() {
    this.router.navigate(['/form-categoria']);
  }

  mostrar() {
    return this.relatorio;
  }

  async carregarSistema() {
    const transacoes = await firstValueFrom(this.transacaoService.transacoes$);
    if (transacoes.length === 0) {
      await this.transacaoService.carregarTransacoes();
    }

    const categorias = await firstValueFrom(this.categoriaService.categorias$);
    if (categorias.length === 0) {
      await this.categoriaService.carregarCategorias();
    }

    const clientes = await firstValueFrom(this.clienteService.clientes$);
    if (clientes.length === 0) {
      await this.clienteService.carregarClientes();
    }

    const produtos = await firstValueFrom(this.produtoService.produtos$);
    if (produtos.length === 0) {
      await this.produtoService.carregarProdutos();
    }

    const orcamentos = await firstValueFrom(this.orcamentoService.orcamento$);
    if (orcamentos.length === 0) {
      await this.orcamentoService.carregarOrcamentos();
    }

    const graficoVendas = await firstValueFrom(this.graficoService.vendas$);
    if (graficoVendas.length === 0) {
      await this.graficoService.carregarDados();
    }

    const variacoes = await firstValueFrom(this.variacoesService.variacoes$);
    if (variacoes.length === 0) {
      await this.variacoesService.carregarVariacoes();
    }
  }
}
