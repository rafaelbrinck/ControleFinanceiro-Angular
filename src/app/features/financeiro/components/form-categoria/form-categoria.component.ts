import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Categoria } from '@app/shared/models/categoria';
import { CategoriaService } from '@app/core/services/categoria.service';
import { AlertaService } from '@app/core/services/alerta.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-form-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-categoria.component.html',
  styleUrls: ['./form-categoria.component.css'],
})
export class FormCategoriaComponent implements OnInit {
  categoria = new Categoria();
  lista: Categoria[] = [];

  constructor(
    private categoriaService: CategoriaService,
    private router: Router,
    private alertaService: AlertaService,
    private destroyRef: DestroyRef,
  ) {}

  async ngOnInit() {
    // Define o tipo padrão
    this.categoria.tipo = 'Transacao';

    if (this.categoriaService.getCategoriasSnapshot().length === 0) {
      await this.categoriaService.carregarCategorias();
    }
    this.categoriaService.categorias$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categorias) => (this.lista = categorias));
  }

  // Só permite selecionar como Mãe categorias do mesmo tipo que NÃO sejam filhas de ninguém
  get categoriasMaeDisponiveis() {
    return this.lista.filter(
      (c) => !c.categoria_mae && c.tipo === this.categoria.tipo,
    );
  }

  // Agrupa as filhas logo abaixo das suas respectivas mães para a UI
  get categoriasAgrupadas() {
    let resultado: any[] = [];
    const principais = this.lista.filter((c) => !c.categoria_mae);

    principais.forEach((pai) => {
      resultado.push({ ...pai, isFilha: false });

      const filhas = this.lista.filter((c) => c.categoria_mae === pai.id);
      filhas.forEach((filha) => {
        resultado.push({ ...filha, isFilha: true, nomeMae: pai.nome });
      });
    });

    return resultado;
  }

  async salvar() {
    if (!this.categoria.nome || this.categoria.nome.trim() === '') {
      this.alertaService.info(
        'Obrigatório',
        'O nome da categoria é obrigatório',
      );
      return;
    }

    const nome =
      this.categoria.nome.charAt(0).toUpperCase() +
      this.categoria.nome.slice(1).toLowerCase();
    this.categoria.nome = nome;

    const catVerificada = await this.categoriaService.buscarNome(nome);
    if (!catVerificada) {
      this.alertaService.erro('Erro', `Categoria ${nome} já cadastrada`);
      return;
    }

    await this.categoriaService.inserir(this.categoria);
    this.alertaService.sucesso(
      'Sucesso',
      `Categoria ${this.categoria.nome} cadastrada!`,
    );

    // Reseta o formulário mantendo o tipo atual
    const tipoAtual = this.categoria.tipo;
    this.categoria = new Categoria();
    this.categoria.tipo = tipoAtual;
  }

  async deletar(id: number) {
    const categoria = await this.categoriaService.buscarId(id);

    // Verifica se é uma categoria mãe com filhas atreladas
    const temFilhas = this.lista.some((c) => c.categoria_mae === id);
    if (temFilhas) {
      this.alertaService.erro(
        'Atenção',
        'Não pode excluir esta categoria pois ela possui subcategorias. Exclua as filhas primeiro.',
      );
      return;
    }

    this.alertaService.confirmar(
      'Confirmação',
      `Deseja realmente deletar a categoria ${categoria?.nome}?`,
      async (resultado) => {
        if (categoria && resultado) {
          await this.categoriaService.deletar(id);
        }
      },
    );
  }

  voltarInicio() {
    this.router.navigate(['/inicio']);
  }

  getNomeCategoriaMae(): string {
    const cat = this.categoriasMaeDisponiveis.find(
      (c) => c.id === this.categoria.categoria_mae,
    );
    return cat ? cat.nome! : '';
  }

  selecionarCategoriaMae(id: any) {
    this.categoria.categoria_mae = id;
  }
}
