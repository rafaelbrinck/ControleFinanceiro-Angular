import { Component } from '@angular/core';
import { Produto, ProdutoOrcamento } from '../../models/produto';
import { ProdutosService } from '../../service/produtos.service';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../service/login.service';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Cliente } from '../../models/cliente';
import { ClientesService } from '../../service/clientes.service';

@Component({
  selector: 'app-orcamento',
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.css',
})
export class OrcamentoComponent {
  nomePesquisa?: string;
  clientePesquisa?: string;
  clienteSelecionado: Cliente = new Cliente();
  listaClientes: Cliente[] = [];
  listaProdutos: Produto[] = [];
  produtosOrcamento: ProdutoOrcamento[] = [];
  mostrarDetalhes = false;
  mostrarClientes = false;

  constructor(
    private loginService: LoginService,
    private produtoService: ProdutosService,
    private clienteService: ClientesService
  ) {}

  async ngOnInit(): Promise<void> {
    this.mostrarClientes = false;
    await this.produtoService.carregarProdutos();
    this.produtoService.produtos$.subscribe((produtos) => {
      this.listaProdutos = produtos;
    });
    await this.clienteService.carregarClientes();
    this.clienteService.clientes$.subscribe((clientes) => {
      this.listaClientes = clientes;
    });
  }

  async adicionarProduto(id?: number) {
    if (!id) return;

    const produto = await this.produtoService.buscarId(id);
    if (produto) {
      const prodLista = this.produtosOrcamento.find(
        (prod) => prod.id === produto.id
      );
      if (prodLista) {
        prodLista.quantidade = (prodLista.quantidade ?? 0) + 1;
      } else {
        const prod: ProdutoOrcamento = {
          id: produto.id,
          nome: produto.nome,
          valor: produto.valor ?? 0,
          quantidade: 1,
        };
        this.produtosOrcamento.push(prod);
      }
    }
  }

  get totalProdutosCarrinho() {
    return (
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0),
        0
      ) || 0
    );
  }

  get total() {
    return (
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0) * (p.valor ?? 0),
        0
      ) || 0
    );
  }

  get totalParcelamento() {
    const total =
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0) * (p.valor ?? 0),
        0
      ) || 0;
    const taxaTotal = 4.98 + 8.66;
    const totalComTaxa = total / (1 - taxaTotal / 100);
    return totalComTaxa;
  }
  removerProduto(id?: number) {
    if (!id) return;

    const prodLista = this.produtosOrcamento.find((prod) => prod.id === id);
    if (prodLista?.quantidade == 1) {
      this.produtosOrcamento = this.produtosOrcamento.filter(
        (p) => p.id !== id
      );
    } else {
      prodLista!.quantidade = (prodLista!.quantidade ?? 0) - 1;
    }
  }
  adicionarCliente(cliente: Cliente) {
    this.clienteSelecionado = cliente;
  }

  finalizarOrcamento() {
    // Lógica futura para salvar orçamento
    alert('Orçamento finalizado com sucesso!');
  }
}
