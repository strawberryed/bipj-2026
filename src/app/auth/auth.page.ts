import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService } from '../services/user-profile.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { establishLocalSession } from '../../data/app-db';

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

  fullName: string = '';
  email: string = '';
  password: string = '';

  toggleMode() {
    this.isSignUpMode = !this.isSignUpMode;
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
        establishLocalSession(user.email || this.email, this.fullName);

        await new Promise(resolve => setTimeout(resolve, 500));
        await loader.dismiss();

        // ── NEW: Route to profile setup first, then onboarding ──
        this.router.navigate(['/setup-profile']);
      } else {
        // --- LOG IN FLOW ---
        const user = await this.profileService.login(this.email, this.password);
        establishLocalSession(user.email || this.email, user.displayName || undefined);

        await new Promise(resolve => setTimeout(resolve, 500));
        await loader.dismiss();

        // ── UPDATED: Check both profile setup AND onboarding completion ──
        const profile = await this.profileService.getCurrentProfile();

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