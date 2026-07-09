import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  todayDate: Date = new Date();

  constructor() { }

  ngOnInit() {
    // Optionally refresh the date when the component initializes
    this.todayDate = new Date();
  }

}
