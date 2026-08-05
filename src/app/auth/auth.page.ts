import { Component } from '@angular/core';
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
  isSignUpMode: boolean = false;

  fullName: string = '';
  email: string = '';
  password: string = '';

  constructor(
    private profileService: UserProfileService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

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
        // Direct users into the questionnaire before persisting profile completion
        await loader.dismiss();
        this.router.navigate(['/onboarding']);
      } else {
        // --- LOG IN FLOW ---
        const user = await this.profileService.login(this.email, this.password);
        await loader.dismiss();

        const isComplete = await this.profileService.isProfileComplete(user.uid);
        if (isComplete) {
          this.router.navigate(['/landing-page']);
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
