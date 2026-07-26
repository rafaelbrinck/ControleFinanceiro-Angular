import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RelatorioVeiculo } from '@app/shared/models/veiculo';

export interface MesAnoSelecionado {
  mes: number;
  ano: number;
}

@Component({
  selector: 'app-veiculos-relatorio',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe],
  templateUrl: './relatorio.component.html',
  styleUrl: './relatorio.component.css',
})
export class RelatorioVeiculoComponent {
  @Input() relatorio: RelatorioVeiculo | null = null;
  @Input() carregando = false;
  @Input() mes = new Date().getMonth() + 1;
  @Input() ano = new Date().getFullYear();
  @Output() mesAnoChange = new EventEmitter<MesAnoSelecionado>();

  readonly meses = [
    { valor: 1, label: 'Janeiro' },
    { valor: 2, label: 'Fevereiro' },
    { valor: 3, label: 'Março' },
    { valor: 4, label: 'Abril' },
    { valor: 5, label: 'Maio' },
    { valor: 6, label: 'Junho' },
    { valor: 7, label: 'Julho' },
    { valor: 8, label: 'Agosto' },
    { valor: 9, label: 'Setembro' },
    { valor: 10, label: 'Outubro' },
    { valor: 11, label: 'Novembro' },
    { valor: 12, label: 'Dezembro' },
  ];

  readonly anosDisponiveis: number[] = (() => {
    const atual = new Date().getFullYear();
    const lista: number[] = [];
    for (let a = atual + 1; a >= atual - 6; a--) {
      lista.push(a);
    }
    return lista;
  })();

  onMesChange(valor: string | number): void {
    const mes = Number(valor);
    if (!mes || mes === this.mes) return;
    this.mesAnoChange.emit({ mes, ano: this.ano });
  }

  onAnoChange(valor: string | number): void {
    const ano = Number(valor);
    if (!ano || ano === this.ano) return;
    this.mesAnoChange.emit({ mes: this.mes, ano });
  }

  get ehMesAtual(): boolean {
    const hoje = new Date();
    return (
      this.mes === hoje.getMonth() + 1 && this.ano === hoje.getFullYear()
    );
  }

  selecionarMesAtual(): void {
    if (this.ehMesAtual) return;
    const hoje = new Date();
    this.mesAnoChange.emit({
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
    });
  }

  formatarDiaMes(data: string): string {
    const v = String(data || '').slice(0, 10);
    if (v.length < 10) return '—';
    return `${v.slice(8, 10)}/${v.slice(5, 7)}`;
  }
}
