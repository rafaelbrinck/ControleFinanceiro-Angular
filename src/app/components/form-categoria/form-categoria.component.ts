import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Categoria } from '../../models/categoria';
import { CategoriaService } from '../../service/categoria.service';
import { LoginService } from '../../service/login.service';

@Component({
  selector: 'app-form-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-categoria.component.html',
  styleUrls: ['./form-categoria.component.css'],
})
export class FormCategoriaComponent {
  categoria = new Categoria();
  lista: Categoria[] = [];
  constructor(
    private categoriaService: CategoriaService,
    private router: Router,
    private loginService: LoginService
  ) {
    this.lista = categoriaService.listar(loginService.getUserLogado());
  }

  salvar() {
    if (!this.categoria.nome || this.categoria.nome.trim() === '') {
      return alert('O nome da categoria é obrigatório');
    }
    const nome =
      this.categoria.nome.charAt(0).toUpperCase() +
      this.categoria.nome.slice(1).toLowerCase();
    this.categoria.nome = nome;

    const catVerificada = this.categoriaService.buscarNome(nome);
    if (!catVerificada) {
      return alert(`Categoria ${nome} já cadastrada`);
    }

    this.categoriaService.inserir(this.categoria);
    alert(`Categoria ${this.categoria.nome} adicionada com sucesso!`);
    this.categoria = new Categoria();
    this.voltar();
  }
  deletar(id: number) {
    const categoria = this.categoriaService.buscarId(id);
    if (confirm(`Tem certeza que deseja deletar ${categoria.nome}?`)) {
      this.categoriaService.deletar(id);
      this.lista = this.categoriaService.listar(
        this.loginService.getUserLogado()
      ); // atualiza a lista
    }
  }
  voltar() {
    this.router.navigate(['/novo']);
  }
  voltarInicio() {
    this.router.navigate(['/inicio']);
  }
}
