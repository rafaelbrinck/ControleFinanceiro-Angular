import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ModuleNavLink {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-financeiro-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './financeiro-layout.component.html',
  styleUrl: './financeiro-layout.component.scss',
})
export class FinanceiroLayoutComponent {
  readonly tituloModulo = 'Financeiro';

  readonly links: ModuleNavLink[] = [
    {
      label: 'Dashboard',
      path: '/financeiro',
      exact: true,
      icon: 'bi-graph-up',
    },
    {
      label: 'Transações',
      path: '/financeiro/transacoes',
      icon: 'bi-currency-exchange',
    },
    {
      label: 'Cartões',
      path: '/financeiro/cartoes',
      icon: 'bi-credit-card',
    },
    {
      label: 'Categorias',
      path: '/financeiro/form-categoria',
      icon: 'bi-tags',
    },
  ];
}
