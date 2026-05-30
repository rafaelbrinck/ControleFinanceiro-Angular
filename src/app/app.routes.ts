import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { ValidacaoGuard } from '@app/core/auth/guards/validacao.guard';
import { LoginGuard } from '@app/core/auth/guards/login.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },

  // Rotas mais pesadas primeiro: dashboard (gráficos/estatísticas)
  // e telas operacionais com bastante lógica e dependências.
  {
    path: 'inicio',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/home/home.component').then(
        (m) => m.HomeComponent,
      ),
  },
  {
    path: 'transacoes',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/financeiro/components/tabela-financeiro/tabela-financeiro.component').then(
        (m) => m.TabelaFinanceiroComponent,
      ),
  },
  {
    path: 'edit/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/financeiro/components/formulario/formulario.component').then(
        (m) => m.FormularioComponent,
      ),
  },
  {
    path: 'novo',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/financeiro/components/formulario/formulario.component').then(
        (m) => m.FormularioComponent,
      ),
  },
  {
    path: 'form-categoria',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/financeiro/components/form-categoria/form-categoria.component').then(
        (m) => m.FormCategoriaComponent,
      ),
  },
  {
    path: 'form-produto',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/produtos/components/form-produto/form-produto.component').then(
        (m) => m.FormProdutoComponent,
      ),
  },
  {
    path: 'form-produto/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/produtos/components/form-produto/form-produto.component').then(
        (m) => m.FormProdutoComponent,
      ),
  },
  {
    path: 'produtos',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/produtos/pages/produtos/produtos.component').then(
        (m) => m.ProdutosComponent,
      ),
  },
  {
    path: 'clientes',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/clientes/pages/clientes/clientes.component').then(
        (m) => m.ClientesComponent,
      ),
  },
  {
    path: 'form-cliente',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/clientes/components/form-cliente/form-cliente.component').then(
        (m) => m.FormClienteComponent,
      ),
  },
  {
    path: 'form-cliente/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/clientes/components/form-cliente/form-cliente.component').then(
        (m) => m.FormClienteComponent,
      ),
  },
  {
    path: 'orcamento',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/orcamentos/pages/orcamento/orcamento.component').then(
        (m) => m.OrcamentoComponent,
      ),
  },
  {
    path: 'perfil',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/perfil/pages/perfil/perfil.component').then(
        (m) => m.PerfilComponent,
      ),
  },
  {
    path: 'lista-orcamentos',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/orcamentos/pages/lista-orcamentos/lista-orcamentos.component').then(
        (m) => m.ListaOrcamentosComponent,
      ),
  },
  {
    path: 'fornecedores',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/fornecedores/pages/fornecedores/fornecedores.component').then(
        (m) => m.FornecedoresComponent,
      ),
  },
  {
    path: 'recibo/:id',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/orcamentos/pages/recibo/recibo.component').then(
        (m) => m.ReciboComponent,
      ),
  },
  {
    path: 'cartoes',
    canActivate: [ValidacaoGuard],
    loadComponent: () =>
      import('./features/cartao/cartao.component').then(
        (m) => m.CartoesComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/common/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  },
];
