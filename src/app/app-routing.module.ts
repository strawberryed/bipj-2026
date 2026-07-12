import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'tab4',
    loadChildren: () => import('./tab4/tab4.module').then( m => m.Tab4PageModule)
  },
  {
    path: 'connect-consultant',
    loadChildren: () => import('./connect-consultant/connect-consultant.module').then( m => m.ConnectConsultantPageModule)
  },
  {
    path: 'upgrade',
    loadChildren: () => import('./upgrade/upgrade.module').then( m => m.UpgradePageModule)
  },
  {
    path: 'checkout-page',
    loadChildren: () => import('./checkout-page/checkout-page.module').then( m => m.CheckoutPageModule)
  }

];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
