import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Categoria } from '../../models/categoria';
import { CategoriaService } from '../../service/categoria.service';
import { AlertaService } from '../../service/alerta.service';

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
    private alertaService: AlertaService
  ) {}

  ngOnInit() {
    this.categoriaService.categorias$.subscribe(
      (categorias) => (this.lista = categorias)
    );
  }

  async salvar() {
    if (!this.categoria.nome || this.categoria.nome.trim() === '') {
      this.alertaService.info(
        'Obrigatório',
        'O nome da categoria é obrigatório'
      );
      return;
    }

    // Padroniza nome: primeira letra maiúscula, resto minúsculo
    const nome =
      this.categoria.nome.charAt(0).toUpperCase() +
      this.categoria.nome.slice(1).toLowerCase();
    this.categoria.nome = nome;

    // Como buscarNome é async, precisamos aguardar
    const catVerificada = await this.categoriaService.buscarNome(nome);
    if (!catVerificada) {
      this.alertaService.erro('Erro', `Categoria ${nome} já cadastrada`);
      return;
    }

    await this.categoriaService.inserir(this.categoria);
    this.alertaService.sucesso(
      'Sucesso',
      `Categoria ${this.categoria.nome} cadastrada com sucesso!`
    );
    this.categoria = new Categoria();
    this.voltar();
  }

  async deletar(id: number) {
    const categoria = await this.categoriaService.buscarId(id);
    this.alertaService.confirmar(
      'Confirmação',
      `Deseja realmente deletar a categoria ${categoria?.nome}?`,
      async (resultado) => {
        if (categoria && resultado) {
          await this.categoriaService.deletar(id);
          this.lista = await this.categoriaService.listarTudo(); // atualiza a lista após deletar
        }
      }
    );
  }

  voltar() {
    this.router.navigate(['/form-categoria']);
  }

  voltarInicio() {
    this.router.navigate(['/inicio']);
  }
}
