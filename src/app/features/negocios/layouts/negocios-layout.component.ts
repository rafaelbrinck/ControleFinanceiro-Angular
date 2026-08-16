import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ModuleSidebarService } from '@app/shared/services/module-sidebar.service';

interface ModuleNavLink {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-negocios-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './negocios-layout.component.html',
  styleUrl: './negocios-layout.component.scss',
})
export class NegociosLayoutComponent {
  readonly sidebar = inject(ModuleSidebarService);
  readonly tituloModulo = 'Negócios';

  readonly links: ModuleNavLink[] = [
    {
      label: 'Dashboard',
      path: '/negocios',
      exact: true,
      icon: 'bi-graph-up',
    },
    { label: 'Orçamentos', path: '/negocios/orcamento', icon: 'bi-calculator' },
    { label: 'Clientes', path: '/negocios/clientes', icon: 'bi-people' },
    {
      label: 'Transações',
      path: '/negocios/transacoes',
      icon: 'bi-currency-exchange',
    },
    {
      label: 'Cartões',
      path: '/negocios/cartoes',
      icon: 'bi-credit-card',
    },
    {
      label: 'Categorias',
      path: '/negocios/form-categoria',
      icon: 'bi-tags',
    },
    { label: 'Produtos', path: '/negocios/produtos', icon: 'bi-box-seam' },
    {
      label: 'Lista de orçamentos',
      path: '/negocios/lista-orcamentos',
      icon: 'bi-journal-text',
    },
    {
      label: 'Fornecedores',
      path: '/negocios/fornecedores',
      icon: 'bi-buildings',
    },
  ];
}
