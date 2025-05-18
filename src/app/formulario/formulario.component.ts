import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Transacao } from '../trasacao';
import { TransacaoService } from '../transacao.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-formulario',
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css',
})
export class FormularioComponent {
  transacao = new Transacao();
  id?: number;
  botao = 'Cadastrar';

  constructor(
    private transacaoService: TransacaoService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      this.transacao = this.transacaoService.buscarId(this.id);
    }
  }

  salvar() {
    if (this.id) {
      this.transacaoService.editar(this.id, this.transacao);
      alert('Transação editada com sucesso!');
    } else {
      this.transacaoService.inserir(this.transacao);
      alert('Transação cadastrada com sucesso!');
      this.transacao = new Transacao();
    }
  }

  voltar() {
    this.router.navigate(['/tabela']);
  }
}
