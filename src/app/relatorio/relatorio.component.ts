import { Component, OnInit } from '@angular/core';
import { Relatorio } from '../relatorio';
import { TransacaoService } from '../transacao.service';
import { Transacao } from '../trasacao';
import { CommonModule, NgClass } from '@angular/common';
import { MoedaPipe } from '../moeda.pipe';

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

  mostrarDetalhes: boolean = false;
  tipoDetalhe: 'Entrada' | 'Saida' | undefined;

  constructor(private transacaoService: TransacaoService) {}

  exibirDetalhes(tipo: 'Entrada' | 'Saida') {
    this.tipoDetalhe = tipo;
    this.mostrarDetalhes = true;
  }

  fecharDetalhes() {
    this.tipoDetalhe = undefined;
    this.mostrarDetalhes = false;
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
  }

  atualizarRelatorio(transacoes: Transacao[]): void {
    let entradas = 0;
    let saidas = 0;

    transacoes.forEach((t) => {
      if (t.valor !== undefined) {
        if (t.tipo === 'Entrada') entradas += t.valor;
        else if (t.tipo === 'Saida') saidas += t.valor;
      }
    });

    this.relatorio.entradas = entradas;
    this.relatorio.saidas = saidas;
    this.relatorio.resultado = entradas - saidas;
  }

  mostrar() {
    return this.relatorio;
  }
}
