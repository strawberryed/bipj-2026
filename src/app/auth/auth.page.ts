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

  toggleMode() {
    if (this.loginRole === 'consultant') return;
    this.isSignUpMode = !this.isSignUpMode;
  }

  selectLoginRole(role: 'customer' | 'consultant'): void {
    this.loginRole = role;
    if (role === 'consultant') this.isSignUpMode = false;
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

    const loader = await this.loadingCtrl.create({
      message: this.isSignUpMode ? 'Validating credentials...' : 'Logging in...'
    });
    await loader.present();

    try {
      if (this.isSignUpMode) {
        const user = await this.profileService.signUp(this.email, this.password, this.fullName);

        await new Promise(resolve => setTimeout(resolve, 500));
        await loader.dismiss();

        // ── NEW: Route to profile setup first, then onboarding ──
        this.router.navigate(['/setup-profile']);
      } else {
        // --- LOG IN FLOW ---
        await this.profileService.login(this.email, this.password);

        await new Promise(resolve => setTimeout(resolve, 500));

        // ── UPDATED: Check both profile setup AND onboarding completion ──
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
          // Fully completed user → main app
          this.router.navigate(['/tabs/tab1']);
        } else if (profile?.isProfileSetupComplete) {
          // Set up profile but didn't finish onboarding → resume onboarding
          this.showToast('Let\'s finish setting up your profile.');
          this.router.navigate(['/onboarding']);
        } else {
          // Account exists but never set up profile → start from profile setup
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
