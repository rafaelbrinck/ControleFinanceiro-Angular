import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AlertaService } from '@app/core/services/alerta.service';
import {
  MembroFamiliaDetalhado,
  RoleMembroFamilia,
  UsuarioFamilia,
} from '@app/shared/models/familia';
import { FamilyService } from '../../services/family.service';

@Component({
  selector: 'app-membros-familia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './membros-familia.component.html',
  styleUrl: './membros-familia.component.css',
})
export class MembrosFamiliaComponent implements OnInit {
  private readonly familyService = inject(FamilyService);
  private readonly alertaService = inject(AlertaService);
  private readonly router = inject(Router);

  readonly familia = this.familyService.familiaAtual;
  readonly membros = this.familyService.membros;
  readonly ehAdmin = this.familyService.ehAdmin;
  readonly carregando = this.familyService.carregando;
  readonly salvando = signal(false);
  readonly buscando = signal(false);

  usernameBusca = '';
  usuarioEncontrado: UsuarioFamilia | null = null;
  roleNovo: RoleMembroFamilia = 'membro';

  modalAberto = signal(false);
  membroEditando: MembroFamiliaDetalhado | null = null;
  roleEdicao: RoleMembroFamilia = 'membro';

  async ngOnInit(): Promise<void> {
    // Sempre recarrega para evitar estado stale após troca de usuário.
    await this.familyService.carregarFamiliaDoUsuario();

    if (!this.familia()) {
      this.alertaService.info('Família', 'Você precisa pertencer a uma família.');
      this.router.navigate(['/contas-casa']);
      return;
    }

    if (!this.ehAdmin()) {
      this.alertaService.info(
        'Acesso restrito',
        'Apenas o administrador da família pode gerenciar membros.',
      );
      this.router.navigate(['/contas-casa']);
    }
  }

  async buscarUsuario(): Promise<void> {
    const termo = this.usernameBusca.trim();
    if (!termo) {
      this.alertaService.info('Obrigatório', 'Informe o e-mail/usuário.');
      return;
    }

    this.buscando.set(true);
    this.usuarioEncontrado = null;
    try {
      const user = await this.familyService.buscarUsuarioPorUsername(termo);
      if (!user) {
        this.alertaService.info(
          'Não encontrado',
          'Nenhum usuário com esse e-mail/usuário.',
        );
        return;
      }
      this.usuarioEncontrado = user;
    } finally {
      this.buscando.set(false);
    }
  }

  async adicionarMembro(): Promise<void> {
    const familia = this.familia();
    const user = this.usuarioEncontrado;
    if (!familia || !user?.id) return;

    this.salvando.set(true);
    try {
      const res = await this.familyService.adicionarMembro({
        id_familia: familia.id,
        id_membro: user.id,
        role: this.roleNovo,
      });

      if (!res.ok) {
        this.alertaService.erro('Erro', res.mensagem || 'Falha ao adicionar.');
        return;
      }

      this.alertaService.sucesso('Sucesso', 'Membro adicionado!');
      this.usernameBusca = '';
      this.usuarioEncontrado = null;
      this.roleNovo = 'membro';
    } finally {
      this.salvando.set(false);
    }
  }

  abrirEdicao(membro: MembroFamiliaDetalhado): void {
    if (this.ehTitular(membro)) {
      this.alertaService.info(
        'Titular',
        'O papel do administrador titular não pode ser alterado.',
      );
      return;
    }
    this.membroEditando = membro;
    this.roleEdicao = (membro.role as RoleMembroFamilia) || 'membro';
    this.modalAberto.set(true);
  }

  fecharModal(): void {
    this.modalAberto.set(false);
    this.membroEditando = null;
  }

  async salvarEdicao(): Promise<void> {
    if (!this.membroEditando) return;

    this.salvando.set(true);
    try {
      const res = await this.familyService.atualizarMembro(
        this.membroEditando.id,
        { role: this.roleEdicao },
      );

      if (!res.ok) {
        this.alertaService.erro('Erro', res.mensagem || 'Falha ao atualizar.');
        return;
      }

      this.alertaService.sucesso('Sucesso', 'Membro atualizado!');
      this.fecharModal();
    } finally {
      this.salvando.set(false);
    }
  }

  confirmarExclusao(membro: MembroFamiliaDetalhado): void {
    const nome =
      membro.usuario?.nome || membro.usuario?.username || 'este membro';

    this.alertaService.confirmar(
      'Remover membro',
      `Deseja remover ${nome} da família?`,
      async (ok) => {
        if (!ok) return;
        const res = await this.familyService.removerMembro(membro.id);
        if (!res.ok) {
          this.alertaService.erro('Erro', res.mensagem || 'Falha ao remover.');
          return;
        }
        this.alertaService.sucesso('Sucesso', 'Membro removido.');
      },
    );
  }

  nomeMembro(membro: MembroFamiliaDetalhado): string {
    return (
      membro.usuario?.nome ||
      membro.usuario?.username ||
      'Usuário sem nome'
    );
  }

  ehTitular(membro: MembroFamiliaDetalhado): boolean {
    return this.familia()?.adm_id === membro.id_membro;
  }

  labelRole(role: string): string {
    return role === 'admin' ? 'Administrador' : 'Membro';
  }
}
