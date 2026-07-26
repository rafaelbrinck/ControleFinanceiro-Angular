import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertaService } from '@app/core/services/alerta.service';
import {
  EventoTimeline,
  TipoVeiculo,
} from '@app/shared/models/veiculo';
import { AbastecimentoFormComponent } from '../../components/abastecimento-form/abastecimento-form.component';
import { ManutencaoFormComponent } from '../../components/manutencao-form/manutencao-form.component';
import {
  MesAnoSelecionado,
  RelatorioVeiculoComponent,
} from '../../components/relatorio/relatorio.component';
import { TimelineComponent } from '../../components/timeline/timeline.component';
import { VeiculosService } from '../../services/veiculos.service';

type PainelGasto = 'menu' | 'abastecimento' | 'manutencao';

@Component({
  selector: 'app-veiculos-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    TimelineComponent,
    AbastecimentoFormComponent,
    ManutencaoFormComponent,
    RelatorioVeiculoComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class VeiculosDashboardComponent implements OnInit {
  private readonly veiculosService = inject(VeiculosService);
  private readonly alertaService = inject(AlertaService);
  private readonly fb = inject(FormBuilder);

  /** Consome signals do serviço — UI reativa sem cópia local. */
  readonly veiculos = this.veiculosService.veiculos;
  readonly veiculoAtivo = this.veiculosService.veiculoAtivo;
  readonly timeline = this.veiculosService.timeline;
  readonly timelineTemMais = this.veiculosService.timelineTemMais;
  readonly resumo = this.veiculosService.resumoMes;
  readonly relatorio = this.veiculosService.relatorio;
  readonly carregando = this.veiculosService.carregando;
  readonly carregandoRelatorio = this.veiculosService.carregandoRelatorio;
  readonly carregandoMaisTimeline =
    this.veiculosService.carregandoMaisTimeline;

  readonly mes = signal(new Date().getMonth() + 1);
  readonly ano = signal(new Date().getFullYear());
  readonly painelAberto = signal(false);
  readonly painelModo = signal<PainelGasto>('menu');
  readonly modalVeiculoAberto = signal(false);
  readonly salvandoVeiculo = signal(false);

  readonly labelMes = computed(() => {
    const nomes = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
    ];
    return `${nomes[this.mes() - 1]}/${this.ano()}`;
  });

  readonly formVeiculo = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipo: ['carro' as TipoVeiculo, Validators.required],
    marca: [''],
    modelo: [''],
    placa: [''],
    ano: [new Date().getFullYear()],
    odometro_base: [0],
  });

  async ngOnInit(): Promise<void> {
    // Cache: só bate no Supabase se ainda não houver dados em memória
    await Promise.all([
      this.veiculosService.carregarVeiculos(),
      this.veiculosService.carregarTiposServico(),
    ]);

    if (this.veiculoAtivo()) {
      await this.recarregarHistorico();
    }
  }

  async onTrocarVeiculo(id: string): Promise<void> {
    const num = Number(id);
    this.veiculosService.selecionarVeiculo(Number.isNaN(num) ? null : num);
    await this.recarregarHistorico(true);
  }

  async mesAnterior(): Promise<void> {
    if (this.mes() === 1) {
      this.mes.set(12);
      this.ano.update((a) => a - 1);
    } else {
      this.mes.update((m) => m - 1);
    }
    await this.recarregarHistorico(true);
  }

  async mesSeguinte(): Promise<void> {
    if (this.mes() === 12) {
      this.mes.set(1);
      this.ano.update((a) => a + 1);
    } else {
      this.mes.update((m) => m + 1);
    }
    await this.recarregarHistorico(true);
  }

  async recarregarHistorico(forceRefresh = false): Promise<void> {
    const veiculo = this.veiculoAtivo();
    if (!veiculo) return;
    await Promise.all([
      this.veiculosService.carregarTimelineEResumo(
        veiculo.id,
        this.mes(),
        this.ano(),
        forceRefresh,
      ),
      this.veiculosService.carregarRelatorio(
        veiculo.id,
        this.mes(),
        this.ano(),
        forceRefresh,
      ),
    ]);
  }

  carregarMaisTimeline(): void {
    this.veiculosService.carregarMaisTimeline();
  }

  async onTrocarMesAnoRelatorio(selecao: MesAnoSelecionado): Promise<void> {
    this.mes.set(selecao.mes);
    this.ano.set(selecao.ano);
    await this.recarregarHistorico(true);
  }

  abrirFab(): void {
    if (!this.veiculoAtivo()) {
      this.alertaService.info(
        'Veículo',
        'Cadastre ou selecione um veículo para registrar gastos.',
      );
      this.abrirModalVeiculo();
      return;
    }
    this.painelModo.set('menu');
    this.painelAberto.set(true);
  }

  fecharPainel(): void {
    this.painelAberto.set(false);
    this.painelModo.set('menu');
  }

  escolherAbastecimento(): void {
    this.painelModo.set('abastecimento');
  }

  escolherManutencao(): void {
    this.painelModo.set('manutencao');
  }

  /**
   * Após UI otimista: fecha o painel sem reconsultar o banco.
   * Relatório é invalidado no service e recarregado em background se necessário.
   */
  async aoSalvarGasto(): Promise<void> {
    this.fecharPainel();
    const veiculo = this.veiculoAtivo();
    if (!veiculo) return;
    // Só refresca relatório (cache invalidado); timeline/resumo já estão locais
    void this.veiculosService.carregarRelatorio(
      veiculo.id,
      this.mes(),
      this.ano(),
      true,
    );
  }

  abrirModalVeiculo(): void {
    this.formVeiculo.reset({
      nome: '',
      tipo: 'carro',
      marca: '',
      modelo: '',
      placa: '',
      ano: new Date().getFullYear(),
      odometro_base: 0,
    });
    this.modalVeiculoAberto.set(true);
  }

  fecharModalVeiculo(): void {
    this.modalVeiculoAberto.set(false);
  }

  async salvarVeiculo(): Promise<void> {
    if (this.formVeiculo.invalid) {
      this.formVeiculo.markAllAsTouched();
      this.alertaService.info('Obrigatório', 'Informe ao menos o nome do veículo.');
      return;
    }

    const raw = this.formVeiculo.getRawValue();
    this.salvandoVeiculo.set(true);
    try {
      const criado = await this.veiculosService.criarVeiculo({
        nome: raw.nome.trim(),
        tipo: raw.tipo,
        marca: raw.marca?.trim() || null,
        modelo: raw.modelo?.trim() || null,
        placa: raw.placa?.trim().toUpperCase() || null,
        ano: Number(raw.ano) || null,
        odometro_base: Number(raw.odometro_base) || 0,
      });

      if (!criado) {
        this.alertaService.erro('Erro', 'Não foi possível cadastrar o veículo.');
        return;
      }

      this.alertaService.sucesso('Pronto', 'Veículo cadastrado!');
      this.fecharModalVeiculo();
      await this.recarregarHistorico(true);
    } finally {
      this.salvandoVeiculo.set(false);
    }
  }

  confirmarExclusaoEvento(evento: EventoTimeline): void {
    const dataFmt = this.formatarDiaMes(evento.data);
    this.alertaService.confirmar(
      'Excluir registro',
      `Deseja excluir "${evento.titulo}" de ${dataFmt}?`,
      async (ok) => {
        if (!ok) return;
        // Optimistic delete + sync no service; sem reload completo
        const sucesso =
          evento.tipo === 'abastecimento'
            ? await this.veiculosService.deletarAbastecimento(evento.refId)
            : await this.veiculosService.deletarManutencao(evento.refId);

        if (!sucesso) {
          this.alertaService.erro('Erro', 'Não foi possível excluir.');
          return;
        }
        this.alertaService.sucesso('Excluído', 'Registro removido.');
        const veiculo = this.veiculoAtivo();
        if (veiculo) {
          void this.veiculosService.carregarRelatorio(
            veiculo.id,
            this.mes(),
            this.ano(),
            true,
          );
        }
      },
    );
  }

  private formatarDiaMes(data: string): string {
    const v = String(data || '').slice(0, 10);
    if (v.length < 10) return data;
    return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}`;
  }
}
