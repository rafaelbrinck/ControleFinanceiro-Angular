import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BuscadorPipe } from '@app/shared/pipes/buscador.pipe';
import { CpfPipe } from '@app/shared/pipes/cpf.pipe';
import { OrcamentoService } from '@app/core/services/orcamento.service';
import { Orcamento } from '@app/shared/models/orcamento';
import { TelefonePipe } from '@app/shared/pipes/telefone.pipe';
import { Router, RouterLink } from '@angular/router';
import { TransacaoService } from '@app/core/services/transacao.service';
import { Transacao } from '@app/shared/models/transacao';
import { AlertaService } from '@app/core/services/alerta.service';
import { CategoriaService } from '@app/core/services/categoria.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-lista-orcamentos',
  standalone: true,
  imports: [
    CommonModule,
    BuscadorPipe,
    FormsModule,
    CpfPipe,
    TelefonePipe,
    RouterLink,
  ],
  templateUrl: './lista-orcamentos.component.html',
  styleUrl: './lista-orcamentos.component.css',
})
export class ListaOrcamentosComponent implements OnInit {
  campoPesquisa: string = 'nomeCliente';
  nomePesquisa?: string;
  listaOrcamentos: Orcamento[] = [];
  orcamentoSelecionado?: Orcamento;
  mesAnoSelecionado: string = '';

  constructor(
    private orcamentoService: OrcamentoService,
    private router: Router,
    private transacaoService: TransacaoService,
    private alertaService: AlertaService,
    private categoriaService: CategoriaService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    // Inicializa com o mês atual no formato YYYY-MM
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    this.mesAnoSelecionado = `${ano}-${mes}`;

    if (this.orcamentoService.getOrcamentosSnapshot().length === 0) {
      await this.orcamentoService.carregarOrcamentos();
    }

    this.orcamentoService.orcamentoSelecionado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (orcamento) => (this.orcamentoSelecionado = orcamento ?? undefined),
      );
    this.orcamentoService.orcamento$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((dados) => {
        this.listaOrcamentos = dados;
      });
  }

  // Getter que filtra os orçamentos com base no mês e ano selecionado
  get orcamentosFiltrados(): Orcamento[] {
    if (!this.mesAnoSelecionado) {
      return this.listaOrcamentos;
    }

    return this.listaOrcamentos.filter((orcamento) => {
      if (!orcamento.created_at) return false;

      const data = new Date(orcamento.created_at);
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const mesAnoOrcamento = `${ano}-${mes}`;

      return mesAnoOrcamento === this.mesAnoSelecionado;
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
            `O orçamento para ${orcamento.cliente?.nome} foi reenviado com sucesso.`,
          );
          return true;
        }
        return false;
      },
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
          if (orcamento.status != 'Aguardando Pagamento') {
            if (!this.validarOrcamento(orcamento, 'f')) return false;
          }

          if (
            orcamento.formaPagamento == 'Boleto' &&
            orcamento.status !== 'Aguardando Pagamento'
          ) {
            orcamento.status = 'Aguardando Pagamento';
          } else {
            orcamento.status = 'Finalizado';
          }

          orcamento.updated_at = new Date();

          const sucesso = await this.orcamentoService.atualizar(orcamento);

          if (!sucesso) {
            this.alertaService.erro(
              'Erro ao Finalizar Orçamento',
              'Ocorreu um erro ao finalizar o orçamento. Tente novamente.',
            );
            return false;
          }

          this.alertaService.sucesso(
            'Sucesso',
            'Orçamento finalizado e lançado no financeiro!',
          );
          this.fecharModal();
          return true;
        }
        return false;
      },
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
              'Ocorreu um erro ao cancelar o orçamento. Tente novamente.',
            );
            return false;
          }
          this.fecharModal();
          return true;
        }
        return false;
      },
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
        if (resposta) {
          this.orcamentoService.duplicarOrcamento(orcamento);
          this.orcamentoSelecionado = undefined;
          this.router.navigate(['/orcamento']);
        }
      },
    );
  }

  validarOrcamento(orcamento: Orcamento, tipo: string = 'c'): boolean {
    if (orcamento.formaPagamento === 'Boleto' && !orcamento.dt_boleto) {
      this.alertaService.info(
        'Data do Boleto Não Informada',
        'Você precisa informar a data do boleto antes de finalizar o orçamento.',
      );
      return false;
    }
    if (
      orcamento.dt_boleto &&
      new Date(orcamento.dt_boleto).getDate() < new Date().getDate()
    ) {
      this.alertaService.info(
        'Boleto com Data no Passado',
        'O boleto deste orçamento está com data no passado.',
      );
      return false;
    }
    if (orcamento.status === 'Finalizado') {
      this.alertaService.info(
        'Orçamento Finalizado',
        'Este orçamento já foi finalizado.',
      );
      return false;
    }
    if (orcamento.status === 'Cancelado') {
      this.alertaService.info(
        'Orçamento Cancelado',
        'Este orçamento já foi cancelado.',
      );
      return false;
    }
    if (tipo != 'c' && !orcamento.formaPagamento) {
      this.alertaService.info(
        'Forma de Pagamento Não Selecionada',
        'Você precisa selecionar a forma de pagamento antes de finalizar o orçamento.',
      );
      return false;
    }
    return true;
  }

  verificarVencido(orcamento: any): boolean {
    if (orcamento.status === 'Aguardando Pagamento' && orcamento.dt_boleto) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataVencimento = new Date(orcamento.dt_boleto + 'T00:00:00');
      dataVencimento.setHours(0, 0, 0, 0);

      return dataVencimento < hoje;
    }

    return false;
  }

  get calculoGanchos() {
    let total = 0;
    this.orcamentoSelecionado?.produtos?.forEach((prod) => {
      let totalProdQtd = 0;
      if (prod.quantidade > 1) {
        totalProdQtd = prod.qtd_gancho! * prod.quantidade;
        total += totalProdQtd;
      } else {
        total += prod.qtd_gancho!;
      }
    });

    return total;
  }
}
