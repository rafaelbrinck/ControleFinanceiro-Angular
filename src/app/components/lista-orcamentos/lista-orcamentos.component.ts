import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { CpfPipe } from '../../pipes/cpf.pipe';
import { OrcamentoService } from '../../service/orcamento.service';
import { Orcamento } from '../../models/orcamento';
import { TelefonePipe } from '../../pipes/telefone.pipe';
import { Router } from '@angular/router';
import { TransacaoService } from '../../service/transacao.service';
import { Transacao } from '../../models/trasacao';

@Component({
  selector: 'app-lista-orcamentos',
  standalone: true,
  imports: [
    CommonModule,
    BuscadorPipe,
    FormsModule,
    CpfPipe,
    TelefonePipe,
    DatePipe,
  ],
  templateUrl: './lista-orcamentos.component.html',
  styleUrl: './lista-orcamentos.component.css',
})
export class ListaOrcamentosComponent implements OnInit {
  nomePesquisa?: string;
  listaOrcamentos: Orcamento[] = [];
  orcamentoSelecionado?: Orcamento;

  constructor(
    private orcamentoService: OrcamentoService,
    private router: Router,
    private transacaoService: TransacaoService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.orcamentoService.carregarOrcamentos();
    this.orcamentoService.orcamento$.subscribe((dados) => {
      this.listaOrcamentos = dados;
    });
  }

  abrirModal(orcamento: Orcamento) {
    this.orcamentoSelecionado = orcamento;
  }

  fecharModal() {
    this.orcamentoSelecionado = undefined;
  }

  getNomesProdutos(orcamento: Orcamento): string {
    return orcamento?.produtos?.map((produto) => produto.nome).join(', ') || '';
  }

  async finalizarOrcamento(orcamento: Orcamento) {
    if (!confirm('Deseja finalizar este orçamento?')) return false;
    if (orcamento.status === 'Finalizado') {
      alert('Orçamento já está finalizado');
      return false;
    }
    if (orcamento.status === 'Cancelado') {
      alert('Orçamento cancelado não pode ser finalizado');
      return false;
    }
    if (!orcamento.formaPagamento) {
      alert('Selecione a forma de pagamento antes de finalizar');
      return false;
    }
    orcamento.status = 'Finalizado';
    orcamento.updated_at = new Date();
    const sucesso = await this.orcamentoService.atualizar(orcamento);
    if (!sucesso) {
      console.error('Erro ao finalizar orçamento');
      return false;
    }
    // Registrar transação
    const transacao: Transacao = {
      nome: `Pagamento de ${orcamento.cliente!.nome} - Orçamento #${
        orcamento.id
      }`,
      valor: orcamento.valor,
      tipo: 'Entrada',
      categoria: 'Vendas',
      data: new Date(),
    };

    const sucessoTransacao = await this.transacaoService.inserir(transacao);
    if (!sucessoTransacao) {
      console.error('Erro ao registrar transação');
      return false;
    }

    this.fecharModal();
    return true;
  }

  async cancelarOrcamento(orcamento: Orcamento) {
    if (!confirm('Deseja cancelar este orçamento?')) return false;
    if (orcamento.status === 'Cancelado') {
      alert('Orçamento já está cancelado');
      return false;
    }
    if (orcamento.status === 'Finalizado') {
      alert('Orçamento finalizado não pode ser cancelado');
      return false;
    }
    orcamento.status = 'Cancelado';
    orcamento.updated_at = new Date();
    const sucesso = await this.orcamentoService.atualizar(orcamento);
    if (!sucesso) {
      console.error('Erro ao cancelar orçamento');
      return false;
    }
    this.fecharModal();
    return true;
  }
  paginaOrcamentos() {
    this.router.navigate(['/orcamento']);
  }
}
