import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth } from '@angular/fire/auth';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { EntitlementsService } from '../services/entitlement.service';

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout-page.page.html',
  styleUrls: ['./checkout-page.page.scss'],
  standalone: false,
})
export class CheckoutPage implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private entitlements = inject(EntitlementsService);
  private functions = inject(Functions);
  private auth = inject(Auth);

  paymentForm!: FormGroup;
  includeReport: boolean = true;
  includeConsultant: boolean = true;
  totalPrice: number = 15.00;
  selectedMethod: 'card' | 'nets' = 'card';

  isProcessing = false;
  cardErrorMessage = '';

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;
  ngOnInit() {
    // Card number, expiry, and CVV are now collected by Stripe's own Card
    // Element (mounted in ngAfterViewInit) — never by our own form fields,
    // so raw card data never touches this component or our server.
    this.paymentForm = this.fb.group({
      cardName: ['', [Validators.required, Validators.minLength(2), Validators.pattern('^[a-zA-Z ]*$')]],
    });

    this.route.queryParams.subscribe(params => {
      if (params['report'] !== undefined) this.includeReport = params['report'] === 'true';
      if (params['consultant'] !== undefined) this.includeConsultant = params['consultant'] === 'true';
      this.calculateTotal();
    });
  }

  async ngAfterViewInit() {
    this.stripe = await loadStripe(environment.stripePublishableKey);
    if (this.selectedMethod === 'card') {
      this.mountCardElement();
    }
  }

  ngOnDestroy() {
    this.cardElement?.unmount();
  }

  private mountCardElement() {
    if (!this.stripe) return;
    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card', {
      style: { base: { fontSize: '16px' } },
    });
    this.cardElement.mount('#card-element');
    this.cardElement.on('change', (event) => {
      this.cardErrorMessage = event.error ? event.error.message : '';
    });
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
      this.cardElement?.unmount();
    } else {
      this.paymentForm.enable();
      // Re-mount on the next tick so #card-element exists in the DOM again.
      setTimeout(() => this.mountCardElement());
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    if (this.selectedMethod === 'nets') return false;
    const field = this.paymentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  async processPayment() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.cardErrorMessage = '';

    try {
      if (this.selectedMethod === 'card') {
        await this.payWithCard();
      } else {
        // NETS QR stays simulated here — Stripe doesn't support NETS, so a real
        // NETS integration would go through a separate SG payment gateway.
        alert('🇸🇬 NETS QR Dynamic Broadcast Token Verified! (simulated)');
      }

      // Persist entitlements based on what was actually purchased.
      await this.entitlements.grant({
        consultant: this.includeConsultant,
        report: this.includeReport
      });
      this.router.navigate(['/connect-consultant']);
    } catch (error: any) {
      this.cardErrorMessage = error.message || 'Something went wrong. Please try again.';
    } finally {
      this.isProcessing = false;
    }
  }

  private async payWithCard(): Promise<void> {
    if (!this.stripe || !this.cardElement) {
      throw new Error('Payment form is still loading — please try again in a moment.');
    }
    if (!this.auth.currentUser) {
      throw new Error('Please sign in before checking out.');
    }

    // Ask our Cloud Function for a PaymentIntent. The amount is computed
    // server-side from includeReport/includeConsultant — the client never
    // gets to say how much to charge.
    const createPaymentIntent = httpsCallable<
      { includeReport: boolean; includeConsultant: boolean },
      { clientSecret: string }
    >(this.functions, 'createPaymentIntent');

    const { data } = await createPaymentIntent({
      includeReport: this.includeReport,
      includeConsultant: this.includeConsultant,
    });

    const result = await this.stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: this.cardElement,
        billing_details: { name: this.paymentForm.get('cardName')?.value },
      },
    });

    if (result.error) {
      throw new Error(result.error.message || 'Card was declined.');
    }
    if (result.paymentIntent?.status !== 'succeeded') {
      throw new Error(`Payment status: ${result.paymentIntent?.status}. Please try again.`);
    }
  }
}
