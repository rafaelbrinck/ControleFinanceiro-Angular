import { Routes } from '@angular/router';
import { TabelaFinanceiroComponent } from './components/tabela-financeiro/tabela-financeiro.component';
import { FormularioComponent } from './components/formulario/formulario.component';
import { RelatorioComponent } from './components/relatorio/relatorio.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { FormCategoriaComponent } from './components/form-categoria/form-categoria.component';
import { LoginComponent } from './components/login/login.component';
import { ValidacaoGuard } from './guard/validacao.guard';
import { LoginGuard } from './guard/login.guard';
import { ProdutosComponent } from './components/produtos/produtos.component';
import { FormProdutoComponent } from './components/form-produto/form-produto.component';
import { ClientesComponent } from './components/clientes/clientes.component';
import { FormClienteComponent } from './components/form-cliente/form-cliente.component';

export const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full' },
  { path: '', component: LoginComponent, canActivate: [LoginGuard] },

  {
    path: 'transacoes',
    component: TabelaFinanceiroComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'edit/:id',
    component: FormularioComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'novo',
    component: FormularioComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'inicio',
    component: RelatorioComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'form-categoria',
    component: FormCategoriaComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'form-produto',
    component: FormProdutoComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'form-produto/:id',
    component: FormProdutoComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'produtos',
    component: ProdutosComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'clientes',
    component: ClientesComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'form-cliente',
    component: FormClienteComponent,
    canActivate: [ValidacaoGuard],
  },
  {
    path: 'form-cliente/:id',
    component: FormClienteComponent,
    canActivate: [ValidacaoGuard],
  },
  { path: '**', component: PageNotFoundComponent },
];
