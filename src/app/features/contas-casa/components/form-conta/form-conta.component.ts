import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertaService } from '@app/core/services/alerta.service';
import { ContaCreate, ContaDetalhada } from '@app/shared/models/conta';
import {
  CategoriaFamilia,
  MembroFamiliaDetalhado,
} from '@app/shared/models/familia';
import { BillsService } from '../../services/bills.service';
import { FamilyService } from '../../services/family.service';

@Component({
  selector: 'app-form-conta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-conta.component.html',
  styleUrl: './form-conta.component.css',
})
export class FormContaComponent implements OnChanges {
  private readonly billsService = inject(BillsService);
  private readonly familyService = inject(FamilyService);
  private readonly alertaService = inject(AlertaService);

  @Input() aberto = false;
  @Input() conta: ContaDetalhada | null = null;
  @Input() idFamilia!: number;
  @Input() categorias: CategoriaFamilia[] = [];
  /** Mês/ano vigentes no dashboard (1–12) — usados como default de vencimento. */
  @Input() mes = new Date().getMonth() + 1;
  @Input() ano = new Date().getFullYear();

  @Output() fechado = new EventEmitter<void>();
  @Output() salvo = new EventEmitter<void>();

  descricao = '';
  valorFormatado = '';
  valor = 0;
  dataVencimento = '';
  idCategoria: number | null = null;
  pago = false;
  pagoPor: number | null = null;
  isFixa = false;
  salvando = signal(false);

  readonly membros = this.familyService.membros;

  get editando(): boolean {
    return !!this.conta?.id;
  }

  get titulo(): string {
    return this.editando ? 'Editar Conta' : 'Nova Conta';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['aberto'] || changes['conta'] || changes['categorias']) &&
      this.aberto
    ) {
      this.preencherFormulario();
    }
  }

  preencherFormulario(): void {
    if (this.conta) {
      this.descricao = this.conta.descricao ?? '';
      this.valor = Number(this.conta.valor) || 0;
      this.valorFormatado = this.valor > 0 ? this.formatarMoeda(this.valor) : '';
      this.dataVencimento = String(this.conta.data_vencimento).slice(0, 10);
      this.idCategoria = Number(this.conta.id_categoria) || null;
      this.pago = !!this.conta.pago;
      this.pagoPor =
        this.conta.pago_por != null ? Number(this.conta.pago_por) : null;
      this.isFixa = !!this.conta.is_fixa;
      return;
    }

    this.descricao = '';
    this.valor = 0;
    this.valorFormatado = '';
    this.dataVencimento = this.dataPadraoMes();
    this.idCategoria = this.categorias[0]
      ? Number(this.categorias[0].id)
      : null;
    this.pago = false;
    this.pagoPor = null;
    this.isFixa = false;
  }

  aoAlterarPago(): void {
    if (!this.pago) {
      this.pagoPor = null;
    }
  }

  nomeMembro(membro: MembroFamiliaDetalhado): string {
    return (
      membro.usuario?.nome ||
      membro.usuario?.username ||
      'Usuário sem nome'
    );
  }

  fechar(): void {
    this.fechado.emit();
  }

  mascaraValor(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numeros = input.value.replace(/\D/g, '');
    if (!numeros) {
      this.valor = 0;
      this.valorFormatado = '';
      return;
    }
    this.valor = parseFloat(numeros) / 100;
    this.valorFormatado = this.formatarMoeda(this.valor);
  }

  async salvar(): Promise<void> {
    if (!this.validar()) return;
    if (!this.idFamilia) {
      this.alertaService.erro('Erro', 'Família inválida para salvar a conta.');
      return;
    }

    this.salvando.set(true);

    try {
      const pagoPor = this.pago ? this.pagoPor : null;

      if (this.editando && this.conta?.id) {
        const ok = await this.billsService.atualizar(this.conta.id, {
          descricao: this.descricao.trim(),
          valor: this.valor,
          data_vencimento: this.dataVencimento,
          id_categoria: Number(this.idCategoria),
          pago: this.pago,
          pago_por: pagoPor,
          is_fixa: this.isFixa,
        });

        if (!ok) {
          this.alertaService.erro('Erro', 'Não foi possível atualizar a conta.');
          return;
        }

        this.alertaService.sucesso('Sucesso', 'Conta atualizada com sucesso!');
      } else {
        const membro = await this.familyService.obterMembroLogado();
        if (!membro) {
          this.alertaService.erro(
            'Erro',
            'Não foi possível identificar seu vínculo na família.',
          );
          return;
        }

        const payload: ContaCreate = {
          id_familia: this.idFamilia,
          id_criador: membro.id,
          descricao: this.descricao.trim(),
          valor: this.valor,
          data_vencimento: this.dataVencimento,
          id_categoria: Number(this.idCategoria),
          pago: this.pago,
          pago_por: pagoPor,
          is_fixa: this.isFixa,
        };

        const criada = await this.billsService.criar(payload);
        if (!criada) {
          this.alertaService.erro('Erro', 'Não foi possível criar a conta.');
          return;
        }

        this.alertaService.sucesso('Sucesso', 'Conta cadastrada com sucesso!');
      }

      this.salvo.emit();
      this.fechar();
    } finally {
      this.salvando.set(false);
    }
  }

  private validar(): boolean {
    if (!this.descricao.trim()) {
      this.alertaService.info('Obrigatório', 'Informe a descrição da conta.');
      return false;
    }
    if (!this.valor || Number.isNaN(this.valor) || this.valor <= 0) {
      this.alertaService.info(
        'Obrigatório',
        'Informe um valor maior que zero.',
      );
      return false;
    }
    if (!this.dataVencimento) {
      this.alertaService.info('Obrigatório', 'Informe a data de vencimento.');
      return false;
    }
    if (!this.idCategoria) {
      this.alertaService.info('Obrigatório', 'Selecione uma categoria.');
      return false;
    }
    if (this.pago && !this.pagoPor) {
      this.alertaService.info(
        'Obrigatório',
        'Selecione quem pagou a conta.',
      );
      return false;
    }
    return true;
  }

  private dataPadraoMes(): string {
    const hoje = new Date();
    const dia =
      this.mes === hoje.getMonth() + 1 && this.ano === hoje.getFullYear()
        ? hoje.getDate()
        : 1;
    const ultimoDia = new Date(this.ano, this.mes, 0).getDate();
    const d = Math.min(dia, ultimoDia);
    return `${this.ano}-${String(this.mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
