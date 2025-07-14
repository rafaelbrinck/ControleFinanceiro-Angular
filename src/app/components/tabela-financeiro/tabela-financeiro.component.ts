import { Component, Input } from '@angular/core';
import { Transacao } from '../../models/trasacao';
import { TransacaoService } from '../../service/transacao.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { AlertaService } from '../../service/alerta.service';

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
    private loginService: LoginService,
    private alertaService: AlertaService
  ) {}
  async ngOnInit(): Promise<void> {
    this.transacaoService.transacoes$.subscribe(async (transacoes) => {
      if (transacoes.length == 0) {
        await this.transacaoService.carregarTransacoes();
      }
    });
    this.transacaoService.transacoes$.subscribe(
      (transacoes) => (this.lista = transacoes)
    );
  }
  async deletar(id?: number) {
    this.alertaService.sucesso(
      'Sucesso',
      `Produto com id ${id} removido com sucesso!`
    );
    await this.transacaoService.deletar(id!);
  }
}
