import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertaService } from '@app/core/services/alerta.service';
import { Veiculo } from '@app/shared/models/veiculo';
import { VeiculosService } from '../../services/veiculos.service';

@Component({
  selector: 'app-abastecimento-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './abastecimento-form.component.html',
  styleUrl: './abastecimento-form.component.css',
})
export class AbastecimentoFormComponent implements OnInit, OnChanges {
  @Input() veiculo: Veiculo | null = null;
  @Input() aberto = false;
  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly veiculosService = inject(VeiculosService);
  private readonly alertaService = inject(AlertaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly salvando = signal(false);
  readonly usandoPrecoAnterior = signal(false);
  private calculando = false;

  readonly form = this.fb.nonNullable.group({
    data: [this.hojeLocal(), Validators.required],
    odometro: [0, [Validators.required, Validators.min(0)]],
    valor_litro: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    valor_total: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],
    litros: [{ value: 0, disabled: true }],
    completou_tanque: [true],
    posto_combustivel: [''],
  });

  ngOnInit(): void {
    this.form.controls.valor_total.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcularLitros());
    this.form.controls.valor_litro.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.usandoPrecoAnterior.set(false);
        this.recalcularLitros();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['aberto'] || changes['veiculo']) && this.aberto) {
      void this.resetar();
    }
  }

  async resetar(): Promise<void> {
    const odometro =
      this.veiculo?.odometro_base != null
        ? Number(this.veiculo.odometro_base)
        : 0;

    let valorLitroAnterior: number | null = null;
    if (this.veiculo?.id) {
      valorLitroAnterior = await this.veiculosService.buscarUltimoValorLitro(
        this.veiculo.id,
      );
    }

    this.usandoPrecoAnterior.set(valorLitroAnterior != null && valorLitroAnterior > 0);

    this.form.reset({
      data: this.hojeLocal(),
      odometro,
      valor_litro: valorLitroAnterior,
      valor_total: null,
      litros: 0,
      completou_tanque: true,
      posto_combustivel: '',
    });
  }

  async salvar(): Promise<void> {
    if (!this.veiculo) {
      this.alertaService.info('Veículo', 'Selecione um veículo primeiro.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertaService.info('Obrigatório', 'Preencha os campos principais.');
      return;
    }

    const raw = this.form.getRawValue();
    const odometro = Number(raw.odometro);
    const odometroBase = Number(this.veiculo.odometro_base || 0);
    const litros = Number(raw.litros) || this.calcularLitros();

    if (litros <= 0) {
      this.alertaService.info(
        'Litros',
        'Informe valor total e R$/litro para calcular os litros.',
      );
      return;
    }

    if (odometro < odometroBase) {
      this.alertaService.info(
        'Odômetro',
        `O odômetro não pode ser menor que o atual (${odometroBase.toLocaleString('pt-BR')} km).`,
      );
      return;
    }

    this.salvando.set(true);
    try {
      const criado = await this.veiculosService.criarAbastecimento({
        id_veiculo: this.veiculo.id,
        data: raw.data,
        odometro,
        valor_total: Number(raw.valor_total),
        litros,
        valor_litro: Number(raw.valor_litro),
        completou_tanque: !!raw.completou_tanque,
        posto_combustivel: raw.posto_combustivel?.trim() || null,
      });

      if (!criado) {
        this.alertaService.erro(
          'Erro',
          'Não foi possível salvar o abastecimento.',
        );
        return;
      }

      if (odometro > odometroBase) {
        await this.veiculosService.atualizarVeiculo(this.veiculo.id, {
          odometro_base: odometro,
        });
      }

      this.alertaService.sucesso('Pronto', 'Abastecimento registrado!');
      this.salvo.emit();
    } finally {
      this.salvando.set(false);
    }
  }

  cancelar(): void {
    this.cancelado.emit();
  }

  private recalcularLitros(): void {
    if (this.calculando) return;
    this.calculando = true;
    const litros = this.calcularLitros();
    this.form.controls.litros.setValue(Number(litros.toFixed(3)), {
      emitEvent: false,
    });
    this.calculando = false;
  }

  private calcularLitros(): number {
    const total = Number(this.form.controls.valor_total.value) || 0;
    const valorLitro = Number(this.form.controls.valor_litro.value) || 0;
    if (valorLitro <= 0) return 0;
    return total / valorLitro;
  }

  private hojeLocal(): string {
    const hoje = new Date();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    return `${hoje.getFullYear()}-${m}-${d}`;
  }
}
