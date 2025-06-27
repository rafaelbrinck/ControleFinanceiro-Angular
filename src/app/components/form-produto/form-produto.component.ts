import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Produto } from '../../models/produto';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdutosService } from '../../service/produtos.service';
import { LoginService } from '../../service/login.service';
import { Categoria } from '../../models/categoria';
import { CategoriaService } from '../../service/categoria.service';

@Component({
  selector: 'app-form-produto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-produto.component.html',
  styleUrl: './form-produto.component.css',
})
export class FormProdutoComponent implements OnInit {
  valorFormatado: string = '';
  produto = new Produto();
  id?: number;
  botao = 'Cadastrar';
  listaCategorias: Categoria[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private produtoService: ProdutosService,
    private loginService: LoginService,
    private categoriaService: CategoriaService
  ) {}

  async ngOnInit() {
    this.listaCategorias = await this.categoriaService.listar('Produto');

    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      const produtoBuscado = await this.produtoService.buscarId(this.id);
      if (produtoBuscado) {
        this.produto = produtoBuscado;
        if (this.produto.valor != null) {
          this.valorFormatado = this.produto.valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }
      }
    }
  }

  async salvar() {
    if (this.validarCampos()) {
      if (this.id) {
        await this.produtoService.editar(this.id, this.produto);
        alert('Produto editado com sucesso!');
        this.voltar();
      } else {
        this.produto.idUser = this.loginService.getUserLogado();
        const sucesso = await this.produtoService.inserir(this.produto);
        if (sucesso!) {
          alert('Produto adicionado com sucesso!');
          this.produto = new Produto();
          this.valorFormatado = '';
          this.voltar();
        }
      }
    }
  }

  voltar() {
    this.router.navigate(['produtos']);
  }

  mascaraValor(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value;

    const numeros = valor.replace(/\D/g, '');
    const somenteNumeros = parseFloat(numeros) / 100;
    this.produto.valor = somenteNumeros;
    this.valorFormatado = somenteNumeros.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  conferirCategoria(valor: string) {
    if (valor === 'nova') {
      if (confirm('Gostaria de adicionar uma nova categoria?')) {
        this.router.navigate(['/form-categoria']);
      }
    }
  }

  private validarCampos() {
    if (!this.produto.nome || this.produto.nome.trim() === '') {
      alert('Obrigatório preencher nome do produto!');
      return false;
    }
    if (!this.produto.valor || this.produto.valor <= 0) {
      alert('Valor deve ser maior do que zero!');
      return false;
    }
    return true;
  }
}
