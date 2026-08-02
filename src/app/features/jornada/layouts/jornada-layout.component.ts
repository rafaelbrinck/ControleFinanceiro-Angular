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
  selector: 'app-jornada-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './jornada-layout.component.html',
  styleUrl: './jornada-layout.component.scss',
})
export class JornadaLayoutComponent {
  readonly tituloModulo = 'Controle de Jornada';

  readonly links: ModuleNavLink[] = [
    {
      label: 'Jornada',
      path: '/jornada',
      exact: true,
      icon: 'bi-clock-history',
    },
  ];
}
