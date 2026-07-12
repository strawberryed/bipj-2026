import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // 1. Import Forms Utilities

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.page.html',
  styleUrls: ['./checkout-page.page.scss'],
  standalone: false
})
export class CheckoutPage implements OnInit {
  paymentForm!: FormGroup; // Define form structure holder
  includeReport: boolean = true;     
  includeConsultant: boolean = true; 
  totalPrice: number = 15.00;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder // 2. Inject FormBuilder
  ) { }

  ngOnInit() {
    // 3. Initialize the reactive validation fields
    this.paymentForm = this.fb.group({
      cardName: ['', [Validators.required, Validators.minLength(2)]],
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]], // Exactly 16 digits
      expiry: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\/[0-9]{2}$')]], // MM/YY format
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]] // Exactly 3 digits
    });

    this.route.queryParams.subscribe(params => {
      if (params['report'] !== undefined) this.includeReport = params['report'] === 'true';
      if (params['consultant'] !== undefined) this.includeConsultant = params['consultant'] === 'true';
      this.calculateTotal();
    });
  }

  calculateTotal() {
    let base = 0;
    if (this.includeReport) base += 5.00;
    if (this.includeConsultant) base += 10.00;
    this.totalPrice = base;
  }

  // Helper method to look up field validation status cleanly in the template HTML
  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  processPayment() {
    if (this.paymentForm.valid) {
      alert('Payment Successful! Form inputs are valid.');
      console.log('Valid Form Payload Data:', this.paymentForm.value);
    }
  }
}
