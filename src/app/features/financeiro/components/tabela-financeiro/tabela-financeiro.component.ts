import { Component, DestroyRef, OnInit } from '@angular/core';
import { Transacao } from '@app/shared/models/transacao';
import { TransacaoService } from '@app/core/services/transacao.service';
import { CommonModule } from '@angular/common';
import { MoedaPipe } from '@app/shared/pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlertaService } from '@app/core/services/alerta.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type FiltroTipoExtrato = 'Todos' | 'Entrada' | 'Saida';

export interface GrupoTransacoesDia {
  data: string; // yyyy-MM-dd
  label: string;
  transacoes: Transacao[];
}

@Component({
  selector: 'app-tabela-financeiro',
  standalone: true,
  imports: [CommonModule, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './tabela-financeiro.component.html',
  styleUrl: './tabela-financeiro.component.css',
})
export class TabelaFinanceiroComponent implements OnInit {
  nomePesquisa = '';
  lista: Transacao[] = [];

  mesSelecionado: number;
  anoSelecionado: number;
  filtroTipo: FiltroTipoExtrato = 'Todos';

  totalEntradas = 0;
  totalSaidas = 0;
  saldoLiquido = 0;

  private readonly meses = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  constructor(
    private transacaoService: TransacaoService,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {
    const hoje = new Date();
    this.mesSelecionado = hoje.getMonth();
    this.anoSelecionado = hoje.getFullYear();
  }

  async ngOnInit(): Promise<void> {
    if (this.transacaoService.getTransacoesSnapshot().length === 0) {
      await this.transacaoService.carregarTransacoes();
    }
    this.transacaoService.transacoes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((transacoes) => {
        this.lista = transacoes;
        this.calcularDashboard();
      });
  }

  get labelMesAno(): string {
    return `${this.meses[this.mesSelecionado]} ${this.anoSelecionado}`;
  }

  get transacoesAgrupadas(): GrupoTransacoesDia[] {
    const termo = this.nomePesquisa.trim().toLowerCase();

    const filtradas = this.lista.filter((t) => {
      if (!this.pertenceAoMes(t.data)) return false;
      if (this.filtroTipo !== 'Todos' && t.tipo !== this.filtroTipo) return false;

      if (!termo) return true;

      const campos = [t.nome, t.tipo, t.cat, t.cartao_nome, t.fornecedor_nome]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return campos.includes(termo);
    });

    const grupos = new Map<string, Transacao[]>();

    for (const t of filtradas) {
      const chave = this.toISODate(t.data);
      if (!chave) continue;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(t);
    }

    return Array.from(grupos.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([data, transacoes]) => ({
        data,
        label: this.formatarLabelDia(data),
        transacoes: transacoes.sort(
          (a, b) =>
            new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime(),
        ),
      }));
  }

  mesAnterior(): void {
    if (this.mesSelecionado === 0) {
      this.mesSelecionado = 11;
      this.anoSelecionado -= 1;
    } else {
      this.mesSelecionado -= 1;
    }
    this.calcularDashboard();
  }

  mesSeguinte(): void {
    if (this.mesSelecionado === 11) {
      this.mesSelecionado = 0;
      this.anoSelecionado += 1;
    } else {
      this.mesSelecionado += 1;
    }
    this.calcularDashboard();
  }

  setFiltroTipo(tipo: FiltroTipoExtrato): void {
    this.filtroTipo = tipo;
  }

  calcularDashboard(): void {
    const doMes = this.lista.filter((t) => this.pertenceAoMes(t.data));

    this.totalEntradas = doMes
      .filter((t) => t.tipo === 'Entrada')
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    this.totalSaidas = doMes
      .filter((t) => t.tipo === 'Saida')
      .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

    this.saldoLiquido = this.totalEntradas - this.totalSaidas;
  }

  async deletar(id?: number): Promise<void> {
    if (!id) return;

    this.alertaService.confirmar(
      'Confirmação',
      'Deseja excluir esta transação?',
      async (resultado) => {
        if (!resultado) return;
        await this.transacaoService.deletar(id);
        this.alertaService.sucesso(
          'Sucesso',
          'Transação removida com sucesso!',
        );
      },
    );
  }

  private pertenceAoMes(data?: Date | string): boolean {
    if (!data) return false;
    const d = new Date(data);
    return (
      d.getMonth() === this.mesSelecionado &&
      d.getFullYear() === this.anoSelecionado
    );
  }

  private toISODate(data?: Date | string): string | null {
    if (!data) return null;
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatarLabelDia(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    const data = new Date(y, m - 1, d);
    return data.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
    });
  }
}
