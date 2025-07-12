import { Component } from '@angular/core';
import { Produto, ProdutoOrcamento } from '../../models/produto';
import { ProdutosService } from '../../service/produtos.service';
import { CommonModule } from '@angular/common';
import { LoginService } from '../../service/login.service';
import { BuscadorPipe } from '../../pipes/buscador.pipe';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Cliente } from '../../models/cliente';
import { ClientesService } from '../../service/clientes.service';
import { Orcamento } from '../../models/orcamento';
import { OrcamentoService } from '../../service/orcamento.service';
import { AlertaService } from '../../service/alerta.service';

@Component({
  selector: 'app-orcamento',
  imports: [CommonModule, BuscadorPipe, MoedaPipe, FormsModule, RouterModule],
  templateUrl: './orcamento.component.html',
  styleUrl: './orcamento.component.css',
})
export class OrcamentoComponent {
  freteFormatado: string = '';
  descontoFormatado: string = '';
  frete: number = 0;
  desconto: number = 0;
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
    private clienteService: ClientesService,
    private orcamentoService: OrcamentoService,
    private alertaService: AlertaService,
    private router: Router
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
    const total =
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0) * (p.valor ?? 0),
        0
      ) || 0;

    const totalComDesconto = total - this.desconto;
    const totalComFrete = totalComDesconto + this.frete;

    return totalComFrete;
  }

  get totalParcelamento() {
    const total =
      this.produtosOrcamento.reduce(
        (soma, p) => soma + (p.quantidade ?? 0) * (p.valor ?? 0),
        0
      ) || 0;
    const taxaTotal = 4.98 + 8.66;
    const totalComTaxa = total / (1 - taxaTotal / 100);
    const totalComTaxaDesconto = totalComTaxa - this.desconto;
    const totalComTaxaFrete = totalComTaxaDesconto + this.frete;
    return totalComTaxaFrete;
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

  async finalizarOrcamento() {
    if (!this.validarOrcamento()) return;
    const orcamento: Orcamento = {
      cliente: this.clienteSelecionado,
      produtos: this.produtosOrcamento,
      valorCredito: this.totalParcelamento, // Implementar lógica de crédito se necessário
      valor: this.total, // Valor total do orçamento
      status: 'Aberto',
      idUser: this.loginService.getUserLogado(),
      frete: this.frete,
      desconto: this.desconto,
    };
    await this.orcamentoService.inserir(orcamento).then((success) => {
      if (success) {
        this.produtosOrcamento = [];
        this.clienteSelecionado = new Cliente();
        this.mostrarDetalhes = false;
        this.mostrarClientes = false;
        this.frete = 0;
        this.desconto = 0;
        this.alertaService.sucesso(
          'Orçamento Finalizado',
          'O orçamento foi salvo com sucesso!'
        );
      } else {
        this.alertaService.erro(
          'Erro ao Finalizar Orçamento',
          'Ocorreu um erro ao finalizar o orçamento. Tente novamente.'
        );
      }
    });
  }
  validarOrcamento(): boolean {
    if (this.produtosOrcamento.length === 0) {
      this.alertaService.info(
        'Orçamento Vazio',
        'Você precisa adicionar pelo menos um produto ao orçamento.'
      );
      return false;
    }
    if (!this.clienteSelecionado.id) {
      this.alertaService.info(
        'Cliente Não Selecionado',
        'Você precisa selecionar um cliente para o orçamento.'
      );
      return false;
    }
    if (this.frete < 0) {
      this.alertaService.info(
        'Frete Inválido',
        'O valor do frete não pode ser negativo.'
      );
      return false;
    }
    if (this.desconto < 0) {
      this.alertaService.info(
        'Desconto Inválido',
        'O valor do desconto não pode ser negativo.'
      );
      return false;
    }
    if (this.total < 0) {
      this.alertaService.info(
        'Valor Total Inválido',
        'O valor total do orçamento não pode ser negativo.'
      );
      return false;
    }
    return true;
  }

  paginaOrcamentos() {
    this.router.navigate(['/lista-orcamentos']);
  }

  mascaraValor(event: Event, campo: 'frete' | 'desconto') {
    const input = event.target as HTMLInputElement;
    const valor = input.value;

    const numeros = valor.replace(/\D/g, '');
    const somenteNumeros = parseFloat(numeros) / 100 || 0;

    const formatado = somenteNumeros.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    // Atualiza valor e texto formatado
    if (campo === 'frete') {
      this.frete = somenteNumeros;
      this.freteFormatado = formatado;
    } else {
      this.desconto = somenteNumeros;
      this.descontoFormatado = formatado;
    }

    input.value = formatado; // reflete no input imediatamente
  }
}
