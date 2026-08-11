import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'tab4',
    loadChildren: () => import('./tab4/tab4.module').then(m => m.Tab4PageModule)
  },
  {
    path: 'connect-consultant',
    loadChildren: () => import('./connect-consultant/connect-consultant.module').then(m => m.ConnectConsultantPageModule)
  },
  {
    path: 'upgrade',
    loadChildren: () => import('./upgrade/upgrade.module').then(m => m.UpgradePageModule)
  },
  {
    path: 'checkout-page',
    loadChildren: () => import('./checkout-page/checkout-page.module').then(m => m.CheckoutPageModule)
  },
  {
    path: 'book-meeting',
    loadChildren: () => import('./book-meeting/book-meeting.module').then(m => m.BookMeetingPageModule)
  },
  {
    path: 'onboarding',
    loadChildren: () => import('./onboarding/onboarding.module').then(m => m.OnboardingPageModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthPageModule)
  },  {
    path: 'setup-profile',
    loadChildren: () => import('./setup-profile/setup-profile.module').then( m => m.SetupProfilePageModule)
  },
  {
    path: 'edit-profile',
    loadChildren: () => import('./edit-profile/edit-profile.module').then( m => m.EditProfilePageModule)
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
