import { Component, Input } from '@angular/core';
import { Transacao } from '../trasacao';
import { TransacaoService } from '../transacao.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../buscador.pipe';
import { MoedaPipe } from '../moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginService } from '../login.service';

@Component({
  selector: 'app-tabela-financeiro',
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './tabela-financeiro.component.html',
  styleUrl: './tabela-financeiro.component.css',
})
export class TabelaFinanceiroComponent {
  nomePesquisa?: string;
  lista: Transacao[] = [];

  constructor(
    private transacaoService: TransacaoService,
    private loginService: LoginService
  ) {
    this.lista = this.transacaoService.listar(loginService.getUserLogado());
  }
  deletar(id?: number) {
    alert(`Produto com id ${id} removido com sucesso!`);
    this.transacaoService.deletar(id);
  }
}
