import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ConnectConsultantPageRoutingModule } from './connect-consultant-routing.module';
import { ConsultantPage } from './connect-consultant.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ConnectConsultantPageRoutingModule
  ],
  declarations: [
    ConsultantPage // Declares the page component
  ]
})
export class ConnectConsultantPageModule {}
