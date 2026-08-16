import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService } from '../services/user-profile.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: false,
})
export class AuthPage {
  private profileService = inject(UserProfileService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  isSignUpMode: boolean = false;
  loginRole: 'customer' | 'consultant' = 'customer';

  fullName: string = '';
  email: string = '';
  password: string = '';
  phoneNumber: string = '';

  toggleMode() {
    if (this.loginRole === 'consultant') return;
    this.isSignUpMode = !this.isSignUpMode;
  }

  selectLoginRole(role: 'customer' | 'consultant'): void {
    this.loginRole = role;
    if (role === 'consultant') this.isSignUpMode = false;
  }

  // Very light validation: Singapore-style 8-digit local numbers (starting
  // 6/8/9) or full international E.164 (+ followed by 8-15 digits). This is
  // a UX guard, not a security control — real phone verification would need
  // Firebase Phone Auth (SMS OTP), which is a separate, heavier feature.
  private isValidPhoneNumber(value: string): boolean {
    const trimmed = value.trim();
    return /^\+?[0-9]{8,15}$/.test(trimmed.replace(/[\s-]/g, ''));
  }

  // Normalizes to E.164-ish format for storage. Assumes Singapore (+65) if
  // no country code was given — adjust the default country code if your
  // user base isn't primarily SG-based.
  private normalizePhoneNumber(value: string): string {
    const digitsOnly = value.trim().replace(/[\s-]/g, '');
    if (digitsOnly.startsWith('+')) return digitsOnly;
    return `+65${digitsOnly}`;
  }

  async handleAuth() {
    if (!this.email || !this.password) {
      this.showToast('Please fill in all required fields.');
      return;
    }

    if (this.isSignUpMode && !this.fullName) {
      this.showToast('Please enter your full name.');
      return;
    }

    if (this.isSignUpMode && !this.phoneNumber) {
      this.showToast('Please enter your phone number — it\'s used for your consultant bookings.');
      return;
    }

    if (this.isSignUpMode && !this.isValidPhoneNumber(this.phoneNumber)) {
      this.showToast('Please enter a valid phone number.');
      return;
    }

    const loader = await this.loadingCtrl.create({
      message: this.isSignUpMode ? 'Validating credentials...' : 'Logging in...'
    });
    await loader.present();

    try {
      if (this.isSignUpMode) {
        await this.profileService.signUp(this.email, this.password, this.fullName, this.normalizePhoneNumber(this.phoneNumber));

        await new Promise(resolve => setTimeout(resolve, 500));
        await loader.dismiss();

        this.router.navigate(['/setup-profile']);
      } else {
        await this.profileService.login(this.email, this.password);

        await new Promise(resolve => setTimeout(resolve, 500));

        const profile = await this.profileService.getCurrentProfile();

        const accountRole = profile?.role ?? 'customer';
        if (accountRole !== this.loginRole) {
          await this.profileService.logout();
          throw new Error(this.loginRole === 'consultant'
            ? 'This account is not registered as a consultant.'
            : 'This is a consultant account. Choose Consultant login instead.');
        }

        await loader.dismiss();

        if (accountRole === 'consultant') {
          this.router.navigate(['/tabs/tab3']);
          return;
        }

        if (profile?.isOnboardingCompleted) {
          this.router.navigate(['/tabs/tab1']);
        } else if (profile?.isProfileSetupComplete) {
          this.showToast('Let\'s finish setting up your profile.');
          this.router.navigate(['/onboarding']);
        } else {
          this.showToast('Let\'s set up your profile.');
          this.router.navigate(['/setup-profile']);
        }
      }
    } catch (error: any) {
      await loader.dismiss();
      this.showToast(error.message || 'Authentication failed.');
    }
  }

  private async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      color: 'dark',
      position: 'bottom'
    });
    toast.present();
  }
}
