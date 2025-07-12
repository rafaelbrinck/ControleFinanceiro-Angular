import { CommonModule } from '@angular/common';
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
import { AlertaService } from '../../service/alerta.service';

@Component({
  selector: 'app-lista-orcamentos',
  standalone: true,
  imports: [CommonModule, BuscadorPipe, FormsModule, CpfPipe, TelefonePipe],
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
    private transacaoService: TransacaoService,
    private alertaService: AlertaService
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
    this.alertaService.confirmar(
      'Finalizar Orçamento',
      `Deseja finalizar o orçamento para ${orcamento.cliente?.nome}?`,
      async (resposta: boolean) => {
        if (resposta) {
          if (!this.validarOrcamento(orcamento, 'f')) return false;
          orcamento.status = 'Finalizado';
          orcamento.updated_at = new Date();
          const sucesso = await this.orcamentoService.atualizar(orcamento);
          if (!sucesso) {
            this.alertaService.erro(
              'Erro ao Finalizar Orçamento',
              'Ocorreu um erro ao finalizar o orçamento. Tente novamente.'
            );
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

          const sucessoTransacao = await this.transacaoService.inserir(
            transacao
          );
          if (!sucessoTransacao) {
            console.error('Erro ao registrar transação');
            return false;
          }

          this.fecharModal();
          return true;
        }
        return false;
      }
    );
  }

  async cancelarOrcamento(orcamento: Orcamento) {
    this.alertaService.confirmar(
      'Cancelar Orçamento',
      `Deseja cancelar o orçamento para ${orcamento.cliente?.nome}?`,
      async (resposta: boolean) => {
        if (resposta) {
          if (!this.validarOrcamento(orcamento, 'c')) return false;
          orcamento.status = 'Cancelado';
          orcamento.updated_at = new Date();
          const sucesso = await this.orcamentoService.atualizar(orcamento);
          if (!sucesso) {
            this.alertaService.erro(
              'Erro ao Cancelar Orçamento',
              'Ocorreu um erro ao cancelar o orçamento. Tente novamente.'
            );
            return false;
          }
          this.fecharModal();
          return true;
        }
        return false;
      }
    );
  }

  paginaOrcamentos() {
    this.router.navigate(['/orcamento']);
  }

  validarOrcamento(orcamento: Orcamento, tipo: string = 'c'): boolean {
    if (orcamento.status === 'Finalizado') {
      this.alertaService.info(
        'Orçamento Finalizado',
        'Este orçamento já foi finalizado.'
      );
      return false;
    }
    if (orcamento.status === 'Cancelado') {
      this.alertaService.info(
        'Orçamento Cancelado',
        'Este orçamento já foi cancelado.'
      );
      return false;
    }
    if (tipo != 'c' && !orcamento.formaPagamento) {
      this.alertaService.info(
        'Forma de Pagamento Não Selecionada',
        'Você precisa selecionar a forma de pagamento antes de finalizar o orçamento.'
      );
      return false;
    }
    return true;
  }
}
