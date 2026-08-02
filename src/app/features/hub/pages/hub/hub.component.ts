import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginService } from '@app/core/auth/services/login.service';

interface HubWidget {
  titulo: string;
  descricao: string;
  icone: string;
  rota: string;
  cor: string;
  /** Placeholder para KPIs futuros injetados no card. */
  resumo: string;
}

@Component({
  selector: 'app-hub',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hub.component.html',
  styleUrl: './hub.component.scss',
})
export class HubComponent implements OnInit {
  private readonly loginService = inject(LoginService);

  readonly nomeUsuario = signal('Rafael');

  readonly saudacao = computed(
    () => `Olá, ${this.nomeUsuario()}! O que vamos gerenciar hoje?`,
  );

  readonly widgets: HubWidget[] = [
    {
      titulo: 'Negócios',
      descricao: 'Produtos, clientes, orçamentos e fornecedores',
      icone: 'bi-briefcase-fill',
      rota: '/negocios',
      cor: 'negocios',
      resumo: '3 orçamentos pendentes',
    },
    {
      titulo: 'Financeiro',
      descricao: 'Transações, cartões e categorias',
      icone: 'bi-wallet2',
      rota: '/financeiro',
      cor: 'financeiro',
      resumo: 'Saldo do mês disponível em breve',
    },
    {
      titulo: 'Casa',
      descricao: 'Contas compartilhadas, membros e relatórios',
      icone: 'bi-house-heart-fill',
      rota: '/contas-casa',
      cor: 'casa',
      resumo: 'Acompanhe o rateio da família',
    },
    {
      titulo: 'Veículos',
      descricao: 'Frota, abastecimentos e manutenções',
      icone: 'bi-car-front-fill',
      rota: '/veiculos',
      cor: 'veiculos',
      resumo: 'Último abastecimento: há 4 dias',
    },
    {
      titulo: 'Jornada',
      descricao: 'Controle de ponto e horas trabalhadas',
      icone: 'bi-clock-history',
      rota: '/jornada',
      cor: 'jornada',
      resumo: 'Registre sua jornada do dia',
    },
  ];

  async ngOnInit(): Promise<void> {
    const user = await this.loginService.getUser();
    const nome = user?.nome?.trim() || user?.username?.trim();
    if (nome) {
      this.nomeUsuario.set(nome.split(' ')[0]!);
    }
  }
}
