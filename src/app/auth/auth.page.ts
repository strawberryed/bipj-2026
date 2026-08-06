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
        await loader.dismiss();
        this.router.navigate(['/onboarding']);
      } else {
        // --- LOG IN FLOW ---
        const user = await this.profileService.login(this.email, this.password);

        // Tab 3 uses the local workspace database for its timeline and policy
        // data. Reuse this login there instead of presenting another sign-in.
        establishLocalSession(user.email || this.email, user.displayName || undefined);

        // Wait for Firebase Auth to fully register the session before reading
        // Firestore. Without this, isProfileComplete()'s Firestore read can fire
        // under a not-yet-authenticated state and return false even when the doc
        // exists with isOnboardingCompleted: true.
        await new Promise(resolve => setTimeout(resolve, 500));

        await loader.dismiss();

        const isComplete = await this.profileService.isProfileComplete(user.uid);
        if (isComplete) {
          this.router.navigate(['/tabs/tab1']);
        } else {
          this.showToast('No completed profile found. Please complete sign up.');
          this.router.navigate(['/onboarding']);
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
