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
import { CategoriaService } from '../../service/categoria.service';

@Component({
  selector: 'app-lista-orcamentos',
  standalone: true,
  imports: [CommonModule, BuscadorPipe, FormsModule, CpfPipe, TelefonePipe],
  templateUrl: './lista-orcamentos.component.html',
  styleUrl: './lista-orcamentos.component.css',
})
export class ListaOrcamentosComponent implements OnInit {
  campoPesquisa: string = 'nomeCliente';
  nomePesquisa?: string;
  listaOrcamentos: Orcamento[] = [];
  orcamentoSelecionado?: Orcamento;

  constructor(
    private orcamentoService: OrcamentoService,
    private router: Router,
    private transacaoService: TransacaoService,
    private alertaService: AlertaService,
    private categoriaService: CategoriaService
  ) {}

  async ngOnInit(): Promise<void> {
    this.orcamentoService.orcamentoSelecionado$.subscribe(
      (orcamento) => (this.orcamentoSelecionado = orcamento ?? undefined)
    );
    this.orcamentoService.orcamento$.subscribe(async (orcamentos) => {
      if (orcamentos.length == 0) {
        await this.orcamentoService.carregarOrcamentos();
      }
    });
    this.orcamentoService.orcamento$.subscribe((dados) => {
      this.listaOrcamentos = dados;
    });
  }

  reenviarOrcamento(orcamento: Orcamento) {
    this.alertaService.confirmar(
      'Reenviar Orçamento',
      `Deseja reenviar o orçamento para ${orcamento.cliente?.nome}?`,
      (resposta) => {
        if (resposta) {
          this.orcamentoService.enviarOrcamentoWhatsApp(orcamento);
          this.alertaService.sucesso(
            'Orçamento Reenviado',
            `O orçamento para ${orcamento.cliente?.nome} foi reenviado com sucesso.`
          );
          return true;
        }
        return false;
      }
    );
  }

  abrirModal(orcamento: Orcamento) {
    this.orcamentoService.addOrcamentoSelecionado(orcamento);
  }

  fecharModal() {
    this.orcamentoService.limparOrcamentoSelecionado();
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
          const categoriaVenda = await this.categoriaService.retornarVenda();
          if (!categoriaVenda) {
            this.alertaService.erro(
              'Erro',
              "erro ao buscar categoria de vendas. Verifique se a categoria 'Vendas' está cadastrada."
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
            categoria: categoriaVenda.id,
            data: new Date(),
          };

          const sucessoTransacao = await this.transacaoService.inserir(
            transacao
          );
          if (!sucessoTransacao) {
            console.error('Erro ao registrar transação');
            return false;
          }

          const transacaoFrete: Transacao = {
            nome: `Frete do orçamento #${orcamento.id}`,
            valor: orcamento.frete || 0,
            tipo: 'Saida',
            categoria: categoriaVenda.id,
            data: new Date(),
          };

          const sucessoTransacaoFrete = await this.transacaoService.inserir(
            transacaoFrete
          );
          if (!sucessoTransacaoFrete) {
            console.error('Erro ao registrar transação Frete');
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

  duplicarOrcamento(orcamento: Orcamento) {
    this.alertaService.confirmar(
      'Duplicar Orçamento',
      `Deseja duplicar o orçamento para ${orcamento.cliente?.nome}?`,
      (resposta) => {
        this.orcamentoService.duplicarOrcamento(orcamento);
        this.router.navigate(['/orcamento']);
      }
    );
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
