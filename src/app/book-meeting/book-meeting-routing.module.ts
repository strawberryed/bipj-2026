import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BookMeetingPage } from './book-meeting.page';

const routes: Routes = [
  {
    path: '',
    component: BookMeetingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BookMeetingPageRoutingModule {}
