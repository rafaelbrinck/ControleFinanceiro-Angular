import { Component } from '@angular/core';
import { LoginService } from '../login.service';
import { ProdutosService } from '../produtos.service';
import { Produto } from '../produto';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../buscador.pipe';
import { MoedaPipe } from '../moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-produtos',
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.css',
})
export class ProdutosComponent {
  nomePesquisa?: string;
  listaProdutos: Produto[] = [];

  constructor(
    private loginService: LoginService,
    private produtoService: ProdutosService
  ) {}
  ngOnInit(): void {
    this.produtoService.produtos$.subscribe((produtos) => {
      this.listaProdutos = produtos;
    });
  }
  deletar(id?: number) {
    const produto = this.produtoService.buscarId(id!);
    if (produto) {
      if (
        confirm(
          `Deseja deletar ${produto.nome} ${produto.id}${produto.categoria}?`
        )
      ) {
        alert(`Produto ${produto.nome} removido com sucesso!`);
        this.produtoService.deletar(id);
      }
    }
  }
}
