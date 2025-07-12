import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-alerta',
  imports: [CommonModule],
  templateUrl: './alerta.component.html',
  styleUrl: './alerta.component.css',
})
export class AlertaComponent {
  visivel: boolean = false;
  tipo: 'info' | 'erro' | 'sucesso' | 'confirmar' = 'info';
  titulo: string = '';
  mensagem: string = '';
  callback!: (resposta: boolean) => void;

  abrir(
    titulo: string,
    mensagem: string,
    tipo: typeof this.tipo = 'info',
    callback?: (res: boolean) => void
  ): void {
    this.visivel = true;
    this.titulo = titulo;
    this.mensagem = mensagem;
    this.tipo = tipo;
    this.callback = callback ?? (() => {});
  }

  fechar(resposta: boolean = true) {
    this.visivel = false;
    this.callback(resposta);
  }

  icone() {
    return {
      info: 'bi bi-info-circle',
      erro: 'bi bi-x-circle',
      sucesso: 'bi bi-check-circle',
      confirmar: 'bi bi-question-circle',
    }[this.tipo];
  }

  classeCabecalho() {
    return {
      confirmar: 'bg-primary',
      erro: 'bg-danger',
      sucesso: 'bg-success',
      info: 'bg-warning text-dark',
    }[this.tipo];
  }

  classeBotao() {
    return {
      confirmar: 'btn-primary',
      erro: 'btn-danger',
      sucesso: 'btn-success',
      info: 'btn-warning text-dark',
    }[this.tipo];
  }
}
