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
  isSummarySelected: boolean = false;
  isConsultantSelected: boolean = false;
  cartTotal: number = 0;

  readonly SUMMARY_PRICE: number = 5.0;
  readonly CONSULTANT_PRICE: number = 10.0;


  constructor(private router: Router) { }

  ngOnInit() {}

  // Automatically fires whenever a user checks or unchecks a box
  calculateCartTotal() {
    let total = 0;
    if (this.isSummarySelected) {
      total += this.SUMMARY_PRICE;
    }
    if (this.isConsultantSelected) {
      total += this.CONSULTANT_PRICE;
    }
    this.cartTotal = total;
  }

  getSelectedCount(): number {
    let count = 0;
    if (this.isSummarySelected) count++;
    if (this.isConsultantSelected) count++;
    return count;
  }

  // Packs up selections and navigates to your checkout layout page smoothly
  goToCheckout() {
    this.router.navigate(['/checkout-page'], {
      queryParams: {
        report: this.isSummarySelected,
        consultant: this.isConsultantSelected
      }
    });
  }
}
