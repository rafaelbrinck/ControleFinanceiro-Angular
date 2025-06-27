import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Transacao } from '../../models/trasacao';
import { TransacaoService } from '../../service/transacao.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Categoria } from '../../models/categoria';
import { CategoriaService } from '../../service/categoria.service';
import { LoginService } from '../../service/login.service';

@Component({
  selector: 'app-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario.component.html',
  styleUrl: './formulario.component.css',
})
export class FormularioComponent implements OnInit {
  valorFormatado: string = '';
  transacao = new Transacao();
  id?: number;
  botao = 'Cadastrar';
  listaCategorias: Categoria[] = [];

  constructor(
    private transacaoService: TransacaoService,
    private categoriaService: CategoriaService,
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService
  ) {}

  async ngOnInit() {
    this.listaCategorias = await this.categoriaService.listar('Transacao');

    this.id = +this.route.snapshot.params['id'];
    if (this.id) {
      this.botao = 'Editar';
      this.transacao = await this.transacaoService.buscarId(this.id);
      if (this.transacao.valor != null) {
        this.valorFormatado = this.transacao.valor.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
    }
  }

  async salvar() {
    if (this.transacao.nome == undefined) {
      return alert('Descrição obrigatória!');
    }
    if (
      this.transacao.valor == undefined ||
      this.transacao.valor == null ||
      Number.isNaN(this.transacao.valor)
    ) {
      return alert('Valor é obrigatório preencher!');
    }
    if (this.transacao.valor != undefined) {
      if (!this.validaValor(this.transacao.valor)) {
        return alert('Valor tem que ser maior do que zero');
      }
    }
    if (this.transacao.tipo == undefined) {
      return alert('Tipo de transação obrigatório ser preenchido!');
    }
    if (this.id) {
      if (await this.transacaoService.editar(this.id, this.transacao)) {
        alert('Transação editada com sucesso!');
        this.voltar();
      } else {
        alert('Problema para editar a transação!');
      }
    } else {
      this.transacao.idUser = this.loginService.getUserLogado();
      this.transacaoService.inserir(this.transacao);
      alert('Transação cadastrada com sucesso!');
      this.transacao = new Transacao();
      this.voltar();
    }
  }

  validaValor(valor: number) {
    return valor > 0;
  }

  mascaraValor(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value;

    const numeros = valor.replace(/\D/g, '');
    const somenteNumeros = parseFloat(numeros) / 100;
    this.transacao.valor = somenteNumeros;
    this.valorFormatado = somenteNumeros.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  voltar() {
    this.router.navigate(['/transacoes']);
  }

  conferirCategoria(valor: string) {
    if (valor === 'nova') {
      if (confirm('Gostaria de adicionar uma nova categoria?')) {
        this.router.navigate(['/form-categoria']);
      }
    }
  }
}
