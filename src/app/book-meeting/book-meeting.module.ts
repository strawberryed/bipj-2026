import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BookMeetingPageRoutingModule } from './book-meeting-routing.module';

import { BookMeetingPage } from './book-meeting.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BookMeetingPageRoutingModule
  ],
  declarations: [BookMeetingPage]
})
export class BookMeetingPageModule {}
