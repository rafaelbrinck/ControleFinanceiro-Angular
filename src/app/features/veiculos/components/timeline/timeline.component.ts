import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EventoTimeline } from '@app/shared/models/veiculo';

@Component({
  selector: 'app-veiculos-timeline',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.css',
})
export class TimelineComponent {
  @Input() eventos: EventoTimeline[] = [];
  @Input() carregando = false;
  @Input() temMais = false;
  @Input() carregandoMais = false;
  @Output() excluir = new EventEmitter<EventoTimeline>();
  @Output() carregarMais = new EventEmitter<void>();

  formatarDiaMes(data: string): string {
    const v = String(data || '').slice(0, 10);
    if (v.length < 10) return '—';
    return `${v.slice(8, 10)}/${v.slice(5, 7)}`;
  }

  formatarKm(km: number): string {
    return `${Number(km || 0).toLocaleString('pt-BR')} km`;
  }
}
