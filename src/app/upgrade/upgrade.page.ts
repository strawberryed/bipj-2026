import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upgrade',
  templateUrl: './upgrade.page.html',
  styleUrls: ['./upgrade.page.scss'],
  standalone: false
})
export class UpgradePage implements OnInit {
  // Cart state tracking
  isReportSelected: boolean = false;
  isConsultantSelected: boolean = false;
  cartTotal: number = 0;

  constructor(private router: Router) { }

  ngOnInit() {}

  // Automatically fires whenever a user checks or unchecks a box
  updateTotal() {
    let total = 0;
    if (this.isReportSelected) total += 5.00;
    if (this.isConsultantSelected) total += 10.00;
    this.cartTotal = total;
  }

  getSelectedCount(): number {
    let count = 0;
    if (this.isReportSelected) count++;
    if (this.isConsultantSelected) count++;
    return count;
  }

  // Packs up selections and navigates to your checkout layout page smoothly
  goToCheckout() {
    this.router.navigate(['/checkout-page'], {
      queryParams: {
        report: this.isReportSelected,
        consultant: this.isConsultantSelected
      }
    });
  }
}
