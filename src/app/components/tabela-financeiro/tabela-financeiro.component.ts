import { Component, Input } from '@angular/core';
import { Transacao } from '../../models/trasacao';
import { TransacaoService } from '../../service/transacao.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginService } from '../../service/login.service';

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
  ) {}
  async ngOnInit(): Promise<void> {
    await this.transacaoService.carregarTransacoes();
    this.transacaoService.transacoes$.subscribe(
      (transacoes) => (this.lista = transacoes)
    );
  }
  async deletar(id?: number) {
    alert(`Produto com id ${id} removido com sucesso!`);
    await this.transacaoService.deletar(id!);
  }
}
