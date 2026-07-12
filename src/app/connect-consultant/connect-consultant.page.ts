import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // 1. Import Angular Router

@Component({
  selector: 'app-consultant',
  templateUrl: './connect-consultant.page.html',
  styleUrls: ['./connect-consultant.page.scss'],
  standalone: false
})
export class ConsultantPage implements OnInit {
  isPaidUser: boolean = false;

  // 2. Inject router in constructor
  constructor(private router: Router) { }

  ngOnInit() {}

  // 3. Update method to redirect the user
  upgradeUser() {
    this.router.navigate(['/upgrade']);
  }
}
  