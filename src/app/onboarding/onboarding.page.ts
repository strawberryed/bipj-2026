import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserProfileService, ExistingPlan } from '../services/user-profile.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { updateCurrentLocalUserProfile } from '../../data/app-db';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: false,
})
export class OnboardingPage {
  private profileService = inject(UserProfileService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  currentStep: number = 1;

  // Step 1 Form Fields (initialized empty)
  fullName: string = '';
  age: number | null = null;
  occupation: string = '';
  monthlyIncome: number | null = null;
  maritalStatus: string = '';
  dependents: number = 0;

  // Step 2 Form Fields
  hasInsurance: boolean | null = null;
  mainGoal: string = '';
  monthlyBudget: number = 300;
  primaryConcern: string = '';

  // Existing insurance plans — only shown when hasInsurance === true.
  // Users can add multiple plans, each with plan name (required),
  // insurer (optional), and freeform notes (optional).
  existingPlans: ExistingPlan[] = [];

  // Validation Error States
  ageError: string = ''; // Stores inline error message for age
  readonly MINIMUM_AGE: number = 18;

  // Helpers for the existing-plans dynamic list

  addExistingPlan() {
    if (this.existingPlans.length >= 10) {
      this.showToast('You can add up to 10 plans.');
      return;
    }
    this.existingPlans.push({ name: '', insurer: '', notes: '' });
  }

  removeExistingPlan(index: number) {
    this.existingPlans.splice(index, 1);
  }

  // ngFor trackBy — keeps input focus stable when the array mutates
  trackByIndex(index: number): number {
    return index;
  }

  // Reset the list when the user flips hasInsurance to No,
  // so we don't accidentally save stale entries.
  onHasInsuranceChange() {
    if (this.hasInsurance === false) {
      this.existingPlans = [];
    }
  }

  nextStep() {
    // Reset errors
    this.ageError = '';

    // Check if required fields are filled
    if (!this.fullName || !this.age || !this.occupation || !this.monthlyIncome || !this.maritalStatus || this.dependents === null || this.dependents === undefined) {
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

  goBack() {
    this.router.navigate(['/setup-profile']);
  }

  prevStep() {
    this.currentStep = 1;
  }

  async finishOnboarding() {
    if (this.hasInsurance === null || this.hasInsurance === undefined || !this.mainGoal || !this.primaryConcern) {
      this.showToast('Please complete all questions.');
      return;
    }

    // Clean up existing plans: drop rows where the user added an entry
    // but didn't fill in a name. For optional fields, OMIT them entirely
    // when empty rather than setting them to undefined — Firestore rejects
    // undefined values and setDoc will fail with an "invalid data" error.
    const cleanedExistingPlans: ExistingPlan[] = this.hasInsurance
      ? this.existingPlans
        .map(p => {
          const cleaned: ExistingPlan = { name: (p.name ?? '').trim() };
          const insurer = (p.insurer ?? '').trim();
          const notes = (p.notes ?? '').trim();
          if (insurer) cleaned.insurer = insurer;
          if (notes) cleaned.notes = notes;
          return cleaned;
        })
        .filter(p => p.name.length > 0)
      : [];

    if (this.hasInsurance && cleanedExistingPlans.length === 0) {
      this.showToast('Please add at least one plan, or select "No" for existing insurance.');
      return;
    }

    const loader = await this.loadingCtrl.create({
      message: 'Generating your profile...',
    });
    await loader.present();

    try {
      const profileData = {
        fullName: this.fullName,
        age: Number(this.age),
        occupation: this.occupation,
        monthlyIncome: Number(this.monthlyIncome),
        maritalStatus: this.maritalStatus,
        dependents: Number(this.dependents),
        hasExistingInsurance: !!this.hasInsurance,
        existingPlans: cleanedExistingPlans,
        mainGoals: this.mainGoal ? [this.mainGoal] : [],
        monthlyBudget: this.monthlyBudget,
        topConcern: this.primaryConcern
      };

      // saveOnboardingProfile (not updateProfile) is what marks
      // isOnboardingCompleted: true AND generates personaTag/riskProfile/
      // aiInsights — the fields tab1's dynamic dashboard and tab4's
      // Profile Summary both depend on.
      await this.profileService.saveOnboardingProfile(profileData);

      // Keep the local Tab 3 workspace profile aligned with onboarding so its
      // recommendation can be generated without asking for the details again.
      updateCurrentLocalUserProfile({
        name: this.fullName,
        monthlyIncome: Number(this.monthlyIncome),
        financialPriorities: [this.mainGoal, this.primaryConcern],
        monthlyBudget: this.monthlyBudget,
        hasExistingInsurance: this.hasInsurance,
      });

      await loader.dismiss();
      this.router.navigate(['/tabs/tab1']); // Navigate to Landing Page after onboarding
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