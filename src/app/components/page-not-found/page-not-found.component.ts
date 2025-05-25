import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ValidacaoService } from '../../service/validacao.service';

@Component({
  selector: 'app-page-not-found',
  imports: [RouterModule],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.css',
})
export class PageNotFoundComponent {
  constructor(private router: Router, private validacao: ValidacaoService) {}

  voltar() {
    if (this.validacao.confirmaAutenticacao()) {
      this.router.navigate(['/inicio']);
    } else {
      this.router.navigate(['']);
    }
  }
}
