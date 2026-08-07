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
  parcelado = false;
  quantidadeParcelas = 2;
  salvando = signal(false);

  readonly membros = this.familyService.membros;

  get editando(): boolean {
    return !!this.conta?.id;
  }

  get titulo(): string {
    return this.editando ? 'Editar Conta' : 'Nova Conta';
  }

  get labelValor(): string {
    return this.parcelado && !this.editando
      ? 'Valor da parcela (R$)'
      : 'Valor (R$)';
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
      this.parcelado = false;
      this.quantidadeParcelas = 2;
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
    this.parcelado = false;
    this.quantidadeParcelas = 2;
  }

  aoAlterarPago(): void {
    if (!this.pago) {
      this.pagoPor = null;
    }
  }

  aoAlterarParcelado(): void {
    if (!this.parcelado) {
      this.quantidadeParcelas = 2;
      return;
    }
    // Parcelamento e conta fixa são mutuamente exclusivos na criação
    this.isFixa = false;
    if (!this.quantidadeParcelas || this.quantidadeParcelas < 2) {
      this.quantidadeParcelas = 2;
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

        const payloads = this.montarPayloadsCriacao(membro.id, pagoPor);
        const criadas = await this.billsService.criar(payloads);
        if (!criadas.length) {
          this.alertaService.erro('Erro', 'Não foi possível criar a conta.');
          return;
        }

        const msg =
          criadas.length > 1
            ? `${criadas.length} parcelas cadastradas com sucesso!`
            : 'Conta cadastrada com sucesso!';
        this.alertaService.sucesso('Sucesso', msg);
      }

      this.salvo.emit();
      this.fechar();
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Monta o array para bulk insert.
   * - Sem parcelamento: 1 item com id_grupo_parcelamento = null.
   * - Com parcelamento: N itens com o mesmo UUID de grupo e vencimentos mensais.
   * O `valor` do formulário é o valor de cada parcela.
   */
  private montarPayloadsCriacao(
    idCriador: number,
    pagoPor: number | null,
  ): ContaCreate[] {
    const descricaoBase = this.descricao.trim();
    const idCategoria = Number(this.idCategoria);
    const base: Omit<ContaCreate, 'descricao' | 'data_vencimento' | 'pago' | 'pago_por' | 'id_grupo_parcelamento'> =
      {
        id_familia: this.idFamilia,
        id_criador: idCriador,
        valor: this.valor,
        id_categoria: idCategoria,
        is_fixa: this.parcelado ? false : this.isFixa,
      };

    if (!this.parcelado) {
      return [
        {
          ...base,
          descricao: descricaoBase,
          data_vencimento: this.dataVencimento,
          pago: this.pago,
          pago_por: pagoPor,
          id_grupo_parcelamento: null,
        },
      ];
    }

    const qtd = Math.floor(Number(this.quantidadeParcelas));
    const grupoId = crypto.randomUUID();
    const parcelas: ContaCreate[] = [];

    for (let i = 1; i <= qtd; i++) {
      const ehPrimeira = i === 1;
      parcelas.push({
        ...base,
        descricao: `${descricaoBase} (${i}/${qtd})`,
        data_vencimento: this.adicionarMeses(this.dataVencimento, i - 1),
        // Apenas a 1ª parcela herda o status "já paga" do formulário
        pago: ehPrimeira ? this.pago : false,
        pago_por: ehPrimeira ? pagoPor : null,
        id_grupo_parcelamento: grupoId,
      });
    }

    return parcelas;
  }

  /**
   * Soma meses a uma data ISO (YYYY-MM-DD) preservando o dia quando possível.
   * Em viradas (ex.: 31/jan → fev), usa o último dia do mês de destino.
   */
  adicionarMeses(dataIso: string, meses: number): string {
    const [anoStr, mesStr, diaStr] = String(dataIso).slice(0, 10).split('-');
    const ano = Number(anoStr);
    const mes = Number(mesStr); // 1–12
    const dia = Number(diaStr);

    if (!ano || !mes || !dia) {
      return dataIso;
    }

    const mesIndexDestino = mes - 1 + meses;
    const anoDestino = ano + Math.floor(mesIndexDestino / 12);
    const mesDestino = ((mesIndexDestino % 12) + 12) % 12; // 0–11
    const ultimoDia = new Date(anoDestino, mesDestino + 1, 0).getDate();
    const diaDestino = Math.min(dia, ultimoDia);

    return `${anoDestino}-${String(mesDestino + 1).padStart(2, '0')}-${String(diaDestino).padStart(2, '0')}`;
  }

  private validar(): boolean {
    if (!this.descricao.trim()) {
      this.alertaService.info('Obrigatório', 'Informe a descrição da conta.');
      return false;
    }
    if (!this.valor || Number.isNaN(this.valor) || this.valor <= 0) {
      this.alertaService.info(
        'Obrigatório',
        this.parcelado
          ? 'Informe o valor de cada parcela (maior que zero).'
          : 'Informe um valor maior que zero.',
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
    if (
      !this.editando &&
      this.parcelado &&
      (!this.quantidadeParcelas ||
        Number.isNaN(Number(this.quantidadeParcelas)) ||
        Number(this.quantidadeParcelas) < 2)
    ) {
      this.alertaService.info(
        'Obrigatório',
        'Informe a quantidade de parcelas (mínimo 2).',
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
