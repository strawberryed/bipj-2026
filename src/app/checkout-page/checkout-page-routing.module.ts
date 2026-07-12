import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CheckoutPage } from './checkout-page.page'; // Fixed class name here

const routes: Routes = [
  {
    path: '',
    component: CheckoutPage // Fixed class name here
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CheckoutPageRoutingModule {}
