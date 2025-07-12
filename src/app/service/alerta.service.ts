import { Injectable } from '@angular/core';
import { AlertaComponent } from '../components/shared/alerta/alerta.component';

@Injectable({
  providedIn: 'root',
})
export class AlertaService {
  private componente!: AlertaComponent;

  registrar(component: AlertaComponent): void {
    this.componente = component;
  }
  info(titulo: string, mensagem: string) {
    this.componente.abrir(titulo, mensagem, 'info');
  }
  erro(titulo: string, mensagem: string) {
    this.componente.abrir(titulo, mensagem, 'erro');
  }

  sucesso(titulo: string, mensagem: string) {
    this.componente.abrir(titulo, mensagem, 'sucesso');
  }

  confirmar(
    titulo: string,
    mensagem: string,
    callback: (res: boolean) => void
  ) {
    this.componente.abrir(titulo, mensagem, 'confirmar', callback);
  }
}
