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
  selector: 'app-casa-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './casa-layout.component.html',
  styleUrl: './casa-layout.component.scss',
})
export class CasaLayoutComponent {
  readonly tituloModulo = 'Casa';

  readonly links: ModuleNavLink[] = [
    {
      label: 'Dashboard',
      path: '/contas-casa',
      exact: true,
      icon: 'bi-house-door',
    },
    {
      label: 'Membros',
      path: '/contas-casa/membros',
      exact: true,
      icon: 'bi-people',
    },
    {
      label: 'Categorias',
      path: '/contas-casa/categorias',
      exact: true,
      icon: 'bi-tags',
    },
    {
      label: 'Relatórios',
      path: '/contas-casa/relatorios',
      exact: true,
      icon: 'bi-bar-chart',
    },
  ];
}
