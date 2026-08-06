import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.page.html',
  styleUrls: ['./checkout-page.page.scss'],
  standalone: false,
})
export class CheckoutPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  paymentForm!: FormGroup;
  includeReport: boolean = true;     
  includeConsultant: boolean = true; 
  totalPrice: number = 15.00;
  selectedMethod: 'card' | 'nets' = 'card';

  ngOnInit() {
    this.paymentForm = this.fb.group({
      cardName: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-Z ]*$')]],
      cardNumber: ['', [Validators.required, Validators.pattern('^([0-9]{4}[ ]){3}[0-9]{4}$')]],
      expiry: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\/[0-9]{2}$'), this.yearRangeValidator]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]]
    });

    this.route.queryParams.subscribe(params => {
      if (params['report'] !== undefined) this.includeReport = params['report'] === 'true';
      if (params['consultant'] !== undefined) this.includeConsultant = params['consultant'] === 'true';
      this.calculateTotal();
    });
  }

  yearRangeValidator(control: AbstractControl) {
    if (!control.value || !control.value.includes('/')) return null;
    const yearSegment = parseInt(control.value.split('/')[1], 10);
    // Limits inputs explicitly between 2026 and 2031
    if (yearSegment < 26 || yearSegment > 31) {
      return { invalidYearRange: true };
    }
    return null;
  }

  calculateTotal() {
    let base = 0;
    if (this.includeReport) base += 5.00;
    if (this.includeConsultant) base += 10.00;
    this.totalPrice = base;
  }

  setPaymentMethod(method: 'card' | 'nets') {
    this.selectedMethod = method;
    if (method === 'nets') {
      this.paymentForm.disable();
    } else {
      this.paymentForm.enable();
    }
  }

  blockNonNumbers(event: any, fieldName: string, maxLength: number) {
    let input = event.target.value;
    let cleaned = input.replace(/\D/g, '');
    
    if (fieldName === 'cardNumber') {
      if (cleaned.length > 16) cleaned = cleaned.slice(0, 16);
      let match = cleaned.match(/.{1,4}/g);
      let formatted = match ? match.join(' ') : cleaned;
      this.paymentForm.get(fieldName)?.setValue(formatted, { emitEvent: false });
    } else {
      if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
      this.paymentForm.get(fieldName)?.setValue(cleaned, { emitEvent: false });
    }
  }

  formatExpiry(event: any) {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 4) input = input.slice(0, 4);
    if (input.length > 2) {
      input = input.slice(0, 2) + '/' + input.slice(2);
    }
    this.paymentForm.get('expiry')?.setValue(input, { emitEvent: false });
  }

  isFieldInvalid(fieldName: string): boolean {
    if (this.selectedMethod === 'nets') return false;
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  processPayment() {
    if (this.selectedMethod === 'card') {
      // Simulate typical card processor responses
      const cardNum = this.paymentForm.get('cardNumber')?.value.replace(/ /g, '');
      if (cardNum !== '4242424242424242') {
        alert('❌ Sandbox Error: Please use the designated test card details provided above.');
        return;
      }
      alert('💳 Sandbox Authorization Successful! Card processed successfully.');
    } else {
      alert('🇸🇬 NETS QR Dynamic Broadcast Token Verified!');
    }

    // Direct back to page with verification variables passed
    this.router.navigate(['/connect-consultant'], {
      queryParams: { unlocked: 'true' }
    });
  }
}
