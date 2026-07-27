import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { CustomerOnboardingPageRoutingModule } from './customer-onboarding-routing.module';

import { CustomerOnboardingPage } from './customer-onboarding.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    CustomerOnboardingPageRoutingModule
  ],
  declarations: [ CustomerOnboardingPage ]
})
export class CustomerOnboardingPageModule { }
