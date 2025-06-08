import { Injectable } from '@angular/core';
import { Orcamento } from '../models/orcamento';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LoginService } from './login.service';

@Injectable({
  providedIn: 'root',
})
export class OrcamentoService {
  private orcamentoSubject = new BehaviorSubject<Orcamento[]>([]);
  public orcamento$: Observable<Orcamento[]> = this.orcamentoSubject
    .asObservable()
    .pipe(
      map((orcamentos) => {
        return orcamentos.filter(
          (orcamento) => orcamento.idUser === this.loginService.getUserLogado()
        );
      })
    );

  private listaOrcamentos: Orcamento[] = [];

  constructor(private loginService: LoginService) {
    this.atualizarStream();
  }

  private atualizarStream() {
    this.orcamentoSubject.next([...this.listaOrcamentos]);
  }

  inserir(orcamento: Orcamento) {
    orcamento.id = this.listaOrcamentos.length + 1;
    orcamento.idUser = this.loginService.getUserLogado();
    this.listaOrcamentos.push(orcamento);
    this.atualizarStream();
  }
}
