import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-page-not-found',
  imports: [RouterModule],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.css',
})
export class PageNotFoundComponent {
  constructor(private location: Location) {}

  voltar() {
    this.location.back();
  }
}
