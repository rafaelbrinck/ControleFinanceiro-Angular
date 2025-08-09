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
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { ClientesService } from '../../service/clientes.service';
import { ProdutosService } from '../../service/produtos.service';
import { OrcamentoService } from '../../service/orcamento.service';
import { VariacoesService } from '../../service/variacoes.service';
import { firstValueFrom } from 'rxjs';
import { GraficosComponent } from '../shared/graficos/graficos.component';
import { GraficosDataService } from '../../service/grafico.service';

@Component({
  selector: 'app-home',
  imports: [NgClass, CommonModule, MoedaPipe, GraficosComponent],
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

  constructor(
    private transacaoService: TransacaoService,
    private categoriaService: CategoriaService,
    private clienteService: ClientesService,
    private produtoService: ProdutosService,
    private orcamentoService: OrcamentoService,
    private variacoesService: VariacoesService,
    private router: Router,
    private loginService: LoginService,
    private graficoService: GraficosDataService
  ) {
    console.log('HomeComponent constructor chamado');
  }

  async ngOnInit(): Promise<void> {
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
          (cat) => cat.id === transacao.categoria
        );
        transacao.cat = categoria ? categoria.nome : 'Categoria não encontrada';
      });
      this.listaTransacoes = transacoes;
    });
  }

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
    if (this.mostrarCategorias) {
      this.mostrarCategorias = false;
    } else {
      this.mostrarCategorias = true;
    }
  }

  fecharDetalhes() {
    this.tipoDetalhe = undefined;
    this.mostrarDetalhes = false;
    this.mostrarCategorias = false;
  }

  get transacoesFiltradas(): Transacao[] {
    return this.listaTransacoes.filter(
      (transacao) => transacao.tipo === this.tipoDetalhe
    );
  }

  async carregarRelatorioViaEdge() {
    try {
      const idUser = this.loginService.getUserLogado();
      const { data, error } = await supabase.functions.invoke('relatorio', {
        body: { userId: idUser },
      });

      if (error) {
        console.error('Erro da função:', error);
        alert(
          'Erro ao carregar relatório via função: ' +
            (error.message || JSON.stringify(error))
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
    /*
    if (variacoes.length === 0) {
      await this.variacoesService.carregarVariacoes();
    }
    */
  }
}
