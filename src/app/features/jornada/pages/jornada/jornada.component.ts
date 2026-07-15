import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertaService } from '@app/core/services/alerta.service';
import { JornadaService } from '@app/core/services/jornada.service';
import {
  Jornada,
  ResumoDiaJornada,
  TipoJornada,
  TopDiaJornada,
} from '@app/shared/models/jornada';

@Component({
  selector: 'app-jornada',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jornada.component.html',
  styleUrl: './jornada.component.css',
})
export class JornadaComponent implements OnInit {
  dataSelecionada = this.hojeISO();
  registros: Jornada[] = [];
  registrosDoDia: Jornada[] = [];
  salvando = false;

  horasDia: ResumoDiaJornada = { minutos: 0, label: '0h 00m' };
  horasMes: ResumoDiaJornada = { minutos: 0, label: '0h 00m' };
  topDia: TopDiaJornada | null = null;

  proximoTipo: TipoJornada = 'Entrada';

  constructor(
    private jornadaService: JornadaService,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.jornadaService.carregarRegistros();

    this.jornadaService.registros$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((regs) => {
        this.registros = regs;
        this.recalcular();
      });
  }

  get isHoje(): boolean {
    return this.dataSelecionada === this.hojeISO();
  }

  get labelBotao(): string {
    return this.proximoTipo === 'Entrada'
      ? 'Registrar Entrada'
      : 'Registrar Saída';
  }

  get classeBotao(): string {
    return this.proximoTipo === 'Entrada' ? 'btn-entrada' : 'btn-saida';
  }

  irParaHoje(): void {
    this.dataSelecionada = this.hojeISO();
    this.recalcular();
  }

  onDataChange(): void {
    this.recalcular();
  }

  async baterPonto(): Promise<void> {
    if (this.salvando) return;
    this.salvando = true;

    try {
      const ok = await this.jornadaService.registrarPonto(this.proximoTipo);
      if (!ok) {
        this.alertaService.erro('Erro', 'Não foi possível registrar o ponto.');
        return;
      }

      this.alertaService.sucesso(
        'Ponto registrado',
        `${this.proximoTipo} salva com sucesso.`,
      );

      if (!this.isHoje) {
        this.dataSelecionada = this.hojeISO();
      }
    } finally {
      this.salvando = false;
    }
  }

  formatarHora(iso?: string): string {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  formatarDataBR(isoDate: string): string {
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  }

  private recalcular(): void {
    this.registrosDoDia = this.filtrarPorDia(
      this.registros,
      this.dataSelecionada,
    );

    this.horasDia = this.calcularResumo(this.registrosDoDia);
    this.atualizarProximoTipo();

    const mesKey = this.dataSelecionada.slice(0, 7); // yyyy-MM
    const doMes = this.registros.filter((r) => {
      const dia = this.toISODate(r.created_at);
      return !!dia && dia.startsWith(mesKey);
    });

    this.horasMes = this.calcularResumo(doMes);
    this.topDia = this.calcularTopDia(doMes);
  }

  /**
   * Cruza pares Entrada → Saída em ordem cronológica.
   * Entrada sem Saída correspondente é ignorada no total (jornada aberta).
   * Saída sem Entrada prévia também é ignorada.
   */
  private calcularMinutosTrabalhados(regs: Jornada[]): number {
    const ordenados = [...regs].sort(
      (a, b) =>
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime(),
    );

    let totalMinutos = 0;
    let entradaAberta: Date | null = null;

    for (const r of ordenados) {
      if (!r.created_at || !r.tipo) continue;
      const momento = new Date(r.created_at);

      if (r.tipo === 'Entrada') {
        entradaAberta = momento;
        continue;
      }

      if (entradaAberta) {
        const diffMs = momento.getTime() - entradaAberta.getTime();
        if (diffMs > 0) {
          totalMinutos += Math.floor(diffMs / 60000);
        }
        entradaAberta = null;
      }
    }

    return totalMinutos;
  }

  private calcularResumo(regs: Jornada[]): ResumoDiaJornada {
    const minutos = this.calcularMinutosTrabalhados(regs);
    return { minutos, label: this.formatarDuracao(minutos) };
  }

  private calcularTopDia(regsMes: Jornada[]): TopDiaJornada | null {
    const porDia = new Map<string, Jornada[]>();

    for (const r of regsMes) {
      const dia = this.toISODate(r.created_at);
      if (!dia) continue;
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia)!.push(r);
    }

    let melhor: TopDiaJornada | null = null;

    for (const [data, lista] of porDia.entries()) {
      const minutos = this.calcularMinutosTrabalhados(lista);
      if (!melhor || minutos > melhor.minutos) {
        melhor = {
          data,
          minutos,
          label: this.formatarDuracao(minutos),
        };
      }
    }

    return melhor && melhor.minutos > 0 ? melhor : null;
  }

  private atualizarProximoTipo(): void {
    const hoje = this.hojeISO();
    const doHoje = this.filtrarPorDia(this.registros, hoje);

    if (doHoje.length === 0) {
      this.proximoTipo = 'Entrada';
      return;
    }

    const ultimo = doHoje[doHoje.length - 1];
    this.proximoTipo = ultimo.tipo === 'Entrada' ? 'Saida' : 'Entrada';
  }

  private filtrarPorDia(regs: Jornada[], diaISO: string): Jornada[] {
    return regs
      .filter((r) => this.toISODate(r.created_at) === diaISO)
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime(),
      );
  }

  private formatarDuracao(minutosTotais: number): string {
    const h = Math.floor(minutosTotais / 60);
    const m = minutosTotais % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  private hojeISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toISODate(iso?: string): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
