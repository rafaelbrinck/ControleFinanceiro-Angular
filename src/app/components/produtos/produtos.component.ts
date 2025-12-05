import { Component, OnInit } from '@angular/core';
import { Produto } from '../../models/produto';
import { CommonModule } from '@angular/common';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { ProdutosService } from '../../service/produtos.service';
import { AlertaService } from '../../service/alerta.service';

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
    private loginService: LoginService,
    private produtoService: ProdutosService,
    private alertaService: AlertaService
  ) {}

  toggleExpand(index: number, prod: Produto) {
    if (prod.variacoes.length >= 0) {
      this.expandedRow = this.expandedRow === index ? null : index;
    }
  }

  async ngOnInit(): Promise<void> {
    this.produtoService.produtos$.subscribe(async (produtos) => {
      if (produtos.length == 0) {
        await this.produtoService.carregarProdutos();
      }
    });
    this.produtoService.produtos$.subscribe((produtos) => {
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
