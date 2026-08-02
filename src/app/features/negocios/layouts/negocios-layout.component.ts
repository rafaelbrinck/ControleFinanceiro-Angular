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
  selector: 'app-negocios-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './negocios-layout.component.html',
  styleUrl: './negocios-layout.component.scss',
})
export class NegociosLayoutComponent {
  readonly tituloModulo = 'Negócios';

  readonly links: ModuleNavLink[] = [
    { label: 'Produtos', path: '/negocios/produtos', icon: 'bi-box-seam' },
    { label: 'Clientes', path: '/negocios/clientes', icon: 'bi-people' },
    { label: 'Orçamentos', path: '/negocios/orcamento', icon: 'bi-calculator' },
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
