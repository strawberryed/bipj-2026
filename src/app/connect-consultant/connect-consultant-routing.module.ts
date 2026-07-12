import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ConsultantPage } from './connect-consultant.page';

const routes: Routes = [
  {
    path: '',
    component: ConsultantPage // Point directly to the component class
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ConnectConsultantPageRoutingModule {}
