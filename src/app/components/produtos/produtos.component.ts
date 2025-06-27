import { Component, OnInit } from '@angular/core';
import { Produto } from '../../models/produto';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { ProdutosService } from '../../service/produtos.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.css',
})
export class ProdutosComponent implements OnInit {
  nomePesquisa?: string;
  listaProdutos: Produto[] = [];

  constructor(
    private loginService: LoginService,
    private produtoService: ProdutosService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.produtoService.carregarProdutos();
    this.produtoService.produtos$.subscribe((produtos) => {
      this.listaProdutos = produtos;
    });
  }

  async deletar(id?: number) {
    if (!id) return;

    const produto = await this.produtoService.buscarId(id);
    if (produto) {
      if (confirm(`Deseja deletar ${produto.nome}?`)) {
        await this.produtoService.deletar(id);
        alert(`Produto ${produto.nome} removido com sucesso!`);
      }
    }
  }
}
