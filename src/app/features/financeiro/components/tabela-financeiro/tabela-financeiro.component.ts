import { Component, DestroyRef } from '@angular/core';
import { Transacao } from '@app/shared/models/transacao';
import { TransacaoService } from '@app/core/services/transacao.service';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '@app/shared/pipes/buscador.pipe';
import { MoedaPipe } from '@app/shared/pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlertaService } from '@app/core/services/alerta.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-tabela-financeiro',
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './tabela-financeiro.component.html',
  styleUrl: './tabela-financeiro.component.css',
})
export class TabelaFinanceiroComponent {
  campoPesquisa: string = 'nome';
  nomePesquisa?: string;
  lista: Transacao[] = [];

  constructor(
    private transacaoService: TransacaoService,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {}
  async ngOnInit(): Promise<void> {
    if (this.transacaoService.getTransacoesSnapshot().length === 0) {
      await this.transacaoService.carregarTransacoes();
    }
    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((transacoes) => (this.lista = transacoes));
  }
  async deletar(id?: number) {
    this.alertaService.sucesso(
      'Sucesso',
      `Produto com id ${id} removido com sucesso!`
    );
    await this.transacaoService.deletar(id!);
  }
}
