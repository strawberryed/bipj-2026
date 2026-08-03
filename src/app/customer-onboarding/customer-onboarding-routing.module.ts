import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CustomerOnboardingPage } from './customer-onboarding.page';

const routes: Routes = [
  {
    path: '',
    component: CustomerOnboardingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerOnboardingPageRoutingModule {}
