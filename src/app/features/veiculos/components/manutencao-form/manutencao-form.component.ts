import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertaService } from '@app/core/services/alerta.service';
import { TipoServico, Veiculo } from '@app/shared/models/veiculo';
import { VeiculosService } from '../../services/veiculos.service';

interface ServicoSelecionado {
  id: number;
  nome: string;
  valor: number;
}

@Component({
  selector: 'app-manutencao-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './manutencao-form.component.html',
  styleUrl: './manutencao-form.component.css',
})
export class ManutencaoFormComponent implements OnInit, OnChanges {
  @Input() veiculo: Veiculo | null = null;
  @Input() aberto = false;
  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly veiculosService = inject(VeiculosService);
  private readonly alertaService = inject(AlertaService);

  readonly tipos = this.veiculosService.tiposServico;
  readonly selecionados = signal<ServicoSelecionado[]>([]);
  readonly salvando = signal(false);
  readonly valorServicoTemp = signal<number>(0);

  readonly totalServicos = computed(() =>
    this.selecionados().reduce((s, i) => s + (i.valor || 0), 0),
  );

  readonly form = this.fb.nonNullable.group({
    data: [this.hojeLocal(), Validators.required],
    odometro: [0, [Validators.required, Validators.min(0)]],
    oficina: [''],
    observacoes: [''],
  });

  async ngOnInit(): Promise<void> {
    if (!this.tipos().length) {
      await this.veiculosService.carregarTiposServico();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['aberto'] || changes['veiculo']) && this.aberto) {
      this.resetar();
    }
  }

  resetar(): void {
    this.selecionados.set([]);
    this.valorServicoTemp.set(0);
    this.form.reset({
      data: this.hojeLocal(),
      odometro: Number(this.veiculo?.odometro_base || 0),
      oficina: '',
      observacoes: '',
    });
  }

  estaSelecionado(tipo: TipoServico): boolean {
    return this.selecionados().some((s) => s.id === tipo.id);
  }

  toggleServico(tipo: TipoServico): void {
    if (this.estaSelecionado(tipo)) {
      this.selecionados.update((lista) =>
        lista.filter((s) => s.id !== tipo.id),
      );
      return;
    }

    const valor = Number(this.valorServicoTemp()) || 0;
    this.selecionados.update((lista) => [
      ...lista,
      { id: tipo.id, nome: tipo.nome, valor },
    ]);
  }

  atualizarValorServico(id: number, valor: number): void {
    this.selecionados.update((lista) =>
      lista.map((s) => (s.id === id ? { ...s, valor: Number(valor) || 0 } : s)),
    );
  }

  async salvar(): Promise<void> {
    if (!this.veiculo) {
      this.alertaService.info('Veículo', 'Selecione um veículo primeiro.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertaService.info('Obrigatório', 'Preencha data e odômetro.');
      return;
    }
    if (!this.selecionados().length) {
      this.alertaService.info(
        'Serviços',
        'Selecione ao menos um tipo de serviço.',
      );
      return;
    }

    const total = this.totalServicos();
    if (total <= 0) {
      this.alertaService.info(
        'Valor',
        'Informe o valor de pelo menos um serviço.',
      );
      return;
    }

    const raw = this.form.getRawValue();
    const odometro = Number(raw.odometro);
    const odometroBase = Number(this.veiculo.odometro_base || 0);

    if (odometro < odometroBase) {
      this.alertaService.info(
        'Odômetro',
        `O odômetro não pode ser menor que o atual (${odometroBase.toLocaleString('pt-BR')} km).`,
      );
      return;
    }

    this.salvando.set(true);
    try {
      const criada = await this.veiculosService.criarManutencao({
        id_veiculo: this.veiculo.id,
        data: raw.data,
        odometro,
        valor_total: total,
        oficina: raw.oficina?.trim() || null,
        observacoes: raw.observacoes?.trim() || null,
        servicos: this.selecionados().map((s) => ({
          id_tipo_servico: s.id,
          valor_servico: s.valor,
        })),
      });

      if (!criada) {
        this.alertaService.erro('Erro', 'Não foi possível salvar a manutenção.');
        return;
      }

      if (odometro > odometroBase) {
        await this.veiculosService.atualizarVeiculo(this.veiculo.id, {
          odometro_base: odometro,
        });
      }

      this.alertaService.sucesso('Pronto', 'Manutenção registrada!');
      this.salvo.emit();
    } finally {
      this.salvando.set(false);
    }
  }

  cancelar(): void {
    this.cancelado.emit();
  }

  private hojeLocal(): string {
    const hoje = new Date();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    return `${hoje.getFullYear()}-${m}-${d}`;
  }
}
