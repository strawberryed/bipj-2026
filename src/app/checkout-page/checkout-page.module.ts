import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common'; // Fixes *ngIf and number pipe
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular'; // Fixes ion-header, ion-input, etc.

import { CheckoutPageRoutingModule } from './checkout-page-routing.module';
import { CheckoutPage } from './checkout-page.page'; // Fixed class name here

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReactiveFormsModule,
    CheckoutPageRoutingModule
  ],
  declarations: [CheckoutPage] // Fixed class name here
})
export class CheckoutPageModule {}
