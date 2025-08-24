import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Produto } from '../../models/produto';
import { Variacao, VariacoesDTO } from '../../models/variacoes';
import { ActivatedRoute, Router } from '@angular/router';
import { ProdutosService } from '../../service/produtos.service';
import { LoginService } from '../../service/login.service';
import { Categoria } from '../../models/categoria';
import { CategoriaService } from '../../service/categoria.service';
import { AlertaService } from '../../service/alerta.service';
import { MoedaPipe } from '../../pipes/moeda.pipe';
import { VariacoesService } from '../../service/variacoes.service';

@Component({
  selector: 'app-form-produto',
  standalone: true,
  imports: [CommonModule, FormsModule, MoedaPipe],
  templateUrl: './form-produto.component.html',
  styleUrl: './form-produto.component.css',
})
export class FormProdutoComponent implements OnInit {
  valorFormatado: string = '';
  produto = new Produto();
  id?: number;
  botao = 'Cadastrar';
  listaCategorias: Categoria[] = [];

  mostrarVariacao: boolean = false;
  variacao = new Variacao();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private produtoService: ProdutosService,
    private loginService: LoginService,
    private categoriaService: CategoriaService,
    private alertaService: AlertaService,
    private variacaoService: VariacoesService
  ) {}

  async ngOnInit() {
    this.listaCategorias = await this.categoriaService.listar('Produto');

    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      const produtoBuscado = await this.produtoService.buscarId(this.id);
      this.produto = produtoBuscado!;
      if (produtoBuscado) {
        Object.assign(this.produto, produtoBuscado);

        if (this.produto.valor != null) {
          this.valorFormatado = this.produto.valor.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }

        this.variacaoService.variacoes$.subscribe((variacoes) => {
          var varia = variacoes.filter((v) => v.idProd === this.produto.id);
          this.produto.variacoes = varia;

          if (varia.length > 0) {
            this.mostrarVariacao = true;
          }
        });
      }
    }
  }

  adicionarVariacao() {
    if (!this.mostrarVariacao) {
      this.mostrarVariacao = true;
    } else {
      this.variacao.valor = this.produto.valor;
      if (
        !this.variacao.variacao ||
        this.variacao.variacao.trim() === '' ||
        !this.variacao.valor ||
        this.variacao.valor <= 0
      ) {
        this.alertaService.info(
          'Obrigatório',
          'Obrigatório preencher variação e valor maior do que zero!'
        );
        return;
      }
      this.variacao.variacao = this.variacao.variacao?.toLocaleUpperCase();
      this.produto.valor = 0;
      this.produto.variacoes.push(this.variacao);
      this.variacao = new Variacao();
      this.valorFormatado = '';
    }
  }
  fecharVariacoes() {
    this.mostrarVariacao = false;
    this.variacao = new Variacao();
    this.produto.variacoes = [];
    this.valorFormatado = '';
  }
  async removerVariacao(variacao: VariacoesDTO) {
    if (this.id) {
      await this.variacaoService.deletar(variacao.id!);
    }
    this.produto.variacoes = this.produto.variacoes.filter(
      (v) => v !== variacao
    );
  }

  async salvar() {
    if (this.validarCampos()) {
      if (this.id) {
        await this.produtoService.editar(this.id, this.produto);
        this.alertaService.sucesso('Sucesso', 'Produto editado com sucesso!');
        this.voltar();
      } else {
        this.produto.idUser = this.loginService.getUserLogado();
        const sucesso = await this.produtoService.inserir(this.produto);
        if (sucesso) {
          this.alertaService.sucesso(
            'Sucesso',
            'Produto cadastrado com sucesso!'
          );
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
      this.alertaService.confirmar(
        'Nova Categoria',
        'Você selecionou a opção de nova categoria. Deseja adicionar uma nova categoria?',
        (resultado) => {
          if (resultado) {
            this.router.navigate(['/form-categoria']);
          }
        }
      );
    }
  }

  private validarCampos() {
    if (!this.produto.nome || this.produto.nome.trim() === '') {
      this.alertaService.info(
        'Obrigatório',
        'Obrigatório preencher nome do produto!'
      );
      return false;
    }
    if (
      this.produto.variacoes.length === 0 &&
      (!this.produto.valor || this.produto.valor <= 0)
    ) {
      if (!this.produto.valor || this.produto.valor <= 0) {
        this.alertaService.info(
          'Obrigatório',
          'Valor deve ser maior do que zero!'
        );
        return false;
      }
    }
    return true;
  }
}
