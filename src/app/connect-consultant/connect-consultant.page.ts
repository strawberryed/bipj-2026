import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router'; // 1. Import Angular Router

@Component({
  selector: 'app-consultant',
  templateUrl: './connect-consultant.page.html',
  styleUrls: ['./connect-consultant.page.scss'],
  standalone: false
})
export class ConsultantPage implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isPaidUser: boolean = false;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['unlocked'] === 'true') {
        this.isPaidUser = true;
      }
    });
  }

  // 3. Update method to redirect the user
  upgradeUser() {
    this.router.navigate(['/upgrade']);
  }

  goToBooking() {
    // Navigates the window display stack directly into tab4
    this.router.navigate(['/book-meeting']);
  }
}
