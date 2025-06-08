import { Component } from '@angular/core';
import { Produto } from '../../models/produto';
import { Categoria } from '../../models/categoria';
import { ProdutosService } from '../../service/produtos.service';
import { CategoriaService } from '../../service/categoria.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orcamento',
  imports: [CommonModule],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.css',
})
export class OrcamentoComponent {
  listaProdutos: Produto[] = [];
  listaCategoria: Categoria[] = [];
  catSelecionada: string = 'Tudo';

  constructor(
    private produtoService: ProdutosService,
    private categoriaService: CategoriaService
  ) {
    this.produtoService.produtos$.subscribe(
      (produtos) => (this.listaProdutos = produtos)
    );
    this.categoriaService.categorias$.subscribe((categorias) => {
      categorias.forEach((categoria) => {
        if (categoria.tipo === 'Produto') {
          this.listaCategoria.push(categoria);
        }
      });
    });
  }
}
