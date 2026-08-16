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
  selector: 'app-veiculos-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './veiculos-layout.component.html',
  styleUrl: './veiculos-layout.component.scss',
})
export class VeiculosLayoutComponent {
  readonly sidebar = inject(ModuleSidebarService);
  readonly tituloModulo = 'Veículos';

  readonly links: ModuleNavLink[] = [
    {
      label: 'Dashboard',
      path: '/veiculos',
      exact: true,
      icon: 'bi-speedometer2',
    },
    {
      label: 'Abastecimentos',
      path: '/veiculos/abastecimentos',
      exact: true,
      icon: 'bi-fuel-pump',
    },
    {
      label: 'Manutenções',
      path: '/veiculos/manutencoes',
      exact: true,
      icon: 'bi-wrench-adjustable',
    },
  ];
}
