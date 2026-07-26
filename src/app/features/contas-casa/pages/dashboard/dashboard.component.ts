import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertaService } from '@app/core/services/alerta.service';
import { ContaDetalhada } from '@app/shared/models/conta';
import { FormContaComponent } from '../../components/form-conta/form-conta.component';
import { BillsService } from '../../services/bills.service';
import { FamilyService } from '../../services/family.service';

@Component({
  selector: 'app-contas-casa-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    FormContaComponent,
    RouterLink,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class ContasCasaDashboardComponent implements OnInit {
  private readonly familyService = inject(FamilyService);
  private readonly billsService = inject(BillsService);
  private readonly alertaService = inject(AlertaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

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

  readonly mes = signal(new Date().getMonth() + 1);
  readonly ano = signal(new Date().getFullYear());
  readonly contas = signal<ContaDetalhada[]>([]);
  readonly modalAberto = signal(false);
  readonly contaEditando = signal<ContaDetalhada | null>(null);
  readonly sugerirImportacao = signal(false);
  readonly importando = signal(false);
  readonly nomeFamiliaNova = signal('');
  readonly criandoFamilia = signal(false);

  readonly familia = this.familyService.familiaAtual;
  readonly membros = this.familyService.membros;
  readonly categorias = this.familyService.categorias;
  readonly ehAdmin = this.familyService.ehAdmin;
  readonly carregandoFamilia = this.familyService.carregando;
  readonly carregandoContas = this.billsService.carregando;

  readonly labelMesAno = computed(
    () => `${this.meses[this.mes() - 1]} ${this.ano()}`,
  );

  readonly totalGasto = computed(() =>
    this.contas().reduce((acc, c) => acc + (c.valor || 0), 0),
  );

  readonly totalPago = computed(() =>
    this.contas()
      .filter((c) => c.pago)
      .reduce((acc, c) => acc + (c.valor || 0), 0),
  );

  readonly totalPendente = computed(
    () => this.totalGasto() - this.totalPago(),
  );

  readonly valorRateado = computed(() => {
    const qtd = this.membros().length;
    if (!qtd) return 0;
    return this.totalGasto() / qtd;
  });

  readonly contasVencidas = computed(() =>
    this.contas().filter((c) => this.estaVencida(c)),
  );

  readonly totalVencido = computed(() =>
    this.contasVencidas().reduce((acc, c) => acc + (c.valor || 0), 0),
  );

  async ngOnInit(): Promise<void> {
    this.billsService.contas$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contas) => this.contas.set(contas));

    await this.familyService.carregarFamiliaDoUsuario();

    if (this.familia()) {
      await this.carregarMes();
    }
  }

  async mesAnterior(): Promise<void> {
    if (this.mes() === 1) {
      this.mes.set(12);
      this.ano.update((a) => a - 1);
    } else {
      this.mes.update((m) => m - 1);
    }
    await this.carregarMes();
  }

  async mesSeguinte(): Promise<void> {
    if (this.mes() === 12) {
      this.mes.set(1);
      this.ano.update((a) => a + 1);
    } else {
      this.mes.update((m) => m + 1);
    }
    await this.carregarMes();
  }

  async carregarMes(): Promise<void> {
    const familia = this.familia();
    if (!familia) return;

    this.sugerirImportacao.set(false);
    const contas = await this.billsService.buscarPorMes(
      familia.id,
      this.mes(),
      this.ano(),
    );

    if (contas.length === 0) {
      await this.verificarContasFixas();
    }
  }

  async verificarContasFixas(): Promise<void> {
    const familia = this.familia();
    if (!familia) return;

    const fixas = await this.billsService.buscarContasFixasMesAnterior(
      familia.id,
      this.mes(),
      this.ano(),
    );

    this.sugerirImportacao.set(fixas.length > 0);
  }

  confirmarImportacao(): void {
    this.alertaService.confirmar(
      'Importar contas fixas',
      'Deseja importar as contas fixas do mês passado?',
      async (confirmado) => {
        if (confirmado) {
          await this.importarContasFixas();
        }
      },
    );
  }

  async importarContasFixas(): Promise<void> {
    const familia = this.familia();
    if (!familia) return;

    this.importando.set(true);
    try {
      const fixas = await this.billsService.buscarContasFixasMesAnterior(
        familia.id,
        this.mes(),
        this.ano(),
      );

      const importadas = await this.billsService.importarContasFixas(
        fixas,
        this.mes(),
        this.ano(),
      );

      if (!importadas.length) {
        this.alertaService.erro(
          'Erro',
          'Não foi possível importar as contas fixas.',
        );
        return;
      }

      this.alertaService.sucesso(
        'Sucesso',
        `${importadas.length} conta(s) fixa(s) importada(s).`,
      );
      this.sugerirImportacao.set(false);
      // Importação já mesclou no cache local
    } finally {
      this.importando.set(false);
    }
  }

  abrirNovaConta(): void {
    if (!this.categorias().length) {
      if (this.ehAdmin()) {
        this.alertaService.confirmar(
          'Categorias',
          'Cadastre ao menos uma categoria antes de criar contas. Deseja ir para categorias agora?',
          (ok) => {
            if (ok) this.router.navigate(['/contas-casa/categorias']);
          },
        );
      } else {
        this.alertaService.info(
          'Categorias',
          'Peça ao administrador da família para cadastrar categorias.',
        );
      }
      return;
    }
    this.contaEditando.set(null);
    this.modalAberto.set(true);
  }

  abrirEdicao(conta: ContaDetalhada): void {
    this.contaEditando.set(conta);
    this.modalAberto.set(true);
  }

  fecharModal(): void {
    this.modalAberto.set(false);
    this.contaEditando.set(null);
  }

  async aoSalvarConta(): Promise<void> {
    // Lista já foi atualizada otimisticamente no BillsService
  }

  async alternarPago(conta: ContaDetalhada): Promise<void> {
    // Ao marcar como paga (principalmente se vencida), pede confirmação.
    if (!conta.pago) {
      this.confirmarPagamento(conta);
      return;
    }

    const ok = await this.billsService.alternarPago(conta.id, false);
    if (!ok) {
      this.alertaService.erro('Erro', 'Não foi possível atualizar o status.');
    }
  }

  confirmarPagamento(conta: ContaDetalhada): void {
    if (conta.pago) return;

    const vencida = this.estaVencida(conta);
    const titulo = vencida ? 'Confirmar pagamento (vencida)' : 'Confirmar pagamento';
    const mensagem = vencida
      ? `"${conta.descricao}" está vencida desde ${this.formatarDiaMes(conta.data_vencimento)}. Confirma que o pagamento foi efetuado?`
      : `Confirma que o pagamento de "${conta.descricao}" (${this.formatarMoeda(conta.valor)}) foi efetuado?`;

    this.alertaService.confirmar(titulo, mensagem, async (confirmado) => {
      if (!confirmado) return;

      const ok = await this.billsService.alternarPago(conta.id, true);
      if (!ok) {
        this.alertaService.erro('Erro', 'Não foi possível confirmar o pagamento.');
        return;
      }

      this.alertaService.sucesso('Pago!', `"${conta.descricao}" marcada como paga.`);
    });
  }

  /**
   * Conta não paga com vencimento anterior à data de hoje (local).
   * Comparação em yyyy-MM-dd evita problemas de timezone.
   */
  estaVencida(conta: ContaDetalhada): boolean {
    if (conta.pago) return false;
    const vencimento = String(conta.data_vencimento || '').slice(0, 10);
    if (vencimento.length < 10) return false;
    return vencimento < this.dataHojeLocal();
  }

  private dataHojeLocal(): string {
    const hoje = new Date();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    return `${hoje.getFullYear()}-${m}-${d}`;
  }

  private formatarMoeda(valor: number): string {
    return (valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  confirmarExclusao(conta: ContaDetalhada): void {
    this.alertaService.confirmar(
      'Excluir conta',
      `Deseja excluir "${conta.descricao}"?`,
      async (confirmado) => {
        if (!confirmado) return;
        const ok = await this.billsService.deletar(conta.id);
        if (!ok) {
          this.alertaService.erro('Erro', 'Não foi possível excluir a conta.');
          return;
        }
        this.alertaService.sucesso('Sucesso', 'Conta excluída.');
      },
    );
  }

  async criarFamilia(): Promise<void> {
    const nome = this.nomeFamiliaNova().trim();
    if (!nome) {
      this.alertaService.info('Obrigatório', 'Informe o nome da família.');
      return;
    }

    this.criandoFamilia.set(true);
    try {
      const familia = await this.familyService.criarFamilia(nome);
      if (!familia) {
        this.alertaService.erro('Erro', 'Não foi possível criar a família.');
        return;
      }
      this.alertaService.sucesso('Sucesso', 'Família criada com sucesso!');
      this.nomeFamiliaNova.set('');
      await this.carregarMes();
    } finally {
      this.criandoFamilia.set(false);
    }
  }

  /** Evita shift de timezone do DatePipe em strings yyyy-MM-dd. */
  formatarDiaMes(data: string): string {
    const valor = String(data || '').slice(0, 10);
    if (valor.length < 10) return '—';
    return `${valor.slice(8, 10)}/${valor.slice(5, 7)}`;
  }
}
