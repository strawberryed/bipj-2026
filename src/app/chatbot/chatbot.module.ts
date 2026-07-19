import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotPage } from './chatbot.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { ChatbotPageRoutingModule } from './chatbot-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    ChatbotPageRoutingModule
  ],
  declarations: [ChatbotPage],
  providers: []
})
export class ChatbotPageModule {}
