import { Routes } from '@angular/router';
import { TabelaFinanceiroComponent } from './tabela-financeiro/tabela-financeiro.component';
import { FormularioComponent } from './formulario/formulario.component';
import { RelatorioComponent } from './relatorio/relatorio.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { FormCategoriaComponent } from './form-categoria/form-categoria.component';

export const routes: Routes = [
  { path: 'tabela', component: TabelaFinanceiroComponent },
  { path: 'edit/:id', component: FormularioComponent },
  { path: 'novo', component: FormularioComponent },
  { path: 'inicio', component: RelatorioComponent },
  { path: 'form-categoria', component: FormCategoriaComponent },
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];
