import { Component, OnInit } from '@angular/core';
import { Relatorio } from '../relatorio';
import { TransacaoService } from '../transacao.service';
import { Transacao } from '../trasacao';
import { CommonModule, NgClass } from '@angular/common';
import { MoedaPipe } from '../moeda.pipe';
import { CategoriaService } from '../categoria.service';
import { Router } from '@angular/router';
import { Categoria } from '../categoria';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-relatorio',
  standalone: true,
  imports: [NgClass, CommonModule, MoedaPipe],
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.css'],
})
export class RelatorioComponent implements OnInit {
  relatorio = new Relatorio(0, 0, 0);
  listaTransacoes: Transacao[] = [];

  mostrarCategorias: boolean = false;
  categorias: Categoria[] = [];

  mostrarDetalhes: boolean = false;
  tipoDetalhe: 'Entrada' | 'Saida' | undefined;

  constructor(
    private transacaoService: TransacaoService,
    private categoriaService: CategoriaService,
    private router: Router,
    private loginService: LoginService
  ) {}

  exibirDetalhes(tipo: 'Entrada' | 'Saida') {
    this.tipoDetalhe = tipo;
    this.mostrarDetalhes = true;
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

  ngOnInit(): void {
    this.transacaoService.transacoes$.subscribe((transacoes) => {
      this.listaTransacoes = transacoes;
      this.atualizarRelatorio(transacoes);
    });
    this.categoriaService.categorias$.subscribe(
      (cats) => (this.categorias = cats)
    );
  }

  atualizarRelatorio(transacoes: Transacao[]): void {
    let entradas = 0;
    let saidas = 0;

    transacoes.forEach((transacao) => {
      if (transacao.valor !== undefined) {
        if (transacao.tipo === 'Entrada') entradas += transacao.valor;
        else if (transacao.tipo === 'Saida') saidas += transacao.valor;
      }
    });

    this.relatorio.entradas = entradas;
    this.relatorio.saidas = saidas;
    this.relatorio.resultado = entradas - saidas;
  }
  navegarParaCategorias() {
    this.router.navigate(['/form-categoria']);
  }
  mostrar() {
    return this.relatorio;
  }
}
