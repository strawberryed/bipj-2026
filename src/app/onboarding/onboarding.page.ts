import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService } from '../services/user-profile.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false,
})
export class OnboardingPage implements OnInit {
  currentStep: number = 1;

  // Step 1 Form Fields (initialized empty)
  fullName: string = '';
  age: number | null = null;
  occupation: string = '';
  monthlyIncome: number | null = null;
  maritalStatus: string = '';

  // Step 2 Form Fields
  hasInsurance: boolean | null = null;
  mainGoal: string = '';
  monthlyBudget: number = 300;
  primaryConcern: string = '';

  // Validation Error States
  ageError: string = ''; // Stores inline error message for age
  readonly MINIMUM_AGE: number = 18;


  constructor(
    private profileService: UserProfileService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() { }

  nextStep() {
    // Reset errors
    this.ageError = '';

    // Check if required fields are filled
    if (!this.fullName || !this.age || !this.occupation || !this.monthlyIncome || !this.maritalStatus) {
      this.showToast('Please fill in all fields before proceeding.');
      return;
    }

    // Inline Age Validation
    if (this.age < this.MINIMUM_AGE) {
      this.ageError = `You must be at least ${this.MINIMUM_AGE} years old to use this app.`;
      return; // Stop navigation
    }

    // Move to step 2 if valid
    this.currentStep = 2;
  }

  prevStep() {
    this.currentStep = 1;
  }

  async finishOnboarding() {
    if (this.hasInsurance === null || this.hasInsurance === undefined || !this.mainGoal || !this.primaryConcern) {
      this.showToast('Please complete all questions.');
      return;
    }

    const loader = await this.loadingCtrl.create({
      message: 'Generating your profile...',
    });
    await loader.present();

    try {
      // Field names deliberately match what saveOnboardingProfile expects
      // and what the rest of the app (Cova's personalization, insights
      // generation) reads. saveOnboardingProfile sets isOnboardingCompleted
      // and derives insights automatically.
      const profileData = {
        fullName: this.fullName,
        age: Number(this.age),
        occupation: this.occupation,
        monthlyIncome: Number(this.monthlyIncome),
        maritalStatus: this.maritalStatus,
        hasExistingInsurance: !!this.hasInsurance,
        mainGoals: [this.mainGoal],
        monthlyBudget: this.monthlyBudget,
        topConcern: this.primaryConcern
      };

      await this.profileService.saveOnboardingProfile(profileData);

      await loader.dismiss();
      this.router.navigate(['/tabs/tab1']);
    } catch (error: any) {
      await loader.dismiss();
      this.showToast(error.message || 'Failed to save profile.');
    }
  }

  private async showToast(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: 'dark',
      position: 'bottom'
    });
    toast.present();
  }
}
