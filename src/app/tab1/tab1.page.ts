import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { BookingService, Booking } from '../services/booking';
import { Observable, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { UserProfileService, UserProfileData } from '../services/user-profile.service';
import { Plan, PolicyDataService } from '../services/policy-data';

interface RecommendedPlan extends Plan {
  matchScore: number;
  matchReasons: string[];
}

const AVATAR_MAP: Record<string, { icon: string; bg: string; color: string }> = {
  'avatar-1': { icon: 'person', bg: '#ede9fe', color: '#7c3aed' },
  'avatar-2': { icon: 'happy', bg: '#fce7f3', color: '#db2777' },
  'avatar-3': { icon: 'planet', bg: '#dbeafe', color: '#2563eb' },
  'avatar-4': { icon: 'leaf', bg: '#d1fae5', color: '#059669' },
  'avatar-5': { icon: 'flame', bg: '#ffedd5', color: '#ea580c' },
  'avatar-6': { icon: 'diamond', bg: '#e0e7ff', color: '#4f46e5' },
  'avatar-7': { icon: 'paw', bg: '#fef3c7', color: '#d97706' },
  'avatar-8': { icon: 'rocket', bg: '#f3e8ff', color: '#9333ea' },
  'avatar-9': { icon: 'musical-notes', bg: '#cffafe', color: '#0891b2' },
};

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit, OnDestroy {
  private bookingService = inject(BookingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private userProfileService = inject(UserProfileService);
  private toastCtrl = inject(ToastController);
  private policyData = inject(PolicyDataService);

  todayDate: Date = new Date();
  activeBooking$: Observable<Booking | null>;
  isDetailsModalOpen: boolean = false;
  currentUserName = '';
  userNotes: string = '';
  isCancelling: boolean = false;
  recommendationsOpen = false;
  comparisonOpen = false;
  recommendationsLoading = false;
  recommendedPlans: RecommendedPlan[] = [];
  comparisonSelection: RecommendedPlan[] = [];

  // Dynamic Profile Properties for Dashboard
  userProfile: UserProfileData | null = null;
  private profileSub!: Subscription;

  constructor() {
    this.activeBooking$ = this.bookingService.activeBooking$.pipe(
      tap(booking => {
        if (booking) {
          this.userNotes = booking.notes || '';
        }
      })
    );
  }

  ngOnInit() {
    this.refreshViewModel();

    // Subscribe to userProfile$ to sync currentUserName dynamically from sign-up/onboarding
    this.profileSub = this.userProfileService.userProfile$.subscribe((profile) => {
      this.userProfile = profile;
      if (profile?.fullName) {
        this.currentUserName = profile.fullName;
      }
      this.cdr.detectChanges();
    });
  }

  ionViewWillEnter() {
    this.refreshViewModel();
  }

  ngOnDestroy() {
    if (this.profileSub) {
      this.profileSub.unsubscribe();
    }
  }

  private refreshViewModel() {
    this.todayDate = new Date();
    this.currentUserName = this.userProfile?.fullName ?? 'User';
  }

  async openRecommendations() {
    this.recommendationsOpen = true;
    this.recommendationsLoading = true;
    try {
      await this.policyData.ensureLoaded();
      this.recommendedPlans = this.policyData.getPlans()
        .map(plan => this.rankPlan(plan, this.userProfile))
        .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));
    } catch (error) {
      console.error('[Tab1] Failed to load recommendations:', error);
      await this.showErrorToast('Could not load recommendations. Please try again.');
    } finally {
      this.recommendationsLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeRecommendations() {
    this.recommendationsOpen = false;
    this.comparisonOpen = false;
    this.comparisonSelection = [];
  }

  toggleComparison(plan: RecommendedPlan) {
    const index = this.comparisonSelection.findIndex(item => item.id === plan.id);
    if (index >= 0) this.comparisonSelection.splice(index, 1);
    else if (this.comparisonSelection.length < 3) this.comparisonSelection.push(plan);
  }

  isSelectedForComparison(planId: string): boolean {
    return this.comparisonSelection.some(plan => plan.id === planId);
  }

  coveragePreview(plan: Plan): string {
    return (plan.covered ?? []).slice(0, 3).join(' · ');
  }

  openComparison() {
    if (this.comparisonSelection.length >= 2) this.comparisonOpen = true;
  }

  private rankPlan(plan: Plan, profile: UserProfileData | null): RecommendedPlan {
    if (!profile?.isOnboardingCompleted) {
      return { ...plan, matchScore: 50, matchReasons: ['Complete your profile to improve this match.'] };
    }
    const needsText = [...(profile.mainGoals ?? []), profile.topConcern ?? ''].join(' ').toLowerCase();
    const planText = [plan.name, plan.category, plan.description, ...(plan.bestFor ?? []), ...(plan.covered ?? [])].join(' ').toLowerCase();
    const categoryTerms: Record<Plan['filterCategory'], string[]> = {
      health: ['health', 'medical', 'hospital'], ci: ['critical', 'illness'],
      life: ['life', 'family', 'dependent', 'income', 'protection'],
      wealth: ['wealth', 'saving', 'retirement', 'education', 'investment']
    };
    const reasons: string[] = [];
    let score = 40;
    const relevantTerms = categoryTerms[plan.filterCategory] ?? [];
    if (relevantTerms.some(term => needsText.includes(term) || (needsText.includes(term) && planText.includes(term)))) {
      score += 28;
      reasons.push(`Matches your ${profile.topConcern || profile.mainGoals?.[0] || 'stated protection goal'}.`);
    }
    const monthlyPremium = this.monthlyPremium(plan.premium);
    const budget = Number(profile.monthlyBudget || 0);
    if (budget && monthlyPremium !== null) {
      if (monthlyPremium <= budget) { score += 22; reasons.push(`The ${plan.premium} premium fits your S$${budget} monthly budget.`); }
      else { score -= 20; reasons.push(`The ${plan.premium} premium exceeds your S$${budget} monthly budget.`); }
    }
    const existingText = (profile.existingPlans ?? []).map(item => `${item.name} ${item.insurer ?? ''}`).join(' ').toLowerCase();
    const overlaps = !!existingText && (existingText.includes(plan.name.toLowerCase()) || relevantTerms.some(term => existingText.includes(term)));
    if (overlaps) { score -= 18; reasons.push('May overlap with coverage already in your profile.'); }
    else if (profile.hasExistingInsurance) { score += 8; reasons.push(`Adds ${plan.category.toLowerCase()} coverage without directly duplicating your listed plans.`); }
    if ((profile.dependents ?? 0) > 0 && ['life', 'ci'].includes(plan.filterCategory)) {
      score += 10; reasons.push(`Relevant because you support ${profile.dependents} dependant${profile.dependents === 1 ? '' : 's'}.`);
    }
    if (!reasons.length) reasons.push('Available for review against your current needs.');
    return { ...plan, matchScore: Math.max(15, Math.min(98, score)), matchReasons: reasons.slice(0, 3) };
  }

  private monthlyPremium(value: string): number | null {
    const amount = Number(String(value).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount)) return null;
    return /year|annual|\/yr/i.test(value) ? amount / 12 : amount;
  }

  openDetailsModal() {
    this.isDetailsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDetailsModal() {
    this.isDetailsModalOpen = false;
    this.cdr.detectChanges();
  }

  async saveNotesChange() {
    try {
      await this.bookingService.updateBookingNotes(this.userNotes);
    } catch (error: any) {
      await this.showErrorToast(error.message || 'Failed to save your notes. Please try again.');
    }
  }

  goToProfile() {
    this.closeDetailsModal();
    this.router.navigate(['/edit-profile']);
  }

  rescheduleBooking(currentBooking: Booking) {
    this.closeDetailsModal();
    this.router.navigate(['/book-meeting'], {
      queryParams: {
        reschedule: true,
        advisorName: currentBooking.consultantName
      }
    });
  }

  async handleCancellation() {
    this.isCancelling = true;
    try {
      await this.bookingService.clearBooking();
      // Only close the modal once the cancellation is confirmed to have
      // gone through — closing it optimistically could tell the user their
      // meeting was cancelled when the Firestore write actually failed
      // (e.g. while offline).
      this.isDetailsModalOpen = false;
    } catch (error: any) {
      await this.showErrorToast(error.message || 'Failed to cancel your booking. Please check your connection and try again.');
    } finally {
      this.isCancelling = false;
      this.cdr.detectChanges();
    }
  }

  getAvatarIcon(avatarId: string): string {
    return AVATAR_MAP[avatarId]?.icon ?? 'person';
  }

  getAvatarBg(avatarId: string): string {
    return AVATAR_MAP[avatarId]?.bg ?? '#ede9fe';
  }

  getAvatarColor(avatarId: string): string {
    return AVATAR_MAP[avatarId]?.color ?? '#7c3aed';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}
