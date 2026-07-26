import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlertaService } from '@app/core/services/alerta.service';
import { CategoriaFamilia } from '@app/shared/models/familia';
import { FamilyService } from '../../services/family.service';

const CORES_PADRAO = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

@Component({
  selector: 'app-categorias-familia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './categorias-familia.component.html',
  styleUrl: './categorias-familia.component.css',
})
export class CategoriasFamiliaComponent implements OnInit {
  private readonly familyService = inject(FamilyService);
  private readonly alertaService = inject(AlertaService);
  private readonly router = inject(Router);

  readonly familia = this.familyService.familiaAtual;
  readonly categorias = this.familyService.categorias;
  readonly ehAdmin = this.familyService.ehAdmin;
  readonly carregando = this.familyService.carregando;
  readonly salvando = signal(false);

  readonly cores = CORES_PADRAO;

  nome = '';
  cor = CORES_PADRAO[0];
  editando: CategoriaFamilia | null = null;

  async ngOnInit(): Promise<void> {
    // Cache em memória (forceRefresh só após logout / troca de usuário via limparEstado)
    await this.familyService.carregarFamiliaDoUsuario();

    if (!this.familia()) {
      this.alertaService.info('Família', 'Você precisa pertencer a uma família.');
      this.router.navigate(['/contas-casa']);
      return;
    }

    if (!this.ehAdmin()) {
      this.alertaService.info(
        'Acesso restrito',
        'Apenas o administrador da família pode gerenciar categorias.',
      );
      this.router.navigate(['/contas-casa']);
    }
  }

  iniciarEdicao(categoria: CategoriaFamilia): void {
    this.editando = categoria;
    this.nome = categoria.nome;
    this.cor = categoria.cor || CORES_PADRAO[0];
  }

  cancelarEdicao(): void {
    this.editando = null;
    this.nome = '';
    this.cor = CORES_PADRAO[0];
  }

  async salvar(): Promise<void> {
    const familia = this.familia();
    if (!familia) return;

    const nome = this.nome.trim();
    if (!nome) {
      this.alertaService.info('Obrigatório', 'Informe o nome da categoria.');
      return;
    }

    this.salvando.set(true);
    try {
      if (this.editando) {
        const res = await this.familyService.atualizarCategoria(this.editando.id, {
          nome,
          cor: this.cor,
        });
        if (!res.ok) {
          this.alertaService.erro('Erro', res.mensagem || 'Falha ao atualizar.');
          return;
        }
        this.alertaService.sucesso('Sucesso', 'Categoria atualizada!');
      } else {
        const res = await this.familyService.criarCategoria({
          nome,
          cor: this.cor,
          id_familia: familia.id,
        });
        if (!res.ok) {
          this.alertaService.erro('Erro', res.mensagem || 'Falha ao criar.');
          return;
        }
        this.alertaService.sucesso('Sucesso', 'Categoria criada!');
      }

      this.cancelarEdicao();
    } finally {
      this.salvando.set(false);
    }
  }

  confirmarExclusao(categoria: CategoriaFamilia): void {
    this.alertaService.confirmar(
      'Excluir categoria',
      `Deseja excluir "${categoria.nome}"? Contas vinculadas podem impedir a exclusão.`,
      async (ok) => {
        if (!ok) return;
        const res = await this.familyService.removerCategoria(categoria.id);
        if (!res.ok) {
          this.alertaService.erro('Erro', res.mensagem || 'Falha ao excluir.');
          return;
        }
        this.alertaService.sucesso('Sucesso', 'Categoria excluída.');
        if (this.editando?.id === categoria.id) {
          this.cancelarEdicao();
        }
      },
    );
  }
}
