import { Component, DestroyRef, OnInit } from '@angular/core';
import { Produto } from '@app/shared/models/produto';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '@app/shared/pipes/buscador.pipe';
import { MoedaPipe } from '@app/shared/pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProdutosService } from '@app/core/services/produtos.service';
import { AlertaService } from '@app/core/services/alerta.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  expandedRow: number | null = null;

  constructor(
    private produtoService: ProdutosService,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {}

  toggleExpand(index: number, prod: Produto) {
    if (prod.variacoes.length >= 0) {
      this.expandedRow = this.expandedRow === index ? null : index;
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.produtoService.getProdutosSnapshot().length === 0) {
      await this.produtoService.carregarProdutos();
    }
    this.produtoService.produtos$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((produtos) => {
        this.listaProdutos = produtos;
      });
  }

  async deletar(id?: number) {
    if (!id) return;
    const produto = await this.produtoService.buscarId(id);
    if (produto) {
      this.alertaService.confirmar(
        'Confirmação',
        `Deseja deletar ${produto?.nome}?`,
        async (confirma) => {
          if (!confirma) return;
          await this.produtoService.deletar(id);
          this.alertaService.sucesso(
            'Sucesso',
            'Produto deletado com sucesso!'
          );
        }
      );
    }
  }
}
